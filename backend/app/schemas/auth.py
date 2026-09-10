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
    age: Optional[int] = None
    gender: Optional[str] = None
    village: Optional[str] = None
    district: Optional[str] = None
    preferred_language: Optional[str] = None
    emergency_contact: Optional[str] = None
    abha_number: Optional[str] = None
    role: str = "PATIENT"


class AuthTokenResponse(BaseModel):
    """Response returned upon successful OTP verification or self-registration."""

    is_registered: bool = True
    access_token: Optional[str] = None
    token_type: str = "bearer"
    role: str = "PATIENT"
    patient: Optional[AuthenticatedPatient] = None
    registration_token: Optional[str] = None
    mobile: Optional[str] = None
    message: Optional[str] = None


class PatientSelfRegisterRequest(BaseModel):
    """Payload for POST /api/v1/auth/register-patient (self-registration after OTP verification)."""

    full_name: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Patient full name (supports English, Hindi, and Marathi)",
        examples=["Ramesh Kumar", "रमेश कुमार"],
    )
    mobile: str = Field(
        ...,
        description="10-digit OTP-verified Indian mobile number",
        examples=["9876543210"],
    )
    age: int = Field(
        ...,
        ge=1,
        le=120,
        description="Patient age in years (1-120)",
        examples=[35],
    )
    gender: str = Field(
        ...,
        description="Patient gender (MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY)",
        examples=["MALE"],
    )
    village: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Village or residential locality",
        examples=["Malshiras"],
    )
    district: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="District name",
        examples=["Solapur"],
    )
    preferred_language: Optional[str] = Field(
        "en",
        description="Preferred language code ('en', 'hi', or 'mr')",
        examples=["en"],
    )
    emergency_contact: Optional[str] = Field(
        None,
        description="Optional 10-digit Indian emergency contact mobile number",
        examples=["9876543211"],
    )
    abha_number: Optional[str] = Field(
        None,
        max_length=25,
        description="Optional 14-digit Ayushman Bharat Health Account ID",
        examples=["14-1234-5678-9012"],
    )
    consent: bool = Field(
        True,
        description="Explicit user consent for healthcare data processing",
    )
    registration_token: Optional[str] = Field(
        None,
        description="Signed OTP verification registration token (can also be passed in Authorization header)",
    )

    @field_validator("mobile")
    @classmethod
    def validate_mobile(cls, v: str) -> str:
        clean = clean_mobile_number(v)
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Mobile number must be a valid 10-digit Indian mobile starting with 6-9")
        return clean

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        trimmed = v.strip()
        if len(trimmed) < 2:
            raise ValueError("Full name must be at least 2 characters")
        # Allow English letters, Devanagari script (Hindi/Marathi \u0900-\u097F), spaces, dots, hyphens, apostrophes
        if not re.match(r"^[\w\s\.\'\-\u0900-\u097F]+$", trimmed, re.UNICODE):
            raise ValueError("Full name contains invalid characters")
        return trimmed

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str) -> str:
        norm = v.strip().upper().replace(" ", "_")
        if norm not in ("MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"):
            raise ValueError("Gender must be MALE, FEMALE, OTHER, or PREFER_NOT_TO_SAY")
        return norm

    @field_validator("village", "district")
    @classmethod
    def validate_locations(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("Location fields cannot be blank")
        return trimmed

    @field_validator("preferred_language")
    @classmethod
    def validate_language(cls, v: Optional[str]) -> str:
        if not v:
            return "en"
        norm = v.strip().lower()
        if norm in ("en", "english"):
            return "en"
        elif norm in ("hi", "hindi"):
            return "hi"
        elif norm in ("mr", "marathi"):
            return "mr"
        return norm

    @field_validator("emergency_contact")
    @classmethod
    def validate_emergency_contact(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        trimmed = v.strip()
        if not trimmed:
            return None
        clean = clean_mobile_number(trimmed)
        if not re.match(r"^[6-9]\d{9}$", clean):
            raise ValueError("Emergency contact number must be a valid 10-digit Indian mobile starting with 6-9")
        return clean
