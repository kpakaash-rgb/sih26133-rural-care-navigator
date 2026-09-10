"""
api/v1/routes/patients.py
=========================
Patient management and frontline intake routes.

Endpoints:
  POST /api/v1/patients              — Frontline worker patient registration
  GET  /api/v1/patients              — List patients for worker's assigned facility
  GET  /api/v1/patients/{patient_id} — Get patient details
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AuthorizationError, NotFoundError, ValidationAppError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_user, get_current_worker
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.schemas.patient import PatientCreate, PatientResponse
from backend.app.services.health_journey_service import HealthJourneyService

router = APIRouter(prefix="/patients", tags=["Patients"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependencies
# ──────────────────────────────────────────────────────────────────────────────

def get_patient_repo(db: Session = Depends(get_db)) -> PatientRepository:
    return PatientRepository(db)


def get_journey_service(db: Session = Depends(get_db)) -> HealthJourneyService:
    journey_repo = HealthJourneyRepository(db)
    patient_repo = PatientRepository(db)
    return HealthJourneyService(health_journey_repo=journey_repo, patient_repo=patient_repo)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", summary="Register a patient (Worker only)")
async def register_patient(
    payload: PatientCreate,
    current_worker: TokenData = Depends(get_current_worker),
    patient_repo: PatientRepository = Depends(get_patient_repo),
    journey_service: HealthJourneyService = Depends(get_journey_service),
):
    """
    Intake a new patient into the rural healthcare network.

    Requires role='WORKER'. Links the patient with the worker's facility.
    """
    # Check if patient already registered with this mobile number
    existing = patient_repo.find_by_mobile(payload.mobile)
    if existing:
        # Update demographics if previously created with minimal info
        existing.full_name = payload.full_name or existing.full_name
        existing.age = payload.age if payload.age is not None else existing.age
        existing.gender = payload.gender or existing.gender
        existing.village = payload.village or existing.village
        if current_worker.facility_id and not existing.facility_id:
            existing.facility_id = current_worker.facility_id
        patient_repo.db.commit()
        patient_repo.db.refresh(existing)
        patient = existing
    else:
        patient = patient_repo.create_patient(
            mobile=payload.mobile,
            full_name=payload.full_name,
            age=payload.age,
            gender=payload.gender,
            village=payload.village,
            district=payload.district,
            facility_id=current_worker.facility_id,
            abha_number=payload.abha_number,
            consent=payload.consent,
        )

        # Log timeline event
        journey_service.create_event(
            patient_id=patient.id,
            event_type="REGISTRATION",
            title="Patient Intake Completed",
            description=f"Registered into community healthcare network by frontline worker (Facility #{current_worker.facility_id}).",
            facility_id=current_worker.facility_id,
        )

    return success_response(
        data=PatientResponse.model_validate(patient).model_dump(),
        message="Patient registered successfully",
    )


@router.get("", summary="List patients for frontline worker")
async def list_patients(
    q: Optional[str] = Query(None, description="Search query for name, mobile, village"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_worker: TokenData = Depends(get_current_worker),
    patient_repo: PatientRepository = Depends(get_patient_repo),
):
    """
    Retrieve patients assigned to the frontline worker's facility.
    """
    patients = patient_repo.list_patients(
        facility_id=current_worker.facility_id,
        query=q,
        limit=limit,
        offset=offset,
    )
    result = [PatientResponse.model_validate(p).model_dump() for p in patients]
    return success_response(
        data=result,
        message="Patients retrieved successfully",
    )


@router.get("/{patient_id}", summary="Get patient details")
async def get_patient_details(
    patient_id: int,
    current_user: TokenData = Depends(get_current_user),
    patient_repo: PatientRepository = Depends(get_patient_repo),
):
    """
    Retrieve a patient's profile. Accessible by Frontline Workers and the patient themselves.
    """
    if current_user.role == "PATIENT":
        try:
            pid = int(current_user.user_id)
            if pid != patient_id:
                raise AuthorizationError("Access denied: You can only access your own profile")
        except (ValueError, TypeError):
            raise AuthorizationError("Invalid patient token")

    patient = patient_repo.get_by_id(patient_id)
    if not patient:
        raise NotFoundError(f"Patient with ID {patient_id} not found")

    return success_response(
        data=PatientResponse.model_validate(patient).model_dump(),
        message="Patient details retrieved successfully",
    )
