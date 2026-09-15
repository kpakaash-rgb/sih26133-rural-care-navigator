from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, Field

UrgencyLevel = Literal[
    "emergency",
    "needs_attention",
    "routine",
]

class TriageRequest(BaseModel):
    symptoms: list[str] = Field(
        default_factory=list,
        description="Symptoms selected or reported by the patient.",
    )
    description: str = Field(
        default="",
        description="Patient's description of their current problem.",
    )
    duration_days: int = Field(
        default=1,
        ge=1,
        le=30,
        description="Duration of reported symptoms in days (1-30).",
    )

class TriageResult(BaseModel):
    urgency: UrgencyLevel
    recommended_care: str
    reason: str
    emergency: bool
    symptoms: list[str] = Field(
        default_factory=list,
        description="Canonical normalized symptom categories evaluated.",
    )
    duration_days: int = Field(
        default=1,
        description="Duration in days considered during triage decision support.",
    )