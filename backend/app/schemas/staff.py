"""
schemas/staff.py
================
Pydantic schemas for Unified Healthcare Staff (Doctors & Frontline Workers) authentication and profiles.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class StaffLoginRequest(BaseModel):
    """Payload for healthcare staff authentication (Doctors & Frontline Workers)."""
    staff_id: str = Field(..., min_length=2, description="Staff ID (e.g. 'FHW-20841', 'DOC-10101') or registered mobile number")
    password: str = Field(..., min_length=4, description="Staff password / PIN")


class StaffProfileResponse(BaseModel):
    """Authenticated profile representation of a healthcare staff member."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    staff_id: str
    name: str
    mobile: str
    role: str
    facility_id: int
    facility_name: Optional[str] = None
    specialization: Optional[str] = None


class StaffAuthResponse(BaseModel):
    """Response containing JWT and staff profile upon successful authentication."""
    access_token: str
    token_type: str = "bearer"
    role: str
    user: StaffProfileResponse
