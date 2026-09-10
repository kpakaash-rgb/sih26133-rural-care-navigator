"""
models/doctor.py
================
SQLAlchemy ORM model for Healthcare Doctors and Medical Officers.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Doctor(Base, TimestampMixin):
    """
    Doctor / Medical Officer entity.

    Attributes:
        id:             Unique primary key ID.
        doctor_id:      Official doctor identifier (e.g., 'DOC-10101').
        name:           Full name of the doctor.
        mobile:         Registered mobile number.
        role:           Role designation ('DOCTOR').
        specialization: Clinical specialization (e.g. 'General Medicine').
        facility_id:    Healthcare facility association.
        password_hash:  Optional hashed password for doctor portal authentication.
    """

    __tablename__ = "doctors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    doctor_id: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(30), default="DOCTOR", nullable=False)
    specialization: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, default="General Medicine")
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    facility = relationship("Facility")

    def __repr__(self) -> str:
        return f"<Doctor id={self.id} doctor_id={self.doctor_id} name={self.name} facility_id={self.facility_id}>"
