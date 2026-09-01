"""
services/health_journey_service.py
==================================
Business logic for Patient Health Journey timeline events.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError
from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository


class HealthJourneyService:
    """Service handling patient timeline logging and retrieval."""

    def __init__(
        self,
        health_journey_repo: HealthJourneyRepository,
        patient_repo: PatientRepository,
    ):
        self.health_journey_repo = health_journey_repo
        self.patient_repo = patient_repo

    def _format_event(self, event: HealthJourneyEvent) -> Dict[str, Any]:
        """Format an event ORM object into a dictionary representation."""
        return {
            "id": event.id,
            "patient_id": event.patient_id,
            "event_type": event.event_type,
            "title": event.title,
            "description": event.description,
            "event_date": event.event_date,
            "facility_id": event.facility_id,
            "appointment_id": event.appointment_id,
            "referral_id": event.referral_id,
            "created_at": event.created_at,
        }

    def create_event(
        self,
        patient_id: int,
        event_type: str,
        title: str,
        description: Optional[str] = None,
        event_date: Optional[str] = None,
        facility_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
        referral_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Log a timeline event for a patient."""
        if not event_date:
            event_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        event = self.health_journey_repo.create_event(
            patient_id=patient_id,
            event_type=event_type,
            title=title,
            description=description,
            event_date=event_date,
            facility_id=facility_id,
            appointment_id=appointment_id,
            referral_id=referral_id,
        )
        return self._format_event(event)

    def get_patient_timeline(
        self,
        patient_id: int,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve chronological care journey events for the authenticated patient."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        events = self.health_journey_repo.get_events_by_patient(
            patient_id=patient_id,
            event_type=event_type,
        )
        return [self._format_event(e) for e in events]
