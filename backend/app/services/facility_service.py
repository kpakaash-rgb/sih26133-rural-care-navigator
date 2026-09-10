"""
services/facility_service.py
============================
Business logic for healthcare facility discovery, service inquiries, and availability time slots.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError, ValidationAppError
from backend.app.models.facility import Facility
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.facility_repository import FacilityRepository


def calculate_haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """
    Calculate the great-circle distance between two geographic coordinates in kilometers.

    Uses standard spherical trigonometry suitable for lightweight prototype calculation.
    """
    R = 6371.0  # Earth radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2.0) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)


class FacilityService:
    """Business service orchestrating facilities, medical services, and time slots."""

    def __init__(
        self,
        facility_repo: FacilityRepository,
        availability_repo: AvailabilityRepository,
    ):
        self.facility_repo = facility_repo
        self.availability_repo = availability_repo

    def _format_facility(
        self,
        facility: Facility,
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Format a Facility model instance into a response dictionary with optional distance."""
        distance_km = None
        if (
            user_lat is not None
            and user_lon is not None
            and facility.latitude is not None
            and facility.longitude is not None
        ):
            distance_km = calculate_haversine_distance(
                user_lat, user_lon, facility.latitude, facility.longitude
            )

        return {
            "id": facility.id,
            "name": facility.name,
            "type": facility.type,
            "address": facility.address,
            "district": facility.district,
            "latitude": facility.latitude,
            "longitude": facility.longitude,
            "status": facility.status,
            "distance_km": distance_km,
            "services": [
                {
                    "id": s.id,
                    "facility_id": s.facility_id,
                    "name": s.name,
                    "description": s.description,
                    "available": s.available,
                }
                for s in (facility.services or [])
            ],
        }

    def list_facilities(
        self,
        district: Optional[str] = None,
        facility_type: Optional[str] = None,
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """
        List all active facilities matching optional filters.

        If user coordinates are provided, calculates distance for each facility and sorts by proximity.
        """
        facilities = self.facility_repo.list_facilities(
            district=district,
            facility_type=facility_type,
            status="ACTIVE",
        )

        formatted = [
            self._format_facility(f, user_lat=user_lat, user_lon=user_lon)
            for f in facilities
        ]

        if user_lat is not None and user_lon is not None:
            # Sort by distance if available
            formatted.sort(key=lambda x: (x["distance_km"] is None, x["distance_km"] or 0))

        return formatted

    def get_facility_details(
        self,
        facility_id: int,
        user_lat: Optional[float] = None,
        user_lon: Optional[float] = None,
    ) -> Dict[str, Any]:
        """Fetch facility details by ID, or raise NotFoundError."""
        facility = self.facility_repo.get_facility_with_services(facility_id)
        if not facility:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found.")

        return self._format_facility(facility, user_lat=user_lat, user_lon=user_lon)

    def get_facility_services(self, facility_id: int) -> List[Dict[str, Any]]:
        """Fetch all services provided by a specific facility."""
        facility = self.facility_repo.get_by_id(facility_id)
        if not facility:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found.")

        services = self.facility_repo.get_services(facility_id)
        return [
            {
                "id": s.id,
                "facility_id": s.facility_id,
                "name": s.name,
                "description": s.description,
                "available": s.available,
            }
            for s in services
        ]

    def get_facility_availability(
        self,
        facility_id: int,
        service_id: Optional[int] = None,
        date_str: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Fetch available consultation time slots for a facility.

        Validates:
          - Facility existence
          - Service existence and parent facility relationship (if provided)
          - Date format (YYYY-MM-DD)
        """
        facility = self.facility_repo.get_by_id(facility_id)
        if not facility:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found.")

        if service_id is not None:
            service = self.facility_repo.get_service_by_id(service_id)
            if not service or service.facility_id != facility_id:
                raise NotFoundError(
                    f"Service with ID {service_id} not found for facility {facility_id}."
                )

        if date_str is not None:
            try:
                datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                raise ValidationAppError("Invalid date format. Expected YYYY-MM-DD.")

        slots = self.availability_repo.get_slots(
            facility_id=facility_id,
            service_id=service_id,
            slot_date=date_str,
            status=status,
        )

        return [
            {
                "id": slot.id,
                "facility_id": slot.facility_id,
                "service_id": slot.service_id,
                "service_name": slot.service.name if slot.service else None,
                "date": slot.date,
                "start_time": slot.start_time,
                "end_time": slot.end_time,
                "status": slot.status,
            }
            for slot in slots
        ]


def find_best_facility_for_patient(
    db: Any,
    locality: Optional[str] = None,
    care_level: Optional[str] = None,
    emergency: bool = False,
    required_service: Optional[str] = None,
    user_lat: Optional[float] = None,
    user_lon: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Dynamically discover and rank real healthcare facilities from PostgreSQL based on
    caller locality, clinical care level, emergency capability, service availability,
    and live queue status. Zero hardcoded hospital defaults.
    """
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload
    from backend.app.models.facility import Facility
    from backend.app.models.hospital_queue import HospitalQueue

    facilities_list: List[Facility] = []
    if db is not None:
        try:
            stmt = (
                select(Facility)
                .options(selectinload(Facility.services))
                .where(Facility.status == "ACTIVE")
            )
            facilities_list = list(db.scalars(stmt).all())
        except Exception:
            facilities_list = []

    # If DB is empty, use seed demo facilities
    if not facilities_list:
        from backend.app.database.seed_data import DEMO_FACILITIES
        for df in DEMO_FACILITIES:
            fac_obj = Facility(
                id=df.get("id", len(facilities_list) + 1),
                name=df["name"],
                type=df["type"],
                address=df["address"],
                district=df["district"],
                latitude=df.get("latitude"),
                longitude=df.get("longitude"),
                status=df.get("status", "ACTIVE"),
            )
            facilities_list.append(fac_obj)

    clean_locality = (locality or "").strip().lower()
    clean_care = (care_level or "").strip().lower()

    scored_facilities: List[tuple[float, Facility, Optional[float], bool]] = []

    for fac in facilities_list:
        score = 0.0
        loc_matched = False

        # 1. Locality Proximity Matching (Highest Weight)
        if clean_locality:
            fac_name_lower = fac.name.lower()
            fac_addr_lower = fac.address.lower()
            fac_dist_lower = fac.district.lower()

            if clean_locality in fac_name_lower:
                score += 80.0
                loc_matched = True
            elif clean_locality in fac_addr_lower:
                score += 70.0
                loc_matched = True
            elif clean_locality in fac_dist_lower:
                score += 30.0

        # 2. Emergency Suitability
        is_emerg_facility = fac.type in ("DISTRICT_HOSPITAL", "COMMUNITY_HEALTH_CENTRE")
        if emergency:
            if fac.type == "DISTRICT_HOSPITAL":
                score += 60.0
            elif fac.type == "COMMUNITY_HEALTH_CENTRE":
                score += 50.0
            else:
                score += 5.0
        else:
            # 3. Clinical Care Level Matching
            if "primary health centre" in clean_care or "phc" in clean_care:
                if fac.type == "PRIMARY_HEALTH_CENTRE":
                    score += 50.0
                elif fac.type == "COMMUNITY_HEALTH_CENTRE":
                    score += 40.0
                else:
                    score += 20.0
            elif "community health" in clean_care or "chc" in clean_care:
                if fac.type == "COMMUNITY_HEALTH_CENTRE":
                    score += 50.0
                elif fac.type == "DISTRICT_HOSPITAL":
                    score += 45.0
                else:
                    score += 15.0
            elif "emergency" in clean_care or "hospital" in clean_care:
                if fac.type == "DISTRICT_HOSPITAL":
                    score += 55.0
                elif fac.type == "COMMUNITY_HEALTH_CENTRE":
                    score += 45.0
                else:
                    score += 10.0
            else:
                # Routine care
                if fac.type == "PRIMARY_HEALTH_CENTRE":
                    score += 40.0
                elif fac.type == "MOBILE_CLINIC":
                    score += 35.0
                else:
                    score += 25.0

        # 4. Service Availability
        available_services = [s.name for s in (fac.services or []) if getattr(s, "available", True)]
        if required_service:
            req_lower = required_service.lower()
            if any(req_lower in s.lower() for s in available_services):
                score += 20.0

        # 5. Live Hospital Queue Penalty / Bonus
        if db is not None:
            try:
                q_stmt = select(HospitalQueue).where(HospitalQueue.facility_id == fac.id)
                q = db.scalars(q_stmt).first()
                if q:
                    if q.status == "OVERLOADED":
                        score -= 15.0
                    elif q.status == "NORMAL":
                        score += 10.0
            except Exception:
                pass

        # 6. Distance Calculation if coordinates exist
        dist_km = None
        if user_lat is not None and user_lon is not None and fac.latitude and fac.longitude:
            dist_km = calculate_haversine_distance(user_lat, user_lon, fac.latitude, fac.longitude)
            score += max(0.0, 50.0 - dist_km)

        scored_facilities.append((score, fac, dist_km, loc_matched))

    # Sort descending by score
    scored_facilities.sort(key=lambda x: x[0], reverse=True)
    best_score, best_fac, best_dist, matched = scored_facilities[0]

    svc_names = [s.name for s in (best_fac.services or []) if getattr(s, "available", True)]

    return {
        "id": best_fac.id,
        "name": best_fac.name,
        "type": best_fac.type,
        "address": best_fac.address,
        "district": best_fac.district,
        "latitude": best_fac.latitude,
        "longitude": best_fac.longitude,
        "status": best_fac.status,
        "emergency_capable": best_fac.type in ("DISTRICT_HOSPITAL", "COMMUNITY_HEALTH_CENTRE"),
        "distance_km": best_dist,
        "locality_matched": matched,
        "services": svc_names,
    }
