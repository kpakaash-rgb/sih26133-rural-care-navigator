"""
services/appointment_service.py
===============================
Business logic for Patient Appointment booking, cancellation, and validation.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import ConflictError, NotFoundError, ValidationAppError
from backend.app.models.appointment import Appointment
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.patient_repository import PatientRepository


class AppointmentService:
    """Service handling atomic appointment reservations and patient schedule management."""

    def __init__(
        self,
        appointment_repo: AppointmentRepository,
        facility_repo: FacilityRepository,
        availability_repo: AvailabilityRepository,
        patient_repo: PatientRepository,
        health_journey_repo: Optional[HealthJourneyRepository] = None,
    ):
        self.appointment_repo = appointment_repo
        self.facility_repo = facility_repo
        self.availability_repo = availability_repo
        self.patient_repo = patient_repo
        self.health_journey_repo = health_journey_repo


    def _format_appointment(self, appt: Appointment) -> Dict[str, Any]:
        """Format an Appointment ORM instance into an API dictionary response."""
        return {
            "id": appt.id,
            "patient_id": appt.patient_id,
            "facility_id": appt.facility_id,
            "facility_name": appt.facility.name if appt.facility else None,
            "facility": {
                "id": appt.facility.id,
                "name": appt.facility.name,
                "type": appt.facility.type,
                "address": appt.facility.address,
                "district": appt.facility.district,
            }
            if appt.facility
            else None,
            "service_id": appt.service_id,
            "service_name": appt.service.name if appt.service else None,
            "service": {
                "id": appt.service.id,
                "name": appt.service.name,
                "description": appt.service.description,
            }
            if appt.service
            else None,
            "availability_slot_id": appt.availability_slot_id,
            "appointment_date": appt.appointment_date,
            "start_time": appt.start_time,
            "end_time": appt.end_time,
            "status": appt.status,
            "created_at": appt.created_at,
        }

    def book_appointment(
        self,
        patient_id: int,
        facility_id: int,
        service_id: int,
        availability_slot_id: int,
    ) -> Dict[str, Any]:
        """
        Book an available appointment time slot for the authenticated patient.

        Validation Steps:
          1. Verify patient exists.
          2. Verify facility exists.
          3. Verify service exists and belongs to the facility.
          4. Verify availability slot exists and matches facility/service.
          5. Verify slot status is 'AVAILABLE'.
          6. Prevent double-booking.
          7. Atomically create appointment and transition slot status to 'BOOKED'.
        """
        # 1. Patient verification
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        # 2. Facility verification
        facility = self.facility_repo.get_by_id(facility_id)
        if not facility:
            raise NotFoundError(f"Healthcare facility with ID {facility_id} not found.")

        # 3 & 4. Service verification and facility ownership
        service = self.facility_repo.get_service_by_id(service_id)
        if not service:
            raise NotFoundError(f"Service with ID {service_id} not found.")
        if service.facility_id != facility_id:
            raise ValidationAppError(
                f"Service '{service.name}' (ID {service_id}) does not belong to facility ID {facility_id}."
            )

        # 5 & 6. Availability slot verification
        slot = self.availability_repo.get_by_id(availability_slot_id)
        if not slot:
            raise NotFoundError(f"Availability slot with ID {availability_slot_id} not found.")
        if slot.facility_id != facility_id:
            raise ValidationAppError(
                f"Availability slot ID {availability_slot_id} does not belong to facility ID {facility_id}."
            )
        if slot.service_id is not None and slot.service_id != service_id:
            raise ValidationAppError(
                f"Availability slot ID {availability_slot_id} is assigned to service ID {slot.service_id}, not {service_id}."
            )

        # 7 & 8. Slot status & double-booking prevention
        if slot.status != "AVAILABLE":
            raise ConflictError(
                f"The requested time slot is {slot.status.lower()} and cannot be booked."
            )

        existing_active = self.appointment_repo.get_active_by_slot_id(availability_slot_id)
        if existing_active:
            slot.status = "BOOKED"
            raise ConflictError("This time slot has already been booked.")

        # Mark slot as BOOKED
        slot.status = "BOOKED"

        # Create appointment record
        created = self.appointment_repo.create_appointment(
            patient_id=patient_id,
            facility_id=facility_id,
            service_id=service_id,
            availability_slot_id=availability_slot_id,
            appointment_date=slot.date,
            start_time=slot.start_time,
            end_time=slot.end_time,
            status="SCHEDULED",
        )

        appointment = self.appointment_repo.get_by_id_with_relations(created.id) or created

        # Automatically emit APPOINTMENT Health Journey event
        if self.health_journey_repo:
            self.health_journey_repo.create_event(
                patient_id=patient_id,
                event_type="APPOINTMENT",
                title="Doctor Appointment",
                description=f"Consultation scheduled at {facility.name} - {service.name}",
                event_date=slot.date,
                facility_id=facility_id,
                appointment_id=appointment.id,
            )

        return self._format_appointment(appointment)



    def get_patient_appointments(self, patient_id: int) -> List[Dict[str, Any]]:
        """Fetch all appointments belonging strictly to the authenticated patient."""
        appointments = self.appointment_repo.get_appointments_by_patient(patient_id)
        return [self._format_appointment(a) for a in appointments]

    def get_appointment_by_id(self, appointment_id: int, patient_id: int) -> Dict[str, Any]:
        """
        Fetch a specific appointment by ID, enforcing patient ownership.

        Returns 404 if not found or if the appointment belongs to another patient.
        """
        appointment = self.appointment_repo.get_by_id_with_relations(appointment_id)
        if not appointment or appointment.patient_id != patient_id:
            raise NotFoundError(f"Appointment with ID {appointment_id} not found.")

        return self._format_appointment(appointment)

    def cancel_appointment(self, appointment_id: int, patient_id: int) -> Dict[str, Any]:
        """
        Cancel an existing appointment and release its availability slot back to 'AVAILABLE'.

        Enforces patient ownership and prevents re-cancellation of already cancelled appointments.
        """
        appointment = self.appointment_repo.get_by_id_with_relations(appointment_id)
        if not appointment or appointment.patient_id != patient_id:
            raise NotFoundError(f"Appointment with ID {appointment_id} not found.")

        if appointment.status == "CANCELLED":
            raise ValidationAppError("Appointment is already cancelled.")

        # Update appointment status
        appointment.status = "CANCELLED"

        # Release the availability slot back to AVAILABLE
        if appointment.availability_slot_id:
            slot = self.availability_repo.get_by_id(appointment.availability_slot_id)
            if slot:
                slot.status = "AVAILABLE"

        self.appointment_repo.db.flush()
        self.appointment_repo.db.refresh(appointment)

        return self._format_appointment(appointment)
