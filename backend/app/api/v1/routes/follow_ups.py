"""
api/v1/routes/follow_ups.py
===========================
Patient Follow-Up scheduling, completion, and cancellation routes.

Endpoints:
  POST /api/v1/follow-ups              — Create a follow-up consultation
  GET  /api/v1/follow-ups              — List authenticated patient's follow-ups
  POST /api/v1/follow-ups/{id}/complete — Mark follow-up as COMPLETED
  POST /api/v1/follow-ups/{id}/cancel  — Mark follow-up as CANCELLED
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AuthenticationError, AuthorizationError, ValidationAppError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_user
from backend.app.database.connection import get_db
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpResponse,
)
from backend.app.services.follow_up_service import FollowUpService

router = APIRouter(prefix="/follow-ups", tags=["Follow-Ups"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_follow_up_service(db: Session = Depends(get_db)) -> FollowUpService:
    """Dependency provider for FollowUpService."""
    follow_up_repo = FollowUpRepository(db)
    patient_repo = PatientRepository(db)
    appointment_repo = AppointmentRepository(db)
    referral_repo = ReferralRepository(db)
    health_journey_repo = HealthJourneyRepository(db)
    return FollowUpService(
        follow_up_repo=follow_up_repo,
        patient_repo=patient_repo,
        appointment_repo=appointment_repo,
        referral_repo=referral_repo,
        health_journey_repo=health_journey_repo,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", summary="Create a follow-up checkup")
async def create_follow_up(
    payload: FollowUpCreate,
    current_user: TokenData = Depends(get_current_user),
    follow_up_service: FollowUpService = Depends(get_follow_up_service),
):
    """
    Schedule a follow-up consultation linked to a previous appointment or referral.
    """
    if current_user.role == "PATIENT":
        try:
            target_patient_id = int(current_user.user_id)
        except (ValueError, TypeError):
            raise AuthenticationError("Invalid patient user in token")
    elif current_user.role in ("WORKER", "DOCTOR"):
        if not payload.patient_id:
            raise ValidationAppError(f"patient_id is required when creating a {current_user.role.lower()} follow-up")
        target_patient_id = payload.patient_id
    else:
        raise AuthorizationError("Unauthorized to create follow-ups")

    follow_up = follow_up_service.create_follow_up(
        patient_id=target_patient_id,
        follow_up_date=payload.follow_up_date,
        notes=payload.notes,
        appointment_id=payload.appointment_id,
        referral_id=payload.referral_id,
    )
    return success_response(
        data=follow_up,
        message="Follow-up scheduled successfully",
    )


@router.get("", summary="List follow-ups")
async def get_patient_follow_ups(
    current_user: TokenData = Depends(get_current_user),
    follow_up_service: FollowUpService = Depends(get_follow_up_service),
):
    """
    Retrieve follow-up consultations.
    - If PATIENT: returns authenticated patient's own follow-ups.
    - If WORKER/DOCTOR: returns facility-scoped follow-ups.
    """
    if current_user.role == "PATIENT":
        try:
            patient_id = int(current_user.user_id)
        except (ValueError, TypeError):
            raise AuthenticationError("Invalid patient user in token")
        follow_ups = follow_up_service.get_patient_follow_ups(patient_id=patient_id)
    elif current_user.role in ("WORKER", "DOCTOR"):
        facility_id = current_user.facility_id
        if not facility_id:
            follow_ups = []
        else:
            follow_ups = follow_up_service.get_facility_follow_ups(facility_id=facility_id)
    else:
        raise AuthorizationError("Unauthorized to view follow-ups")

    return success_response(
        data=follow_ups,
        message="Follow-ups retrieved successfully",
    )


@router.post("/{follow_up_id}/complete", summary="Mark follow-up as completed")
async def complete_follow_up(
    follow_up_id: int,
    current_user: TokenData = Depends(get_current_user),
    follow_up_service: FollowUpService = Depends(get_follow_up_service),
):
    """
    Mark a follow-up as COMPLETED.
    """
    if current_user.role == "PATIENT":
        try:
            patient_id = int(current_user.user_id)
        except (ValueError, TypeError):
            raise AuthenticationError("Invalid patient user in token")
        follow_up = follow_up_service.complete_follow_up(
            follow_up_id=follow_up_id,
            patient_id=patient_id,
        )
    elif current_user.role in ("WORKER", "DOCTOR"):
        facility_id = current_user.facility_id
        follow_up = follow_up_service.complete_follow_up(
            follow_up_id=follow_up_id,
            facility_id=facility_id,
        )
    else:
        raise AuthorizationError("Unauthorized to complete follow-ups")

    return success_response(
        data=follow_up,
        message="Follow-up completed successfully",
    )


@router.post("/{follow_up_id}/cancel", summary="Cancel a follow-up")
async def cancel_follow_up(
    follow_up_id: int,
    current_user: TokenData = Depends(get_current_user),
    follow_up_service: FollowUpService = Depends(get_follow_up_service),
):
    """
    Cancel a pending follow-up.
    """
    if current_user.role == "PATIENT":
        try:
            patient_id = int(current_user.user_id)
        except (ValueError, TypeError):
            raise AuthenticationError("Invalid patient user in token")
        follow_up = follow_up_service.cancel_follow_up(
            follow_up_id=follow_up_id,
            patient_id=patient_id,
        )
    elif current_user.role in ("WORKER", "DOCTOR"):
        facility_id = current_user.facility_id
        follow_up = follow_up_service.cancel_follow_up(
            follow_up_id=follow_up_id,
            facility_id=facility_id,
        )
    else:
        raise AuthorizationError("Unauthorized to cancel follow-ups")

    return success_response(
        data=follow_up,
        message="Follow-up cancelled successfully",
    )
