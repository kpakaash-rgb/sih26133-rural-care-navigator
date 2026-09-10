"""
models/voice_encounter.py
=========================
SQLAlchemy ORM model for Telephone Voice IVR Patient Encounters.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import Boolean, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class VoiceEncounter(Base, TimestampMixin):
    """
    Telephone Voice IVR interaction record for clinical triage and care navigation.

    Attributes:
        id:                 Unique primary key ID.
        patient_id:         Optional foreign key referencing the registered Patient.
        phone_number:       Caller phone number from telephony headers/metadata.
        stream_sid:         Exotel audio stream identifier.
        call_sid:           Exotel call session identifier.
        language:           Interaction language ('en-IN', 'hi-IN').
        symptoms:           Extracted clinical symptoms (comma-separated).
        symptom_duration:   Reported duration of symptoms (e.g. '3 days').
        triage_urgency:     Clinical urgency level ('routine', 'needs_attention', 'emergency').
        triage_reason:      Clinical rationale returned by run_triage().
        emergency:          Flag indicating emergency safety escalation.
        locality:           Caller's reported village / town / locality.
        facility_id:        Foreign key referencing the recommended Healthcare Facility.
        facility_name:      Name of the recommended healthcare facility.
        booking_intent:     Appointment booking request ('PHONE', 'OFFLINE', 'NONE').
        appointment_id:     Optional foreign key referencing a created Appointment.
        transcript_summary: Summary of dialogue turns.
        interaction_source: Channel origin (default 'VOICE_IVR').
    """

    __tablename__ = "voice_encounters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    patient_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    phone_number: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, index=True)
    stream_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    call_sid: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    language: Mapped[str] = mapped_column(String(10), default="en-IN", nullable=False)
    symptoms: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    symptom_duration: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    triage_urgency: Mapped[Optional[str]] = mapped_column(String(30), nullable=True, index=True)
    triage_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    emergency: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    locality: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    facility_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("facilities.id", ondelete="SET NULL"), nullable=True, index=True
    )
    facility_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    booking_intent: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("appointments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    transcript_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    interaction_source: Mapped[str] = mapped_column(String(30), default="VOICE_IVR", nullable=False)

    # Extended Structured Intake Fields
    patient_name: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    additional_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    recommended_care_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    appointment_type: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)

    patient = relationship("Patient")
    facility = relationship("Facility")
    appointment = relationship("Appointment")

    def __repr__(self) -> str:
        return (
            f"<VoiceEncounter id={self.id} phone={self.phone_number} "
            f"urgency={self.triage_urgency} emergency={self.emergency} locality={self.locality}>"
        )
