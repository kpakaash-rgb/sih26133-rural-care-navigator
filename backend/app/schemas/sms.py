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


class InboundSMSRequest(BaseModel):
    """
    Provider-neutral Inbound SMS Webhook payload.
    Supports standard carrier/MSG91/gateway parameter names.
    """

    mobile: Optional[str] = Field(default=None, description="Sender mobile number (e.g. 9876543210)")
    sender: Optional[str] = Field(default=None, description="Alias for sender mobile number")
    from_: Optional[str] = Field(default=None, alias="from", description="Alias for sender mobile number")
    message: Optional[str] = Field(default=None, description="Incoming text body")
    body: Optional[str] = Field(default=None, description="Alias for incoming text body")
    text: Optional[str] = Field(default=None, description="Alias for incoming text body")
    provider_message_id: Optional[str] = Field(default=None, description="Unique carrier/gateway message identifier")
    msg_id: Optional[str] = Field(default=None, description="Alias for carrier message ID")
    timestamp: Optional[str] = Field(default=None, description="Inbound delivery timestamp")

    model_config = ConfigDict(extra="ignore", populate_by_name=True)


class InboundSMSResponse(BaseModel):
    """
    Standard response for inbound SMS webhook processing.
    """

    success: bool = Field(description="True if message was successfully processed")
    reply: str = Field(description="Generated outbound SMS response text")
    next_state: str = Field(description="Subsequent conversation state machine phase")
    demo_mode: bool = Field(default=False, description="True if operating in local/sandbox demo mode")
    outbound_delivered: bool = Field(default=False, description="True if real SMS dispatch succeeded")

    model_config = ConfigDict(from_attributes=True)


class DemoInboundSMSRequest(BaseModel):
    """
    Development and live demo test request payload.
    """

    mobile: str = Field(..., description="Simulated 10-digit sender mobile number")
    message: str = Field(..., description="Simulated inbound SMS text")
    provider_message_id: Optional[str] = Field(default=None, description="Optional simulated provider message ID")

    model_config = ConfigDict(extra="ignore")


class DemoInboundSMSResponse(BaseModel):
    """
    Developer/Demo preview response payload.
    """

    demo_mode: bool = Field(default=True, description="Always true for demo sandbox endpoint")
    reply: str = Field(description="The exact SMS text that would be delivered to the phone")
    next_state: str = Field(description="Conversation state machine state")
    mobile: str = Field(description="Sender phone number")
    conversation: Optional[dict] = Field(default=None, description="State snapshot for debugging/inspection")

    model_config = ConfigDict(from_attributes=True)
