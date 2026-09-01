"""
api/v1/routes/auth.py
=====================
Authentication endpoints for Rural Care Navigator patients.

Endpoints:
  POST /api/v1/auth/request-otp — Request a 6-digit OTP for a mobile number
  POST /api/v1/auth/verify-otp  — Verify OTP and receive JWT access token
  GET  /api/v1/auth/me          — Protected route returning current patient profile
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AuthenticationError, AuthorizationError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_user
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.otp_repository import OTPRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.schemas.auth import (
    AuthenticatedPatient,
    OTPRequest,
    OTPVerifyRequest,
)
from backend.app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Dependency provider for AuthService."""
    otp_repo = OTPRepository(db)
    patient_repo = PatientRepository(db)
    return AuthService(otp_repo=otp_repo, patient_repo=patient_repo)


async def get_current_patient(
    current_user: TokenData = Depends(get_current_user),
    auth_service: AuthService = Depends(get_auth_service),
) -> Patient:
    """
    Dependency that enforces valid authentication with the 'PATIENT' role
    and resolves the authenticated Patient record.
    """
    if current_user.role != "PATIENT":
        raise AuthorizationError("Access forbidden: Patient role required")

    try:
        patient_id = int(current_user.user_id)
    except (ValueError, TypeError):
        raise AuthenticationError("Invalid user identity in token")

    return auth_service.get_patient_by_id(patient_id)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/request-otp", summary="Request OTP for mobile authentication")
async def request_otp(
    payload: OTPRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Generate and send a 6-digit OTP to the patient's mobile number.

    In demo mode, the OTP is returned in the response object for testing.
    """
    result = auth_service.request_otp(mobile=payload.mobile)
    return success_response(
        data=result,
        message="OTP sent successfully",
    )


@router.post("/verify-otp", summary="Verify OTP and issue JWT access token")
async def verify_otp(
    payload: OTPVerifyRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Verify the submitted OTP for the mobile number.

    Upon successful verification, authenticates the patient and issues a
    signed JWT access token.
    """
    result = auth_service.verify_otp(mobile=payload.mobile, otp=payload.otp)
    return success_response(
        data=result,
        message="Authentication successful",
    )


@router.get("/me", summary="Get authenticated patient profile")
async def get_me(
    patient: Patient = Depends(get_current_patient),
):
    """
    Protected endpoint to verify the authenticated patient's identity.

    Requires Bearer token with 'PATIENT' role.
    """
    patient_data = AuthenticatedPatient.model_validate(patient).model_dump()
    return success_response(
        data=patient_data,
        message="Authenticated patient profile",
    )
