"""
api/v1/routes/queues.py
=======================
Facility queue inquiry and management endpoints for Rural Care Navigator.

Endpoints:
  GET /api/v1/facilities/{facility_id}/queue — Get current facility queue status
  PUT /api/v1/facilities/{facility_id}/queue — Update facility queue (for facility workers/staff)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.exceptions import AuthorizationError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_facility_staff
from backend.app.database.connection import get_db
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository
from backend.app.schemas.hospital_queue import (
    HospitalQueueResponse,
    HospitalQueueUpdate,
)
from backend.app.services.hospital_queue_service import HospitalQueueService

router = APIRouter(prefix="/facilities", tags=["Facility Queue Management"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_queue_service(db: Session = Depends(get_db)) -> HospitalQueueService:
    """Dependency provider for HospitalQueueService."""
    queue_repo = HospitalQueueRepository(db)
    facility_repo = FacilityRepository(db)
    return HospitalQueueService(queue_repo=queue_repo, facility_repo=facility_repo)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/{facility_id}/queue", summary="Get facility queue status")
async def get_facility_queue(
    facility_id: int,
    queue_service: HospitalQueueService = Depends(get_queue_service),
):
    """
    Retrieve live queue status for a healthcare facility.

    Available publicly for Patients, Doctors, and Healthcare Workers to view
    current patient load, wait estimations, and queue status.
    """
    queue = queue_service.get_queue(facility_id=facility_id)
    return success_response(
        data=HospitalQueueResponse.model_validate(queue).model_dump(),
        message="Facility queue retrieved successfully",
    )


@router.put("/{facility_id}/queue", summary="Update facility queue status")
async def update_facility_queue(
    facility_id: int,
    payload: HospitalQueueUpdate,
    current_staff: TokenData = Depends(get_current_facility_staff),
    queue_service: HospitalQueueService = Depends(get_queue_service),
):
    """
    Update live queue status and waiting estimations for a healthcare facility.

    Requires role in ('WORKER', 'DOCTOR'). Ensures the staff member only modifies their assigned facility.
    """
    if current_staff.facility_id is not None and current_staff.facility_id != facility_id:
        role_title = "Doctor" if current_staff.role == "DOCTOR" else "Worker"
        raise AuthorizationError(f"{role_title} is not authorized to modify queue for facility #{facility_id}")

    updated_queue = queue_service.update_queue(
        facility_id=facility_id,
        waiting_patients=payload.waiting_patients,
        estimated_wait_minutes=payload.estimated_wait_minutes,
        status=payload.status,
    )
    return success_response(
        data=HospitalQueueResponse.model_validate(updated_queue).model_dump(),
        message="Facility queue updated successfully",
    )
