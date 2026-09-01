"""
models/appointment.py
=====================
SQLAlchemy ORM model for Patient Appointments.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Appointment(Base, TimestampMixin):
    """
    Appointment booking record for healthcare consultations.

    Attributes:
        id:                   Unique primary key ID.
        patient_id:           Foreign key referencing the Patient.
        facility_id:          Foreign key referencing the Healthcare Facility.
        service_id:           Foreign key referencing the Facility Service.
        availability_slot_id: Foreign key referencing the booked Availability Slot.
        appointment_date:     Date in YYYY-MM-DD format.
        start_time:           Start time in HH:MM format.
        end_time:             End time in HH:MM format.
        status:               Booking status ('SCHEDULED', 'COMPLETED', 'CANCELLED').
    """

    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facility_services.id", ondelete="CASCADE"), nullable=False, index=True
    )
    availability_slot_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("availability_slots.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="SCHEDULED", nullable=False, index=True)

    patient = relationship("Patient")
    facility = relationship("Facility")
    service = relationship("FacilityService")
    slot = relationship("AvailabilitySlot")

    def __repr__(self) -> str:
        return (
            f"<Appointment id={self.id} patient_id={self.patient_id} "
            f"facility_id={self.facility_id} date={self.appointment_date} status={self.status}>"
        )
