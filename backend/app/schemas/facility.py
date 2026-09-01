"""
schemas/facility.py
===================
Pydantic schemas for Healthcare Facilities, Services, and Availability Slots.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class FacilityServiceResponse(BaseModel):
    """Schema representing a service provided by a healthcare facility."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    facility_id: int
    name: str
    description: Optional[str] = None
    available: bool = True


class FacilityResponse(BaseModel):
    """Schema representing healthcare facility details."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    address: str
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str = "ACTIVE"
    distance_km: Optional[float] = Field(
        None,
        description="Calculated distance in km from patient's location (if provided)",
    )
    services: List[FacilityServiceResponse] = []


class AvailabilitySlotResponse(BaseModel):
    """Schema representing a bookable consultation/service availability time slot."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    facility_id: int
    service_id: Optional[int] = None
    service_name: Optional[str] = None
    date: str = Field(..., description="Date in YYYY-MM-DD format", examples=["2026-09-02"])
    start_time: str = Field(..., description="Start time in HH:MM format", examples=["10:30"])
    end_time: str = Field(..., description="End time in HH:MM format", examples=["10:45"])
    status: str = Field("AVAILABLE", description="Slot status ('AVAILABLE', 'BOOKED', 'UNAVAILABLE')")
