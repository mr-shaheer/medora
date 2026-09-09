"""LLM #3 - Grounding & Verification."""

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

Return ONLY a JSON object with exactly these keys:
{
  "status": "SUFFICIENT" | "INSUFFICIENT",
  "answer": "<the corrected final answer, or 'Insufficient evidence to answer.' if INSUFFICIENT>",
  "missing": "<short note on what evidence would resolve it, empty string if SUFFICIENT>"
}
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
        data = json.loads(text[start:end + 1])
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