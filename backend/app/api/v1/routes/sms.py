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
from fastapi import APIRouter, Depends, Request
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
    DemoInboundSMSRequest,
    DemoInboundSMSResponse,
    InboundSMSRequest,
    InboundSMSResponse,
)
from backend.app.services.sms_conversation_service import SMSConversationService
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


@router.post("/inbound", summary="Inbound SMS Gateway Webhook")
async def receive_inbound_sms(
    request: Request,
    db: Session = Depends(get_db),
    sms_service: SMSService = Depends(get_sms_service),
):
    """
    Provider-neutral Inbound SMS Webhook handler.
    Receives incoming SMS from basic phones, executes the two-way conversation state
    machine, and dispatches the outbound reply via the configured SMS gateway.
    """
    content_type = request.headers.get("content-type", "")
    data = {}
    if "application/json" in content_type:
        try:
            data = await request.json()
        except Exception:
            data = {}
    else:
        try:
            form = await request.form()
            data = dict(form)
        except Exception:
            try:
                data = await request.json()
            except Exception:
                data = {}

    mobile = (
        data.get("mobile")
        or data.get("sender")
        or data.get("from")
        or data.get("From")
        or data.get("msisdn")
        or ""
    )
    message = (
        data.get("message")
        or data.get("body")
        or data.get("text")
        or data.get("Body")
        or data.get("msg")
        or ""
    )
    provider_msg_id = (
        data.get("provider_message_id")
        or data.get("msg_id")
        or data.get("message_id")
        or data.get("id")
        or data.get("MessageSid")
    )

    conv_service = SMSConversationService(db)
    result = conv_service.process_inbound_message(
        mobile=str(mobile),
        message=str(message),
        provider_message_id=str(provider_msg_id) if provider_msg_id else None,
        is_demo=False,
    )

    outbound_ok = False
    if result.get("success") and result.get("reply") and mobile:
        dispatch = sms_service.send_sms(mobile=str(mobile), message=result["reply"])
        outbound_ok = dispatch.success

    return success_response(
        data={
            "success": result.get("success", False),
            "reply": result.get("reply", ""),
            "next_state": result.get("next_state", "UNKNOWN"),
            "demo_mode": False,
            "outbound_delivered": outbound_ok,
        },
        message="Inbound SMS processed successfully",
    )


@router.post("/inbound/demo", summary="Demo Inbound SMS simulator")
async def demo_inbound_sms(
    payload: DemoInboundSMSRequest,
    db: Session = Depends(get_db),
):
    """
    Safe demo sandbox endpoint executing the exact two-way SMS conversation service.
    Essential for live demonstrations and testing without real carrier credentials.
    """
    conv_service = SMSConversationService(db)
    result = conv_service.process_inbound_message(
        mobile=payload.mobile,
        message=payload.message,
        provider_message_id=payload.provider_message_id,
        is_demo=True,
    )

    return success_response(
        data={
            "demo_mode": True,
            "reply": result.get("reply", ""),
            "next_state": result.get("next_state", "UNKNOWN"),
            "mobile": payload.mobile,
            "conversation": result.get("conversation"),
        },
        message="Demo SMS processed",
    )
