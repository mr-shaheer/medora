def rerank(candidates: list[dict], study_types_priority: list[str] | None = None, top_k: int = 10) -> list[dict]:
    priority = {t: i for i, t in enumerate(study_types_priority or [])}

    def score(chunk: dict) -> tuple:
        type_rank = priority.get(chunk["study_type"], len(priority) + 1)
        if "rrf_score" in chunk:
            relevance = -chunk["rrf_score"]
        else:
            relevance = chunk.get("distance", 0.0)
        return (type_rank, relevance)

    return sorted(candidates, key=score)[:top_k]