"""
schemas/screening.py
====================
Pydantic schemas for Patient Field Health Screenings.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ScreeningCreate(BaseModel):
    """Payload for submitting a field screening intake."""
    temperature: Optional[float] = Field(None, ge=25.0, le=45.0, description="Body temp in Celsius")
    systolic_bp: Optional[int] = Field(None, ge=40, le=300, description="Systolic BP mmHg")
    diastolic_bp: Optional[int] = Field(None, ge=30, le=200, description="Diastolic BP mmHg")
    heart_rate: Optional[int] = Field(None, ge=30, le=250, description="Heart rate bpm")
    spo2: Optional[float] = Field(None, ge=0.0, le=100.0, description="Oxygen SpO2 %")
    symptoms: Optional[List[str]] = Field(default_factory=list, description="List of observed symptoms")
    notes: Optional[str] = Field(None, max_length=2000, description="Field notes / audio transcript")
    triage_level: Optional[str] = Field("ROUTINE", description="Triage guidance level ('ROUTINE', 'ATTENTION', 'URGENT')")


class ScreeningResponse(BaseModel):
    """Screening record response schema."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    facility_id: Optional[int] = None
    worker_id: Optional[str] = None
    temperature: Optional[float] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    spo2: Optional[float] = None
    symptoms: Optional[str] = None
    notes: Optional[str] = None
    triage_level: Optional[str] = "ROUTINE"
    screened_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
