"""
schemas/mobile_clinic.py
========================
Pydantic schemas for Mobile Medical Unit and Clinic discovery.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class MobileClinicResponse(BaseModel):
    """Response representation of a Mobile Medical Unit."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    organization: Optional[str] = None
    district: str
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    service_area: Optional[str] = None
    services: Optional[str] = None
    schedule: Optional[str] = None
    contact: Optional[str] = None
    status: str
    distance_km: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
