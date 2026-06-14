"""
Database engine and session factory — supports SQLite (local dev) and PostgreSQL (production).

The active backend is determined by settings.DATABASE_BACKEND:
  - "sqlite"     → local file-based database (default, zero config)
  - "postgresql"  → production-grade PostgreSQL via pg8000 driver

Usage is transparent — all routers use `get_db()` without caring which engine is active.
"""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator

from app.config import settings

logger = logging.getLogger(__name__)


def _build_engine():
    """Create the appropriate SQLAlchemy engine based on configuration."""
    url = settings.DATABASE_URL
    backend = settings.DATABASE_BACKEND.lower()

    if backend == "sqlite" or url.startswith("sqlite"):
        logger.info("🗄️  Database backend: SQLite → %s", url)
        return create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=settings.DEBUG,
        )

    # ── PostgreSQL ──────────────────────────────────────────────
    # Normalize URL to use the pg8000 driver (pure Python — no C build step)
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+pg8000://", 1)
    elif url.startswith("postgresql://") and "+pg8000" not in url:
        url = url.replace("postgresql://", "postgresql+pg8000://", 1)

    # pg8000 doesn't support sslmode in the URL — strip it
    connect_args = {}
    if "sslmode=require" in url:
        url = url.replace("?sslmode=require", "").replace("&sslmode=require", "")
        import ssl
        ssl_context = ssl.create_default_context()
        connect_args["ssl_context"] = ssl_context

    logger.info("🐘 Database backend: PostgreSQL → %s", url.split("@")[-1] if "@" in url else url)
    return create_engine(
        url,
        echo=settings.DEBUG,
        pool_pre_ping=True,       # Auto-reconnect on stale connections
        pool_size=5,              # Connection pool for concurrent requests
        max_overflow=10,
        connect_args=connect_args,
    )


engine = _build_engine()

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency — yields a database session, auto-closes on finish."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
