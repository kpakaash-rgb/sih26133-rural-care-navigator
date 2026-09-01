"""
repositories/referral_repository.py
===================================
Data access operations for Referral entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.referral import Referral
from backend.app.repositories.base import BaseRepository


class ReferralRepository(BaseRepository[Referral]):
    """Repository handling database queries for patient referrals."""

    def __init__(self, db: Session):
        super().__init__(Referral, db)

    def get_by_id_with_relations(self, referral_id: int) -> Optional[Referral]:
        """Fetch a referral by ID with patient, from_facility, to_facility, and appointment preloaded."""
        stmt = (
            select(Referral)
            .where(Referral.id == referral_id)
            .options(
                selectinload(Referral.patient),
                selectinload(Referral.from_facility),
                selectinload(Referral.to_facility),
                selectinload(Referral.appointment),
            )
        )
        return self.db.scalars(stmt).first()

    def get_referrals_by_patient(self, patient_id: int) -> List[Referral]:
        """Fetch all referrals for a specific patient, ordered by creation date descending."""
        stmt = (
            select(Referral)
            .where(Referral.patient_id == patient_id)
            .options(
                selectinload(Referral.from_facility),
                selectinload(Referral.to_facility),
                selectinload(Referral.appointment),
            )
            .order_by(Referral.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def get_referrals_by_facility(self, facility_id: int) -> List[Referral]:
        """Fetch all incoming or outgoing referrals for a facility."""
        stmt = (
            select(Referral)
            .where(
                (Referral.to_facility_id == facility_id)
                | (Referral.from_facility_id == facility_id)
            )
            .options(
                selectinload(Referral.patient),
                selectinload(Referral.from_facility),
                selectinload(Referral.to_facility),
            )
            .order_by(Referral.created_at.desc())
        )
        return list(self.db.scalars(stmt).all())

    def create_referral(
        self,
        patient_id: int,
        to_facility_id: int,
        reason: str,
        priority: str = "ROUTINE",
        status: str = "PENDING",
        from_facility_id: Optional[int] = None,
        appointment_id: Optional[int] = None,
    ) -> Referral:
        """Create and persist a new Referral record."""
        return self.create(
            patient_id=patient_id,
            to_facility_id=to_facility_id,
            from_facility_id=from_facility_id,
            appointment_id=appointment_id,
            reason=reason,
            priority=priority,
            status=status,
        )

    def update_status(self, referral_id: int, status: str) -> Optional[Referral]:
        """Update referral status."""
        referral = self.get_by_id(referral_id)
        if not referral:
            return None
        referral.status = status
        self.db.flush()
        self.db.refresh(referral)
        return referral
