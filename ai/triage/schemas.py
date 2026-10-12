from __future__ import annotations
from typing import Literal, Optional
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


class TranscribeResponse(BaseModel):
    transcript: str = Field(..., description="Recognized speech transcript.")
    language: str = Field(..., description="Normalized language code (e.g. ta-IN, hi-IN, mr-IN, en-IN).")
    demo_mode: bool = Field(default=False, description="Whether transcription was generated in demo mode.")
    provider: str = Field(default="sarvam", description="Speech-to-text provider name.")


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to synthesize into speech.")
    language: str = Field(default="ta-IN", description="Language code (e.g. ta-IN, hi-IN, mr-IN, en-IN).")
    speaker: Optional[str] = Field(default=None, description="Optional speaker identifier.")
    sample_rate: Optional[int] = Field(default=None, description="Audio sample rate (e.g. 8000, 16000, 22050).")


class TTSResponse(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded synthesized audio.")
    mime_type: str = Field(default="audio/wav", description="Audio MIME type.")
    language: str = Field(..., description="Language code used for synthesis.")
    sample_rate: int = Field(default=8000, description="Audio sample rate.")
    provider: str = Field(default="sarvam", description="TTS provider name.")