"""
repositories/doctor_repository.py
=================================
Data access operations for Doctor entities.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.doctor import Doctor
from backend.app.repositories.base import BaseRepository


class DoctorRepository(BaseRepository[Doctor]):
    """Repository handling database operations for Doctor records."""

    def __init__(self, db: Session):
        super().__init__(Doctor, db)

    def find_by_doctor_id(self, doctor_id: str) -> Optional[Doctor]:
        """Look up doctor by official doctor_id string."""
        stmt = select(Doctor).where(Doctor.doctor_id == doctor_id)
        return self.db.scalars(stmt).first()

    def find_by_mobile(self, mobile: str) -> Optional[Doctor]:
        """Look up doctor by registered mobile number."""
        stmt = select(Doctor).where(Doctor.mobile == mobile)
        return self.db.scalars(stmt).first()

    def create_doctor(
        self,
        doctor_id: str,
        name: str,
        mobile: str,
        facility_id: int,
        role: str = "DOCTOR",
        specialization: Optional[str] = "General Medicine",
        password_hash: Optional[str] = None,
    ) -> Doctor:
        """Create and persist a new doctor record."""
        return self.create(
            doctor_id=doctor_id,
            name=name,
            mobile=mobile,
            facility_id=facility_id,
            role=role,
            specialization=specialization,
            password_hash=password_hash,
        )

    def get_or_create_demo_doctor(self) -> Doctor:
        """Retrieve or seed the standard demo doctor for SIH testing."""
        doctor = self.find_by_doctor_id("DOC-10101")
        if not doctor:
            doctor = self.find_by_mobile("9842183000")
        if not doctor:
            doctor = self.create_doctor(
                doctor_id="DOC-10101",
                name="Dr. S. Patil",
                mobile="9842183000",
                facility_id=1,
                role="DOCTOR",
                specialization="General Medicine",
            )
        return doctor
