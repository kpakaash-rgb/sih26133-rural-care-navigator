"""
schemas/sms.py
==============
Pydantic schemas for Patient Care Summary SMS dispatch and preview.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class CareSummarySMSRequest(BaseModel):
    """
    Patient care summary SMS dispatch request payload.
    Recipient mobile number is NEVER supplied by client; it is retrieved
    from the verified authenticated patient record.
    """

    facility_id: Optional[int] = Field(
        default=None,
        description="Healthcare facility ID to summarize in SMS",
    )
    appointment_id: Optional[int] = Field(
        default=None,
        description="Booked appointment ID belonging to the authenticated patient",
    )
    referral_id: Optional[int] = Field(
        default=None,
        description="Referral ID belonging to the authenticated patient",
    )
    emergency_guidance: Optional[bool] = Field(
        default=False,
        description="Flag indicating if emergency guidance and helpline 108 should be included",
    )

    model_config = ConfigDict(extra="ignore")


class CareSummarySMSResponse(BaseModel):
    """
    Care summary SMS dispatch response envelope payload.
    """

    success: bool = Field(description="Indicates whether the SMS was processed/dispatched")
    message: str = Field(description="User-facing summary message")
    demo_mode: bool = Field(description="True if running in prototype/demo mode without real SMS credits")
    sms_preview: Optional[str] = Field(default=None, description="Exact SMS body preview for demo mode")
    recipient_masked: str = Field(description="Masked patient mobile number (e.g. 98XXXX3210)")
    delivery_status: str = Field(description="Delivery state: DEMO_PREPARED | SENT | FAILED")

    model_config = ConfigDict(from_attributes=True)
