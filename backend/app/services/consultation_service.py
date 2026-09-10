"""
services/consultation_service.py
================================
Business logic for Doctor Consultations, Doctor Dashboard, Patient Queue,
and Clinical Summaries with AI-Assisted Triage.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from ai.triage.triage import run_triage
from backend.app.core.exceptions import (
    AuthorizationError,
    NotFoundError,
    ValidationAppError,
)
from backend.app.models.consultation import Consultation
from backend.app.models.doctor import Doctor
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.consultation_repository import ConsultationRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.repositories.screening_repository import ScreeningRepository
from backend.app.schemas.consultation import ConsultationCreate
from backend.app.services.referral_service import ReferralService


class ConsultationService:
    """Service managing doctor consultations, clinical triage review, and queues."""

    def __init__(
        self,
        consultation_repo: ConsultationRepository,
        patient_repo: PatientRepository,
        facility_repo: FacilityRepository,
        appointment_repo: AppointmentRepository,
        screening_repo: ScreeningRepository,
        follow_up_repo: FollowUpRepository,
        referral_repo: ReferralRepository,
        health_journey_repo: HealthJourneyRepository,
        queue_repo: Optional[HospitalQueueRepository] = None,
        referral_service: Optional[ReferralService] = None,
    ):
        self.consultation_repo = consultation_repo
        self.patient_repo = patient_repo
        self.facility_repo = facility_repo
        self.appointment_repo = appointment_repo
        self.screening_repo = screening_repo
        self.follow_up_repo = follow_up_repo
        self.referral_repo = referral_repo
        self.health_journey_repo = health_journey_repo
        self.queue_repo = queue_repo
        self.referral_service = referral_service

    def _format_consultation(self, c: Consultation) -> Dict[str, Any]:
        """Serialize a Consultation ORM model into a clean dictionary."""
        return {
            "id": c.id,
            "patient_id": c.patient_id,
            "doctor_id": c.doctor_id,
            "facility_id": c.facility_id,
            "appointment_id": c.appointment_id,
            "notes": c.notes,
            "assessment": c.assessment,
            "advice": c.advice,
            "prescription": c.prescription,
            "follow_up_required": c.follow_up_required,
            "follow_up_date": c.follow_up_date,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "updated_at": c.updated_at.isoformat() if c.updated_at else None,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Consultation Creation & Retrieval
    # ──────────────────────────────────────────────────────────────────────────

    def create_consultation(
        self,
        doctor: Doctor,
        payload: ConsultationCreate,
    ) -> Dict[str, Any]:
        """
        Record a doctor consultation.

        Automations:
          1. Validates patient existence.
          2. Marks linked appointment as COMPLETED.
          3. Emits 'CONSULTATION_COMPLETED' event to Patient Health Journey.
          4. If follow_up_required is True, creates a FollowUp record and timeline event.
        """
        patient = self.patient_repo.get_by_id(payload.patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {payload.patient_id} not found.")

        # Optional appointment validation
        if payload.appointment_id is not None:
            appt = self.appointment_repo.get_by_id(payload.appointment_id)
            if not appt:
                raise NotFoundError(f"Linked appointment with ID {payload.appointment_id} not found.")
            if appt.patient_id != payload.patient_id:
                raise ValidationAppError("Linked appointment does not belong to this patient.")
            if appt.facility_id != doctor.facility_id:
                raise AuthorizationError("Cannot complete an appointment belonging to another facility.")
            # Mark appointment completed
            self.appointment_repo.update_status(appt.id, "COMPLETED")

        # Persist consultation
        consultation = self.consultation_repo.create_consultation(
            patient_id=payload.patient_id,
            doctor_id=doctor.doctor_id,
            doctor_pk=doctor.id,
            facility_id=doctor.facility_id,
            appointment_id=payload.appointment_id,
            notes=payload.notes,
            assessment=payload.assessment,
            advice=payload.advice,
            prescription=payload.prescription,
            follow_up_required=payload.follow_up_required,
            follow_up_date=payload.follow_up_date,
        )

        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # 3. Create Health Journey Event: CONSULTATION_COMPLETED
        if self.health_journey_repo:
            desc = (
                f"Consultation with {doctor.name} ({doctor.specialization or 'General Medicine'}). "
                f"Assessment: {payload.assessment or 'Routine consultation completed.'}"
            )
            self.health_journey_repo.create_event(
                patient_id=payload.patient_id,
                event_type="CONSULTATION_COMPLETED",
                title="Doctor Consultation Completed",
                description=desc,
                event_date=today_str,
                facility_id=doctor.facility_id,
                appointment_id=payload.appointment_id,
            )

        # 4. Create FollowUp record if requested
        if payload.follow_up_required and payload.follow_up_date:
            self.follow_up_repo.create_follow_up(
                patient_id=payload.patient_id,
                follow_up_date=payload.follow_up_date,
                notes=payload.advice or payload.assessment or "Doctor recommended follow-up checkup",
                appointment_id=payload.appointment_id,
                status="PENDING",
            )
            if self.health_journey_repo:
                self.health_journey_repo.create_event(
                    patient_id=payload.patient_id,
                    event_type="FOLLOW_UP",
                    title="Follow-Up Scheduled",
                    description=f"Follow-up checkup scheduled for {payload.follow_up_date}",
                    event_date=payload.follow_up_date,
                    facility_id=doctor.facility_id,
                    appointment_id=payload.appointment_id,
                )

        return self._format_consultation(consultation)

    def get_consultation_by_id(
        self,
        consultation_id: int,
        doctor: Doctor,
    ) -> Dict[str, Any]:
        """Fetch a specific consultation record with facility isolation check."""
        consultation = self.consultation_repo.get_with_relations(consultation_id)
        if not consultation:
            raise NotFoundError(f"Consultation with ID {consultation_id} not found.")

        if consultation.facility_id != doctor.facility_id:
            raise AuthorizationError("Access denied: Consultation belongs to another facility.")

        return self._format_consultation(consultation)

    def get_patient_consultations(
        self,
        patient_id: int,
        doctor: Doctor,
    ) -> List[Dict[str, Any]]:
        """List past consultations for a patient."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        consultations = self.consultation_repo.get_by_patient(patient_id)
        return [self._format_consultation(c) for c in consultations]

    # ──────────────────────────────────────────────────────────────────────────
    # Doctor Dashboard Metrics
    # ──────────────────────────────────────────────────────────────────────────

    def get_doctor_dashboard(self, doctor: Doctor) -> Dict[str, Any]:
        """
        Aggregate live dashboard metrics for the authenticated doctor's facility.
        Does not invent statistics — reflects real DB records.
        """
        facility = self.facility_repo.get_by_id(doctor.facility_id)
        facility_name = facility.name if facility else "Primary Health Centre"
        today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        # Today's appointments at doctor's facility
        facility_appts = self.appointment_repo.get_appointments_by_facility(doctor.facility_id)
        today_appts = [a for a in facility_appts if a.appointment_date == today_str]
        today_count = len(today_appts)

        # Waiting patients from hospital queue or active scheduled appts
        waiting_count = 0
        est_wait_minutes = 0
        queue_status = "NORMAL"
        if self.queue_repo:
            q = self.queue_repo.find_by_facility_id(doctor.facility_id)
            if q:
                waiting_count = q.waiting_patients
                est_wait_minutes = q.estimated_wait_minutes
                queue_status = q.status
            else:
                waiting_count = len([a for a in facility_appts if a.status in ("SCHEDULED", "WAITING")])
                est_wait_minutes = waiting_count * 15
        else:
            waiting_count = len([a for a in facility_appts if a.status in ("SCHEDULED", "WAITING")])
            est_wait_minutes = waiting_count * 15

        # Completed consultations for doctor's facility
        completed_count = self.consultation_repo.count_by_facility(doctor.facility_id)

        # Urgent / priority count (URGENT/EMERGENCY screenings or referrals)
        screenings = self.screening_repo.db.query(self.screening_repo.model).filter_by(facility_id=doctor.facility_id).all()
        urgent_screenings = [s for s in screenings if (s.triage_level or "").upper() in ("URGENT", "EMERGENCY")]
        urgent_count = len(urgent_screenings)

        # Recent appointments preview
        preview_appts = []
        for a in facility_appts[:5]:
            p = a.patient
            preview_appts.append({
                "id": a.id,
                "patient_id": a.patient_id,
                "patient_name": p.full_name if p else f"Patient #{a.patient_id}",
                "appointment_date": a.appointment_date,
                "time": f"{a.start_time} - {a.end_time}",
                "status": a.status,
                "service_name": a.service.name if a.service else "General Medicine",
            })

        return {
            "doctor": {
                "id": doctor.id,
                "doctor_id": doctor.doctor_id,
                "name": doctor.name,
                "specialization": doctor.specialization or "General Medicine",
                "facility_id": doctor.facility_id,
                "facility_name": facility_name,
                "role": doctor.role,
            },
            "today_appointments_count": today_count,
            "waiting_patients_count": waiting_count,
            "urgent_cases_count": urgent_count,
            "completed_consultations_count": completed_count,
            "estimated_wait_minutes": est_wait_minutes,
            "queue_status": queue_status,
            "recent_appointments": preview_appts,
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Doctor Patient Queue
    # ──────────────────────────────────────────────────────────────────────────

    def get_doctor_queue(self, doctor: Doctor) -> List[Dict[str, Any]]:
        """
        Retrieve live patients currently queued for consultation at doctor's facility.
        Sorts priority: EMERGENCY -> HIGH / URGENT -> NORMAL.
        """
        # 1. Fetch appointments scheduled at doctor's facility
        appts = self.appointment_repo.get_appointments_by_facility(doctor.facility_id)
        active_appts = [a for a in appts if a.status in ("SCHEDULED", "WAITING")]

        # 2. Fetch patients belonging to or screened at this facility
        facility_patients = self.patient_repo.list_patients(facility_id=doctor.facility_id, limit=30)

        # Set of seen patient IDs
        seen_patient_ids = set()
        queue_items: List[Dict[str, Any]] = []

        # Process appointments first
        for a in active_appts:
            if a.patient_id in seen_patient_ids:
                continue
            seen_patient_ids.add(a.patient_id)
            patient = a.patient or self.patient_repo.get_by_id(a.patient_id)
            if not patient:
                continue

            latest_scr = self.screening_repo.get_latest_by_patient(patient.id)
            triage_str = (latest_scr.triage_level or "ROUTINE").upper() if latest_scr else "ROUTINE"

            priority = "NORMAL"
            if triage_str in ("EMERGENCY", "CRITICAL"):
                priority = "EMERGENCY"
            elif triage_str in ("URGENT", "ATTENTION", "HIGH"):
                priority = "URGENT"

            queue_items.append({
                "patient_id": patient.id,
                "patient_code": f"P{patient.id:04d}",
                "name": patient.full_name or f"Patient #{patient.id}",
                "mobile": patient.mobile,
                "age": patient.age,
                "gender": patient.gender,
                "village": patient.village or "Solapur Rural",
                "appointment_id": a.id,
                "appointment_time": f"{a.start_time} - {a.end_time}",
                "appointment_date": a.appointment_date,
                "status": a.status,
                "priority": priority,
                "triage_level": triage_str,
                "chief_complaint": (latest_scr.symptoms or latest_scr.notes if latest_scr else None) or "Scheduled OPD visit",
                "wait_time_minutes": 10,
            })

        # Process screened or assigned patients who haven't completed consultation today
        for p in facility_patients:
            if p.id in seen_patient_ids:
                continue
            seen_patient_ids.add(p.id)

            latest_scr = self.screening_repo.get_latest_by_patient(p.id)
            triage_str = (latest_scr.triage_level or "ROUTINE").upper() if latest_scr else "ROUTINE"

            priority = "NORMAL"
            if triage_str in ("EMERGENCY", "CRITICAL"):
                priority = "EMERGENCY"
            elif triage_str in ("URGENT", "ATTENTION", "HIGH"):
                priority = "URGENT"

            queue_items.append({
                "patient_id": p.id,
                "patient_code": f"P{p.id:04d}",
                "name": p.full_name or f"Patient #{p.id}",
                "mobile": p.mobile,
                "age": p.age,
                "gender": p.gender,
                "village": p.village or "Solapur Rural",
                "appointment_id": None,
                "appointment_time": None,
                "appointment_date": None,
                "status": "WAITING",
                "priority": priority,
                "triage_level": triage_str,
                "chief_complaint": (latest_scr.symptoms or latest_scr.notes if latest_scr else None) or "Field screened patient",
                "wait_time_minutes": 15,
            })

        # Sort priority: EMERGENCY (0) -> URGENT (1) -> NORMAL (2)
        priority_order = {"EMERGENCY": 0, "URGENT": 1, "HIGH": 1, "NORMAL": 2, "ROUTINE": 2}
        queue_items.sort(key=lambda item: priority_order.get(item["priority"], 2))

        return queue_items

    # ──────────────────────────────────────────────────────────────────────────
    # Patient Clinical Summary (with AI-Assisted Triage)
    # ──────────────────────────────────────────────────────────────────────────

    def get_patient_clinical_summary(
        self,
        patient_id: int,
        doctor: Optional[Doctor] = None,
    ) -> Dict[str, Any]:
        """
        Aggregate complete clinical profile for a patient:
        - Demographics
        - Worker field vitals & symptoms
        - AI-assisted symptom triage (with mandatory disclaimer)
        - Historical visits, appointments, consultations, and referrals
        """
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        # Latest field worker screening
        latest_scr = self.screening_repo.get_latest_by_patient(patient_id)
        screening_data = None
        symptoms_list: List[str] = []
        screening_notes = ""

        if latest_scr:
            raw_symptoms = latest_scr.symptoms or ""
            if isinstance(raw_symptoms, str):
                symptoms_list = [s.strip() for s in raw_symptoms.split(",") if s.strip()]
            screening_notes = latest_scr.notes or ""

            screening_data = {
                "id": latest_scr.id,
                "worker_id": latest_scr.worker_id,
                "temperature": latest_scr.temperature,
                "systolic_bp": latest_scr.systolic_bp,
                "diastolic_bp": latest_scr.diastolic_bp,
                "blood_pressure": (
                    f"{latest_scr.systolic_bp}/{latest_scr.diastolic_bp} mmHg"
                    if latest_scr.systolic_bp and latest_scr.diastolic_bp
                    else None
                ),
                "heart_rate": latest_scr.heart_rate,
                "spo2": latest_scr.spo2,
                "symptoms": symptoms_list,
                "notes": latest_scr.notes,
                "triage_level": latest_scr.triage_level,
                "screened_at": latest_scr.screened_at.isoformat() if latest_scr.screened_at else None,
            }

        # Run AI-Assisted Triage engine
        triage_result = run_triage(
            symptoms=symptoms_list if symptoms_list else ["General weakness"],
            description=screening_notes,
        )

        ai_triage = {
            "urgency": triage_result.urgency,
            "recommended_care": triage_result.recommended_care,
            "reason": triage_result.reason,
            "emergency": triage_result.emergency,
            "disclaimer": "AI-assisted triage. Final clinical decision remains with the healthcare professional.",
            "is_decision_support_only": True,
        }

        # Previous consultations
        past_consultations = self.consultation_repo.get_by_patient(patient_id)
        formatted_consultations = [self._format_consultation(c) for c in past_consultations]

        # Appointments
        appts = self.appointment_repo.get_appointments_by_patient(patient_id)
        formatted_appts = [
            {
                "id": a.id,
                "date": a.appointment_date,
                "time": f"{a.start_time} - {a.end_time}",
                "status": a.status,
                "facility_name": a.facility.name if a.facility else None,
                "service_name": a.service.name if a.service else None,
            }
            for a in appts
        ]

        # Referrals
        refs = self.referral_repo.get_referrals_by_patient(patient_id)
        formatted_refs = [
            {
                "id": r.id,
                "from_facility": r.from_facility.name if r.from_facility else None,
                "to_facility": r.to_facility.name if r.to_facility else None,
                "reason": r.reason,
                "priority": r.priority,
                "status": r.status,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in refs
        ]

        # Follow-ups
        follow_ups = self.follow_up_repo.get_follow_ups_by_patient(patient_id)
        formatted_follow_ups = [
            {
                "id": f.id,
                "follow_up_date": f.follow_up_date,
                "notes": f.notes,
                "status": f.status,
            }
            for f in follow_ups
        ]

        # Timeline events
        timeline_events = self.health_journey_repo.get_events_by_patient(patient_id)
        formatted_timeline = [
            {
                "id": e.id,
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "event_date": e.event_date,
            }
            for e in timeline_events
        ]

        # Voice IVR triage encounter
        voice_enc_data = None
        try:
            from backend.app.repositories.voice_encounter_repository import VoiceEncounterRepository
            voice_repo = VoiceEncounterRepository(self.consultation_repo.db)
            latest_enc = voice_repo.get_latest_by_patient(patient_id)
            if latest_enc:
                syms_list = [s.strip() for s in latest_enc.symptoms.split(",")] if latest_enc.symptoms else []
                voice_enc_data = {
                    "id": latest_enc.id,
                    "phone_number": latest_enc.phone_number,
                    "caller_phone": latest_enc.phone_number,
                    "language": latest_enc.language,
                    "symptoms": syms_list if syms_list else latest_enc.symptoms,
                    "symptom_duration": latest_enc.symptom_duration,
                    "triage_urgency": latest_enc.triage_urgency,
                    "triage_reason": latest_enc.triage_reason,
                    "emergency": latest_enc.emergency,
                    "is_emergency": latest_enc.emergency,
                    "locality": latest_enc.locality,
                    "facility_name": latest_enc.facility_name,
                    "recommended_facility_name": latest_enc.facility_name,
                    "booking_intent": latest_enc.booking_intent,
                    "appointment_id": latest_enc.appointment_id,
                    "transcript_summary": latest_enc.transcript_summary,
                    "created_at": latest_enc.created_at.isoformat() if latest_enc.created_at else None,
                    "patient_name": latest_enc.patient_name,
                    "age": latest_enc.age,
                    "gender": latest_enc.gender,
                    "severity": latest_enc.severity,
                    "additional_notes": latest_enc.additional_notes,
                    "recommended_care_level": latest_enc.recommended_care_level,
                    "appointment_type": latest_enc.appointment_type,
                }
        except Exception:
            pass

        return {
            "patient": {
                "id": patient.id,
                "patient_code": f"P{patient.id:04d}",
                "name": patient.full_name or f"Patient #{patient.id}",
                "mobile": patient.mobile,
                "age": patient.age,
                "gender": patient.gender,
                "village": patient.village,
                "district": patient.district,
                "facility_id": patient.facility_id,
                "abha_number": patient.abha_number,
            },
            "screening": screening_data,
            "voice_encounter": voice_enc_data,
            "ai_triage": ai_triage,
            "history": {
                "consultations": formatted_consultations,
                "appointments": formatted_appts,
                "referrals": formatted_refs,
                "follow_ups": formatted_follow_ups,
                "timeline": formatted_timeline,
            },
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Doctor Referral Creation
    # ──────────────────────────────────────────────────────────────────────────

    def create_referral(
        self,
        doctor: Doctor,
        patient_id: int,
        to_facility_id: int,
        reason: str,
        priority: str = "ROUTINE",
        appointment_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Create a referral from the doctor's facility to a destination centre."""
        if self.referral_service:
            return self.referral_service.create_referral(
                patient_id=patient_id,
                to_facility_id=to_facility_id,
                reason=reason,
                priority=priority,
                appointment_id=appointment_id,
                from_facility_id=doctor.facility_id,
            )

        # Fallback to direct repo creation
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        dest = self.facility_repo.get_by_id(to_facility_id)
        if not dest:
            raise NotFoundError(f"Destination facility {to_facility_id} not found.")

        ref = self.referral_repo.create_referral(
            patient_id=patient_id,
            to_facility_id=to_facility_id,
            from_facility_id=doctor.facility_id,
            reason=reason,
            priority=priority.upper(),
            appointment_id=appointment_id,
            status="PENDING",
        )
        return {
            "id": ref.id,
            "patient_id": ref.patient_id,
            "from_facility_id": ref.from_facility_id,
            "to_facility_id": ref.to_facility_id,
            "reason": ref.reason,
            "priority": ref.priority,
            "status": ref.status,
        }
