"""
schemas/follow_up.py
====================
Pydantic schemas for Patient Follow-Up scheduling and updates.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class FollowUpCreate(BaseModel):
    """Payload for POST /api/v1/follow-ups."""

    appointment_id: Optional[int] = Field(None, description="Optional linked appointment ID", examples=[1])
    referral_id: Optional[int] = Field(None, description="Optional linked referral ID", examples=[1])
    follow_up_date: str = Field(..., description="Scheduled follow-up date in YYYY-MM-DD format", examples=["2026-09-10"])
    notes: Optional[str] = Field(None, description="Follow-up clinical notes or instructions", examples=["Review symptoms after consultation"])


class FollowUpResponse(BaseModel):
    """Response representation for a Follow-Up care item."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    appointment_id: Optional[int] = None
    referral_id: Optional[int] = None
    follow_up_date: str
    notes: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
