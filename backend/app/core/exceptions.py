"""
core/exceptions.py
==================
Centralised exception hierarchy and FastAPI exception handlers for the
Rural Care Navigator backend.

Architecture:
  All domain errors subclass AppException.
  Exception handlers convert these into standard docs/api.md envelopes.
  Route handlers should raise these exceptions — never JSONResponse directly.

Usage in routes:
    raise NotFoundError("Patient not found")
    raise AuthenticationError()
    raise AuthorizationError("Admin role required")
"""

from __future__ import annotations

from typing import Any, Optional

from fastapi import Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


# ──────────────────────────────────────────────────────────────────────────────
# Exception Hierarchy
# ──────────────────────────────────────────────────────────────────────────────

class AppException(Exception):
    """
    Base exception for all Rural Care Navigator application errors.
    All custom exceptions MUST inherit from this class.
    """
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message: str = "An unexpected error occurred"

    def __init__(self, message: Optional[str] = None, data: Any = None):
        self.message = message or self.default_message
        self.data = data
        super().__init__(self.message)


class NotFoundError(AppException):
    """Raised when a requested resource does not exist in the database."""
    status_code = status.HTTP_404_NOT_FOUND
    default_message = "Resource not found"


class ValidationAppError(AppException):
    """
    Raised for business-level validation failures (distinct from Pydantic
    schema validation — those are handled by RequestValidationError).
    """
    status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
    default_message = "Validation error"


class AuthenticationError(AppException):
    """Raised when a request lacks valid authentication credentials."""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_message = "Authentication required"


class AuthorizationError(AppException):
    """Raised when an authenticated user lacks permission for an action."""
    status_code = status.HTTP_403_FORBIDDEN
    default_message = "You do not have permission to perform this action"


class ConflictError(AppException):
    """Raised when an operation conflicts with existing state (e.g. duplicate)."""
    status_code = status.HTTP_409_CONFLICT
    default_message = "Resource conflict"


class DatabaseConnectionError(AppException):
    """Raised when the database cannot be reached or is unhealthy."""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_message = "Database unavailable"


class InternalAppError(AppException):
    """Raised for internal application failures such as SMS delivery failures."""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_message = "Internal processing error"


class ExternalServiceError(AppException):
    """Raised when an external third-party provider/service fails."""
    status_code = status.HTTP_502_BAD_GATEWAY
    default_message = "External service error"



# ──────────────────────────────────────────────────────────────────────────────
# Response envelope builder (local copy to avoid circular import with response.py)
# ──────────────────────────────────────────────────────────────────────────────

def _envelope(success: bool, message: str, data: Any = None) -> dict:
    from datetime import datetime, timezone
    return {
        "success": success,
        "data": data,
        "message": message,
        "timestamp": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
    }


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI Exception Handlers
# ──────────────────────────────────────────────────────────────────────────────

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Converts AppException subclasses into standard API error envelopes."""
    return JSONResponse(
        content=_envelope(success=False, message=exc.message, data=exc.data),
        status_code=exc.status_code,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """
    Converts Starlette/FastAPI HTTP exceptions (e.g. 404 route not found,
    405 method not allowed) into the standard API error envelope.
    """
    return JSONResponse(
        content=_envelope(success=False, message=exc.detail),
        status_code=exc.status_code,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """
    Converts Pydantic request validation errors into structured error envelopes.
    Returns all field-level validation failures in the `data` key.
    """
    errors = []
    for err in exc.errors():
        errors.append({
            "field": " → ".join(str(loc) for loc in err.get("loc", [])),
            "message": err.get("msg", ""),
            "type": err.get("type", ""),
        })
    return JSONResponse(
        content=_envelope(
            success=False,
            message="Request validation failed",
            data={"errors": errors},
        ),
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """
    Catches any unhandled Python exceptions and returns a safe 500 response.
    Never expose raw exception details in production.
    """
    from backend.app.core.config import settings
    detail = str(exc) if settings.is_development else None
    return JSONResponse(
        content=_envelope(
            success=False,
            message="Internal server error",
            data={"detail": detail} if detail else None,
        ),
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
