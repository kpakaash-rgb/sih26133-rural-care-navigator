"""
models/sms_conversation.py
==========================
SQLAlchemy ORM model for SMS Conversation session state in Rural Care Navigator.

Maintains multi-turn state for patients interacting via basic phone two-way SMS.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.database.base import Base, TimestampMixin


class SMSConversation(Base, TimestampMixin):
    """
    SMS Conversation entity.

    Attributes:
        id:                       Unique integer primary key.
        mobile:                   Sender 10-digit Indian mobile number (e.g. '9876543210').
        patient_id:               Linked patient ID if registered or identified.
        state:                    Current conversation state (e.g. 'GREETING', 'ASK_NAME', 'TRIAGE', 'BOOKED').
        language:                 Preferred language ('en', 'hi', 'mr').
        collected_name:           Patient full name gathered during intake.
        collected_age:            Patient age gathered during intake.
        collected_gender:         Patient gender gathered during intake.
        collected_location:       Patient village or district name.
        symptoms:                 Reported symptoms string.
        duration:                 Reported duration string.
        severity:                 Reported severity string.
        selected_facility_id:     Facility selected for recommendation/booking.
        selected_service_id:      Service selected for booking.
        selected_slot_id:         Time slot ID selected for booking.
        appointment_id:           Created appointment ID after successful booking.
        last_provider_message_id: ID of last processed SMS message (for idempotency).
        last_reply:               Cached last reply text (for idempotent re-delivery).
        last_message_at:          Timestamp of latest inbound interaction.
    """

    __tablename__ = "sms_conversations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    mobile: Mapped[str] = mapped_column(String(15), index=True, nullable=False)
    patient_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("patients.id", ondelete="SET NULL"), nullable=True, index=True
    )
    state: Mapped[str] = mapped_column(String(50), default="GREETING", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)

    collected_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    collected_age: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    collected_gender: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    collected_location: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    symptoms: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    duration: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    selected_facility_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    selected_service_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    selected_slot_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    last_provider_message_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    last_reply: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    patient = relationship("Patient", lazy="joined")

    def __repr__(self) -> str:
        return f"<SMSConversation id={self.id} mobile={self.mobile} state={self.state}>"
