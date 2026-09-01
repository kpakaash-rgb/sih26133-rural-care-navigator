"""
api/v1/routes/referrals.py
==========================
Patient Referral management routes.

Endpoints:
  POST /api/v1/referrals              — Create a referral request
  GET  /api/v1/referrals              — List authenticated patient's referrals
  GET  /api/v1/referrals/{id}         — Get referral details
  POST /api/v1/referrals/{id}/cancel  — Cancel a pending referral
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.v1.routes.auth import get_current_patient
from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.schemas.referral import (
    ReferralCreate,
    ReferralResponse,
)
from backend.app.services.referral_service import ReferralService

router = APIRouter(prefix="/referrals", tags=["Referrals"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_referral_service(db: Session = Depends(get_db)) -> ReferralService:
    """Dependency provider for ReferralService."""
    referral_repo = ReferralRepository(db)
    facility_repo = FacilityRepository(db)
    patient_repo = PatientRepository(db)
    appointment_repo = AppointmentRepository(db)
    health_journey_repo = HealthJourneyRepository(db)
    return ReferralService(
        referral_repo=referral_repo,
        facility_repo=facility_repo,
        patient_repo=patient_repo,
        appointment_repo=appointment_repo,
        health_journey_repo=health_journey_repo,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", summary="Create a referral")
async def create_referral(
    payload: ReferralCreate,
    patient: Patient = Depends(get_current_patient),
    referral_service: ReferralService = Depends(get_referral_service),
):
    """
    Create a patient referral to a specialized healthcare centre.

    Patient identity is strictly derived from the authenticated token.
    """
    referral = referral_service.create_referral(
        patient_id=patient.id,
        to_facility_id=payload.to_facility_id,
        reason=payload.reason,
        priority=payload.priority or "ROUTINE",
        appointment_id=payload.appointment_id,
        from_facility_id=payload.from_facility_id,
    )
    return success_response(
        data=referral,
        message="Referral created successfully",
    )


@router.get("", summary="List authenticated patient's referrals")
async def get_patient_referrals(
    patient: Patient = Depends(get_current_patient),
    referral_service: ReferralService = Depends(get_referral_service),
):
    """
    Retrieve all referrals belonging to the authenticated patient.

    Cross-patient referral access is prohibited.
    """
    referrals = referral_service.get_patient_referrals(patient_id=patient.id)
    return success_response(
        data=referrals,
        message="Patient referrals retrieved successfully",
    )


@router.get("/{referral_id}", summary="Get referral details")
async def get_referral(
    referral_id: int,
    patient: Patient = Depends(get_current_patient),
    referral_service: ReferralService = Depends(get_referral_service),
):
    """
    Retrieve details for a specific referral.

    Enforces ownership; returns 404 if the referral belongs to another patient.
    """
    referral = referral_service.get_referral_by_id(
        referral_id=referral_id,
        patient_id=patient.id,
    )
    return success_response(
        data=referral,
        message="Referral details retrieved successfully",
    )


@router.post("/{referral_id}/cancel", summary="Cancel a referral")
async def cancel_referral(
    referral_id: int,
    patient: Patient = Depends(get_current_patient),
    referral_service: ReferralService = Depends(get_referral_service),
):
    """
    Cancel a pending referral for the authenticated patient.
    """
    referral = referral_service.cancel_referral(
        referral_id=referral_id,
        patient_id=patient.id,
    )
    return success_response(
        data=referral,
        message="Referral cancelled successfully",
    )
