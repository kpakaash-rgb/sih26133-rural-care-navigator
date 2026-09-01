"""
models/mobile_clinic.py
=======================
SQLAlchemy ORM model for Mobile Medical Units and Clinics.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.database.base import Base, TimestampMixin


class MobileClinic(Base, TimestampMixin):
    """
    Mobile Medical Unit (MMU) providing doorstep healthcare delivery in rural clusters.

    Attributes:
        id:           Unique primary key ID.
        name:         Name of mobile medical unit/van.
        organization: Operating agency or district health department.
        district:     Operating district.
        address:      Base location or route depot.
        latitude:     Current/base latitude coordinate.
        longitude:    Current/base longitude coordinate.
        service_area: Gram Panchayats / villages covered.
        services:     Medical services offered on board.
        schedule:     Weekly / monthly operating schedule.
        contact:      Helpline / supervisor phone number.
        status:       Operational status ('ACTIVE', 'INACTIVE').
    """

    __tablename__ = "mobile_clinics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    organization: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    address: Mapped[Optional[str]] = mapped_column(String(300), nullable=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    service_area: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    services: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    schedule: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contact: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE", nullable=False, index=True)

    def __repr__(self) -> str:
        return f"<MobileClinic id={self.id} name={self.name!r} district={self.district!r}>"
