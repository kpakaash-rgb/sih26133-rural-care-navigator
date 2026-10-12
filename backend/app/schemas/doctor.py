"""
schemas/doctor.py
=================
Pydantic schemas for Doctor Directory public discovery, details, and filtering.
"""

from __future__ import annotations

from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DoctorPublicResponse(BaseModel):
    """Schema representing a healthcare doctor / medical officer in the public directory."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    doctor_id: str = Field(..., description="Official doctor identifier (e.g. 'DOC-10101')")
    name: str = Field(..., description="Doctor full name with title")
    specialization: Optional[str] = Field("General Medicine", description="Clinical department or specialty")
    qualification: Optional[str] = Field("MBBS", description="Medical degrees / qualifications")
    experience_years: Optional[int] = Field(5, description="Years of clinical practice experience")
    facility_id: int = Field(..., description="Associated healthcare facility ID")
    facility_name: Optional[str] = Field(None, description="Name of the healthcare facility")
    facility_type: Optional[str] = Field(None, description="Facility type (PHC, CHC, DH, MMU)")
    facility_address: Optional[str] = Field(None, description="Physical address or route of the facility")
    languages: List[str] = Field(default_factory=lambda: ["mr", "hi", "en"], description="Languages spoken by the doctor")
    opd_timings: Optional[str] = Field("09:00 AM - 02:00 PM", description="Consultation hours")
    opd_room: Optional[str] = Field("OPD-1", description="Assigned room / clinic section")
    available_today: bool = Field(True, description="Whether the doctor is currently on duty today")
    bio: Optional[str] = Field(None, description="Brief professional bio and care focus")
