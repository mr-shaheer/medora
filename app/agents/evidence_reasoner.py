from agents import Agent, Runner
from app.model import high_model

INSTRUCTIONS = """You are a biomedical evidence reasoner.
You will be given a research question and a list of evidence chunks, each
tagged with source metadata (PMID/DOI, title, study type, date).

Rules:
- Only use the supplied evidence. Never invent facts or citations.
- Compare findings across chunks, note agreement/conflict, and weigh by
  study design (meta-analyses/RCTs generally outweigh case reports).
- Cite every claim inline like [PMID:xxxxx] or [DOI:xxxxx].
- If the evidence is insufficient or conflicting, say so plainly.
Produce a clear draft answer.
"""

reasoner_agent = Agent(
    name="EvidenceReasoner",
    instructions=INSTRUCTIONS,
    model=high_model,
)


def format_evidence(chunks: list[dict]) -> str:
    lines = []
    for c in chunks:
        ref = (c.get("pmid") and f"PMID:{c['pmid']}") or (c.get("doi") and f"DOI:{c['doi']}") or c["chunk_id"]
        lines.append(f"[{ref}] ({c.get('study_type')}, {c.get('publication_date')}) {c.get('title')}\n{c['content']}")
    return "\n\n".join(lines)


async def reason_over_evidence(question: str, chunks: list[dict]) -> str:
    prompt = f"Question: {question}\n\nEvidence:\n{format_evidence(chunks)}"
    result = await Runner.run(reasoner_agent, prompt)
    return result.final_output
