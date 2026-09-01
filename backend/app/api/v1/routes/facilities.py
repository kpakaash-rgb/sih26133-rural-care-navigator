"""
api/v1/routes/facilities.py
===========================
Public discovery endpoints for Healthcare Facilities, Medical Services, and Time Slot Availability.

Endpoints:
  GET /api/v1/facilities                     — List & search facilities with optional filters & distance
  GET /api/v1/facilities/{facility_id}       — Get detailed facility information
  GET /api/v1/facilities/{facility_id}/services — List services offered by a facility
  GET /api/v1/facilities/{facility_id}/availability — List available consultation time slots
"""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.schemas.facility import (
    AvailabilitySlotResponse,
    FacilityResponse,
    FacilityServiceResponse,
)
from backend.app.services.facility_service import FacilityService

router = APIRouter(prefix="/facilities", tags=["Healthcare Facilities"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_facility_service(db: Session = Depends(get_db)) -> FacilityService:
    """Dependency provider for FacilityService."""
    facility_repo = FacilityRepository(db)
    availability_repo = AvailabilityRepository(db)
    return FacilityService(facility_repo=facility_repo, availability_repo=availability_repo)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", summary="List & search healthcare facilities")
async def list_facilities(
    district: Optional[str] = Query(None, description="Filter by district name (e.g. 'Solapur')"),
    type: Optional[str] = Query(None, description="Filter by facility type (e.g. 'PRIMARY_HEALTH_CENTRE')"),
    lat: Optional[float] = Query(None, description="User latitude for distance calculation"),
    lon: Optional[float] = Query(None, description="User longitude for distance calculation"),
    facility_service: FacilityService = Depends(get_facility_service),
):
    """
    Retrieve all operational healthcare facilities matching criteria.

    Calculates great-circle distance in kilometers when coordinates are supplied.
    """
    facilities = facility_service.list_facilities(
        district=district,
        facility_type=type,
        user_lat=lat,
        user_lon=lon,
    )
    return success_response(
        data=facilities,
        message="Facilities retrieved successfully",
    )


@router.get("/{facility_id}", summary="Get healthcare facility details")
async def get_facility_details(
    facility_id: int,
    lat: Optional[float] = Query(None, description="User latitude for distance calculation"),
    lon: Optional[float] = Query(None, description="User longitude for distance calculation"),
    facility_service: FacilityService = Depends(get_facility_service),
):
    """Retrieve detailed information and available services for a specific facility."""
    facility = facility_service.get_facility_details(
        facility_id=facility_id,
        user_lat=lat,
        user_lon=lon,
    )
    return success_response(
        data=facility,
        message="Facility details retrieved successfully",
    )


@router.get("/{facility_id}/services", summary="Get facility medical services")
async def get_facility_services(
    facility_id: int,
    facility_service: FacilityService = Depends(get_facility_service),
):
    """Retrieve the list of medical services offered at the specified healthcare facility."""
    services = facility_service.get_facility_services(facility_id=facility_id)
    return success_response(
        data=services,
        message="Facility services retrieved successfully",
    )


@router.get("/{facility_id}/availability", summary="Get facility consultation availability slots")
async def get_facility_availability(
    facility_id: int,
    service_id: Optional[int] = Query(None, description="Filter by specific service ID"),
    date: Optional[str] = Query(None, description="Filter by date in YYYY-MM-DD format (e.g. '2026-09-02')"),
    status: Optional[str] = Query(None, description="Filter by status (default: all or 'AVAILABLE')"),
    facility_service: FacilityService = Depends(get_facility_service),
):
    """
    Retrieve available appointment time slots for a facility.

    Optionally filters by service, date, and slot status.
    """
    slots = facility_service.get_facility_availability(
        facility_id=facility_id,
        service_id=service_id,
        date_str=date,
        status=status,
    )
    return success_response(
        data=slots,
        message="Availability slots retrieved successfully",
    )
