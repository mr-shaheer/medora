import json
from dataclasses import dataclass

from agents import Agent, Runner
from app.model import high_model
from .evidence_reasoner import format_evidence

INSTRUCTIONS = """You are a grounding and verification checker for medical
research answers.

You receive a QUESTION, a DRAFT ANSWER, and EVIDENCE.

Your job is to verify the draft against the evidence.

Rules:
- The EVIDENCE is the only source of truth.
- Do not answer the question independently.
- Keep claims that are directly supported by the evidence.
- Remove or correct unsupported claims.
- Never invent facts or citations.
- Never create new PMID or DOI citations.
- Keep existing valid citations.
- Keep the answer in the required format below. If the draft is not in this
  format, restructure it into it WITHOUT adding new claims.
- Evidence from clinical trial registries (NCT ids) describes study plans, not
  results. Never state a registry record as a finding. At most say a study
  "is registered to investigate…" and give its status if known.

REQUIRED FORMAT for the "answer" value (plain text only):
## Bottom Line
2-3 sentences directly answering the question.

## Key Findings
- one finding per bullet, citation at the end [PMID:xxxxx]

## Strength of Evidence
- 1-3 sentences on study design and consistency.
- State the publication year range of the studies and note if the most recent evidence is older than 3 years.

## Limitations & Gaps
- bullets on conflicts, missing data, caveats

Formatting rules: headings are lines starting with "## ", bullets start with
"- ", blank line between sections. No bold, italics, tables or numbered lists.
Remove any bullet whose claim is unsupported. If a section has nothing
supported, write one plain sentence saying so.

Return ONLY a JSON object with exactly these keys:
{
  "status": "SUFFICIENT" | "INSUFFICIENT",
  "answer": "<the corrected final answer in the format above, or 'Insufficient evidence to answer.' if INSUFFICIENT>",
  "missing": "<short note on what evidence would resolve it, empty string if SUFFICIENT>"
}
Use \\n for line breaks inside the "answer" string.
"""

verifier_agent = Agent(
    name="GroundingVerifier",
    instructions=INSTRUCTIONS,
    model=high_model,
)


@dataclass
class VerificationResult:
    status: str
    answer: str
    missing: str = ""


def _parse(text: str) -> VerificationResult:
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end == -1:
        return VerificationResult(status="INSUFFICIENT", answer=text, missing="")
    try:
        data = json.loads(text[start:end + 1], strict=False)
    except json.JSONDecodeError:
        return VerificationResult(status="INSUFFICIENT", answer=text, missing="")
    return VerificationResult(
        status=data.get("status", "INSUFFICIENT"),
        answer=data.get("answer", ""),
        missing=data.get("missing", ""),
    )


async def verify_answer(
    question: str,
    draft: str,
    chunks: list[dict],
) -> VerificationResult:

    prompt = f"""
Question:
{question}

Draft Answer:
{draft}

Evidence:
{format_evidence(chunks)}
"""

    result = await Runner.run(verifier_agent, prompt)

    return _parse(result.final_output)