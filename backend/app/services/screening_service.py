"""
services/screening_service.py
=============================
Business logic for Patient Field Screenings and Health Observations.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Union

from backend.app.core.exceptions import NotFoundError, ValidationAppError
from backend.app.models.screening import Screening
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.screening_repository import ScreeningRepository


class ScreeningService:
    """Service handling patient screening persistence and journey timeline logging."""

    def __init__(
        self,
        screening_repo: ScreeningRepository,
        patient_repo: PatientRepository,
        journey_repo: Optional[HealthJourneyRepository] = None,
    ):
        self.screening_repo = screening_repo
        self.patient_repo = patient_repo
        self.journey_repo = journey_repo

    def create_screening(
        self,
        patient_id: int,
        worker_id: Optional[str] = None,
        facility_id: Optional[int] = None,
        temperature: Optional[float] = None,
        systolic_bp: Optional[int] = None,
        diastolic_bp: Optional[int] = None,
        heart_rate: Optional[int] = None,
        spo2: Optional[float] = None,
        symptoms: Optional[Union[List[str], str]] = None,
        notes: Optional[str] = None,
        triage_level: Optional[str] = None,
    ) -> Screening:
        """
        Record and persist a frontline field screening observation.
        """
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found")

        # Format symptoms to JSON/comma string
        symptoms_str = ""
        if isinstance(symptoms, list):
            symptoms_str = ", ".join(symptoms)
        elif isinstance(symptoms, str):
            symptoms_str = symptoms

        # Determine/normalize triage level (observation guidance only)
        level = (triage_level or "ROUTINE").upper()
        if (temperature and temperature >= 38.5) or (spo2 and spo2 < 92) or (systolic_bp and systolic_bp >= 140):
            if level == "ROUTINE":
                level = "ATTENTION"
        if (spo2 and spo2 < 90) or (systolic_bp and systolic_bp >= 160):
            level = "URGENT"

        screening = self.screening_repo.create(
            patient_id=patient_id,
            facility_id=facility_id,
            worker_id=worker_id,
            temperature=temperature,
            systolic_bp=systolic_bp,
            diastolic_bp=diastolic_bp,
            heart_rate=heart_rate,
            spo2=spo2,
            symptoms=symptoms_str,
            notes=notes,
            triage_level=level,
            screened_at=datetime.now(timezone.utc),
        )

        # Log to patient health journey timeline
        if self.journey_repo:
            vitals_desc = []
            if temperature: vitals_desc.append(f"Temp: {temperature}°C")
            if systolic_bp and diastolic_bp: vitals_desc.append(f"BP: {systolic_bp}/{diastolic_bp}")
            if spo2: vitals_desc.append(f"SpO2: {spo2}%")
            vitals_summary = ", ".join(vitals_desc) if vitals_desc else "Field observations noted"

            self.journey_repo.create_event(
                patient_id=patient_id,
                event_type="SCREENING",
                title="Field Health Screening",
                description=f"{vitals_summary} (Triage: {level}) recorded by Worker {worker_id or ''}.",
                event_date=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                facility_id=facility_id,
            )

        return screening

    def get_latest_screening(self, patient_id: int) -> Optional[Screening]:
        """Fetch latest screening for a patient."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found")
        return self.screening_repo.get_latest_by_patient(patient_id)
