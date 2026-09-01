"""
api/v1/routes/health.py
=======================
Health check endpoints for the Rural Care Navigator backend.

Endpoints:
  GET /api/v1/health          — Application + database liveness probe
  GET /api/v1/health/ping     — Fast ping (no DB check) for load balancers

These endpoints are unauthenticated and should be accessible at all times.
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.core.config import settings
from backend.app.core.response import success_response

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Full health check")
async def health_check():
    """
    Verify that the application and database are operational.

    Returns application metadata and DB connectivity status.
    This is the primary endpoint for monitoring and container health probes.
    """
    from backend.app.database.connection import check_db_connection

    db_status = "unknown"
    try:
        check_db_connection()
        db_status = "healthy"
    except Exception as exc:
        db_status = f"unhealthy: {exc}"

    return success_response(
        data={
            "status": "healthy" if db_status == "healthy" else "degraded",
            "app": settings.PROJECT_NAME,
            "version": "1.0.0",
            "environment": settings.ENVIRONMENT,
            "database": db_status,
        },
        message="Health check complete",
    )


@router.get("/health/ping", summary="Fast ping")
async def ping():
    """
    Lightweight liveness check — no database access.

    Use this endpoint for high-frequency load-balancer health checks
    where database round-trips would add unnecessary latency.
    """
    return success_response(data={"pong": True}, message="pong")
