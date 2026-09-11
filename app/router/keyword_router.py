import re
from dataclasses import dataclass


@dataclass(frozen=True)
class RouteDecision:
    sources: tuple[str, ...]
    scores: dict[str, int]
    confidence: float


RULES = {
    "pubmed": {
        "strong": [
            "efficacy",
            "effectiveness",
            "systematic review",
            "meta-analysis",
            "meta analysis",
            "randomized",
            "randomised",
            "cohort",
            "case-control",
            "case control",
            "clinical evidence",
            "research evidence",
            "literature",
            "publication",
            "biomarker",
        ],
        "weak": [
            "treatment",
            "outcome",
            "association",
            "risk",
            "study",
            "studies",
            "paper",
            "safety",
        ],
    },

    "clinicaltrials": {
        "strong": [
            "clinical trial",
            "clinical trials",
            "recruiting",
            "recruitment",
            "enrolling",
            "enrollment",
            "enrolment",
            "trial status",
            "nct",
            "participants",
            "intervention",
            "study protocol",
            "ongoing trial",
            "upcoming trial",
        ],
        "weak": [
            "trial",
        ],
    },

    "openfda": {
        "strong": [
            "fda",
            "approved",
            "approval",
            "adverse event",
            "adverse events",
            "drug label",
            "drug labeling",
            "prescribing information",
            "recall",
            "regulatory",
            "contraindication",
            "manufacturer",
            "warning",
            "warnings",
        ],
        "weak": [
            "side effect",
            "side effects",
            "drug",
            "medication",
        ],
    },
}


def _matches(text: str, phrase: str) -> bool:
    if " " in phrase or "-" in phrase:
        return phrase in text

    return re.search(rf"\b{re.escape(phrase)}\b", text) is not None


def route_query(query: str) -> RouteDecision:
    text = query.lower().strip()

    scores = {
        source: 0
        for source in RULES
    }

    for source, rules in RULES.items():

        for keyword in rules["strong"]:
            if _matches(text, keyword):
                scores[source] += 5

        for keyword in rules["weak"]:
            if _matches(text, keyword):
                scores[source] += 1

    ranked = sorted(
        scores.items(),
        key=lambda item: item[1],
        reverse=True,
    )

    best_source, best_score = ranked[0]
    second_score = ranked[1][1]

    # No clear source-specific signal.
    # PubMed is the general biomedical fallback.
    if best_score == 0:
        return None

    # Select a second source only when it has a strong signal.
    selected = [best_source]

    for source, score in ranked[1:]:
        if score >= 5 and best_score - score <= 5:
            selected.append(source)

    margin = best_score - second_score

    confidence = min(
        0.99,
        0.50 + (best_score * 0.05) + (margin * 0.05),
    )

    return RouteDecision(
        sources=tuple(selected),
        scores=scores,
        confidence=confidence,
    )