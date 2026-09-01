"""
schemas/health_journey.py
=========================
Pydantic schemas for Patient Health Journey timeline queries.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict


class HealthJourneyEventResponse(BaseModel):
    """Response item for a Health Journey timeline event."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    event_type: str
    title: str
    description: Optional[str] = None
    event_date: str
    facility_id: Optional[int] = None
    appointment_id: Optional[int] = None
    referral_id: Optional[int] = None
    created_at: Optional[datetime] = None
