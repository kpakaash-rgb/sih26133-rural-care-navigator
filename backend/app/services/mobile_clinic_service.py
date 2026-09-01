"""
services/mobile_clinic_service.py
=================================
Business logic for Mobile Medical Unit (MMU) discovery and distance calculation.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError
from backend.app.models.mobile_clinic import MobileClinic
from backend.app.repositories.mobile_clinic_repository import MobileClinicRepository
from backend.app.services.facility_service import calculate_haversine_distance


class MobileClinicService:
    """Service handling active mobile medical unit discovery, routes, and geographic proximity."""

    def __init__(self, mobile_clinic_repo: MobileClinicRepository):
        self.mobile_clinic_repo = mobile_clinic_repo

    def _format_clinic(
        self,
        clinic: MobileClinic,
        distance_km: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Format MobileClinic ORM instance into an API dictionary response."""
        return {
            "id": clinic.id,
            "name": clinic.name,
            "organization": clinic.organization,
            "district": clinic.district,
            "address": clinic.address,
            "latitude": clinic.latitude,
            "longitude": clinic.longitude,
            "service_area": clinic.service_area,
            "services": clinic.services,
            "schedule": clinic.schedule,
            "contact": clinic.contact,
            "status": clinic.status,
            "distance_km": round(distance_km, 2) if distance_km is not None else None,
            "created_at": clinic.created_at,
            "updated_at": clinic.updated_at,
        }

    def list_clinics(
        self,
        district: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        Discover active mobile medical units with optional district filter and approximate distance.
        """
        clinics = self.mobile_clinic_repo.list_active(district=district)
        results = []

        for clinic in clinics:
            dist: Optional[float] = None
            if lat is not None and lon is not None and clinic.latitude is not None and clinic.longitude is not None:
                dist = calculate_haversine_distance(lat, lon, clinic.latitude, clinic.longitude)
            results.append((clinic, dist))

        # Sort by distance if coordinates were provided
        if lat is not None and lon is not None:
            results.sort(key=lambda item: item[1] if item[1] is not None else float("inf"))

        return [self._format_clinic(c, d) for c, d in results]

    def get_clinic_by_id(
        self,
        clinic_id: int,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Retrieve details of a specific mobile medical unit."""
        clinic = self.mobile_clinic_repo.get_by_id(clinic_id)
        if not clinic or clinic.status != "ACTIVE":
            raise NotFoundError(f"Mobile medical unit with ID {clinic_id} not found.")

        dist: Optional[float] = None
        if lat is not None and lon is not None and clinic.latitude is not None and clinic.longitude is not None:
            dist = calculate_haversine_distance(lat, lon, clinic.latitude, clinic.longitude)

        return self._format_clinic(clinic, dist)
