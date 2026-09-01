"""
services/auth_service.py
========================
Business logic for OTP generation, hashing, verification, and patient authentication.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from backend.app.core.config import settings
from backend.app.core.exceptions import ExternalServiceError, NotFoundError, ValidationAppError
from backend.app.core.security import create_access_token
from backend.app.models.patient import Patient
from backend.app.repositories.otp_repository import OTPRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.services.sms_service import SMSService


class AuthService:
    """Service handling patient OTP generation, verification, and JWT issuance."""

    def __init__(
        self,
        otp_repo: OTPRepository,
        patient_repo: PatientRepository,
        sms_service: Optional[SMSService] = None,
    ):
        self.otp_repo = otp_repo
        self.patient_repo = patient_repo
        self.sms_service = sms_service or SMSService()

    def _hash_otp(self, mobile: str, otp: str) -> str:
        """Generate HMAC-SHA256 hash for OTP."""
        return hmac.new(
            settings.SECRET_KEY.encode(),
            f"{mobile}:{otp}".encode(),
            hashlib.sha256,
        ).hexdigest()

    def request_otp(self, mobile: str) -> Dict[str, Any]:
        """
        Generate and persist a new OTP for the given mobile number.

        Invalidates previous pending OTPs for the same number.
        In demo/development mode, demo_otp is provided for easy testing without real SMS.
        In production mode (OTP_DEMO_MODE=False, SMS_ENABLED=True), dispatches via SMS service.
        """
        # Invalidate any previously active OTPs for this number
        self.otp_repo.invalidate_otps_for_mobile(mobile)

        # Generate a secure 6-digit numeric OTP
        if settings.OTP_DEMO_MODE and settings.DEMO_OTP:
            otp_code = settings.DEMO_OTP
        else:
            otp_code = f"{secrets.randbelow(900000) + 100000}"

        otp_hash = self._hash_otp(mobile, otp_code)
        expires_at = datetime.now(timezone.utc) + timedelta(
            minutes=settings.OTP_EXPIRY_MINUTES
        )

        self.otp_repo.create_otp(
            mobile=mobile,
            otp_hash=otp_hash,
            expires_at=expires_at,
        )

        # Dispatch real SMS OTP when in non-demo mode with SMS enabled
        if not settings.OTP_DEMO_MODE and settings.SMS_ENABLED:
            delivery = self.sms_service.send_otp(mobile=mobile, otp=otp_code)
            if not delivery.success:
                raise ExternalServiceError(
                    "Unable to deliver OTP via SMS at this time. Please try again."
                )

        return {
            "mobile": mobile,
            "expires_in_minutes": settings.OTP_EXPIRY_MINUTES,
            "message": "OTP sent successfully to your mobile number.",
            "demo_otp": otp_code if settings.OTP_DEMO_MODE else None,
        }


    def verify_otp(self, mobile: str, otp: str) -> Dict[str, Any]:
        """
        Verify the submitted OTP for a mobile number.

        Enforces:
          - OTP existence & single-use constraint
          - Expiration check
          - Attempt limits with automatic invalidation on threshold exceed
          - Constant-time cryptographic verification
          - Patient registration lookup

        Returns:
            Dictionary containing access_token and authenticated patient profile.
        """
        otp_record = self.otp_repo.get_latest_active_otp(mobile)

        if not otp_record:
            raise ValidationAppError(
                "No active OTP request found for this mobile number. Please request a new OTP."
            )

        if otp_record.used:
            raise ValidationAppError(
                "OTP has already been used. Please request a new OTP."
            )

        # Ensure timezone-aware comparison
        now = datetime.now(timezone.utc)
        record_expiry = otp_record.expires_at
        if record_expiry.tzinfo is None:
            record_expiry = record_expiry.replace(tzinfo=timezone.utc)

        if now > record_expiry:
            self.otp_repo.mark_used(otp_record)
            raise ValidationAppError(
                "OTP has expired. Please request a new OTP."
            )

        if otp_record.attempts >= settings.OTP_MAX_ATTEMPTS:
            self.otp_repo.mark_used(otp_record)
            raise ValidationAppError(
                "Too many invalid attempts. Please request a new OTP."
            )

        # Constant-time comparison
        expected_hash = self._hash_otp(mobile, otp)
        if not hmac.compare_digest(expected_hash, otp_record.otp_hash):
            self.otp_repo.increment_attempts(otp_record)
            remaining = max(0, settings.OTP_MAX_ATTEMPTS - otp_record.attempts)
            if remaining == 0:
                self.otp_repo.mark_used(otp_record)
                raise ValidationAppError(
                    "Invalid OTP. Too many invalid attempts. Please request a new OTP."
                )
            raise ValidationAppError(
                f"Invalid OTP code. {remaining} attempt(s) remaining."
            )

        # Mark OTP as successfully redeemed
        self.otp_repo.mark_used(otp_record)

        # Look up patient record
        patient = self.patient_repo.find_by_mobile(mobile)
        if not patient:
            raise NotFoundError(
                "Patient not registered with this mobile number. Please register first."
            )

        # Issue JWT Access Token
        access_token = create_access_token(
            subject=str(patient.id),
            role="PATIENT",
            extra_claims={"mobile": patient.mobile},
        )

        return {
            "access_token": access_token,
            "token_type": "bearer",
            "role": "PATIENT",
            "patient": {
                "id": patient.id,
                "mobile": patient.mobile,
                "full_name": patient.full_name,
                "district": patient.district,
                "abha_number": patient.abha_number,
                "role": "PATIENT",
            },
        }

    def get_patient_by_id(self, patient_id: int) -> Patient:
        """Fetch patient record by primary key or raise NotFoundError."""
        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError("Patient record not found.")
        return patient
