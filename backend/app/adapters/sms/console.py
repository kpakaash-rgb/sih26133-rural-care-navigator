"""
adapters/sms/console.py
=======================
Console / In-Memory Mock SMS adapter for local testing and development.
"""

from __future__ import annotations

import logging
import uuid
from typing import List, Tuple

from backend.app.adapters.sms.base import BaseSMSAdapter, SMSDeliveryResult

logger = logging.getLogger(__name__)


class ConsoleSMSAdapter(BaseSMSAdapter):
    """
    Console / Mock SMS Adapter for development, CI/CD, and simulated local runs.

    Safely logs the dispatch event without exposing sensitive credentials or full details.
    Maintains an in-memory delivery audit list for test assertion introspection.
    """

    def __init__(self):
        self.sent_messages: List[Tuple[str, str]] = []

    def send_otp(self, mobile: str, otp: str) -> SMSDeliveryResult:
        # Mask mobile number: e.g. 9876543210 -> 98XXXX3210
        masked_mobile = f"{mobile[:2]}XXXX{mobile[-4:]}" if len(mobile) >= 6 else "XXXXXX"
        msg_id = f"sim-{uuid.uuid4().hex[:8]}"

        self.sent_messages.append((mobile, otp))
        logger.info("[SMS Console] Dispatched OTP message [%s] to recipient %s", msg_id, masked_mobile)

        return SMSDeliveryResult(
            success=True,
            message_id=msg_id,
        )
