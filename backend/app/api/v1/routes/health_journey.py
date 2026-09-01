"""
api/v1/routes/health_journey.py
===============================
Patient Health Journey care timeline routes.

Endpoints:
  GET /api/v1/health-journey — Retrieve chronological care journey events
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.v1.routes.auth import get_current_patient
from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.services.health_journey_service import HealthJourneyService

router = APIRouter(prefix="/health-journey", tags=["Health Journey"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_health_journey_service(db: Session = Depends(get_db)) -> HealthJourneyService:
    """Dependency provider for HealthJourneyService."""
    health_journey_repo = HealthJourneyRepository(db)
    patient_repo = PatientRepository(db)
    return HealthJourneyService(
        health_journey_repo=health_journey_repo,
        patient_repo=patient_repo,
    )


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", summary="Get patient health journey timeline")
async def get_health_journey(
    event_type: Optional[str] = Query(
        None,
        description="Optional filter by event type (e.g. REGISTRATION, APPOINTMENT, REFERRAL, FOLLOW_UP, CARE_COMPLETED)",
    ),
    patient: Patient = Depends(get_current_patient),
    journey_service: HealthJourneyService = Depends(get_health_journey_service),
):
    """
    Retrieve the chronological care timeline for the authenticated patient.

    Patient identity is strictly derived from the validated JWT token.
    """
    events = journey_service.get_patient_timeline(
        patient_id=patient.id,
        event_type=event_type,
    )
    return success_response(
        data=events,
        message="Patient health journey retrieved successfully",
    )
