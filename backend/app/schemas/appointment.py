"""
schemas/appointment.py
======================
Pydantic schemas for Patient Appointment creation, responses, and list queries.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class AppointmentCreate(BaseModel):
    """Payload for POST /api/v1/appointments."""

    facility_id: int = Field(..., description="Target Healthcare Facility ID", examples=[1])
    service_id: int = Field(..., description="Target Facility Service ID", examples=[1])
    availability_slot_id: int = Field(..., description="Available consultation time slot ID", examples=[1])


class AppointmentFacilityInfo(BaseModel):
    """Embedded facility details for appointment responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    address: str
    district: str


class AppointmentServiceInfo(BaseModel):
    """Embedded service details for appointment responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: Optional[str] = None


class AppointmentResponse(BaseModel):
    """Detailed response for a booked, retrieved, or cancelled appointment."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    facility_id: int
    facility_name: Optional[str] = None
    facility: Optional[AppointmentFacilityInfo] = None
    service_id: int
    service_name: Optional[str] = None
    service: Optional[AppointmentServiceInfo] = None
    availability_slot_id: int
    appointment_date: str
    start_time: str
    end_time: str
    status: str
    created_at: Optional[datetime] = None
