import asyncio
import json
import os
import re
from contextlib import asynccontextmanager
from pathlib import Path
from urllib.parse import urlsplit

import openai
from fastapi import Depends, FastAPI, HTTPException      # and delete the other "from fastapi import FastAPI" line
from app.auth import router as auth_router, current_user, init_users_table
from app.api_keys import router as keys_router, init_api_keys_table, get_user_key
from app.model import use_key

from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from fastapi import Depends, FastAPI
from app.api_keys import router as keys_router, init_api_keys_table

from app.auth import router as auth_router, current_user, init_users_table
from app.pipeline import run_stream
from cli import run_maintenance, MAINTENANCE_INTERVAL_HOURS


async def _maintenance_loop() -> None:
    while True:
        try:
            await asyncio.to_thread(run_maintenance)
        except Exception as exc:  # keep the API up even if the cache DB is unreachable
            print(f"[maintenance] skipped: {exc}")
        await asyncio.sleep(MAINTENANCE_INTERVAL_HOURS * 3600)


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_users_table()        
    init_users_table()
    init_api_keys_table()              # NEW
    task = asyncio.create_task(_maintenance_loop())
    yield
    task.cancel()


app = FastAPI(title="Medora API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(keys_router)

class ResearchRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1000)


def _source(raw: str | None) -> str:
    s = (raw or "").lower()
    if "pubmed" in s:
        return "pubmed"
    if "trial" in s or "nct" in s:
        return "clinicaltrials"
    if "fda" in s:
        return "fda"
    return s or "other"



def _url(c: dict) -> str | None:
    """Return a trusted official record URL or publication DOI link."""
    raw_url = c.get("url") or c.get("source_url")

    if isinstance(raw_url, str) and raw_url.strip():
        try:
            parsed = urlsplit(raw_url.strip())
            host = (parsed.hostname or "").lower()

            trusted_host = (
                host in {
                    "pubmed.ncbi.nlm.nih.gov",
                    "clinicaltrials.gov",
                    "pmc.ncbi.nlm.nih.gov",
                    "doi.org",
                }
                or host == "fda.gov"
                or host.endswith(".fda.gov")
            )

            if (
                parsed.scheme == "https"
                and trusted_host
                and parsed.username is None
                and parsed.password is None
            ):
                return raw_url.strip()
        except ValueError:
            pass

    # Fallbacks when the retrieved record has no usable URL.
    pmid = str(c.get("pmid") or "").strip()
    if pmid.isdigit():
        return f"https://pubmed.ncbi.nlm.nih.gov/{pmid}/"

    study_id = str(c.get("study_id") or "").strip().upper()
    if re.fullmatch(r"NCT\d{8}", study_id):
        return f"https://clinicaltrials.gov/study/{study_id}"

    doi = str(c.get("doi") or "").strip()
    if re.fullmatch(r"10\.\d{4,9}/\S+", doi):
        return f"https://doi.org/{doi}"

    return None



def build_evidence(chunks: list[dict]) -> list[dict]:
    """Group ranked chunks into one card per source document.

    `refs` lists every identifier the reasoner may cite for the document
    (PMID:..., DOI:..., study id, chunk ids) so the UI can link citations to cards.
    """
    docs: dict[str, dict] = {}
    for c in chunks:
        key = c.get("pmid") or c.get("doi") or c.get("study_id") or c.get("title") or c["chunk_id"]
        d = docs.get(key)
        if d is None:
            refs = [r for r in (f"PMID:{c['pmid']}" if c.get("pmid") else None,
                                f"DOI:{c['doi']}" if c.get("doi") else None,
                                c.get("study_id")) if r]
            d = docs[key] = {
                "id": refs[0] if refs else c["chunk_id"], "refs": refs, "source": _source(c.get("source")),
                "type": c.get("study_type") or "unspecified", "title": c.get("title") or "Untitled",
                "date": c.get("publication_date") or "", "status": None, "url": _url(c), "passages": [],
            }
        d["refs"].append(c["chunk_id"])
        text = c["content"]
        m = re.match(r"Status:\s*(\S+)\s*\n+", text)
        if m:
            d["status"], text = m.group(1), text[m.end():]
        d["passages"].append(text.strip())
    for d in docs.values():
        d["excerpt"] = "\n\n".join(d.pop("passages"))[:1200]
    return list(docs.values())


def shape(event: dict) -> dict:
    if event["type"] != "result":
        return event
    evidence = build_evidence(event["chunks"])
    answer = event["answer"].replace("**", "")
    return {
        "type": "result",
        "route": event["route"],
        "counts": {**event["counts"], "selected": len(evidence)},
        "verification": {"status": event["status"], "missing": event["missing"]},
        "answer": [p.strip() for p in re.split(r"\n\s*\n", answer) if p.strip()],
        "evidence": evidence,
    }


@app.get("/api/health")
def health():
    return {"ok": True}


def friendly_error(exc: Exception) -> str:
    """Turn a crash into a message the user can act on."""
    text = str(exc).lower()
    if isinstance(exc, (openai.AuthenticationError, openai.PermissionDeniedError)) or "api key" in text:
        return "Google rejected your Gemini API key. Open the profile menu > API keys, delete it and add a valid one."
    if isinstance(exc, openai.RateLimitError) or "quota" in text:
        return "Your Gemini key hit its rate limit or quota. Wait a little, or add a different key."
    return "Medora couldn't complete this search. Please try again in a moment."


@app.post("/api/research")
async def research(req: ResearchRequest, user: dict = Depends(current_user)):
    # The server has no Gemini key of its own: every search runs on the user's own key.
    key = await asyncio.to_thread(get_user_key, user["id"])
    if not key:
        raise HTTPException(400, "Add your Gemini API key first: open the profile menu (top right) > API keys.")

    async def stream():
        use_key(key)  # every Gemini call made during this request now uses this user's key
        try:
            async for event in run_stream(req.question):
                yield json.dumps(shape(event)) + "\n"
        except Exception as exc:
            print(f"[research] failed: {exc!r}")
            yield json.dumps({"type": "error", "message": friendly_error(exc)}) + "\n"

    return StreamingResponse(stream(), media_type="application/x-ndjson",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


_dist = Path(__file__).parent / "frontend" / "dist"
if _dist.exists():
    app.mount("/", StaticFiles(directory=_dist, html=True), name="frontend")
