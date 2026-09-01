"""
services/referral_service.py
============================
Business logic for Patient Referral creation, queries, and cancellation.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError, ValidationAppError
from backend.app.models.referral import Referral
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository


class ReferralService:
    """Service handling patient referrals to higher-tier healthcare centres."""

    VALID_PRIORITIES = {"ROUTINE", "URGENT", "EMERGENCY"}
    VALID_STATUSES = {"PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"}

    def __init__(
        self,
        referral_repo: ReferralRepository,
        facility_repo: FacilityRepository,
        patient_repo: PatientRepository,
        appointment_repo: AppointmentRepository,
        health_journey_repo: Optional[HealthJourneyRepository] = None,
    ):
        self.referral_repo = referral_repo
        self.facility_repo = facility_repo
        self.patient_repo = patient_repo
        self.appointment_repo = appointment_repo
        self.health_journey_repo = health_journey_repo

    def _format_referral(self, ref: Referral) -> Dict[str, Any]:
        """Format a Referral ORM instance into an API dictionary response."""
        return {
            "id": ref.id,
            "patient_id": ref.patient_id,
            "from_facility_id": ref.from_facility_id,
            "from_facility": {
                "id": ref.from_facility.id,
                "name": ref.from_facility.name,
                "type": ref.from_facility.type,
                "district": ref.from_facility.district,
                "address": ref.from_facility.address,
            }
            if ref.from_facility
            else None,
            "to_facility_id": ref.to_facility_id,
            "to_facility": {
                "id": ref.to_facility.id,
                "name": ref.to_facility.name,
                "type": ref.to_facility.type,
                "district": ref.to_facility.district,
                "address": ref.to_facility.address,
            }
            if ref.to_facility
            else None,
            "appointment_id": ref.appointment_id,
            "reason": ref.reason,
            "priority": ref.priority,
            "status": ref.status,
            "created_at": ref.created_at,
            "updated_at": ref.updated_at,
        }

    def create_referral(
        self,
        patient_id: int,
        to_facility_id: int,
        reason: str,
        priority: str = "ROUTINE",
        appointment_id: Optional[int] = None,
        from_facility_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Create a patient referral to a destination facility.

        Validations:
          1. Verify patient exists.
          2. Verify destination facility exists.
          3. Verify priority is valid (ROUTINE, URGENT, EMERGENCY).
          4. If appointment_id is supplied, verify appointment exists and belongs to patient.
          5. If from_facility_id is supplied, verify facility exists.
          6. Automatically logs a REFERRAL health journey event.
        """
        # 1. Patient check
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        # 2. Destination facility check
        to_facility = self.facility_repo.get_by_id(to_facility_id)
        if not to_facility:
            raise NotFoundError(f"Destination facility with ID {to_facility_id} not found.")

        # 3. Priority check
        priority_norm = priority.upper()
        if priority_norm not in self.VALID_PRIORITIES:
            raise ValidationAppError(f"Invalid priority '{priority}'. Must be one of: {', '.join(self.VALID_PRIORITIES)}.")

        # 4. Optional appointment check
        if appointment_id is not None:
            appointment = self.appointment_repo.get_by_id(appointment_id)
            if not appointment:
                raise NotFoundError(f"Linked appointment with ID {appointment_id} not found.")
            if appointment.patient_id != patient_id:
                raise ValidationAppError("Linked appointment does not belong to the authenticated patient.")
            if from_facility_id is None:
                from_facility_id = appointment.facility_id

        # 5. Optional source facility check
        if from_facility_id is not None:
            from_facility = self.facility_repo.get_by_id(from_facility_id)
            if not from_facility:
                raise NotFoundError(f"Source facility with ID {from_facility_id} not found.")

        # 6. Create referral
        created = self.referral_repo.create_referral(
            patient_id=patient_id,
            to_facility_id=to_facility_id,
            from_facility_id=from_facility_id,
            appointment_id=appointment_id,
            reason=reason,
            priority=priority_norm,
            status="PENDING",
        )

        referral = self.referral_repo.get_by_id_with_relations(created.id) or created

        # 7. Automatically emit Health Journey event
        if self.health_journey_repo:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            self.health_journey_repo.create_event(
                patient_id=patient_id,
                event_type="REFERRAL",
                title="Specialist Referral",
                description=f"Referral to {to_facility.name}: {reason}",
                event_date=today_str,
                facility_id=to_facility_id,
                appointment_id=appointment_id,
                referral_id=referral.id,
            )

        return self._format_referral(referral)

    def get_patient_referrals(self, patient_id: int) -> List[Dict[str, Any]]:
        """Retrieve all referrals for the authenticated patient."""
        referrals = self.referral_repo.get_referrals_by_patient(patient_id)
        return [self._format_referral(r) for r in referrals]

    def get_referral_by_id(self, referral_id: int, patient_id: int) -> Dict[str, Any]:
        """Retrieve a specific referral by ID, strictly enforcing patient ownership."""
        referral = self.referral_repo.get_by_id_with_relations(referral_id)
        if not referral or referral.patient_id != patient_id:
            raise NotFoundError(f"Referral with ID {referral_id} not found.")

        return self._format_referral(referral)

    def cancel_referral(self, referral_id: int, patient_id: int) -> Dict[str, Any]:
        """Cancel a pending referral for the authenticated patient."""
        referral = self.referral_repo.get_by_id_with_relations(referral_id)
        if not referral or referral.patient_id != patient_id:
            raise NotFoundError(f"Referral with ID {referral_id} not found.")

        if referral.status in ("CANCELLED", "COMPLETED"):
            raise ValidationAppError(f"Cannot cancel referral in '{referral.status}' status.")

        referral.status = "CANCELLED"
        self.referral_repo.db.flush()
        self.referral_repo.db.refresh(referral)

        return self._format_referral(referral)
