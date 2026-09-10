"""
adapters/sms/base.py
====================
Abstract Base Class and data models for SMS delivery adapters.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class SMSDeliveryResult:
    """Result of an SMS dispatch operation."""

    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class BaseSMSAdapter(ABC):
    """
    Abstract interface for SMS Gateway adapters.

    All vendor-specific implementations (e.g. MSG91, Fast2SMS, Twilio, CDAC)
    must subclass this adapter and implement send_sms() / send_otp().
    """

    def send_sms(self, mobile: str, message: str) -> SMSDeliveryResult:
        """
        Dispatch an SMS message to the specified Indian mobile number.

        Args:
            mobile:  10-digit Indian mobile number (e.g. '9876543210').
            message: Text content of the SMS.

        Returns:
            SMSDeliveryResult indicating delivery success/failure.
        """
        return SMSDeliveryResult(success=True, message_id="SMS-MOCK-DEFAULT")

    def send_otp(self, mobile: str, otp: str) -> SMSDeliveryResult:
        """
        Dispatch a one-time password to the specified Indian mobile number.

        Args:
            mobile: 10-digit Indian mobile number (e.g. '9876543210').
            otp:    Numeric OTP string.

        Returns:
            SMSDeliveryResult indicating delivery success/failure.
        """
        message_text = f"Your Rural Care Navigator verification code is {otp}. Valid for 10 minutes. Please do not share this OTP."
        return self.send_sms(mobile=mobile, message=message_text)

