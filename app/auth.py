import os
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
import psycopg
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field

from app.model import NEON_DATABASE_URL
from psycopg_pool import ConnectionPool

load_dotenv()
JWT_SECRET = os.environ["JWT_SECRET"]
COOKIE_NAME = "medora_token"
TOKEN_DAYS = 7
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "false").lower() == "true"

router = APIRouter(prefix="/api/auth", tags=["auth"])


_pool = ConnectionPool(conninfo=NEON_DATABASE_URL, min_size=1, max_size=5, open=False)
_pool.open()

def _db():
    return _pool.connection()


def init_users_table() -> None:
    with _db() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id            SERIAL PRIMARY KEY,
                name          TEXT NOT NULL,
                email         TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
            )
        """)


# ---------- request bodies ----------
class SignupBody(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=64)


class LoginBody(BaseModel):
    email: EmailStr
    password: str = Field(max_length=64)


# ---------- helpers ----------
def hash_password(password: str) -> str:
    # bcrypt only reads the first 72 bytes, so we cut explicitly
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def check_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode()[:72], hashed.encode())


def make_token(user_id: int) -> str:
    expires = datetime.now(timezone.utc) + timedelta(days=TOKEN_DAYS)
    return jwt.encode({"sub": str(user_id), "exp": expires}, JWT_SECRET, algorithm="HS256")


def set_login_cookie(response: Response, user_id: int) -> None:
    response.set_cookie(
        COOKIE_NAME, make_token(user_id),
        httponly=True,    
        secure=COOKIE_SECURE, 
        samesite="lax", 
        max_age=TOKEN_DAYS * 24 * 3600,
        path="/",
    )


# ---------- the dependency that protects routes ----------
def current_user(request: Request) -> dict:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        raise HTTPException(401, "Not signed in.")
    try:
        user_id = int(jwt.decode(token, JWT_SECRET, algorithms=["HS256"])["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(401, "Session expired. Please sign in again.")
    with _db() as conn:
        row = conn.execute("SELECT id, name, email FROM users WHERE id = %s", (user_id,)).fetchone()
    if not row:
        raise HTTPException(401, "Account not found.")
    return {"id": row[0], "name": row[1], "email": row[2]}


# ---------- routes ----------
@router.post("/signup", status_code=201)
def signup(body: SignupBody, response: Response):
    email = body.email.lower()
    try:
        with _db() as conn:
            row = conn.execute(
                "INSERT INTO users (name, email, password_hash) VALUES (%s, %s, %s) RETURNING id",
                (body.name.strip(), email, hash_password(body.password)),
            ).fetchone()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(409, "An account with this email already exists.")
    set_login_cookie(response, row[0])
    return {"id": row[0], "name": body.name.strip(), "email": email}


@router.post("/login")
def login(body: LoginBody, response: Response):
    with _db() as conn:
        row = conn.execute(
            "SELECT id, name, email, password_hash FROM users WHERE email = %s",
            (body.email.lower(),),
        ).fetchone()
    # Same message for "no such email" and "wrong password" so attackers learn nothing
    if not row or not check_password(body.password, row[3]):
        raise HTTPException(401, "Incorrect email or password.")
    set_login_cookie(response, row[0])
    return {"id": row[0], "name": row[1], "email": row[2]}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(COOKIE_NAME, path="/")
    return {"ok": True}


@router.get("/me")
def me(user: dict = Depends(current_user)):
    return user