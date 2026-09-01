"""
repositories/availability_repository.py
======================================
Data access operations for AvailabilitySlot entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.availability import AvailabilitySlot
from backend.app.repositories.base import BaseRepository


class AvailabilityRepository(BaseRepository[AvailabilitySlot]):
    """Repository handling database operations for Appointment Availability Time Slots."""

    def __init__(self, db: Session):
        super().__init__(AvailabilitySlot, db)

    def get_slots(
        self,
        facility_id: int,
        service_id: Optional[int] = None,
        slot_date: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[AvailabilitySlot]:
        """
        Fetch availability slots matching facility, service, date, and status criteria.

        Args:
            facility_id: Target facility ID.
            service_id:  Optional service ID filter.
            slot_date:   Optional date filter (YYYY-MM-DD).
            status:      Optional status filter ('AVAILABLE', 'BOOKED', 'UNAVAILABLE').

        Returns:
            List of matching AvailabilitySlot records.
        """
        stmt = (
            select(AvailabilitySlot)
            .where(AvailabilitySlot.facility_id == facility_id)
            .options(selectinload(AvailabilitySlot.service))
        )

        if service_id is not None:
            stmt = stmt.where(AvailabilitySlot.service_id == service_id)
        if slot_date is not None:
            stmt = stmt.where(AvailabilitySlot.date == slot_date)
        if status is not None:
            stmt = stmt.where(AvailabilitySlot.status == status)

        stmt = stmt.order_by(AvailabilitySlot.date.asc(), AvailabilitySlot.start_time.asc())
        return list(self.db.scalars(stmt).all())

    def create_slot(
        self,
        facility_id: int,
        date: str,
        start_time: str,
        end_time: str,
        service_id: Optional[int] = None,
        status: str = "AVAILABLE",
    ) -> AvailabilitySlot:
        """Create and persist a new availability slot."""
        return self.create(
            facility_id=facility_id,
            service_id=service_id,
            date=date,
            start_time=start_time,
            end_time=end_time,
            status=status,
        )
