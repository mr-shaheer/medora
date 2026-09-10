import re

CHUNK_SIZE = 800
CHUNK_OVERLAP = 100

RETRACTED_KEYWORDS = (
    "retracted",
    "retraction of",
    "withdrawn article",
)

STUDY_TYPES = {
    "meta-analysis": r"meta-analysis|systematic review",
    "rct": r"randomi[sz]ed controlled trial|randomi[sz]ed clinical trial",
    "cohort": r"cohort study",
    "case-control": r"case-control",
    "case-report": r"case report",
    "review": r"\breview\b",
}


def get_key(doc):
    return (
        doc.get("pmid")
        or doc.get("doi")
        or doc.get("study_id")
        or doc.get("title")
    )


def deduplicate(documents):
    seen = set()
    result = []

    for doc in documents:
        key = get_key(doc)

        if key and key not in seen:
            seen.add(key)
            result.append(doc)

    return result


def normalize(text):
    return "\n\n".join(
        line.strip()
        for line in text.splitlines()
        if line.strip()
    )


def classify_study_type(text):
    text = text.lower()

    for study_type, pattern in STUDY_TYPES.items():
        if re.search(pattern, text):
            return study_type

    return "unspecified"


def is_retracted(text):
    text = text.lower()
    return any(word in text for word in RETRACTED_KEYWORDS)


def chunk_text(text):
    paragraphs = text.split("\n\n")
    chunks = []
    current = ""

    for paragraph in paragraphs:
        if len(current) + len(paragraph) + 2 <= CHUNK_SIZE:
            current = f"{current}\n\n{paragraph}".strip()
            continue

        if current:
            chunks.append(current)

        if len(paragraph) <= CHUNK_SIZE:
            current = paragraph
        else:
            # Split a very long paragraph
            for start in range(
                0,
                len(paragraph),
                CHUNK_SIZE - CHUNK_OVERLAP,
            ):
                chunks.append(paragraph[start:start + CHUNK_SIZE])

            current = ""

    if current:
        chunks.append(current)

    return chunks


def build_evidence_chunks(documents):
    chunks = []

    for doc in deduplicate(documents):
        status = doc.get("status") or doc.get("overall_status") or doc.get("recruitment_status")
        body = normalize(doc.get("abstract") or doc.get("summary") or doc.get("text", ""))
        text = f"Status: {status}\n\n{body}" if status else body

        if not text:
            continue

        study_type = classify_study_type(text)
        retracted = is_retracted(text)
        doc_key = get_key(doc) or "doc"

        for i, chunk in enumerate(chunk_text(text)):
            chunks.append({
                "chunk_id": f"{doc_key}_{i}",
                "content": chunk,
                "source": doc.get("source", "unknown"),
                "pmid": doc.get("pmid"),
                "doi": doc.get("doi"),
                "study_id": doc.get("study_id"),
                "title": doc.get("title"),
                "publication_date": doc.get("publication_date"),
                "study_type": study_type,
                "is_retracted": retracted,
            })

    return chunks