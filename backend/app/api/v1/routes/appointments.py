"""
api/v1/routes/appointments.py
=============================
Patient Appointment booking, inquiry, and cancellation routes.

Endpoints:
  POST /api/v1/appointments              — Book a consultation slot
  GET  /api/v1/appointments              — List authenticated patient's appointments
  GET  /api/v1/appointments/{id}         — Get details of a specific appointment
  POST /api/v1/appointments/{id}/cancel  — Cancel an appointment and release its slot
"""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.v1.routes.auth import get_current_patient
from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.schemas.appointment import (
    AppointmentCreate,
    AppointmentResponse,
)
from backend.app.services.appointment_service import AppointmentService

router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_appointment_service(db: Session = Depends(get_db)) -> AppointmentService:
    """Dependency provider for AppointmentService."""
    appointment_repo = AppointmentRepository(db)
    facility_repo = FacilityRepository(db)
    availability_repo = AvailabilityRepository(db)
    patient_repo = PatientRepository(db)
    health_journey_repo = HealthJourneyRepository(db)
    return AppointmentService(
        appointment_repo=appointment_repo,
        facility_repo=facility_repo,
        availability_repo=availability_repo,
        patient_repo=patient_repo,
        health_journey_repo=health_journey_repo,
    )



# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.post("", summary="Book an appointment slot")
async def book_appointment(
    payload: AppointmentCreate,
    patient: Patient = Depends(get_current_patient),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """
    Reserve an available consultation slot at a healthcare facility.

    Patient identity is strictly derived from the validated JWT token.
    """
    appointment = appointment_service.book_appointment(
        patient_id=patient.id,
        facility_id=payload.facility_id,
        service_id=payload.service_id,
        availability_slot_id=payload.availability_slot_id,
    )
    return success_response(
        data=appointment,
        message="Appointment booked successfully",
    )


@router.get("", summary="List authenticated patient's appointments")
async def get_patient_appointments(
    patient: Patient = Depends(get_current_patient),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """
    Retrieve all appointments belonging to the authenticated patient.

    Cross-patient appointment queries are strictly disallowed.
    """
    appointments = appointment_service.get_patient_appointments(patient_id=patient.id)
    return success_response(
        data=appointments,
        message="Patient appointments retrieved successfully",
    )


@router.get("/{appointment_id}", summary="Get appointment details")
async def get_appointment(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """
    Retrieve details for a specific appointment.

    Enforces patient ownership; returns 404 if the appointment belongs to another patient.
    """
    appointment = appointment_service.get_appointment_by_id(
        appointment_id=appointment_id,
        patient_id=patient.id,
    )
    return success_response(
        data=appointment,
        message="Appointment details retrieved successfully",
    )


@router.post("/{appointment_id}/cancel", summary="Cancel an appointment")
async def cancel_appointment(
    appointment_id: int,
    patient: Patient = Depends(get_current_patient),
    appointment_service: AppointmentService = Depends(get_appointment_service),
):
    """
    Cancel an appointment and release its availability slot back to AVAILABLE.

    Only the patient who booked the appointment can cancel it.
    """
    appointment = appointment_service.cancel_appointment(
        appointment_id=appointment_id,
        patient_id=patient.id,
    )
    return success_response(
        data=appointment,
        message="Appointment cancelled successfully",
    )
