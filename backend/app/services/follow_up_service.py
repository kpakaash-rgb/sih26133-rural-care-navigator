"""
services/follow_up_service.py
=============================
Business logic for Patient Follow-Up tracking, completion, and cancellation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError, ValidationAppError
from backend.app.models.follow_up import FollowUp
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository


class FollowUpService:
    """Service handling post-consultation patient follow-ups and care closure."""

    def __init__(
        self,
        follow_up_repo: FollowUpRepository,
        patient_repo: PatientRepository,
        appointment_repo: AppointmentRepository,
        referral_repo: ReferralRepository,
        health_journey_repo: Optional[HealthJourneyRepository] = None,
    ):
        self.follow_up_repo = follow_up_repo
        self.patient_repo = patient_repo
        self.appointment_repo = appointment_repo
        self.referral_repo = referral_repo
        self.health_journey_repo = health_journey_repo

    def _format_follow_up(self, fu: FollowUp) -> Dict[str, Any]:
        """Format a FollowUp ORM instance into an API response dictionary."""
        return {
            "id": fu.id,
            "patient_id": fu.patient_id,
            "appointment_id": fu.appointment_id,
            "referral_id": fu.referral_id,
            "follow_up_date": fu.follow_up_date,
            "notes": fu.notes,
            "status": fu.status,
            "created_at": fu.created_at,
            "updated_at": fu.updated_at,
        }

    def create_follow_up(
        self,
        patient_id: int,
        follow_up_date: str,
        notes: Optional[str] = None,
        appointment_id: Optional[int] = None,
        referral_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a follow-up consultation record for a patient.

        Validations:
          1. Verify patient exists.
          2. Verify appointment_id (if provided) exists and belongs to patient.
          3. Verify referral_id (if provided) exists and belongs to patient.
          4. At least one of appointment_id or referral_id should be provided.
          5. Automatically logs a FOLLOW_UP health journey event.
        """
        # 1. Patient verification
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        # 2 & 3. Link validation
        if appointment_id is None and referral_id is None:
            raise ValidationAppError("Follow-up must be associated with either an appointment or a referral.")

        if appointment_id is not None:
            appt = self.appointment_repo.get_by_id(appointment_id)
            if not appt:
                raise NotFoundError(f"Linked appointment with ID {appointment_id} not found.")
            if appt.patient_id != patient_id:
                raise ValidationAppError("Linked appointment does not belong to the authenticated patient.")

        if referral_id is not None:
            ref = self.referral_repo.get_by_id(referral_id)
            if not ref:
                raise NotFoundError(f"Linked referral with ID {referral_id} not found.")
            if ref.patient_id != patient_id:
                raise ValidationAppError("Linked referral does not belong to the authenticated patient.")

        # 4. Create follow-up
        created = self.follow_up_repo.create_follow_up(
            patient_id=patient_id,
            follow_up_date=follow_up_date,
            notes=notes,
            appointment_id=appointment_id,
            referral_id=referral_id,
            status="PENDING",
        )

        follow_up = self.follow_up_repo.get_by_id_with_relations(created.id) or created

        # 5. Emit Health Journey event
        if self.health_journey_repo:
            self.health_journey_repo.create_event(
                patient_id=patient_id,
                event_type="FOLLOW_UP",
                title="Follow-Up Scheduled",
                description=notes or "Follow-up checkup scheduled",
                event_date=follow_up_date,
                appointment_id=appointment_id,
                referral_id=referral_id,
            )

        return self._format_follow_up(follow_up)

    def get_patient_follow_ups(self, patient_id: int) -> List[Dict[str, Any]]:
        """Retrieve all follow-ups belonging to the authenticated patient."""
        follow_ups = self.follow_up_repo.get_follow_ups_by_patient(patient_id)
        return [self._format_follow_up(f) for f in follow_ups]

    def complete_follow_up(self, follow_up_id: int, patient_id: int) -> Dict[str, Any]:
        """Mark a follow-up as COMPLETED and log CARE_COMPLETED in Health Journey."""
        follow_up = self.follow_up_repo.get_by_id_with_relations(follow_up_id)
        if not follow_up or follow_up.patient_id != patient_id:
            raise NotFoundError(f"Follow-up with ID {follow_up_id} not found.")

        if follow_up.status in ("COMPLETED", "CANCELLED"):
            raise ValidationAppError(f"Cannot complete follow-up in '{follow_up.status}' status.")

        follow_up.status = "COMPLETED"
        self.follow_up_repo.db.flush()
        self.follow_up_repo.db.refresh(follow_up)

        if self.health_journey_repo:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            self.health_journey_repo.create_event(
                patient_id=patient_id,
                event_type="CARE_COMPLETED",
                title="Care Completed",
                description=f"Follow-up checkup completed successfully: {follow_up.notes or 'No additional notes'}",
                event_date=today_str,
                appointment_id=follow_up.appointment_id,
                referral_id=follow_up.referral_id,
            )

        return self._format_follow_up(follow_up)

    def cancel_follow_up(self, follow_up_id: int, patient_id: int) -> Dict[str, Any]:
        """Cancel an existing follow-up for the authenticated patient."""
        follow_up = self.follow_up_repo.get_by_id_with_relations(follow_up_id)
        if not follow_up or follow_up.patient_id != patient_id:
            raise NotFoundError(f"Follow-up with ID {follow_up_id} not found.")

        if follow_up.status in ("COMPLETED", "CANCELLED"):
            raise ValidationAppError(f"Cannot cancel follow-up in '{follow_up.status}' status.")

        follow_up.status = "CANCELLED"
        self.follow_up_repo.db.flush()
        self.follow_up_repo.db.refresh(follow_up)

        return self._format_follow_up(follow_up)
