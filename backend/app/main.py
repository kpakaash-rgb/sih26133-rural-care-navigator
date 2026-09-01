"""
app/main.py
===========
FastAPI application factory and entry point for the Rural Care Navigator backend.

Starting the server:
    cd backend
    uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

Architecture layers registered here:
  - CORS middleware       (configured from settings)
  - Exception handlers    (all errors → standard docs/api.md envelope)
  - API v1 router         (all /api/v1/... endpoints)
  - Root redirect         (/ → /docs in development)
  - Lifespan hook         (DB table creation on startup)
"""

from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from backend.app.api.v1.router import api_v1_router
from backend.app.core.config import settings
from backend.app.core.exceptions import (
    AppException,
    app_exception_handler,
    http_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)


# ──────────────────────────────────────────────────────────────────────────────
# Lifespan (startup / shutdown)
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.

    Runs once at startup before the first request is served:
      - Imports all ORM models (so SQLAlchemy is aware of them)
      - Creates all database tables (safe — uses CREATE IF NOT EXISTS)

    Runs once at shutdown after the last request completes:
      - Any cleanup code goes here (e.g. close connection pools)
    """
    # ── Startup ────────────────────────────────
    import backend.app.models  # noqa: F401 — registers models with Base.metadata
    from backend.app.database.connection import create_all_tables, SessionLocal
    create_all_tables()

    try:
        from backend.app.database.seed_data import seed_demo_data
        with SessionLocal() as db:
            seed_demo_data(db)
    except Exception:
        pass

    yield  # Application runs here

    # ── Shutdown ───────────────────────────────
    # Connection pool cleanup is handled automatically by SQLAlchemy.
    pass



# ──────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ──────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "Rural Care Navigator API — connecting patients in rural India to "
        "appropriate healthcare pathways via AI-assisted triage, ASHA workers, "
        "and government health schemes."
    ),
    version="1.0.0",
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
    openapi_url="/openapi.json" if not settings.is_production else None,
    lifespan=lifespan,
)

# ──────────────────────────────────────────────────────────────────────────────
# CORS Middleware
# ──────────────────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────────────────────────────
# Exception handlers
# ──────────────────────────────────────────────────────────────────────────────

app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)

# ──────────────────────────────────────────────────────────────────────────────
# API Routers
# ──────────────────────────────────────────────────────────────────────────────

app.include_router(api_v1_router)


# ──────────────────────────────────────────────────────────────────────────────
# Root endpoint
# ──────────────────────────────────────────────────────────────────────────────

@app.get("/", include_in_schema=False)
async def root():
    """
    Root redirect — returns a quick status message.
    In development, the Swagger UI is available at /docs.
    """
    from backend.app.core.response import success_response
    return success_response(
        data={
            "name": settings.PROJECT_NAME,
            "version": "1.0.0",
            "docs": "/docs" if not settings.is_production else "disabled",
            "health": "/api/v1/health",
        },
        message="Rural Care Navigator API is running",
    )
