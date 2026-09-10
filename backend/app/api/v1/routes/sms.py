"""
api/v1/routes/sms.py
====================
Patient Care Summary SMS dispatch and preview endpoints.

Endpoints:
  POST /api/v1/sms/care-summary — Dispatch care summary SMS to authenticated patient
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.v1.routes.auth import get_current_patient
from backend.app.core.config import settings
from backend.app.core.exceptions import AuthorizationError, NotFoundError
from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.schemas.sms import (
    CareSummarySMSRequest,
    CareSummarySMSResponse,
)
from backend.app.services.sms_service import SMSService

router = APIRouter(prefix="/sms", tags=["SMS Notifications"])


def get_sms_service() -> SMSService:
    return SMSService()


def _is_queue_stale(last_updated: Optional[datetime]) -> bool:
    if not last_updated:
        return False
    now = datetime.now(timezone.utc) if last_updated.tzinfo else datetime.utcnow()
    diff_minutes = (now - last_updated).total_seconds() / 60
    return diff_minutes > 120


@router.post("/care-summary", summary="Send care summary via SMS to authenticated patient")
async def send_care_summary_sms(
    payload: CareSummarySMSRequest,
    patient: Patient = Depends(get_current_patient),
    db: Session = Depends(get_db),
    sms_service: SMSService = Depends(get_sms_service),
):
    """
    Send an authoritative care summary SMS to the authenticated patient's registered mobile number.

    Security & Privacy Guarantees:
      - Recipient mobile is strictly derived from the verified patient database record.
      - Appointments and referrals are authorization-checked against patient ID.
      - Demo mode returns safe SMS preview without claiming real carrier delivery.
    """
    mobile = patient.mobile
    masked_mobile = f"{mobile[:2]}XXXX{mobile[-4:]}" if len(mobile) >= 6 else "XXXXXX"

    # 1. Resolve Facility
    facility_repo = FacilityRepository(db)
    facility = None
    if payload.facility_id:
        facility = facility_repo.get_by_id(payload.facility_id)
        if not facility:
            raise NotFoundError(f"Facility #{payload.facility_id} not found")

    # 2. Resolve Appointment (Authorization Checked)
    appointment = None
    if payload.appointment_id:
        appointment_repo = AppointmentRepository(db)
        appointment = appointment_repo.get_by_id(payload.appointment_id)
        if not appointment:
            raise NotFoundError(f"Appointment #{payload.appointment_id} not found")
        if appointment.patient_id != patient.id:
            raise AuthorizationError("You are not authorized to send details for this appointment")
        if not facility and appointment.facility:
            facility = appointment.facility

    # 3. Resolve Referral (Authorization Checked)
    referral = None
    if payload.referral_id:
        referral_repo = ReferralRepository(db)
        referral = referral_repo.get_by_id(payload.referral_id)
        if not referral:
            raise NotFoundError(f"Referral #{payload.referral_id} not found")
        if referral.patient_id != patient.id:
            raise AuthorizationError("You are not authorized to send details for this referral")
        if not facility and referral.to_facility:
            facility = referral.to_facility

    # 4. Resolve Live Facility Queue
    queue = None
    if facility:
        queue_repo = HospitalQueueRepository(db)
        queue = queue_repo.find_by_facility_id(facility.id)

    # 5. Build Concise Authoritative SMS Message
    lines = ["Rural Care Navigator:"]

    if payload.emergency_guidance:
        lines.append("EMERGENCY: Immediate medical attention required. For emergency ambulance call 108.")

    if facility:
        lines.append(f"Facility: {facility.name}")

    if appointment:
        date_str = (
            appointment.appointment_date.strftime("%d %b %Y")
            if hasattr(appointment.appointment_date, "strftime")
            else str(appointment.appointment_date)
        )
        lines.append(f"Appointment: {date_str} at {appointment.slot_time}")
        if appointment.service:
            lines.append(f"Service: {appointment.service.name}")

    if referral:
        dest_name = referral.to_facility.name if referral.to_facility else "Designated Facility"
        lines.append(f"Referral: Ref #{referral.id} ({referral.priority}) to {dest_name}")

    if queue:
        if _is_queue_stale(queue.last_updated):
            lines.append(f"Queue: {queue.waiting_patients} waiting (Queue info may be outdated)")
        else:
            lines.append(f"Queue: {queue.waiting_patients} waiting (~{queue.estimated_wait_minutes} min wait)")

    lines.append("Informational guidance only. For help call facility directly.")
    sms_text = "\n".join(lines)

    # 6. Dispatch through SMS Service
    dispatch_result = sms_service.send_sms(mobile=mobile, message=sms_text)

    is_demo = bool(settings.OTP_DEMO_MODE or settings.SMS_PROVIDER == "console" or not settings.SMS_ENABLED)

    if is_demo:
        response_data = CareSummarySMSResponse(
            success=True,
            message=f"Care details prepared in demo mode for registered mobile {masked_mobile}.",
            demo_mode=True,
            sms_preview=sms_text,
            recipient_masked=masked_mobile,
            delivery_status="DEMO_PREPARED",
        )
    elif dispatch_result.success:
        response_data = CareSummarySMSResponse(
            success=True,
            message=f"Care details sent to your registered mobile number {masked_mobile}.",
            demo_mode=False,
            sms_preview=None,
            recipient_masked=masked_mobile,
            delivery_status="SENT",
        )
    else:
        response_data = CareSummarySMSResponse(
            success=False,
            message=f"Unable to send SMS: {dispatch_result.error or 'SMS provider error'}",
            demo_mode=False,
            sms_preview=None,
            recipient_masked=masked_mobile,
            delivery_status="FAILED",
        )

    return success_response(
        data=response_data.model_dump(),
        message=response_data.message,
    )
