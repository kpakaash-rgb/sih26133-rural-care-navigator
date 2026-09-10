"""
repositories/voice_encounter_repository.py
==========================================
Data access operations for VoiceEncounter entities.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.voice_encounter import VoiceEncounter
from backend.app.repositories.base import BaseRepository


class VoiceEncounterRepository(BaseRepository[VoiceEncounter]):
    """Repository handling database operations for VoiceEncounter records."""

    def __init__(self, db: Session):
        super().__init__(VoiceEncounter, db)

    def create_encounter(
        self,
        phone_number: Optional[str] = None,
        patient_id: Optional[int] = None,
        stream_sid: Optional[str] = None,
        call_sid: Optional[str] = None,
        language: str = "en-IN",
        symptoms: Optional[str] = None,
        symptom_duration: Optional[str] = None,
        triage_urgency: Optional[str] = None,
        triage_reason: Optional[str] = None,
        emergency: bool = False,
        locality: Optional[str] = None,
        facility_id: Optional[int] = None,
        facility_name: Optional[str] = None,
        booking_intent: Optional[str] = None,
        appointment_id: Optional[int] = None,
        transcript_summary: Optional[str] = None,
        interaction_source: str = "VOICE_IVR",
        patient_name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        severity: Optional[str] = None,
        additional_notes: Optional[str] = None,
        recommended_care_level: Optional[str] = None,
        appointment_type: Optional[str] = None,
    ) -> VoiceEncounter:
        """Create and persist a telephone voice encounter record."""
        encounter = VoiceEncounter(
            phone_number=phone_number,
            patient_id=patient_id,
            stream_sid=stream_sid,
            call_sid=call_sid,
            language=language,
            symptoms=symptoms,
            symptom_duration=symptom_duration,
            triage_urgency=triage_urgency,
            triage_reason=triage_reason,
            emergency=emergency,
            locality=locality,
            facility_id=facility_id,
            facility_name=facility_name,
            booking_intent=booking_intent,
            appointment_id=appointment_id,
            transcript_summary=transcript_summary,
            interaction_source=interaction_source,
            patient_name=patient_name,
            age=age,
            gender=gender,
            severity=severity,
            additional_notes=additional_notes,
            recommended_care_level=recommended_care_level,
            appointment_type=appointment_type,
        )
        self.db.add(encounter)
        self.db.commit()
        self.db.refresh(encounter)
        return encounter

    def get_latest_by_patient(self, patient_id: int) -> Optional[VoiceEncounter]:
        """Fetch the most recent voice encounter for a patient."""
        stmt = (
            select(VoiceEncounter)
            .where(VoiceEncounter.patient_id == patient_id)
            .order_by(VoiceEncounter.created_at.desc())
            .limit(1)
        )
        res = self.db.scalars(stmt).first()
        if res:
            return res

        # Fallback to phone number match if caller was not linked at connect time
        from backend.app.models.patient import Patient
        pat = self.db.get(Patient, patient_id)
        if pat and pat.mobile:
            clean_phone = pat.mobile.replace("+91", "").replace("+", "").strip()[-10:]
            stmt_phone = (
                select(VoiceEncounter)
                .where(
                    (VoiceEncounter.phone_number == pat.mobile)
                    | (VoiceEncounter.phone_number.like(f"%{clean_phone}"))
                )
                .order_by(VoiceEncounter.created_at.desc())
                .limit(1)
            )
            return self.db.scalars(stmt_phone).first()
        return None

    def get_by_phone(self, phone_number: str) -> List[VoiceEncounter]:
        """Fetch all voice encounters associated with a phone number."""
        stmt = (
            select(VoiceEncounter)
            .where(VoiceEncounter.phone_number == phone_number)
            .order_by(VoiceEncounter.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def list_by_facility(self, facility_id: int, limit: int = 50) -> List[VoiceEncounter]:
        """Fetch recent voice encounters routed to a specific facility."""
        stmt = (
            select(VoiceEncounter)
            .where(VoiceEncounter.facility_id == facility_id)
            .order_by(VoiceEncounter.created_at.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
