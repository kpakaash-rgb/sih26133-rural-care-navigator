"""
models/health_journey.py
========================
SQLAlchemy ORM model for Patient Health Journey timeline events.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base


class HealthJourneyEvent(Base):
    """
    Chronological care timeline event tracking patient interactions across the healthcare journey.

    Attributes:
        id:             Unique primary key ID.
        patient_id:     Foreign key referencing the Patient.
        event_type:     Category ('REGISTRATION', 'TRIAGE', 'APPOINTMENT', 'REFERRAL', 'FOLLOW_UP', 'CARE_COMPLETED').
        title:          Brief headline of the event.
        description:    Optional detailed narrative or findings.
        event_date:     Date of event in YYYY-MM-DD format.
        facility_id:    Optional related healthcare facility.
        appointment_id: Optional related appointment.
        referral_id:    Optional related referral.
        created_at:     Timestamp when the log was generated.
    """

    __tablename__ = "health_journey_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(String(30), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    event_date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    facility_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True
    )
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True
    )
    referral_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("referrals.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("Patient")
    facility = relationship("Facility")
    appointment = relationship("Appointment")
    referral = relationship("Referral")

    def __repr__(self) -> str:
        return (
            f"<HealthJourneyEvent id={self.id} patient_id={self.patient_id} "
            f"event_type={self.event_type} title={self.title!r} date={self.event_date}>"
        )
