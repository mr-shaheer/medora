import os

import psycopg
from pgvector.psycopg import register_vector
from app.model import NEON_DATABASE_URL, EMBEDDING_DIM, GEMINI_EMBEDDING_MODEL, get_gemini_client

TABLE = "evidence_chunks"

# Cache bounds
MAX_ROWS = int(os.getenv("EVIDENCE_MAX_ROWS", "50000"))
TTL_DAYS = int(os.getenv("EVIDENCE_TTL_DAYS", "60"))


def get_connection() -> psycopg.Connection:
    conn = psycopg.connect(NEON_DATABASE_URL, autocommit=True)
    conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
    register_vector(conn)
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE} (
            chunk_id TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            source TEXT,
            pmid TEXT,
            doi TEXT,
            study_id TEXT,
            title TEXT,
            publication_date TEXT,
            study_type TEXT,
            is_retracted BOOLEAN DEFAULT FALSE,
            embedding VECTOR({EMBEDDING_DIM}),
            content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
    """)

    conn.execute(f"ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    conn.execute(f"ALTER TABLE {TABLE} ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT now()")
    conn.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_{TABLE}_content_tsv
        ON {TABLE} USING GIN (content_tsv)
    """)

    conn.execute(f"""
        CREATE INDEX IF NOT EXISTS idx_{TABLE}_embedding
        ON {TABLE} USING hnsw (embedding vector_l2_ops)
    """)
    return conn


async def embed(texts: list[str], batch_size: int = 100) -> list[list[float]]:
    """Embed texts in batches of max 100 (Gemini limit)."""
    if not texts:
        return []

    client = get_gemini_client()
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = await client.embeddings.create(
            model=GEMINI_EMBEDDING_MODEL,
            input=batch,
            dimensions=EMBEDDING_DIM
        )
        all_embeddings.extend([item.embedding for item in response.data])

    return all_embeddings


def existing_chunk_ids(conn: psycopg.Connection, chunk_ids: list[str]) -> set[str]:
    """Batched existence check (single query) instead of one query per chunk."""
    if not chunk_ids:
        return set()
    rows = conn.execute(
        f"SELECT chunk_id FROM {TABLE} WHERE chunk_id = ANY(%s)", (chunk_ids,)
    ).fetchall()
    return {row[0] for row in rows}


async def upsert_chunks(conn: psycopg.Connection, chunks: list[dict]) -> None:
    existing = existing_chunk_ids(conn, [c["chunk_id"] for c in chunks])
    new_chunks = [c for c in chunks if c["chunk_id"] not in existing]
    if not new_chunks:
        print("No new chunks to embed.")
        return

    print(f"Embedding {len(new_chunks)} new chunks...")
    vectors = await embed([c["content"] for c in new_chunks])

    for chunk, vector in zip(new_chunks, vectors):
        conn.execute(
            f"""INSERT INTO {TABLE}
                (chunk_id, content, source, pmid, doi, study_id, title,
                 publication_date, study_type, is_retracted, embedding)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (chunk_id) DO NOTHING""",
            (chunk["chunk_id"], chunk["content"], chunk["source"], chunk["pmid"],
             chunk["doi"], chunk["study_id"], chunk["title"], chunk["publication_date"],
             chunk["study_type"], chunk["is_retracted"], vector),
        )
    print(f"Successfully stored {len(new_chunks)} chunks.")

    enforce_row_cap(conn)


def touch_accessed(conn: psycopg.Connection, chunk_ids: list[str]) -> None:
    """Bump last_accessed_at for chunks a search actually returned, so LRU
    eviction knows which rows are still useful."""
    if chunk_ids:
        conn.execute(
            f"UPDATE {TABLE} SET last_accessed_at = now() WHERE chunk_id = ANY(%s)",
            (chunk_ids,),
        )


def purge_retracted(conn: psycopg.Connection) -> int:
    """Delete retracted papers outright instead of just flagging them -
    no reason to keep paying to store/index chunks that are never surfaced."""
    result = conn.execute(f"DELETE FROM {TABLE} WHERE is_retracted = TRUE")
    return result.rowcount


def expire_stale(conn: psycopg.Connection, ttl_days: int = TTL_DAYS) -> int:
    """Delete chunks that haven't been returned by a search in ttl_days."""
    result = conn.execute(
        f"DELETE FROM {TABLE} WHERE last_accessed_at < now() - make_interval(days => %s)",
        (ttl_days,),
    )
    return result.rowcount


def enforce_row_cap(conn: psycopg.Connection, max_rows: int = MAX_ROWS) -> int:
    """LRU eviction: if the table is over budget, drop the least-recently
    accessed rows first until it's back under max_rows."""
    (count,) = conn.execute(f"SELECT count(*) FROM {TABLE}").fetchone()
    if count <= max_rows:
        return 0
    overflow = count - max_rows
    result = conn.execute(f"""
        DELETE FROM {TABLE} WHERE chunk_id IN (
            SELECT chunk_id FROM {TABLE} ORDER BY last_accessed_at ASC LIMIT %s
        )
    """, (overflow,))
    return result.rowcount


MAX_SEMANTIC_DISTANCE = float(os.getenv("MAX_SEMANTIC_DISTANCE", "0.8"))

async def semantic_search(conn: psycopg.Connection, query: str, top_k: int = 20, max_distance: float = MAX_SEMANTIC_DISTANCE) -> list[dict]:
    [query_vector] = await embed([query])
    rows = conn.execute(
        f"""SELECT chunk_id, content, source, pmid, doi, study_id, title,
                   publication_date, study_type, is_retracted,
                   embedding <-> %s::vector AS distance
            FROM {TABLE}
            WHERE is_retracted = FALSE
              AND embedding <-> %s::vector <= %s
            ORDER BY embedding <-> %s::vector ASC
            LIMIT %s""",
        (query_vector, query_vector, max_distance, query_vector, top_k),
    ).fetchall()
    columns = ["chunk_id", "content", "source", "pmid", "doi", "study_id", "title",
               "publication_date", "study_type", "is_retracted", "distance"]
    results = [dict(zip(columns, row)) for row in rows]
    touch_accessed(conn, [r["chunk_id"] for r in results])
    return results


def keyword_search(conn: psycopg.Connection, query: str, top_k: int = 20) -> list[dict]:
    """Lexical retrieval step: full-text (BM25-style) search over chunk content.

    Catches exact terms - drug names, gene symbols, dosages, acronyms - that
    embeddings can blur together.
    """
    rows = conn.execute(
        f"""SELECT chunk_id, content, source, pmid, doi, study_id, title,
                   publication_date, study_type, is_retracted,
                   ts_rank(content_tsv, websearch_to_tsquery('english', %s)) AS rank
            FROM {TABLE}
            WHERE is_retracted = FALSE
            AND content_tsv @@ websearch_to_tsquery('english', %s)
            ORDER BY rank DESC
            LIMIT %s""",
        (query, query, top_k),
    ).fetchall()
    columns = ["chunk_id", "content", "source", "pmid", "doi", "study_id", "title",
               "publication_date", "study_type", "is_retracted", "rank"]
    results = [dict(zip(columns, row)) for row in rows]
    touch_accessed(conn, [r["chunk_id"] for r in results])
    return results


async def hybrid_search(
    conn: psycopg.Connection,
    query: str,
    top_k: int = 20,
    rrf_k: int = 60,
    max_distance: float = MAX_SEMANTIC_DISTANCE,
) -> list[dict]:
    semantic_results = await semantic_search(conn, query, top_k=top_k, max_distance=max_distance)
    keyword_results = keyword_search(conn, query, top_k=top_k)

    fused: dict[str, dict] = {}

    for rank, row in enumerate(semantic_results):
        entry = fused.setdefault(row["chunk_id"], {**row, "rrf_score": 0.0})
        entry["rrf_score"] += 1.0 / (rrf_k + rank + 1)

    for rank, row in enumerate(keyword_results):
        entry = fused.setdefault(row["chunk_id"], {**row, "rrf_score": 0.0})
        entry["rrf_score"] += 1.0 / (rrf_k + rank + 1)

    merged = sorted(fused.values(), key=lambda c: c["rrf_score"], reverse=True)
    return merged[:top_k]