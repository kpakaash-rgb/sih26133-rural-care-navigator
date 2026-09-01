"""
database/connection.py
======================
SQLAlchemy engine, session factory, and FastAPI database dependency for the
Rural Care Navigator backend.

PostgreSQL database configuration via DATABASE_URL.

Replace policy:
  To change database configurations or use a different PostgreSQL driver:
    1. Update DATABASE_URL in .env:
         DATABASE_URL=postgresql+psycopg2://user:pass@host:5432/rural_care_db
    2. No other code changes required.

  The get_db dependency and session lifecycle remain identical.
"""

from __future__ import annotations

import logging
from typing import Generator

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from backend.app.core.config import settings
from backend.app.core.exceptions import DatabaseConnectionError

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────────────────────────────
# Engine creation
# ──────────────────────────────────────────────────────────────────────────────

def _build_engine():
    """
    Build the SQLAlchemy engine from settings.DATABASE_URL.
    Configured for PostgreSQL with connection pooling and pre-ping validation.
    """
    engine_kwargs = {
        "echo": settings.is_development,
    }

    if settings.DATABASE_URL.startswith("postgresql"):
        engine_kwargs.update({
            "pool_size": 10,
            "max_overflow": 20,
            "pool_pre_ping": True,
            "pool_recycle": 1800,
        })

    return create_engine(
        settings.DATABASE_URL,
        **engine_kwargs,
    )


engine = _build_engine()

# ──────────────────────────────────────────────────────────────────────────────
# Session factory
# ──────────────────────────────────────────────────────────────────────────────

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ──────────────────────────────────────────────────────────────────────────────
# FastAPI dependency
# ──────────────────────────────────────────────────────────────────────────────

def get_db() -> Generator[Session, None, None]:
    """
    FastAPI database session dependency.

    Yields a SQLAlchemy Session scoped to a single HTTP request.
    The session is automatically closed (and rolled back on error) when
    the request completes.

    Usage in routes:
        @router.get("/something")
        async def endpoint(db: Session = Depends(get_db)):
            results = db.execute(...)
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────────────────────
# Health check utility
# ──────────────────────────────────────────────────────────────────────────────

def check_db_connection() -> bool:
    """
    Verify that the database is reachable and responsive.

    Used by the /health and /api/v1/health endpoints.

    Returns:
        True if the database responds successfully.

    Raises:
        DatabaseConnectionError if the database cannot be reached.
    """
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as exc:
        raise DatabaseConnectionError(
            f"Database health check failed: {exc}"
        ) from exc


def create_all_tables() -> None:
    """
    Create all tables defined in registered ORM models.

    Called once at application startup (main.py lifespan).
    Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS.
    """
    from backend.app.database.base import Base  # noqa: F401
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        logger.warning(
            "Database table creation skipped or database unreachable: %s", exc
        )

