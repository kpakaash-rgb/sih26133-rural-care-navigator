"""
services/hospital_queue_service.py
==================================
Business logic for managing facility queues in Rural Care Navigator.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from backend.app.core.exceptions import NotFoundError, ValidationAppError
from backend.app.models.hospital_queue import HospitalQueue
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository

ALLOWED_QUEUE_STATUSES = {"NORMAL", "BUSY", "OVERLOADED", "CLOSED"}


class HospitalQueueService:
    """Service managing facility queues."""

    def __init__(
        self,
        queue_repo: HospitalQueueRepository,
        facility_repo: FacilityRepository,
    ):
        self.queue_repo = queue_repo
        self.facility_repo = facility_repo

    def get_queue(self, facility_id: int) -> HospitalQueue:
        """
        Retrieve live queue status for a healthcare facility.
        If the facility exists but has no queue record, one is initialized.

        Args:
            facility_id: Healthcare facility ID.

        Returns:
            HospitalQueue record.

        Raises:
            NotFoundError: If the facility does not exist.
        """
        facility = self.facility_repo.get_by_id(facility_id)
        if facility is None:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found")

        return self.queue_repo.get_or_create_by_facility_id(facility_id)

    def update_queue(
        self,
        facility_id: int,
        waiting_patients: int,
        estimated_wait_minutes: int,
        status: str,
    ) -> HospitalQueue:
        """
        Update the queue status and numbers for a facility.

        Args:
            facility_id: Healthcare facility ID.
            waiting_patients: Patient count waiting in line (>= 0).
            estimated_wait_minutes: Estimated wait time in minutes (>= 0).
            status: Status string (e.g. NORMAL, BUSY, CLOSED).

        Returns:
            Updated HospitalQueue record.

        Raises:
            NotFoundError: If the facility does not exist.
            ValidationAppError: If numerical values are negative.
        """
        facility = self.facility_repo.get_by_id(facility_id)
        if facility is None:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found")

        if waiting_patients < 0:
            raise ValidationAppError("Waiting patients cannot be negative")

        if estimated_wait_minutes < 0:
            raise ValidationAppError("Estimated wait minutes cannot be negative")

        normalized_status = status.strip().upper() if status else "NORMAL"

        return self.queue_repo.update_queue(
            facility_id=facility_id,
            waiting_patients=waiting_patients,
            estimated_wait_minutes=estimated_wait_minutes,
            status=normalized_status,
        )
