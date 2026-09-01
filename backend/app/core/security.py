"""
core/security.py
================
JWT token utilities and authentication/authorisation dependencies for the
Rural Care Navigator backend.

Foundation only — OTP generation and full auth flow implemented in Phase 3.

Architecture:
  Routes use Depends(get_current_user) for any protected endpoint.
  Roles are checked via require_roles(["patient", "admin"]).

Replace policy:
  If the JWT provider changes, only this file needs updating.
  Service layer never calls jwt.encode/decode directly.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import jwt
from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.core.config import settings
from backend.app.core.exceptions import AuthenticationError, AuthorizationError

# ──────────────────────────────────────────────────────────────────────────────
# Token schemas
# ──────────────────────────────────────────────────────────────────────────────

class TokenData:
    """Parsed data extracted from a validated JWT payload."""

    def __init__(self, user_id: str, role: str, mobile: Optional[str] = None):
        self.user_id = user_id
        self.role = role
        self.mobile = mobile

    def __repr__(self) -> str:
        return f"<TokenData user_id={self.user_id} role={self.role}>"


# ──────────────────────────────────────────────────────────────────────────────
# Token generation
# ──────────────────────────────────────────────────────────────────────────────

def create_access_token(
    subject: str,
    role: str,
    extra_claims: Optional[Dict[str, Any]] = None,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Generate a signed JWT access token.

    Args:
        subject:      Unique user identifier (UUID or mobile number as str).
        role:         User role string ("patient", "asha", "doctor", "admin").
        extra_claims: Additional claims to embed in the token payload.
        expires_delta: Custom TTL. Defaults to ACCESS_TOKEN_EXPIRE_MINUTES.

    Returns:
        Encoded JWT string.
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        if expires_delta is not None
        else timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    payload: Dict[str, Any] = {
        "sub": subject,        # Subject (user id)
        "role": role,          # User role for RBAC
        "exp": expire,         # Expiry timestamp
        "iat": datetime.now(timezone.utc),  # Issued at
    }

    if extra_claims:
        payload.update(extra_claims)

    encoded = jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded


# ──────────────────────────────────────────────────────────────────────────────
# Token decoding and validation
# ──────────────────────────────────────────────────────────────────────────────

def decode_access_token(token: str) -> TokenData:
    """
    Decode and validate a JWT access token.

    Args:
        token: Raw JWT string from Authorization header.

    Returns:
        TokenData with validated claims.

    Raises:
        AuthenticationError if token is invalid, expired, or missing claims.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
    except jwt.ExpiredSignatureError:
        raise AuthenticationError("Access token has expired")
    except jwt.InvalidTokenError as exc:
        raise AuthenticationError(f"Invalid access token: {exc}")

    user_id: Optional[str] = payload.get("sub")
    role: Optional[str] = payload.get("role")

    if not user_id or not role:
        raise AuthenticationError("Token payload is missing required claims")

    return TokenData(
        user_id=user_id,
        role=role,
        mobile=payload.get("mobile"),
    )


# ──────────────────────────────────────────────────────────────────────────────
# FastAPI dependencies
# ──────────────────────────────────────────────────────────────────────────────

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> TokenData:
    """
    FastAPI dependency that validates the Bearer token from the
    Authorization header and returns the decoded TokenData.

    Usage in routes:
        @router.get("/protected")
        async def protected(user: TokenData = Depends(get_current_user)):
            ...

    Raises:
        AuthenticationError (401) if no token or invalid token.
    """
    if not credentials or not credentials.credentials:
        raise AuthenticationError("Authorization header is required")

    return decode_access_token(credentials.credentials)


def require_roles(allowed_roles: List[str]):
    """
    FastAPI dependency factory for role-based access control.

    Usage in routes:
        @router.get("/admin-only", dependencies=[Depends(require_roles(["admin"]))])
        async def admin_endpoint():
            ...

    Args:
        allowed_roles: List of role strings that are permitted.

    Returns:
        A FastAPI dependency that validates the current user's role.
    """
    async def _role_checker(
        current_user: TokenData = Depends(get_current_user),
    ) -> TokenData:
        if current_user.role not in allowed_roles:
            raise AuthorizationError(
                f"Role '{current_user.role}' is not allowed. "
                f"Required: {allowed_roles}"
            )
        return current_user

    return _role_checker
