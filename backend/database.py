"""
Trilens Backend — Database Connection
=======================================
SQLAlchemy engine, session factory, and FastAPI dependency.

Usage:
    from backend.database import get_db, engine, Base
"""

from __future__ import annotations

import os
import time
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

# ── Database URL ──────────────────────────────────────────────────────────────

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./trilens.db",
)

# Render gives postgres:// but SQLAlchemy requires postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

print(f"[database] Connecting to: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else 'local'}")

# ── Engine & Session ──────────────────────────────────────────────────────────

engine_kwargs = {
    "pool_pre_ping": True,
    "echo": False,
}
if DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
else:
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20
    engine_kwargs["connect_args"] = {"connect_timeout": 10}

engine = create_engine(DATABASE_URL, **engine_kwargs)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db(retries: int = 3, retry_delay: float = 2.0) -> None:
    """Ensure database tables exist before the app starts.

    If PostgreSQL is temporarily unreachable, retry a few times before
    propagating the error.
    """
    for attempt in range(1, retries + 1):
        try:
            if DATABASE_URL.startswith("sqlite"):
                Base.metadata.create_all(bind=engine)
            else:
                with engine.begin() as conn:
                    Base.metadata.create_all(bind=conn)
            return
        except OperationalError as exc:
            print(f"[database] init_db attempt {attempt}/{retries} failed: {exc}")
            if attempt == retries:
                raise
            time.sleep(retry_delay)


# ── Declarative Base ──────────────────────────────────────────────────────────

class Base(DeclarativeBase):
    pass


# ── FastAPI Dependency ────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    Yield a SQLAlchemy session for each request, ensuring it's closed after use.
    Usage in routers:  db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
