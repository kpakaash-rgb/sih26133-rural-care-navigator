"""
schemas/consultation.py
=======================
Pydantic request and response schemas for Doctor Consultations.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class ConsultationCreate(BaseModel):
    """Payload for creating a Doctor Consultation."""

    patient_id: int = Field(..., description="Target patient ID", examples=[1])
    appointment_id: Optional[int] = Field(None, description="Optional associated appointment ID", examples=[1])
    notes: Optional[str] = Field(None, description="Clinical examination observations", examples=["Patient presents with fever and fatigue."])
    assessment: Optional[str] = Field(None, description="Clinical assessment / provisional diagnosis", examples=["Viral syndrome, mild dehydration."])
    advice: Optional[str] = Field(None, description="Doctor advice and lifestyle/diet instructions", examples=["Oral rehydration, adequate rest, avoid exertion."])
    prescription: Optional[str] = Field(None, description="Prescribed medications and instructions", examples=["Tab Paracetamol 500mg TDS x 3 days, ORS sachets."])
    follow_up_required: bool = Field(False, description="Flag indicating if a follow-up checkup is required")
    follow_up_date: Optional[str] = Field(None, description="Follow-up date in YYYY-MM-DD format", examples=["2026-09-12"])


class ConsultationResponse(BaseModel):
    """Response schema for a Doctor Consultation."""

    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    doctor_id: str
    facility_id: int
    appointment_id: Optional[int] = None
    notes: Optional[str] = None
    assessment: Optional[str] = None
    advice: Optional[str] = None
    prescription: Optional[str] = None
    follow_up_required: bool = False
    follow_up_date: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
