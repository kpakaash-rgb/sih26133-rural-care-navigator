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
from backend.app.core.security import TokenData, get_current_doctor, get_current_user, get_current_worker
from backend.app.database.connection import get_db
from backend.app.models.doctor import Doctor
from backend.app.models.patient import Patient
from backend.app.models.worker import Worker
from backend.app.repositories.doctor_repository import DoctorRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.otp_repository import OTPRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.worker_repository import WorkerRepository
from backend.app.schemas.auth import (
    AuthenticatedPatient,
    OTPRequest,
    OTPVerifyRequest,
)
from backend.app.schemas.staff import (
    StaffAuthResponse,
    StaffLoginRequest,
    StaffProfileResponse,
)
from backend.app.schemas.worker import (
    WorkerAuthResponse,
    WorkerLoginRequest,
    WorkerProfileResponse,
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
    worker_repo = WorkerRepository(db)
    facility_repo = FacilityRepository(db)
    doctor_repo = DoctorRepository(db)
    return AuthService(
        otp_repo=otp_repo,
        patient_repo=patient_repo,
        worker_repo=worker_repo,
        facility_repo=facility_repo,
        doctor_repo=doctor_repo,
    )


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


# ──────────────────────────────────────────────────────────────────────────────
# Frontline Worker Auth Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/worker/login", summary="Frontline worker login")
async def worker_login(
    payload: WorkerLoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticate a Frontline Healthcare Worker (ASHA / ANM) and issue a role-scoped JWT.
    """
    result = auth_service.authenticate_worker(
        worker_id=payload.worker_id,
        mobile=payload.mobile,
        password=payload.password,
    )
    return success_response(
        data=result,
        message="Worker authentication successful",
    )


@router.get("/worker/me", summary="Get authenticated worker profile")
async def get_worker_me(
    current_worker: TokenData = Depends(get_current_worker),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Protected endpoint to retrieve the authenticated worker profile and facility context.
    """
    worker = auth_service.get_worker_by_identity(current_worker.user_id)
    facility_name = "Primary Health Centre"
    if auth_service.facility_repo:
        fac = auth_service.facility_repo.get_by_id(worker.facility_id)
        if fac:
            facility_name = fac.name

    data = {
        "id": worker.id,
        "worker_id": worker.worker_id,
        "name": worker.name,
        "mobile": worker.mobile,
        "role": worker.role,
        "facility_id": worker.facility_id,
        "facility_name": facility_name,
    }
    return success_response(
        data=data,
        message="Authenticated worker profile",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Unified Healthcare Staff Auth Routes (Doctor & Frontline Worker)
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/staff/login", summary="Healthcare staff login (Doctor / Worker)")
async def staff_login(
    payload: StaffLoginRequest,
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Authenticate a healthcare staff member (Doctor or Frontline Worker) and issue a role-scoped JWT.

    Does not allow public self-registration. Only pre-registered staff accounts are accepted.
    """
    result = auth_service.authenticate_staff(
        staff_id=payload.staff_id,
        password=payload.password,
    )
    return success_response(
        data=result,
        message="Staff authentication successful",
    )


@router.get("/doctor/me", summary="Get authenticated doctor profile")
async def get_doctor_me(
    current_doctor: TokenData = Depends(get_current_doctor),
    auth_service: AuthService = Depends(get_auth_service),
):
    """
    Protected endpoint to retrieve the authenticated doctor profile and facility context.
    Requires Bearer token with 'DOCTOR' role.
    """
    doctor = auth_service.get_doctor_by_identity(current_doctor.user_id)
    facility_name = "Primary Health Centre"
    if auth_service.facility_repo:
        fac = auth_service.facility_repo.get_by_id(doctor.facility_id)
        if fac:
            facility_name = fac.name

    data = {
        "id": doctor.id,
        "doctor_id": doctor.doctor_id,
        "name": doctor.name,
        "mobile": doctor.mobile,
        "role": doctor.role,
        "specialization": doctor.specialization,
        "facility_id": doctor.facility_id,
        "facility_name": facility_name,
    }
    return success_response(
        data=data,
        message="Authenticated doctor profile",
    )
