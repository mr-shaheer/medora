from agents import Agent, Runner
from app.model import high_model
from .evidence_reasoner import format_evidence

INSTRUCTIONS = INSTRUCTIONS = """You are a grounding and verification checker for medical
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
- If the evidence is insufficient, say:
  "Insufficient evidence to answer."

Return ONLY the corrected final answer.
"""

verifier_agent = Agent(
    name = "GroundingVerifier",
    instructions = INSTRUCTIONS,
    model = high_model,
)


async def verify_answer(
    question: str,
    draft: str,
    chunks: list[dict],
) -> str:

    prompt = f"""
Question:
{question}

Draft Answer:
{draft}

Evidence:
{format_evidence(chunks)}
"""

    result = await Runner.run(verifier_agent, prompt)

    return result.final_output