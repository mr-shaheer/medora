<div align="center">

# 🧬 Medora

### An autonomous agentic system for discovering and synthesizing clinical evidence.

*Multi-source medical retrieval, hybrid vector search, and citation-grounded reasoning — built on the OpenAI Agents SDK and Gemini.*

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![OpenAI Agents SDK](https://img.shields.io/badge/OpenAI_Agents_SDK-0.20+-412991?style=for-the-badge&logo=openai&logoColor=white)](https://github.com/openai/openai-agents-python)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20%2F%203.5-8E75B2?style=for-the-badge&logo=googlegemini&logoColor=white)](https://ai.google.dev/)
[![Postgres](https://img.shields.io/badge/Neon-pgvector-00E599?style=for-the-badge&logo=postgresql&logoColor=white)](https://neon.tech/)
[![Pydantic](https://img.shields.io/badge/Pydantic-v2-E92063?style=for-the-badge&logo=pydantic&logoColor=white)](https://docs.pydantic.dev/)

[Overview](#-overview) • [How It Works](#-how-it-works) • [Features](#-features) • [Quickstart](#-quickstart) • [Usage](#-usage) • [Architecture](#-architecture)

</div>

---

## 📖 Overview

**Medora** takes a clinical research question — *"Is metformin effective for PCOS in adolescents?"* — and turns it into a **cited, evidence-grounded answer**, sourced live from PubMed, ClinicalTrials.gov, and OpenFDA.

Rather than asking one model to "know" medicine, Medora is built as a **pipeline of specialized stages**: a router picks the right medical database, an agent retrieves raw documents through MCP tools, the evidence is chunked and deduplicated, a Postgres + pgvector store performs hybrid semantic/keyword search, a reasoning agent drafts an answer with inline citations, and a final verifier agent checks that draft against the evidence before anything is shown to the user.

> 💡 **Why this project matters:** it's a worked example of *retrieval-augmented reasoning done carefully* — hybrid search (not just embeddings), a rerank step that respects clinical evidence hierarchy, retracted-study filtering, a self-maintaining cache with TTL + LRU eviction, and a dedicated grounding pass so the model can't quietly hallucinate a citation.

---

## 🧠 How It Works

```mermaid
flowchart TD
    U([👤 Research Question]) --> KR

    subgraph Router["🧭 MCP Router"]
        KR[Keyword Router] -->|"confidence ≥ 0.80"| D1[Route decided]
        KR -->|"confidence < 0.80"| LR[LLM Router - Gemini 2.5 Flash]
        LR --> D1
    end

    D1 --> RET

    subgraph Retrieval["🔬 Evidence Retrieval"]
        RET[Retriever Agent] --> MCP1[(PubMed MCP)]
        RET --> MCP2[(ClinicalTrials MCP)]
        RET --> MCP3[(OpenFDA MCP)]
    end

    MCP1 --> EP
    MCP2 --> EP
    MCP3 --> EP

    subgraph Pool["🧹 Evidence Pool"]
        EP[Dedupe + Retraction Filter] --> CH[Chunk + Classify Study Type]
    end

    CH --> VS

    subgraph Store["🗄️ Neon + pgvector"]
        VS[(Embed & Upsert)] --> HS[Hybrid Search<br/>semantic + keyword, RRF fusion]
    end

    HS --> RR[Rerank by Study-Type Priority]
    RR --> ER[Evidence Reasoner Agent]
    ER --> GV{{🛡️ Grounding Verifier}}
    GV --> OUT([✅ Cited Final Answer])

    M[(Maintenance Loop:<br/>purge retracted / expire stale / cap rows)] -.-> VS
```

1. **You ask a clinical research question.**
2. A **two-tier router** decides which medical source(s) to query: a fast **keyword router** scores the question against curated term lists for PubMed, ClinicalTrials, and OpenFDA; if it isn't confident (score < 0.80), an **LLM router** (Gemini 2.5 Flash) breaks the tie.
3. A **retriever agent** connects to the chosen source(s) as **MCP servers** and pulls back raw documents (abstracts, trial records, drug labels) as structured JSON — never summarizing, just fetching.
4. The **Evidence Pool** deduplicates documents, strips out retracted papers, classifies each one by study design (meta-analysis, RCT, cohort, case-report, ...), and splits long text into overlapping chunks.
5. Chunks are embedded and upserted into a **Neon Postgres + pgvector** store. A **hybrid search** — vector similarity fused with full-text keyword search via **Reciprocal Rank Fusion** — pulls the top candidates, catching both semantic matches and exact terms (drug names, gene symbols, dosages) that embeddings alone can blur.
6. Candidates are **reranked** so higher-quality study designs (meta-analyses, RCTs) are preferred over case reports.
7. An **Evidence Reasoner agent** drafts an answer strictly from the retrieved chunks, citing every claim inline as `[PMID:xxxxx]` or `[DOI:xxxxx]`.
8. A **Grounding Verifier agent** checks the draft against the evidence a second time — trimming unsupported claims and refusing to invent new citations — before the final answer is returned.
9. In the background, a **maintenance loop** keeps the evidence cache bounded: retracted papers are purged, stale chunks expire after a TTL, and the table is capped with LRU eviction.

---

## ✨ Features

| | |
|---|---|
| 🧭 **Two-tier source routing** | A cheap, deterministic keyword router handles the obvious cases; an LLM router (Gemini) only gets called when the signal is ambiguous. |
| 🔌 **Multi-source MCP retrieval** | Pulls live evidence from **PubMed**, **ClinicalTrials.gov**, and **OpenFDA** through Model Context Protocol servers — not a static dataset. |
| 🧹 **Evidence Pool preprocessing** | Deduplicates documents by PMID/DOI/study ID, detects and drops retracted papers, classifies study design by regex, and chunks text with configurable size/overlap. |
| 🔎 **Hybrid retrieval** | Combines pgvector semantic search with Postgres full-text keyword search, fused with **Reciprocal Rank Fusion** — so exact clinical terms aren't lost to embedding fuzziness. |
| 📊 **Evidence-hierarchy reranking** | Candidates are reordered so meta-analyses and RCTs outrank cohort studies and case reports, using the study-type priority returned by the retriever. |
| ✍️ **Citation-grounded reasoning** | The Evidence Reasoner agent may only use supplied evidence and must cite every claim inline — no evidence, no claim. |
| 🛡️ **Independent grounding verifier** | A second agent re-checks the draft answer against the evidence, removing unsupported claims and blocking fabricated PMIDs/DOIs, or reporting "Insufficient evidence to answer." |
| ♻️ **Self-maintaining cache** | A background loop purges retracted rows, expires chunks unused for `EVIDENCE_TTL_DAYS`, and LRU-evicts once the table exceeds `EVIDENCE_MAX_ROWS` — all tunable via env vars, no code changes needed. |
| 🧩 **Typed, traceable pipeline** | Every stage is a plain function or `Agent`, wired together under a single `trace("Medical Research Pipeline")` span for observability. |

---

## 🏗️ Architecture

```
medora/
├── cli.py                          # Entry point: input loop + background cache maintenance
├── requirements.txt
├── pyproject.toml
│
└── app/
    ├── model.py                    # Gemini client config (OpenAI-compatible endpoint), embedding + DB settings
    ├── pipeline.py                 # Orchestrates the full 6-step retrieval → reasoning → verification flow
    │
    ├── router/
    │   ├── main_router.py          # Combines keyword + LLM routing into one decision
    │   ├── keyword_router.py       # Rule-based scoring across PubMed / ClinicalTrials / OpenFDA term lists
    │   ├── llm_router.py           # Gemini-backed fallback router for ambiguous queries
    │   └── metadata.py             # Descriptions of each MCP source, used in router prompts
    │
    ├── mcp/
    │   └── mcp_client.py           # MCP server definitions/connections for PubMed, ClinicalTrials, OpenFDA
    │
    ├── retrieval/
    │   ├── evidence_pool.py        # Dedup, retraction filtering, study-type classification, chunking
    │   ├── vector_store.py         # Neon/pgvector: embed, upsert, hybrid search, TTL + LRU maintenance
    │   └── rerank.py               # Reorders candidates by study-type priority
    │
    └── agents/
        ├── evidence_reasoner.py    # Drafts a cited answer strictly from retrieved evidence chunks
        └── verifier.py             # Cross-checks the draft against evidence, strips unsupported claims
```

**Two purpose-built agents, one retriever.** The `EvidenceReasoner` and `GroundingVerifier` agents both run on the stronger model tier (`high_model`, Gemini 3.5 Flash) since drafting and fact-checking a clinical answer benefit from stronger reasoning; the fallback router uses the faster `gemini-2.5-flash` since it only has to pick one of three sources.

**Retrieval is hybrid by design.** `vector_store.py` runs semantic (pgvector) and keyword (Postgres full-text) search in parallel and fuses them with **Reciprocal Rank Fusion**, so a query about a specific biomarker or drug name isn't lost to embedding similarity alone.

**The cache knows its own boundaries.** The `evidence_chunks` table is explicitly a cache, not an archive — PubMed/ClinicalTrials/OpenFDA remain the source of truth. Retracted papers are deleted outright, unused chunks expire on a TTL, and a row cap enforces LRU eviction, all driven from `cli.py`'s startup + background maintenance loop.

---

## 🧰 Tech Stack

- **[OpenAI Agents SDK](https://github.com/openai/openai-agents-python)** — agent definitions, `Runner`, MCP server integration, tracing
- **Google Gemini** (`2.5-flash` / `3.5-flash`) — via an OpenAI-compatible endpoint, for routing, reasoning, and grounding
- **Model Context Protocol (MCP)** — live connections to PubMed, ClinicalTrials.gov, and OpenFDA servers
- **Neon Postgres + pgvector** — hybrid semantic/keyword evidence store with HNSW indexing
- **Pydantic v2** — typed router results and structured LLM output parsing
- **psycopg** — async-friendly Postgres driver

---

## 🚀 Quickstart

### Prerequisites
- Python 3.12+
- A [Gemini API key](https://ai.google.dev/)
- A [Neon](https://neon.tech/) (or any Postgres instance with the `pgvector` extension available)

### 1. Clone & install

```bash
git clone <your-repo-url>
cd medora

# using uv (recommended — a uv.lock is included)
uv sync

# or with pip
pip install -r requirements.txt
```

### 2. Configure environment

Create a `.env` file in the project root:

```ini
GEMINI_API_KEY=your_gemini_key_here
NEON_DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Optional overrides
GEMINI_EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIM=1536
EVIDENCE_MAX_ROWS=50000
EVIDENCE_TTL_DAYS=60
```

### 3. Run it

```bash
python cli.py
```

> **Note:** `cli.py` and the modules under `app/` currently reference each other with flat imports (e.g. `from app.pipeline import run`, `from rerank import rerank`). Depending on your environment, you may need to run from inside `app/` or add `app/`, `app/router/`, `app/retrieval/`, and `app/agents/` to your `PYTHONPATH` for these to resolve.

---

## 💬 Usage

```
You: Is metformin effective for PCOS in adolescents?

>>> MCP ROUTER: pubmed (confidence=0.85)
>>> STEP 1: BioMCP Retriever
>>> STEP 2: Evidence Pool
>>> STEP 3: Vector Search
>>> STEP 4: Evidence Reasoner
>>> STEP 5: Grounding Verifier
>>> STEP 6: Done
Researcher: Metformin shows modest improvement in menstrual regularity and
insulin sensitivity in adolescents with PCOS across several small RCTs
[PMID:xxxxxxx], though evidence on long-term outcomes remains limited
[PMID:xxxxxxx]. ...

You: /exit
```

- Type `/reset` to clear the current session.
- Type `/exit` or `/quit` to leave.
- Cache maintenance (purge retracted / expire stale / enforce row cap) runs once at startup and then every 24 hours in the background.

---

## 📄 License

No license file is currently included — add one (MIT, Apache-2.0, etc.) before distributing.

---

<div align="center">

*Medora synthesizes evidence, it doesn't replace clinical judgment. Always verify against primary sources.*

</div>