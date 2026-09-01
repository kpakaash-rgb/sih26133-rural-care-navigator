"""
adapters/sms/__init__.py
========================
SMS Gateway Adapter factory and exports.
"""

from __future__ import annotations

from backend.app.adapters.sms.base import BaseSMSAdapter, SMSDeliveryResult
from backend.app.adapters.sms.console import ConsoleSMSAdapter
from backend.app.adapters.sms.provider import SmsProviderAdapter
from backend.app.core.config import settings


def get_sms_adapter() -> BaseSMSAdapter:
    """
    Factory creating the configured SMS adapter instance based on SMS_PROVIDER setting.
    """
    provider_name = (settings.SMS_PROVIDER or "console").strip().lower()

    if provider_name in ("provider", "http", "fast2sms", "msg91", "twilio"):
        return SmsProviderAdapter()

    return ConsoleSMSAdapter()


__all__ = [
    "BaseSMSAdapter",
    "ConsoleSMSAdapter",
    "SMSDeliveryResult",
    "SmsProviderAdapter",
    "get_sms_adapter",
]
