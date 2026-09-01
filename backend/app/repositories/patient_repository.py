"""
repositories/patient_repository.py
==================================
Data access operations for Patient entities.
"""

from __future__ import annotations

from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.patient import Patient
from backend.app.repositories.base import BaseRepository


class PatientRepository(BaseRepository[Patient]):
    """Repository handling database operations for Patient records."""

    def __init__(self, db: Session):
        super().__init__(Patient, db)

    def find_by_mobile(self, mobile: str) -> Optional[Patient]:
        """
        Look up a patient by their unique 10-digit mobile number.

        Args:
            mobile: Normalized 10-digit mobile number.

        Returns:
            Patient instance if found, None otherwise.
        """
        stmt = select(Patient).where(Patient.mobile == mobile)
        return self.db.scalars(stmt).first()

    def create_patient(
        self,
        mobile: str,
        full_name: Optional[str] = None,
        district: Optional[str] = None,
        abha_number: Optional[str] = None,
        consent: bool = True,
    ) -> Patient:
        """
        Create and persist a new patient record.

        Args:
            mobile:      Unique 10-digit mobile number.
            full_name:   Optional name of the patient.
            district:    Optional district name.
            abha_number: Optional ABHA identifier.
            consent:     User consent for data processing.

        Returns:
            Newly created and persisted Patient.
        """
        return self.create(
            mobile=mobile,
            full_name=full_name,
            district=district,
            abha_number=abha_number,
            consent=consent,
        )
