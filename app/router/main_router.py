from .keyword_router import route_query as keyword_router
from .llm_router import llm_router
from .keyword_router import RouteDecision


async def route_query(question: str) -> RouteDecision:

    decision = keyword_router(question)

    if decision is not None and decision.confidence >= 0.80:
        return decision

    llm_result = await llm_router(question)

    return RouteDecision(
        sources=(llm_result.source,),
        scores=decision.scores if decision is not None else {},
        confidence=llm_result.confidence,
    )