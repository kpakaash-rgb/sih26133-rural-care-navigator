"""
repositories/consultation_repository.py
======================================
Data access operations for Doctor Consultation entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.consultation import Consultation
from backend.app.repositories.base import BaseRepository


class ConsultationRepository(BaseRepository[Consultation]):
    """Repository handling database operations for Doctor Consultations."""

    def __init__(self, db: Session):
        super().__init__(Consultation, db)

    def get_with_relations(self, consultation_id: int) -> Optional[Consultation]:
        """Fetch a consultation with related patient, facility, and appointment preloaded."""
        stmt = (
            select(Consultation)
            .where(Consultation.id == consultation_id)
            .options(
                selectinload(Consultation.patient),
                selectinload(Consultation.facility),
                selectinload(Consultation.appointment),
            )
        )
        return self.db.scalars(stmt).first()

    def get_by_patient(self, patient_id: int) -> List[Consultation]:
        """Fetch all consultations for a patient in reverse chronological order."""
        stmt = (
            select(Consultation)
            .where(Consultation.patient_id == patient_id)
            .options(
                selectinload(Consultation.facility),
                selectinload(Consultation.appointment),
            )
            .order_by(Consultation.id.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_by_facility(self, facility_id: int, limit: int = 50) -> List[Consultation]:
        """Fetch consultations conducted at a given healthcare facility."""
        stmt = (
            select(Consultation)
            .where(Consultation.facility_id == facility_id)
            .options(
                selectinload(Consultation.patient),
            )
            .order_by(Consultation.id.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def get_by_doctor(self, doctor_id: str, limit: int = 50) -> List[Consultation]:
        """Fetch consultations conducted by a specific doctor identifier."""
        stmt = (
            select(Consultation)
            .where(Consultation.doctor_id == doctor_id)
            .options(
                selectinload(Consultation.patient),
            )
            .order_by(Consultation.id.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())

    def count_by_facility(self, facility_id: int) -> int:
        """Count total completed consultations for a facility."""
        stmt = (
            select(func.count(Consultation.id))
            .where(Consultation.facility_id == facility_id)
        )
        return self.db.scalar(stmt) or 0

    def create_consultation(
        self,
        patient_id: int,
        doctor_id: str,
        facility_id: int,
        appointment_id: Optional[int] = None,
        doctor_pk: Optional[int] = None,
        notes: Optional[str] = None,
        assessment: Optional[str] = None,
        advice: Optional[str] = None,
        prescription: Optional[str] = None,
        follow_up_required: bool = False,
        follow_up_date: Optional[str] = None,
    ) -> Consultation:
        """Create and persist a new doctor consultation record."""
        return self.create(
            patient_id=patient_id,
            doctor_id=doctor_id,
            doctor_pk=doctor_pk,
            facility_id=facility_id,
            appointment_id=appointment_id,
            notes=notes,
            assessment=assessment,
            advice=advice,
            prescription=prescription,
            follow_up_required=follow_up_required,
            follow_up_date=follow_up_date,
        )
