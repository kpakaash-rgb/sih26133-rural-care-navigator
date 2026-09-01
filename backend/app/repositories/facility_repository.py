"""
repositories/facility_repository.py
===================================
Data access operations for Facility and FacilityService entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.facility import Facility, FacilityService
from backend.app.repositories.base import BaseRepository


class FacilityRepository(BaseRepository[Facility]):
    """Repository handling database operations for Healthcare Facilities and Services."""

    def __init__(self, db: Session):
        super().__init__(Facility, db)

    def get_facility_with_services(self, facility_id: int) -> Optional[Facility]:
        """
        Fetch a facility by primary key with its related services pre-loaded.

        Args:
            facility_id: Primary key ID of the facility.

        Returns:
            Facility instance with loaded services or None.
        """
        stmt = (
            select(Facility)
            .where(Facility.id == facility_id)
            .options(selectinload(Facility.services))
        )
        return self.db.scalars(stmt).first()

    def list_facilities(
        self,
        district: Optional[str] = None,
        facility_type: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[Facility]:
        """
        Query facilities with optional filtering by district, type, and operational status.

        Args:
            district:      Optional district name filter (case-insensitive partial/exact).
            facility_type: Optional facility type filter.
            status:        Optional status filter (e.g. 'ACTIVE').

        Returns:
            List of matching Facility instances.
        """
        stmt = select(Facility).options(selectinload(Facility.services))

        if district:
            stmt = stmt.where(Facility.district.ilike(f"%{district.strip()}%"))
        if facility_type:
            stmt = stmt.where(Facility.type.ilike(f"%{facility_type.strip()}%"))
        if status:
            stmt = stmt.where(Facility.status == status)

        stmt = stmt.order_by(Facility.name.asc())
        return list(self.db.scalars(stmt).all())

    def get_services(self, facility_id: int) -> List[FacilityService]:
        """
        Fetch all services provided by a specific facility.

        Args:
            facility_id: Primary key ID of the facility.

        Returns:
            List of FacilityService instances.
        """
        stmt = (
            select(FacilityService)
            .where(FacilityService.facility_id == facility_id)
            .order_by(FacilityService.name.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_service_by_id(self, service_id: int) -> Optional[FacilityService]:
        """
        Fetch a single service by primary key.

        Args:
            service_id: Primary key ID of the service.

        Returns:
            FacilityService instance or None.
        """
        return self.db.get(FacilityService, service_id)

    def create_facility(
        self,
        name: str,
        type: str,
        address: str,
        district: str,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        status: str = "ACTIVE",
    ) -> Facility:
        """Create and persist a new Facility."""
        return self.create(
            name=name,
            type=type,
            address=address,
            district=district,
            latitude=latitude,
            longitude=longitude,
            status=status,
        )

    def add_service(
        self,
        facility_id: int,
        name: str,
        description: Optional[str] = None,
        available: bool = True,
    ) -> FacilityService:
        """Create and persist a new FacilityService linked to a facility."""
        service = FacilityService(
            facility_id=facility_id,
            name=name,
            description=description,
            available=available,
        )
        self.db.add(service)
        self.db.flush()
        self.db.refresh(service)
        return service
