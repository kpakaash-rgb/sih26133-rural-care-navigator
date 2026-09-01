"""
models/facility.py
==================
SQLAlchemy ORM models for Healthcare Facilities and Facility Services.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class Facility(Base, TimestampMixin):
    """
    Healthcare Facility entity.

    Attributes:
        id:        Unique integer primary key.
        name:      Name of the facility (e.g. 'PHC Malshiras').
        type:      Type classification (e.g. 'PRIMARY_HEALTH_CENTRE', 'COMMUNITY_HEALTH_CENTRE', 'DISTRICT_HOSPITAL').
        address:   Physical address / village / town.
        district:  District name (e.g. 'Solapur').
        latitude:  Geographic latitude coordinate.
        longitude: Geographic longitude coordinate.
        status:    Operational status (e.g. 'ACTIVE', 'INACTIVE').
        services:  List of services provided by this facility.
    """

    __tablename__ = "facilities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    district: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    latitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    longitude: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    status: Mapped[str] = mapped_column(String(30), default="ACTIVE", nullable=False)

    services: Mapped[List[FacilityService]] = relationship(
        "FacilityService",
        back_populates="facility",
        cascade="all, delete-orphan",
    )
    availability_slots: Mapped[List[AvailabilitySlot]] = relationship(
        "AvailabilitySlot",
        back_populates="facility",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<Facility id={self.id} name={self.name} type={self.type}>"


class FacilityService(Base, TimestampMixin):
    """
    Service offered by a healthcare facility.

    Attributes:
        id:          Unique integer primary key.
        facility_id: Foreign key linking to the parent facility.
        name:        Service name (e.g. 'General Medicine', 'Basic Tests', 'Doctor Consultation').
        description: Detailed description of the service.
        available:   Whether the service is currently operational.
    """

    __tablename__ = "facility_services"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    facility_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    available: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    facility: Mapped[Facility] = relationship("Facility", back_populates="services")
    availability_slots: Mapped[List[AvailabilitySlot]] = relationship(
        "AvailabilitySlot",
        back_populates="service",
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return f"<FacilityService id={self.id} name={self.name} facility_id={self.facility_id}>"
