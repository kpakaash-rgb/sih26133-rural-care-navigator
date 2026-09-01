"""
core/response.py
================
Standardised JSON response envelope for the Rural Care Navigator API.

Contract defined in docs/api.md:
  {
    "success": true,
    "data": {},
    "message": "Operation successful",
    "timestamp": "2026-08-30T18:00:00Z"
  }

All API routes MUST return responses through the helpers defined here.
Never construct raw dicts or custom response shapes in route handlers.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import status
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiResponse(BaseModel):
    """Pydantic model representing the standard API response envelope."""

    success: bool
    data: Any = None
    message: str = ""
    timestamp: str = ""

    model_config = {"json_schema_extra": {"example": {
        "success": True,
        "data": {},
        "message": "Operation successful",
        "timestamp": "2026-08-30T18:00:00Z",
    }}}


def _iso_now() -> str:
    """Return current UTC time as ISO-8601 string."""
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def success_response(
    data: Any = None,
    message: str = "Operation successful",
    status_code: int = status.HTTP_200_OK,
) -> JSONResponse:
    """
    Build a successful JSON response matching the docs/api.md envelope.

    Args:
        data:        The payload to return (dict, list, None).
        message:     Human-readable success message.
        status_code: HTTP status code (default 200).

    Returns:
        FastAPI JSONResponse with envelope.
    """
    body = ApiResponse(
        success=True,
        data=data,
        message=message,
        timestamp=_iso_now(),
    )
    return JSONResponse(content=body.model_dump(mode="json"), status_code=status_code)


def error_response(
    message: str,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    data: Any = None,
) -> JSONResponse:
    """
    Build a failed JSON response matching the docs/api.md envelope.

    Args:
        message:     Human-readable error description.
        status_code: HTTP status code.
        data:        Optional extra error detail payload.

    Returns:
        FastAPI JSONResponse with envelope.
    """
    body = ApiResponse(
        success=False,
        data=data,
        message=message,
        timestamp=_iso_now(),
    )
    return JSONResponse(content=body.model_dump(mode="json"), status_code=status_code)

