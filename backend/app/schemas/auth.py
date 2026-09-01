"""
schemas/auth.py
===============
Pydantic schemas for OTP request, verification, and authentication tokens.
"""

from __future__ import annotations

import re
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


def clean_mobile_number(v: str) -> str:
    """Normalize and validate a 10-digit Indian mobile number."""
    if not isinstance(v, str):
        raise ValueError("Mobile number must be a string")
    digits = re.sub(r"\D", "", v)
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) != 10:
        raise ValueError("Mobile number must be exactly 10 digits")
    return digits


class OTPRequest(BaseModel):
    """Payload for POST /api/v1/auth/request-otp."""

    mobile: str = Field(
        ...,
        description="10-digit mobile number",
        examples=["9876543210"],
    )

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return clean_mobile_number(v)


class OTPRequestResponse(BaseModel):
    """Response returned after initiating an OTP request."""

    mobile: str
    expires_in_minutes: int
    message: str
    demo_otp: Optional[str] = Field(
        None,
        description="Demo OTP for testing without real SMS provider (demo mode only)",
    )


class OTPVerifyRequest(BaseModel):
    """Payload for POST /api/v1/auth/verify-otp."""

    mobile: str = Field(
        ...,
        description="10-digit mobile number",
        examples=["9876543210"],
    )
    otp: str = Field(
        ...,
        description="6-digit OTP code",
        min_length=4,
        max_length=8,
        examples=["123456"],
    )

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        return clean_mobile_number(v)

    @field_validator("otp")
    @classmethod
    def validate_otp(cls, v: str) -> str:
        v = v.strip()
        if not v.isdigit():
            raise ValueError("OTP must contain only digits")
        return v


class AuthenticatedPatient(BaseModel):
    """Basic patient details returned upon authentication."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    mobile: str
    full_name: Optional[str] = None
    district: Optional[str] = None
    abha_number: Optional[str] = None
    role: str = "PATIENT"


class AuthTokenResponse(BaseModel):
    """Response returned upon successful OTP verification."""

    access_token: str
    token_type: str = "bearer"
    role: str = "PATIENT"
    patient: AuthenticatedPatient
