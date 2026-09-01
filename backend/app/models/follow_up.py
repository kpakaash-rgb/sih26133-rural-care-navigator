"""
models/follow_up.py
===================
SQLAlchemy ORM model for Patient Follow-Up consultations.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class FollowUp(Base, TimestampMixin):
    """
    Follow-up care tracking record for monitoring patient recovery and re-examinations.

    Attributes:
        id:             Unique primary key ID.
        patient_id:     Foreign key referencing the Patient.
        appointment_id: Optional linked consultation appointment.
        referral_id:    Optional linked referral.
        follow_up_date: Scheduled follow-up date in YYYY-MM-DD format.
        notes:          Clinical or symptom notes for the follow-up.
        status:         Follow-up status ('PENDING', 'COMPLETED', 'CANCELLED').
    """

    __tablename__ = "follow_ups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    referral_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("referrals.id", ondelete="SET NULL"), nullable=True, index=True
    )
    follow_up_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="PENDING", nullable=False, index=True)

    patient = relationship("Patient")
    appointment = relationship("Appointment")
    referral = relationship("Referral")

    def __repr__(self) -> str:
        return (
            f"<FollowUp id={self.id} patient_id={self.patient_id} "
            f"date={self.follow_up_date} status={self.status}>"
        )
