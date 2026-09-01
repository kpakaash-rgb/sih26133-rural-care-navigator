"""
services/sms_service.py
=======================
Service layer managing OTP SMS delivery, vendor error isolation, and delivery guarantees.
"""

from __future__ import annotations

import logging
from typing import Optional

from backend.app.adapters.sms.base import BaseSMSAdapter, SMSDeliveryResult
from backend.app.adapters.sms import get_sms_adapter
from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class SMSService:
    """
    High-level SMS orchestration service.

    Decouples business logic from external SMS vendors, handles demo-mode bypassing,
    and ensures zero credential / OTP leakage in application logs.
    """

    def __init__(self, adapter: Optional[BaseSMSAdapter] = None):
        self.adapter = adapter or get_sms_adapter()

    def send_otp(self, mobile: str, otp: str) -> SMSDeliveryResult:
        """
        Send a one-time password to an Indian mobile number.

        - If OTP_DEMO_MODE=True: returns success without invoking external provider.
        - If SMS_ENABLED=False: returns simulated success.
        - If SMS_ENABLED=True and OTP_DEMO_MODE=False: dispatches through SMS adapter.
        """
        masked_mobile = f"{mobile[:2]}XXXX{mobile[-4:]}" if len(mobile) >= 6 else "XXXXXX"

        if settings.OTP_DEMO_MODE:
            logger.info("[SMS Service] Demo mode active; bypassing external SMS gateway for %s", masked_mobile)
            return SMSDeliveryResult(success=True, message_id="demo-mode-bypass")

        if not settings.SMS_ENABLED:
            logger.info("[SMS Service] SMS disabled; simulated delivery for %s", masked_mobile)
            return SMSDeliveryResult(success=True, message_id="sms-disabled-bypass")

        try:
            result = self.adapter.send_otp(mobile=mobile, otp=otp)
            if not result.success:
                logger.warning("[SMS Service] SMS delivery failed for %s: %s", masked_mobile, result.error)
            else:
                logger.info("[SMS Service] SMS successfully dispatched to %s (msg_id: %s)", masked_mobile, result.message_id)
            return result
        except Exception as exc:
            logger.error("[SMS Service] Unexpected exception during SMS dispatch: %s", type(exc).__name__)
            return SMSDeliveryResult(
                success=False,
                error="Internal SMS dispatch error",
            )
