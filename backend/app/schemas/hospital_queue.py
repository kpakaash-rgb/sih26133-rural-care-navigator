"""
schemas/hospital_queue.py
=========================
Pydantic schemas for Hospital Queue data transfers and updates.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HospitalQueueBase(BaseModel):
    """Base schema for hospital queue attributes."""

    waiting_patients: int = Field(
        ...,
        ge=0,
        description="Current count of patients waiting in facility queue",
    )
    estimated_wait_minutes: int = Field(
        ...,
        ge=0,
        description="Estimated queue wait time in minutes",
    )
    status: str = Field(
        default="NORMAL",
        description="Operational status of the queue (e.g. NORMAL, BUSY, CLOSED)",
    )


class HospitalQueueUpdate(HospitalQueueBase):
    """Schema for worker updates to a facility queue."""
    pass


class HospitalQueueResponse(HospitalQueueBase):
    """Schema for public queue status representation."""

    facility_id: int
    last_updated: datetime

    model_config = ConfigDict(from_attributes=True)
