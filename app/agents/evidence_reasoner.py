from agents import Agent, Runner
from app.model import get_model

INSTRUCTIONS = """You are a biomedical evidence reasoner.
You will be given a research question and a list of evidence chunks, each
tagged with source metadata (PMID/DOI, title, study type, date).

Rules:
- Only use the supplied evidence. Never invent facts or citations.
- Compare findings across chunks, note agreement/conflict, and weigh by
  study design (meta-analyses/RCTs generally outweigh case reports).
- Cite every claim inline like [PMID:xxxxx] or [DOI:xxxxx].
- If the evidence is insufficient or conflicting, say so plainly.

FORMAT (follow exactly, plain text only):
- Use these four section headings, in this order, each on its own line
  starting with "## ":
  ## Bottom Line
  ## Key Findings
  ## Strength of Evidence
  ## Limitations & Gaps
- Bottom Line: 2-3 plain sentences that directly answer the question.
- Key Findings: 3-6 bullets, each line starting with "- ". One finding per
  bullet, with its citation(s) at the end, e.g. "- Reduced HbA1c by 1% [PMID:123]".
- Strength of Evidence: 
1-3 sentences on study types, sample sizes and how consistent the studies are.
State the publication year range of the studies and note if the most recent evidence is older than 3 years.
- Limitations & Gaps: bullets (start with "- ") on conflicting results,
  missing populations, short follow-up, or anything the evidence does not cover.
- Put a blank line between sections.
- Do NOT use bold, italics, tables, numbered lists or any markdown other
  than "## " headings and "- " bullets.
- Use plain, clear language a clinician can scan quickly. Keep it concise.
"""

reasoner_agent = Agent(
    name="EvidenceReasoner",
    instructions=INSTRUCTIONS,
)


def format_evidence(chunks: list[dict]) -> str:
    lines = []
    for c in chunks:
        ref = (c.get("pmid") and f"PMID:{c['pmid']}") or (c.get("doi") and f"DOI:{c['doi']}") or c["chunk_id"]
        lines.append(f"[{ref}] ({c.get('study_type')}, {c.get('publication_date')}) {c.get('title')}\n{c['content']}")
    return "\n\n".join(lines)


async def reason_over_evidence(question: str, chunks: list[dict]) -> str:
    prompt = f"Question: {question}\n\nEvidence:\n{format_evidence(chunks)}"
    result = await Runner.run(reasoner_agent.clone(model=get_model()), prompt)
    return result.final_output
