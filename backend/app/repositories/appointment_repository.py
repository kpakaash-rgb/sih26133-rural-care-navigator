"""
repositories/appointment_repository.py
======================================
Data access operations for Appointment entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.appointment import Appointment
from backend.app.repositories.base import BaseRepository


class AppointmentRepository(BaseRepository[Appointment]):
    """Repository handling database operations for Patient Appointments."""

    def __init__(self, db: Session):
        super().__init__(Appointment, db)

    def get_by_id_with_relations(self, appointment_id: int) -> Optional[Appointment]:
        """
        Fetch an appointment by primary key with related facility, service, and patient preloaded.

        Args:
            appointment_id: Primary key ID.

        Returns:
            Appointment instance or None.
        """
        stmt = (
            select(Appointment)
            .where(Appointment.id == appointment_id)
            .options(
                selectinload(Appointment.facility),
                selectinload(Appointment.service),
                selectinload(Appointment.slot),
                selectinload(Appointment.patient),
            )
        )
        return self.db.scalars(stmt).first()

    def get_appointments_by_patient(self, patient_id: int) -> List[Appointment]:
        """
        Fetch all appointments belonging to a specific patient, ordered by date and time.

        Args:
            patient_id: Patient ID.

        Returns:
            List of Appointment instances.
        """
        stmt = (
            select(Appointment)
            .where(Appointment.patient_id == patient_id)
            .options(
                selectinload(Appointment.facility),
                selectinload(Appointment.service),
                selectinload(Appointment.slot),
            )
            .order_by(Appointment.appointment_date.desc(), Appointment.start_time.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_appointments_by_facility(self, facility_id: int) -> List[Appointment]:
        """Fetch all appointments for a specific healthcare facility."""
        stmt = (
            select(Appointment)
            .where(Appointment.facility_id == facility_id)
            .options(
                selectinload(Appointment.patient),
                selectinload(Appointment.service),
            )
            .order_by(Appointment.appointment_date.asc(), Appointment.start_time.asc())
        )
        return list(self.db.scalars(stmt).all())

    def get_active_by_slot_id(self, slot_id: int) -> Optional[Appointment]:
        """Find any non-cancelled appointment booked for a specific availability slot."""
        stmt = (
            select(Appointment)
            .where(
                Appointment.availability_slot_id == slot_id,
                Appointment.status != "CANCELLED",
            )
        )
        return self.db.scalars(stmt).first()

    def create_appointment(
        self,
        patient_id: int,
        facility_id: int,
        service_id: int,
        availability_slot_id: int,
        appointment_date: str,
        start_time: str,
        end_time: str,
        status: str = "SCHEDULED",
    ) -> Appointment:
        """Create and persist a new Appointment."""
        return self.create(
            patient_id=patient_id,
            facility_id=facility_id,
            service_id=service_id,
            availability_slot_id=availability_slot_id,
            appointment_date=appointment_date,
            start_time=start_time,
            end_time=end_time,
            status=status,
        )

    def update_status(self, appointment_id: int, status: str) -> Optional[Appointment]:
        """Update the status of an existing appointment."""
        appointment = self.get_by_id(appointment_id)
        if not appointment:
            return None
        appointment.status = status
        self.db.flush()
        self.db.refresh(appointment)
        return appointment
