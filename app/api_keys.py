import os

from cryptography.fernet import Fernet
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth import _db, current_user

load_dotenv()
fernet = Fernet(os.environ["KEY_ENCRYPTION_SECRET"])

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


def init_api_keys_table() -> None:
    with _db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS api_keys (
                id            SERIAL PRIMARY KEY,
                user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                label         TEXT NOT NULL,
                key_encrypted TEXT NOT NULL,
                last4         TEXT NOT NULL,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)


class KeyBody(BaseModel):
    label: str = Field(min_length=1, max_length=40)
    key: str = Field(min_length=8, max_length=300)


def _item(row) -> dict:
    return {"id": row[0], "label": row[1], "last4": row[2], "created_at": row[3].isoformat()}


@router.get("")
def list_keys(user: dict = Depends(current_user)):
    with _db() as conn:
        rows = conn.execute(
            "SELECT id, label, last4, created_at FROM api_keys WHERE user_id = %s ORDER BY id DESC",
            (user["id"],),
        ).fetchall()
    return [_item(r) for r in rows]


@router.post("", status_code=201)
def add_key(body: KeyBody, user: dict = Depends(current_user)):
    """Medora runs on one key per account: saving replaces whatever was stored."""
    key = body.key.strip()
    with _db() as conn:
        conn.execute("DELETE FROM api_keys WHERE user_id = %s", (user["id"],))
        row = conn.execute(
            "INSERT INTO api_keys (user_id, label, key_encrypted, last4) VALUES (%s, %s, %s, %s) "
            "RETURNING id, label, last4, created_at",
            (user["id"], body.label.strip(), fernet.encrypt(key.encode()).decode(), key[-4:]),
        ).fetchone()
    return _item(row)

@router.delete("/{key_id}")
def delete_key(key_id: int, user: dict = Depends(current_user)):
    with _db() as conn:
        deleted = conn.execute(
            "DELETE FROM api_keys WHERE id = %s AND user_id = %s", (key_id, user["id"])
        ).rowcount
    if not deleted:
        raise HTTPException(404, "Key not found.")
    return {"ok": True}


def get_user_key(user_id: int, label: str | None = None) -> str | None:
    """For your pipeline later: returns the user's decrypted key (newest, or by label)."""
    sql = "SELECT key_encrypted FROM api_keys WHERE user_id = %s"
    args = [user_id]
    if label:
        sql += " AND label = %s"
        args.append(label)
    with _db() as conn:
        row = conn.execute(sql + " ORDER BY id DESC LIMIT 1", args).fetchone()
    return fernet.decrypt(row[0].encode()).decode() if row else None