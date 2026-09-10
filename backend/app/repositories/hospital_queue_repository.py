"""
repositories/hospital_queue_repository.py
=========================================
Data access operations for HospitalQueue entities.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.hospital_queue import HospitalQueue
from backend.app.repositories.base import BaseRepository


class HospitalQueueRepository(BaseRepository[HospitalQueue]):
    """Repository handling database operations for HospitalQueue records."""

    def __init__(self, db: Session):
        super().__init__(HospitalQueue, db)

    def find_by_facility_id(self, facility_id: int) -> Optional[HospitalQueue]:
        """
        Fetch the queue record for a specific facility.

        Args:
            facility_id: Healthcare facility ID.

        Returns:
            HospitalQueue instance or None if not initialized.
        """
        stmt = select(HospitalQueue).where(HospitalQueue.facility_id == facility_id)
        return self.db.scalars(stmt).first()

    def get_or_create_by_facility_id(self, facility_id: int) -> HospitalQueue:
        """
        Retrieve the existing queue for a facility, or create a default one.

        Args:
            facility_id: Healthcare facility ID.

        Returns:
            HospitalQueue instance.
        """
        queue = self.find_by_facility_id(facility_id)
        if queue is not None:
            return queue

        return self.create(
            facility_id=facility_id,
            waiting_patients=0,
            estimated_wait_minutes=0,
            status="NORMAL",
            last_updated=datetime.utcnow(),
        )

    def update_queue(
        self,
        facility_id: int,
        waiting_patients: int,
        estimated_wait_minutes: int,
        status: str,
    ) -> HospitalQueue:
        """
        Update or initialize the queue for a facility.

        Args:
            facility_id: Healthcare facility ID.
            waiting_patients: Number of patients currently waiting.
            estimated_wait_minutes: Estimated wait duration in minutes.
            status: Operational status string.

        Returns:
            Updated HospitalQueue instance.
        """
        queue = self.find_by_facility_id(facility_id)
        now = datetime.utcnow()

        if queue is None:
            return self.create(
                facility_id=facility_id,
                waiting_patients=waiting_patients,
                estimated_wait_minutes=estimated_wait_minutes,
                status=status,
                last_updated=now,
            )

        queue.waiting_patients = waiting_patients
        queue.estimated_wait_minutes = estimated_wait_minutes
        queue.status = status
        queue.last_updated = now
        self.db.flush()
        self.db.refresh(queue)
        return queue
