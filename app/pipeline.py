import json

from app.retrieval.rerank import rerank
from agents import Agent, Runner, trace

from app.model import get_model
from app.agents.verifier import verify_answer
from app.mcp.mcp_client import get_medical_server
from app.router.main_router import route_query
from app.retrieval.evidence_pool import build_evidence_chunks, deduplicate
from app.agents.evidence_reasoner import reason_over_evidence
from app.retrieval.vector_store import get_connection, upsert_chunks, hybrid_search
from agents.exceptions import MaxTurnsExceeded

RETRIEVER_INSTRUCTIONS = """You are a biomedical evidence retriever.

Given the user's medical research question, use only the MCP tools available
to you. Retrieve relevant raw documents from that source.

Return ONLY a JSON object with exactly these two keys:
{
  "study_types_priority": ["meta-analysis", "rct", "cohort", "case-report"],
  "documents": [
    
    { ...raw document fields: source, url, source_url, pmid, doi,
      study_id, title, publication_date,
      status/overall_status/recruitment_status,
      abstract/summary/text... }
  ]
}

- Call each available tool ONE time only, with your best single query.
- If that search returns ANY documents — even just one, even if it only
  partially answers the question — STOP searching. Use that result and
  return the JSON immediately.
- Do NOT reformulate the query and search again "to check for more" or
  "to find a better match." One relevant document is sufficient evidence
  to proceed; a downstream verification step will judge if it's enough.
- Only perform a second search if the first search returned ZERO results.
- Always include the trial's recruitment/overall status field if present
  in the source data (e.g. RECRUITING, ACTIVE_NOT_RECRUITING, COMPLETED).
  Never omit it even if not asked about directly.
- Prefer recent systematic reviews, meta-analyses and clinical guidelines when available.
- Do not summarize or answer the question.
- Do not invent documents.
"""


def _extract_json(text: str) -> dict:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return {"study_types_priority": [], "documents": []}
    try:
        data = json.loads(text[start:end + 1])
    except json.JSONDecodeError:
        return {"study_types_priority": [], "documents": []}
    return {
        "study_types_priority": data.get("study_types_priority", []),
        "documents": data.get("documents", []),
    }

async def plan_and_retrieve(question: str, on_route=None) -> tuple[list[str], list[dict]]:
    decision = await route_query(question)
    if on_route:
        on_route(decision)

    print(
        f">>> MCP ROUTER: {', '.join(decision.sources)} "
        f"(confidence={decision.confidence:.2f})"
    )

    servers = [
        get_medical_server(source)
        for source in decision.sources
    ]

    for server in servers:
        await server.connect()

    try:
        retriever_agent = Agent(
            name = "MedicalEvidenceRetriever",
            instructions = RETRIEVER_INSTRUCTIONS,
            model = get_model(),
            mcp_servers = servers,
        )

        result = await Runner.run(
            retriever_agent,
            question,
            max_turns = 4
        )

        meta = _extract_json(result.final_output)

        return (
            meta["study_types_priority"],
            meta["documents"],
        )
    except MaxTurnsExceeded:
        print(">>> STEP 1b: Retriever hit max turns, proceeding with no documents.")
        return ([], [])

    finally:
        for server in reversed(servers):
            await server.cleanup()

MAX_REFLECT_ATTEMPTS = 1

async def run(question: str) -> str:
    with trace("Medical Research Pipeline"):
        print(">>> STEP 1: BioMCP Retriever")
        study_priority, raw_documents = await plan_and_retrieve(question)

        print(">>> STEP 2: Evidence Pool")
        chunks = build_evidence_chunks(raw_documents)

        print(">>> STEP 3: Vector Search")
        conn = get_connection()
        await upsert_chunks(conn, chunks)

        top_k = 20
        select_k = 10
        max_distance = 0.8
        attempt = 0
        previous_ids: set[str] = set()

        while True:
            candidates = await hybrid_search(conn, question, top_k=top_k, max_distance=max_distance)
            selected = rerank(candidates, study_priority, top_k=select_k)

            if not selected:
                if attempt >= MAX_REFLECT_ATTEMPTS:
                    conn.close()
                    print(">>> STEP 6: Done")
                    return "Insufficient evidence to answer."
                attempt += 1
                print(
                    f">>> STEP 5b: Reflect - no evidence within distance {max_distance:.1f}, "
                    f"widening to {max_distance + 0.2:.1f}. Retry {attempt}/{MAX_REFLECT_ATTEMPTS}."
                )
                top_k += 15
                select_k += 5
                max_distance += 0.2
                continue

            current_ids = {c["chunk_id"] for c in selected}
            if attempt > 0 and current_ids == previous_ids:
                conn.close()
                print(">>> STEP 5b: Reflect - broader search returned the same evidence, stopping.")
                print(">>> STEP 6: Done")
                return "Insufficient evidence to answer."
            previous_ids = current_ids

            print(">>> STEP 4: Evidence Reasoner")
            draft = await reason_over_evidence(question, selected)

            print(">>> STEP 5: Grounding Verifier")
            verdict = await verify_answer(question, draft, selected)

            if verdict.status == "SUFFICIENT" or attempt >= MAX_REFLECT_ATTEMPTS:
                conn.close()
                print(">>> STEP 6: Done")
                return verdict.answer

            attempt += 1
            print(
                f">>> STEP 5b: Reflect - evidence insufficient "
                f"({verdict.missing or 'no detail given'}). "
                f"Retry {attempt}/{MAX_REFLECT_ATTEMPTS} with broader search."
            )
            top_k += 15
            select_k += 5
            max_distance += 0.2


async def run_stream(question: str):

    route: dict = {}

    def on_route(decision):
        route.update(sources=list(decision.sources), confidence=float(decision.confidence))

    def result(answer, status, missing, selected, counts):
        return {"type": "result", "route": route, "counts": counts,
                "status": status, "missing": missing, "answer": answer, "chunks": selected}

    with trace("Medical Research Pipeline"):
        yield {"type": "stage", "index": 0}
        study_priority, raw_documents = await plan_and_retrieve(question, on_route=on_route)

        yield {"type": "stage", "index": 1}
        chunks = build_evidence_chunks(raw_documents)
        counts = {
            "retrieved": len(raw_documents),
            "unique": len(deduplicate(raw_documents)),
            "retracted": len({c["chunk_id"].rsplit("_", 1)[0] for c in chunks if c["is_retracted"]}),
        }
        conn = get_connection()
        try:
            await upsert_chunks(conn, chunks)

            top_k, select_k, max_distance = 20, 10, 0.8
            attempt = 0
            previous_ids: set[str] = set()

            while True:
                candidates = await hybrid_search(conn, question, top_k=top_k, max_distance=max_distance)
                selected = rerank(candidates, study_priority, top_k=select_k)

                if not selected:
                    if attempt >= MAX_REFLECT_ATTEMPTS:
                        yield result("Insufficient evidence to answer.", "INSUFFICIENT",
                                     "No relevant evidence was found for this question.", [], counts)
                        return
                    attempt += 1
                    top_k += 15
                    select_k += 5
                    max_distance += 0.2
                    continue

                current_ids = {c["chunk_id"] for c in selected}
                if attempt > 0 and current_ids == previous_ids:
                    yield result("Insufficient evidence to answer.", "INSUFFICIENT",
                                 "A broader search returned the same evidence.", selected, counts)
                    return
                previous_ids = current_ids

                yield {"type": "stage", "index": 2}
                draft = await reason_over_evidence(question, selected)

                yield {"type": "stage", "index": 3}
                verdict = await verify_answer(question, draft, selected)

                if verdict.status == "SUFFICIENT" or attempt >= MAX_REFLECT_ATTEMPTS:
                    yield result(verdict.answer, verdict.status, verdict.missing, selected, counts)
                    return

                attempt += 1
                top_k += 15
                select_k += 5
                max_distance += 0.2
                yield {"type": "stage", "index": 1}
        finally:
            conn.close()
