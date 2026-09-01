"""
api/v1/routes/mobile_clinics.py
===============================
Mobile Medical Unit (MMU) and Mobile Clinic discovery routes.

Endpoints:
  GET /api/v1/mobile-clinics      — List/filter active mobile clinics with distance
  GET /api/v1/mobile-clinics/{id} — Get details of a specific mobile clinic
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.repositories.mobile_clinic_repository import MobileClinicRepository
from backend.app.services.mobile_clinic_service import MobileClinicService

router = APIRouter(prefix="/mobile-clinics", tags=["Mobile Clinics"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_mobile_clinic_service(db: Session = Depends(get_db)) -> MobileClinicService:
    """Dependency provider for MobileClinicService."""
    clinic_repo = MobileClinicRepository(db)
    return MobileClinicService(mobile_clinic_repo=clinic_repo)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", summary="Discover mobile medical units")
async def list_mobile_clinics(
    district: Optional[str] = Query(None, description="Filter by district (e.g. Solapur)"),
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Patient latitude for distance calculation"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Patient longitude for distance calculation"),
    clinic_service: MobileClinicService = Depends(get_mobile_clinic_service),
):
    """
    Public directory of active Mobile Medical Units, routes, and village visit schedules.
    """
    clinics = clinic_service.list_clinics(district=district, lat=lat, lon=lon)
    return success_response(
        data=clinics,
        message="Mobile clinics retrieved successfully",
    )


@router.get("/{clinic_id}", summary="Get mobile clinic details")
async def get_mobile_clinic(
    clinic_id: int,
    lat: Optional[float] = Query(None, ge=-90, le=90, description="Patient latitude for distance calculation"),
    lon: Optional[float] = Query(None, ge=-180, le=180, description="Patient longitude for distance calculation"),
    clinic_service: MobileClinicService = Depends(get_mobile_clinic_service),
):
    """
    Retrieve full details, routes, and supervisor contacts for a specific Mobile Medical Unit.
    """
    clinic = clinic_service.get_clinic_by_id(clinic_id=clinic_id, lat=lat, lon=lon)
    return success_response(
        data=clinic,
        message="Mobile clinic details retrieved successfully",
    )
