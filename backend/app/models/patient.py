"""
models/patient.py
=================
SQLAlchemy ORM model for Patient entities in Rural Care Navigator.

Represents registered rural healthcare patients identified by unique mobile numbers.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base, TimestampMixin


class Patient(Base, TimestampMixin):
    """
    Patient entity.

    Attributes:
        id:          Unique integer primary key.
        mobile:      Unique 10-digit mobile number for authentication.
        full_name:   Full name of the patient (optional during early auth).
        district:    Home district for geographic triage and facility matching.
        abha_number: Optional 14-digit Ayushman Bharat Health Account ID.
        consent:     Explicit user consent for healthcare data processing.
    """

    __tablename__ = "patients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mobile: Mapped[str] = mapped_column(String(15), unique=True, index=True, nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    district: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    abha_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    consent: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    def __repr__(self) -> str:
        return f"<Patient id={self.id} mobile={self.mobile} name={self.full_name}>"
