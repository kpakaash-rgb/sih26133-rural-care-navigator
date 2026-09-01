"""
repositories/follow_up_repository.py
====================================
Data access operations for Follow-Up entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.follow_up import FollowUp
from backend.app.repositories.base import BaseRepository


class FollowUpRepository(BaseRepository[FollowUp]):
    """Repository handling database queries for patient follow-up care."""

    def __init__(self, db: Session):
        super().__init__(FollowUp, db)

    def get_by_id_with_relations(self, follow_up_id: int) -> Optional[FollowUp]:
        """Fetch a follow-up by ID with appointment and referral preloaded."""
        stmt = (
            select(FollowUp)
            .where(FollowUp.id == follow_up_id)
            .options(
                selectinload(FollowUp.patient),
                selectinload(FollowUp.appointment),
                selectinload(FollowUp.referral),
            )
        )
        return self.db.scalars(stmt).first()

    def get_follow_ups_by_patient(self, patient_id: int) -> List[FollowUp]:
        """Fetch all follow-ups for a patient, ordered by follow-up date."""
        stmt = (
            select(FollowUp)
            .where(FollowUp.patient_id == patient_id)
            .options(
                selectinload(FollowUp.appointment),
                selectinload(FollowUp.referral),
            )
            .order_by(FollowUp.follow_up_date.desc(), FollowUp.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def create_follow_up(
        self,
        patient_id: int,
        follow_up_date: str,
        notes: Optional[str] = None,
        appointment_id: Optional[int] = None,
        referral_id: Optional[int] = None,
        status: str = "PENDING",
    ) -> FollowUp:
        """Create and persist a new FollowUp record."""
        return self.create(
            patient_id=patient_id,
            follow_up_date=follow_up_date,
            notes=notes,
            appointment_id=appointment_id,
            referral_id=referral_id,
            status=status,
        )

    def update_status(self, follow_up_id: int, status: str) -> Optional[FollowUp]:
        """Update follow-up status."""
        follow_up = self.get_by_id(follow_up_id)
        if not follow_up:
            return None
        follow_up.status = status
        self.db.flush()
        self.db.refresh(follow_up)
        return follow_up
