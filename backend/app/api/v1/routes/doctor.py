"""
api/v1/routes/doctor.py
=======================
Doctor Clinical Portal routes.

Endpoints:
  GET  /api/v1/doctor/dashboard                        — Live facility and OPD dashboard metrics
  GET  /api/v1/doctor/queue                            — Facility queue prioritized by clinical urgency
  GET  /api/v1/doctor/patients/{patient_id}/clinical-summary — Complete clinical record with AI-assisted triage
  POST /api/v1/doctor/consultations                    — Record consultation, advice, & prescription
  GET  /api/v1/doctor/consultations/{id}               — View consultation details
  GET  /api/v1/doctor/patients/{patient_id}/consultations — View patient consultation history
  POST /api/v1/doctor/referrals                        — Create inter-facility referral
  GET  /api/v1/doctor/appointments                     — Facility appointments schedule
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.exceptions import NotFoundError
from backend.app.core.response import success_response
from backend.app.core.security import TokenData, get_current_doctor
from backend.app.database.connection import get_db
from backend.app.models.doctor import Doctor
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.consultation_repository import ConsultationRepository
from backend.app.repositories.doctor_repository import DoctorRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.repositories.screening_repository import ScreeningRepository
from backend.app.schemas.consultation import ConsultationCreate
from backend.app.schemas.referral import ReferralCreate
from backend.app.services.consultation_service import ConsultationService
from backend.app.services.referral_service import ReferralService

router = APIRouter(prefix="/doctor", tags=["Doctor"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Providers
# ──────────────────────────────────────────────────────────────────────────────

def get_consultation_service(db: Session = Depends(get_db)) -> ConsultationService:
    consultation_repo = ConsultationRepository(db)
    patient_repo = PatientRepository(db)
    facility_repo = FacilityRepository(db)
    appointment_repo = AppointmentRepository(db)
    screening_repo = ScreeningRepository(db)
    follow_up_repo = FollowUpRepository(db)
    referral_repo = ReferralRepository(db)
    health_journey_repo = HealthJourneyRepository(db)
    queue_repo = HospitalQueueRepository(db)

    referral_service = ReferralService(
        referral_repo=referral_repo,
        facility_repo=facility_repo,
        patient_repo=patient_repo,
        appointment_repo=appointment_repo,
        health_journey_repo=health_journey_repo,
    )

    return ConsultationService(
        consultation_repo=consultation_repo,
        patient_repo=patient_repo,
        facility_repo=facility_repo,
        appointment_repo=appointment_repo,
        screening_repo=screening_repo,
        follow_up_repo=follow_up_repo,
        referral_repo=referral_repo,
        health_journey_repo=health_journey_repo,
        queue_repo=queue_repo,
        referral_service=referral_service,
    )


def resolve_doctor(
    current_doctor: TokenData = Depends(get_current_doctor),
    db: Session = Depends(get_db),
) -> Doctor:
    """Resolve the authenticated doctor entity from the validated JWT token."""
    doctor_repo = DoctorRepository(db)
    doctor = doctor_repo.find_by_doctor_id(current_doctor.user_id)
    if not doctor:
        try:
            doc_pk = int(current_doctor.user_id)
            doctor = doctor_repo.get_by_id(doc_pk)
        except (ValueError, TypeError):
            doctor = None

    if not doctor:
        if current_doctor.user_id in ("DOC-10101", "DOC10101"):
            return doctor_repo.get_or_create_demo_doctor()
        raise NotFoundError("Doctor account not found.")

    return doctor


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/dashboard", summary="Doctor live dashboard metrics")
async def get_doctor_dashboard(
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """
    Retrieve real facility metrics:
    - Today's appointment count
    - Waiting patients
    - Urgent/priority cases
    - Completed consultations
    """
    stats = consultation_service.get_doctor_dashboard(doctor)
    return success_response(
        data=stats,
        message="Doctor dashboard metrics retrieved successfully",
    )


@router.get("/queue", summary="Doctor live patient queue")
async def get_doctor_queue(
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """
    Retrieve patients currently waiting for consultation at the doctor's facility.
    Strictly isolates patients to the doctor's assigned facility.
    Prioritizes EMERGENCY -> HIGH / URGENT -> NORMAL.
    """
    queue_list = consultation_service.get_doctor_queue(doctor)
    return success_response(
        data=queue_list,
        message="Doctor patient queue retrieved successfully",
    )


@router.get("/patients/{patient_id}/clinical-summary", summary="Patient clinical summary")
async def get_patient_clinical_summary(
    patient_id: int,
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """
    Retrieve patient demographics, latest worker screening vitals,
    AI-assisted triage analysis (with clinical disclaimer), and prior visits.
    """
    summary = consultation_service.get_patient_clinical_summary(
        patient_id=patient_id,
        doctor=doctor,
    )
    return success_response(
        data=summary,
        message="Patient clinical summary retrieved successfully",
    )


@router.post("/consultations", summary="Submit consultation record")
async def create_consultation(
    payload: ConsultationCreate,
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """
    Record clinical findings, assessment, advice, and prescription.
    Automatically:
    - Marks appointment as COMPLETED.
    - Emits CONSULTATION_COMPLETED event to Patient Health Journey.
    - Schedules follow-up checkup if requested.
    """
    consultation = consultation_service.create_consultation(
        doctor=doctor,
        payload=payload,
    )
    return success_response(
        data=consultation,
        message="Consultation completed and saved successfully",
    )


@router.get("/consultations/{consultation_id}", summary="Get consultation details")
async def get_consultation(
    consultation_id: int,
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """Retrieve details for a specific consultation record."""
    consultation = consultation_service.get_consultation_by_id(
        consultation_id=consultation_id,
        doctor=doctor,
    )
    return success_response(
        data=consultation,
        message="Consultation retrieved successfully",
    )


@router.get("/patients/{patient_id}/consultations", summary="Get patient consultations history")
async def get_patient_consultations(
    patient_id: int,
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """List historical consultations for a patient."""
    consultations = consultation_service.get_patient_consultations(
        patient_id=patient_id,
        doctor=doctor,
    )
    return success_response(
        data=consultations,
        message="Patient consultations retrieved successfully",
    )


@router.post("/referrals", summary="Create referral from doctor")
async def create_doctor_referral(
    payload: ReferralCreate,
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """
    Create a patient referral to a specialized or district facility.
    Originates from doctor's assigned facility and logs REFERRAL event in health journey.
    """
    if not payload.patient_id:
        from backend.app.core.exceptions import ValidationAppError
        raise ValidationAppError("patient_id is required to create a doctor referral.")

    referral = consultation_service.create_referral(
        doctor=doctor,
        patient_id=payload.patient_id,
        to_facility_id=payload.to_facility_id,
        reason=payload.reason,
        priority=payload.priority or "ROUTINE",
        appointment_id=payload.appointment_id,
    )
    return success_response(
        data=referral,
        message="Doctor referral created successfully",
    )


@router.get("/appointments", summary="Doctor facility appointments")
async def get_doctor_appointments(
    doctor: Doctor = Depends(resolve_doctor),
    consultation_service: ConsultationService = Depends(get_consultation_service),
):
    """Retrieve all appointments scheduled at the doctor's facility."""
    appts = consultation_service.appointment_repo.get_appointments_by_facility(doctor.facility_id)
    data = [
        {
            "id": a.id,
            "patient_id": a.patient_id,
            "patient_name": a.patient.full_name if a.patient else f"Patient #{a.patient_id}",
            "appointment_date": a.appointment_date,
            "time": f"{a.start_time} - {a.end_time}",
            "status": a.status,
            "service_name": a.service.name if a.service else "General Medicine",
        }
        for a in appts
    ]
    return success_response(
        data=data,
        message="Facility appointments retrieved successfully",
    )
