"""
models/consultation.py
======================
SQLAlchemy ORM model for Doctor Patient Consultations.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Consultation(Base, TimestampMixin):
    """
    Doctor clinical consultation record.

    Attributes:
        id:                 Unique primary key ID.
        patient_id:         Foreign key referencing the Patient.
        doctor_id:          Doctor official identifier (e.g. 'DOC-10101').
        doctor_pk:          Optional foreign key referencing Doctor table primary key.
        facility_id:        Healthcare facility where consultation took place.
        appointment_id:     Optional linked appointment.
        notes:              Clinical examination observations.
        assessment:         Clinical assessment or provisional diagnosis.
        advice:             Doctor's advice, instructions, or care plan.
        prescription:       Medications and dosage regimen.
        follow_up_required: Boolean flag indicating if follow-up checkup is required.
        follow_up_date:     Scheduled follow-up date in YYYY-MM-DD format.
    """

    __tablename__ = "consultations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    doctor_id: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    doctor_pk: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("doctors.id", ondelete="SET NULL"), nullable=True, index=True
    )
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    assessment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    advice: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prescription: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    follow_up_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    follow_up_date: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)

    patient = relationship("Patient")
    facility = relationship("Facility")
    appointment = relationship("Appointment")
    doctor = relationship("Doctor", foreign_keys=[doctor_pk])

    def __repr__(self) -> str:
        return (
            f"<Consultation id={self.id} patient_id={self.patient_id} "
            f"doctor_id={self.doctor_id} facility_id={self.facility_id}>"
        )
