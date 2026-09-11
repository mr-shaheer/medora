from typing import Literal
from pydantic import BaseModel
from agents import AsyncOpenAI

from app.model import external_client
from .metadata import MCPS

ROUTER_MODEL = "gemini-2.5-flash"

class RouterResult(BaseModel):
    source: Literal["pubmed", "clinicaltrials", "fda"]
    confidence: float


async def llm_router(question: str) -> RouterResult:
    completion = await external_client.chat.completions.parse(
        model=ROUTER_MODEL,
        messages=[
            {
                "role": "system",
                "content": f"""
You are an MCP router for a medical research system.

Available MCP servers:
{MCPS}

Choose the single best MCP server for the user's question.

Rules:
- pubmed = biomedical research papers and literature
- clinicaltrials = clinical trials and study information
- fda = FDA drugs, labels, recalls, approvals and safety information
- Return only the structured result.
- Confidence must be between 0 and 1.
"""
            },
            {
                "role": "user",
                "content": question,
            },
        ],
        response_format=RouterResult,
    )

    return completion.choices[0].message.parsed