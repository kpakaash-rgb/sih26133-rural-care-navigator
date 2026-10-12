"""
api/v1/routes/doctors.py
========================
Public Doctor Directory discovery routes for patients and healthcare seekers.

Endpoints:
  GET /api/v1/doctors               — Search and list doctors with filters (specialty, facility, search)
  GET /api/v1/doctors/{doctor_id}   — Get complete profile, OPD timings, and facility info for a doctor
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.schemas.doctor import DoctorPublicResponse
from backend.app.services.doctor_directory_service import DoctorDirectoryService

router = APIRouter(prefix="/doctors", tags=["Doctor Directory"])


def get_doctor_directory_service(db: Session = Depends(get_db)) -> DoctorDirectoryService:
    """Dependency provider for DoctorDirectoryService."""
    return DoctorDirectoryService(db=db)


@router.get("", summary="Search and list doctors in directory")
async def list_doctors(
    facility_id: Optional[int] = Query(None, description="Filter doctors by healthcare facility ID"),
    specialization: Optional[str] = Query(None, description="Filter by clinical specialty (e.g. 'Pediatrics', 'General Medicine')"),
    search: Optional[str] = Query(None, description="Free text search by doctor name, specialty, or facility"),
    available_today: Optional[bool] = Query(None, description="Filter for doctors on duty today"),
    service: DoctorDirectoryService = Depends(get_doctor_directory_service),
):
    """
    Public directory of verified medical officers and doctors across primary,
    community, and district healthcare facilities.
    """
    doctors = service.list_doctors(
        facility_id=facility_id,
        specialization=specialization,
        search=search,
        available_today=available_today,
    )
    return success_response(
        data=doctors,
        message="Doctor directory retrieved successfully",
    )


@router.get("/{doctor_id}", summary="Get doctor profile details")
async def get_doctor_details(
    doctor_id: str,
    service: DoctorDirectoryService = Depends(get_doctor_directory_service),
):
    """
    Retrieve comprehensive profile details, credentials, OPD timings, room,
    and facility association for a specific doctor.
    """
    doctor = service.get_doctor_by_id(doctor_id)
    return success_response(
        data=doctor,
        message="Doctor details retrieved successfully",
    )
