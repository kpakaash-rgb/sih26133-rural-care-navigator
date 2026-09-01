"""
repositories/mobile_clinic_repository.py
========================================
Data access operations for Mobile Medical Units and Clinics.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.mobile_clinic import MobileClinic
from backend.app.repositories.base import BaseRepository


class MobileClinicRepository(BaseRepository[MobileClinic]):
    """Repository handling database queries for Mobile Medical Units."""

    def __init__(self, db: Session):
        super().__init__(MobileClinic, db)

    def list_active(self, district: Optional[str] = None) -> List[MobileClinic]:
        """
        List active mobile clinics, optionally filtered by operating district.
        """
        stmt = select(MobileClinic).where(MobileClinic.status == "ACTIVE")

        if district:
            stmt = stmt.where(MobileClinic.district.ilike(f"%{district}%"))

        stmt = stmt.order_by(MobileClinic.name.asc())
        return list(self.db.scalars(stmt).all())

    def create_clinic(
        self,
        name: str,
        district: str,
        organization: Optional[str] = None,
        address: Optional[str] = None,
        latitude: Optional[float] = None,
        longitude: Optional[float] = None,
        service_area: Optional[str] = None,
        services: Optional[str] = None,
        schedule: Optional[str] = None,
        contact: Optional[str] = None,
        status: str = "ACTIVE",
    ) -> MobileClinic:
        """Create and persist a new Mobile Clinic record."""
        return self.create(
            name=name,
            district=district,
            organization=organization,
            address=address,
            latitude=latitude,
            longitude=longitude,
            service_area=service_area,
            services=services,
            schedule=schedule,
            contact=contact,
            status=status,
        )
