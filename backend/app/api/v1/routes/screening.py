"""
api/v1/routes/screening.py
==========================
Patient field screening routes for Frontline Healthcare Workers.

Endpoints:
  POST /api/v1/patients/{patient_id}/screening        — Record field vitals & symptoms (Worker only)
  GET  /api/v1/patients/{patient_id}/screening/latest — Retrieve patient's latest screening
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_user, get_current_worker
from backend.app.database.connection import get_db
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.screening_repository import ScreeningRepository
from backend.app.schemas.screening import ScreeningCreate, ScreeningResponse
from backend.app.services.screening_service import ScreeningService

router = APIRouter(prefix="/patients", tags=["Screening"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_screening_service(db: Session = Depends(get_db)) -> ScreeningService:
    screening_repo = ScreeningRepository(db)
    patient_repo = PatientRepository(db)
    journey_repo = HealthJourneyRepository(db)
    return ScreeningService(
        screening_repo=screening_repo,
        patient_repo=patient_repo,
        journey_repo=journey_repo,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/{patient_id}/screening", summary="Submit patient screening (Worker only)")
async def submit_screening(
    patient_id: int,
    payload: ScreeningCreate,
    current_worker: TokenData = Depends(get_current_worker),
    screening_service: ScreeningService = Depends(get_screening_service),
):
    """
    Record vitals and symptoms for a patient during field intake or home visit.

    Requires role='WORKER'.
    """
    screening = screening_service.create_screening(
        patient_id=patient_id,
        worker_id=current_worker.user_id,
        facility_id=current_worker.facility_id,
        temperature=payload.temperature,
        systolic_bp=payload.systolic_bp,
        diastolic_bp=payload.diastolic_bp,
        heart_rate=payload.heart_rate,
        spo2=payload.spo2,
        symptoms=payload.symptoms,
        notes=payload.notes,
        triage_level=payload.triage_level,
    )

    return success_response(
        data=ScreeningResponse.model_validate(screening).model_dump(),
        message="Patient screening recorded successfully",
    )


@router.get("/{patient_id}/screening/latest", summary="Get patient's latest screening")
async def get_latest_screening(
    patient_id: int,
    current_user: TokenData = Depends(get_current_user),
    screening_service: ScreeningService = Depends(get_screening_service),
):
    """
    Retrieve the most recent screening observations for a patient.
    """
    screening = screening_service.get_latest_screening(patient_id)
    if not screening:
        return success_response(
            data=None,
            message="No screening records found for this patient",
        )

    return success_response(
        data=ScreeningResponse.model_validate(screening).model_dump(),
        message="Latest screening retrieved successfully",
    )
