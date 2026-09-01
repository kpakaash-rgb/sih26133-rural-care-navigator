"""
repositories/health_journey_repository.py
=========================================
Data access operations for Health Journey events.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.repositories.base import BaseRepository


class HealthJourneyRepository(BaseRepository[HealthJourneyEvent]):
    """Repository handling persistence and queries for patient health journey events."""

    def __init__(self, db: Session):
        super().__init__(HealthJourneyEvent, db)

    def create_event(
        self,
        patient_id: int,
        event_type: str,
        title: str,
        event_date: str,
        description: Optional[str] = None,
        facility_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        referral_id: Optional[int] = None,
    ) -> HealthJourneyEvent:
        """Create and log a chronological health journey event."""
        return self.create(
            patient_id=patient_id,
            event_type=event_type,
            title=title,
            description=description,
            event_date=event_date,
            facility_id=facility_id,
            appointment_id=appointment_id,
            referral_id=referral_id,
        )

    def get_events_by_patient(
        self,
        patient_id: int,
        event_type: Optional[str] = None,
    ) -> List[HealthJourneyEvent]:
        """
        Fetch chronological events for a patient, optionally filtered by event type.

        Ordered by event_date desc, created_at desc.
        """
        stmt = (
            select(HealthJourneyEvent)
            .where(HealthJourneyEvent.patient_id == patient_id)
            .options(
                selectinload(HealthJourneyEvent.facility),
                selectinload(HealthJourneyEvent.appointment),
                selectinload(HealthJourneyEvent.referral),
            )
        )
        if event_type:
            stmt = stmt.where(HealthJourneyEvent.event_type == event_type.upper())

        stmt = stmt.order_by(
            HealthJourneyEvent.event_date.desc(),
            HealthJourneyEvent.created_at.desc(),
        )
        return list(self.db.scalars(stmt).all())
