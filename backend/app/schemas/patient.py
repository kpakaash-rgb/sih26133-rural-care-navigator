"""
schemas/patient.py
==================
Pydantic schemas for Patient intake, profiles, and listing.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class PatientCreate(BaseModel):
    """Schema for worker patient intake registration."""
    full_name: str = Field(..., min_length=3, max_length=100, description="Full name of patient")
    mobile: str = Field(..., pattern=r"^\d{10}$", description="10-digit mobile number")
    age: Optional[int] = Field(None, ge=0, le=120, description="Age in years")
    gender: Optional[str] = Field(None, description="Gender (Female / Male / Other)")
    district: Optional[str] = Field(None, description="Home district")
    village: Optional[str] = Field(None, description="Village / Sector")
    abha_number: Optional[str] = Field(None, description="Optional ABHA ID")
    consent: bool = Field(True, description="Patient consent")


class PatientResponse(BaseModel):
    """Public patient profile schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    full_name: Optional[str] = None
    mobile: str
    age: Optional[int] = None
    gender: Optional[str] = None
    district: Optional[str] = None
    village: Optional[str] = None
    facility_id: Optional[int] = None
    abha_number: Optional[str] = None
    created_at: Optional[datetime] = None
