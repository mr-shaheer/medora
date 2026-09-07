import json

from app.retrieval.rerank import rerank
from agents import Agent, Runner, trace

from app.model import high_model
from app.agents.verifier import verify_answer
from app.mcp.mcp_client import get_medical_server
from app.router.main_router import route_query
from app.retrieval.evidence_pool import build_evidence_chunks
from app.agents.evidence_reasoner import reason_over_evidence
from app.retrieval.vector_store import get_connection, upsert_chunks, hybrid_search

RETRIEVER_INSTRUCTIONS = """You are a biomedical evidence retriever.

Given the user's medical research question, use only the MCP tools available
to you. Retrieve relevant raw documents from that source.

Return ONLY a JSON object with exactly these two keys:
{
  "study_types_priority": ["meta-analysis", "rct", "cohort", "case-report"],
  "documents": [
    { ...raw document fields: source, pmid, doi, study_id, title,
       publication_date, status/overall_status/recruitment_status, abstract/summary/text... }
  ]
}

- Always include the trial's recruitment/overall status field if present
  in the source data (e.g. RECRUITING, ACTIVE_NOT_RECRUITING, COMPLETED).
  Never omit it even if not asked about directly.
- study_types_priority: study designs to prefer when ranking evidence.
- documents: the raw retrieved documents, one object per search hit.
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

async def plan_and_retrieve(question: str) -> tuple[list[str], list[dict]]:
    decision = await route_query(question)

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
            name="MedicalEvidenceRetriever",
            instructions=RETRIEVER_INSTRUCTIONS,
            model=high_model,
            mcp_servers=servers,
        )

        result = await Runner.run(
            retriever_agent,
            question,
        )

        meta = _extract_json(result.final_output)

        return (
            meta["study_types_priority"],
            meta["documents"],
        )

    finally:
        for server in reversed(servers):
            await server.cleanup()

async def run(question: str) -> str:

    with trace("Medical Research Pipeline"):

        print(">>> STEP 1: BioMCP Retriever")
        study_priority, raw_documents = await plan_and_retrieve(question)

        print(">>> STEP 2: Evidence Pool")
        chunks = build_evidence_chunks(raw_documents)

        print(">>> STEP 3: Vector Search")
        conn = get_connection()
        await upsert_chunks(conn, chunks)
        candidates = await hybrid_search(conn, question, top_k=20)
        selected = rerank(candidates, study_priority, top_k=10)
        conn.close()

        print(">>> STEP 4: Evidence Reasoner")
        draft = await reason_over_evidence(question, selected)

        print(">>> STEP 5: Grounding Verifier")
        final_answer = await verify_answer(question, draft, selected)

        print(">>> STEP 6: Done")

        return final_answer