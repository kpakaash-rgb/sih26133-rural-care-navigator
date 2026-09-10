"""
models/screening.py
===================
SQLAlchemy ORM model for Frontline Patient Health Screenings.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Screening(Base, TimestampMixin):
    """
    Patient field health screening record.

    Attributes:
        id:           Unique primary key ID.
        patient_id:   Foreign key referencing Patient.
        facility_id:  Associated facility (PHC).
        worker_id:    Identifier or name of screening frontline worker.
        temperature:  Body temperature in Celsius.
        systolic_bp:  Systolic blood pressure in mmHg.
        diastolic_bp: Diastolic blood pressure in mmHg.
        heart_rate:   Heart rate in bpm.
        spo2:         Oxygen saturation percentage (0-100%).
        symptoms:     Observed or reported symptoms list / comma-separated string.
        notes:        Clinical / field observations or audio transcript note.
        triage_level: Preliminary guidance triage level ('ROUTINE', 'ATTENTION', 'URGENT').
        screened_at:  Timestamp of screening observation.
    """

    __tablename__ = "screenings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True
    )
    facility_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    worker_id: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    temperature: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    systolic_bp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    diastolic_bp: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    heart_rate: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    spo2: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    symptoms: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    triage_level: Mapped[Optional[str]] = mapped_column(String(30), default="ROUTINE", nullable=True)
    screened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )

    patient = relationship("Patient")
    facility = relationship("Facility")

    def __repr__(self) -> str:
        return f"<Screening id={self.id} patient_id={self.patient_id} triage_level={self.triage_level}>"
