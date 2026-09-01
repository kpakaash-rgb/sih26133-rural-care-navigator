"""
models/availability.py
======================
SQLAlchemy ORM model for Facility Appointment Availability / Time Slots.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class AvailabilitySlot(Base, TimestampMixin):
    """
    Time slot available for consultation or testing at a facility.

    Attributes:
        id:          Unique integer primary key.
        facility_id: Foreign key linking to the parent facility.
        service_id:  Optional foreign key linking to a specific facility service.
        date:        Date string in YYYY-MM-DD format.
        start_time:  Start time string in HH:MM format (e.g. '10:30').
        end_time:    End time string in HH:MM format (e.g. '10:45').
        status:      Availability status ('AVAILABLE', 'BOOKED', 'UNAVAILABLE').
    """

    __tablename__ = "availability_slots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    service_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("facility_services.id", ondelete="CASCADE"), nullable=True, index=True
    )
    date: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    start_time: Mapped[str] = mapped_column(String(10), nullable=False)
    end_time: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="AVAILABLE", nullable=False, index=True)

    facility: Mapped[Facility] = relationship("Facility", back_populates="availability_slots")
    service: Mapped[Optional[FacilityService]] = relationship("FacilityService", back_populates="availability_slots")

    def __repr__(self) -> str:
        return (
            f"<AvailabilitySlot id={self.id} facility_id={self.facility_id} "
            f"date={self.date} {self.start_time}-{self.end_time} status={self.status}>"
        )
