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

class TriageResult(BaseModel):
    urgency: UrgencyLevel
    recommended_care: str
    reason: str
    emergency: bool