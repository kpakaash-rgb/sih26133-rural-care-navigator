"""
repositories/screening_repository.py
====================================
Data access operations for Screening entities.
"""

from __future__ import annotations

from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.screening import Screening
from backend.app.repositories.base import BaseRepository


class ScreeningRepository(BaseRepository[Screening]):
    """Repository handling database operations for Patient Screening records."""

    def __init__(self, db: Session):
        super().__init__(Screening, db)

    def get_latest_by_patient(self, patient_id: int) -> Optional[Screening]:
        """Fetch the most recent screening record for a patient."""
        stmt = (
            select(Screening)
            .where(Screening.patient_id == patient_id)
            .order_by(Screening.id.desc())
        )
        return self.db.scalars(stmt).first()

    def list_by_patient(self, patient_id: int, limit: int = 20) -> List[Screening]:
        """List historical screenings for a patient in reverse chronological order."""
        stmt = (
            select(Screening)
            .where(Screening.patient_id == patient_id)
            .order_by(Screening.id.desc())
            .limit(limit)
        )
        return list(self.db.scalars(stmt).all())
