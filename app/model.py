import os
from contextvars import ContextVar
from functools import lru_cache

from agents import AsyncOpenAI, OpenAIChatCompletionsModel
from dotenv import load_dotenv

load_dotenv()

GEMINI_BASE_URL = os.getenv("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
GEMINI_CHAT_MODEL = "gemini-2.5-flash"

_current_key: ContextVar[str | None] = ContextVar("gemini_key", default=None)


class MissingKeyError(Exception):
    """Raised when something tries to call Gemini but no user key was set."""


def use_key(key: str | None) -> None:
    """Call once at the start of a request: all Gemini calls after it use this key."""
    _current_key.set(key)


@lru_cache(maxsize=64)
def _client_for(key: str) -> AsyncOpenAI:
    return AsyncOpenAI(api_key=key, base_url=GEMINI_BASE_URL)


def get_gemini_client() -> AsyncOpenAI:
    key = _current_key.get()
    if not key:
        raise MissingKeyError("No Gemini API key. Add yours under Profile > API keys.")
    return _client_for(key)


def get_model() -> OpenAIChatCompletionsModel:
    return OpenAIChatCompletionsModel(model=GEMINI_CHAT_MODEL, openai_client=get_gemini_client())


GEMINI_EMBEDDING_MODEL = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-001")
EMBEDDING_DIM = int(os.getenv("EMBEDDING_DIM", "1536"))

NEON_DATABASE_URL = os.getenv("NEON_DATABASE_URL", "postgresql://user:password@host/dbname?sslmode=require")