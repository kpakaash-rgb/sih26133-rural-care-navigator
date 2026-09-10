"""
repositories/sms_conversation_repository.py
===========================================
Data access operations for SMSConversation entities.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.sms_conversation import SMSConversation
from backend.app.repositories.base import BaseRepository


class SMSConversationRepository(BaseRepository[SMSConversation]):
    """Repository handling database operations for SMSConversation records."""

    def __init__(self, db: Session):
        super().__init__(SMSConversation, db)

    def find_active_by_mobile(
        self,
        mobile: str,
        max_inactivity_minutes: int = 60,
    ) -> Optional[SMSConversation]:
        """
        Find the most recent conversation for a mobile number.
        If it has been inactive for longer than max_inactivity_minutes, returns None.
        """
        clean_mobile = (mobile or "").replace("+91", "").replace("+", "").strip()[-10:] or mobile
        stmt = (
            select(SMSConversation)
            .where((SMSConversation.mobile == mobile) | (SMSConversation.mobile == clean_mobile))
            .order_by(SMSConversation.id.desc())
        )
        conv = self.db.scalars(stmt).first()
        if not conv:
            return None

        # Check inactivity expiration
        now = datetime.now(timezone.utc)
        last_msg = conv.last_message_at
        if last_msg:
            if not last_msg.tzinfo:
                last_msg = last_msg.replace(tzinfo=timezone.utc)
            inactivity_mins = (now - last_msg).total_seconds() / 60.0
            if inactivity_mins > max_inactivity_minutes:
                return None

        return conv

    def get_or_create_conversation(
        self,
        mobile: str,
        language: str = "en",
        max_inactivity_minutes: int = 60,
    ) -> SMSConversation:
        """
        Retrieve active conversation or create a new session if expired or not found.
        """
        clean_mobile = (mobile or "").replace("+91", "").replace("+", "").strip()[-10:] or mobile
        active = self.find_active_by_mobile(clean_mobile, max_inactivity_minutes=max_inactivity_minutes)
        if active:
            return active

        now = datetime.now(timezone.utc)
        conv = SMSConversation(
            mobile=clean_mobile,
            state="GREETING",
            language=language,
            last_message_at=now,
        )
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def reset_conversation(self, conv: SMSConversation, language: Optional[str] = None) -> SMSConversation:
        """Reset conversation state for a fresh start."""
        conv.state = "GREETING"
        if language:
            conv.language = language
        conv.symptoms = None
        conv.duration = None
        conv.severity = None
        conv.selected_facility_id = None
        conv.selected_service_id = None
        conv.selected_slot_id = None
        conv.appointment_id = None
        conv.last_message_at = datetime.now(timezone.utc)
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv

    def save(self, conv: SMSConversation) -> SMSConversation:
        """Persist updates to conversation."""
        conv.last_message_at = datetime.now(timezone.utc)
        self.db.add(conv)
        self.db.commit()
        self.db.refresh(conv)
        return conv
