"""
models/referral.py
==================
SQLAlchemy ORM model for Healthcare Referrals.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Referral(Base, TimestampMixin):
    """
    Patient referral record directing patients to appropriate care centres.

    Attributes:
        id:               Unique primary key ID.
        patient_id:       Foreign key referencing the Patient.
        from_facility_id: Optional source facility where referral originated.
        to_facility_id:   Destination healthcare facility.
        appointment_id:   Optional linked prior consultation appointment.
        reason:           Clinical rationale or symptoms requiring escalation.
        priority:         Urgency level ('ROUTINE', 'URGENT', 'EMERGENCY').
        status:           Workflow status ('PENDING', 'ACCEPTED', 'COMPLETED', 'CANCELLED').
    """

    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    from_facility_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    to_facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(String(20), default="ROUTINE", nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)

    patient = relationship("Patient")
    from_facility = relationship("Facility", foreign_keys=[from_facility_id])
    to_facility = relationship("Facility", foreign_keys=[to_facility_id])
    appointment = relationship("Appointment", foreign_keys=[appointment_id])

    def __repr__(self) -> str:
        return (
            f"<Referral id={self.id} patient_id={self.patient_id} "
            f"to_facility_id={self.to_facility_id} priority={self.priority} status={self.status}>"
        )
