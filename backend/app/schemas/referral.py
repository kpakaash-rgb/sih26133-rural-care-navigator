"""
schemas/referral.py
===================
Pydantic schemas for Patient Referral requests and responses.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ReferralCreate(BaseModel):
    """Payload for POST /api/v1/referrals."""

    to_facility_id: int = Field(..., description="Target destination facility ID", examples=[2])
    reason: str = Field(..., min_length=3, description="Clinical reason for referral", examples=["Requires specialist evaluation"])
    priority: Optional[str] = Field("ROUTINE", description="Priority: ROUTINE, URGENT, EMERGENCY", examples=["ROUTINE"])
    appointment_id: Optional[int] = Field(None, description="Optional associated appointment ID", examples=[1])
    from_facility_id: Optional[int] = Field(None, description="Optional originating facility ID", examples=[1])


class ReferralFacilityInfo(BaseModel):
    """Embedded facility details for referral responses."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    type: str
    district: str
    address: Optional[str] = None


class ReferralResponse(BaseModel):
    """Response representation for a referral."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    from_facility_id: Optional[int] = None
    from_facility: Optional[ReferralFacilityInfo] = None
    to_facility_id: int
    to_facility: Optional[ReferralFacilityInfo] = None
    appointment_id: Optional[int] = None
    reason: str
    priority: str
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
