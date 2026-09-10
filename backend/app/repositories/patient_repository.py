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
        clean = (mobile or "").replace("+91", "").replace("+", "").strip()[-10:]
        stmt = select(Patient).where((Patient.mobile == mobile) | (Patient.mobile == clean))
        return self.db.scalars(stmt).first()

    get_by_phone = find_by_mobile

    def get_or_create_patient(
        self,
        mobile: str,
        full_name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        village: Optional[str] = None,
    ) -> Patient:
        """
        Idempotently find an existing patient by mobile or create a new patient record.
        """
        existing = self.find_by_mobile(mobile)
        if existing:
            # Update missing attributes if provided in current intake
            updated = False
            if full_name and not existing.full_name:
                existing.full_name = full_name
                updated = True
            if age is not None and existing.age is None:
                existing.age = age
                updated = True
            if gender and not existing.gender:
                existing.gender = gender
                updated = True
            if village and not existing.village:
                existing.village = village
                updated = True
            if updated:
                self.db.add(existing)
                self.db.commit()
                self.db.refresh(existing)
            return existing

        clean_mobile = (mobile or "").replace("+91", "").replace("+", "").strip()[-10:] or mobile
        return self.create_patient(
            mobile=clean_mobile,
            full_name=full_name,
            age=age,
            gender=gender,
            village=village,
        )

    def create_patient(
        self,
        mobile: str,
        full_name: Optional[str] = None,
        age: Optional[int] = None,
        gender: Optional[str] = None,
        village: Optional[str] = None,
        district: Optional[str] = None,
        preferred_language: Optional[str] = None,
        emergency_contact: Optional[str] = None,
        facility_id: Optional[int] = None,
        abha_number: Optional[str] = None,
        consent: bool = True,
    ) -> Patient:
        """
        Create and persist a new patient record.
        """
        return self.create(
            mobile=mobile,
            full_name=full_name,
            age=age,
            gender=gender,
            village=village,
            district=district,
            preferred_language=preferred_language,
            emergency_contact=emergency_contact,
            facility_id=facility_id,
            abha_number=abha_number,
            consent=consent,
        )

    def list_patients(
        self,
        facility_id: Optional[int] = None,
        query: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Patient]:
        """
        List patients with optional facility scoping and text search across name, mobile, and village.
        """
        stmt = select(Patient)
        if facility_id is not None:
            # Match facility_id or patients without facility association
            stmt = stmt.where((Patient.facility_id == facility_id) | (Patient.facility_id.is_(None)))

        if query:
            q_clean = f"%{query.strip()}%"
            stmt = stmt.where(
                Patient.full_name.ilike(q_clean)
                | Patient.mobile.ilike(q_clean)
                | Patient.village.ilike(q_clean)
                | Patient.district.ilike(q_clean)
            )

        stmt = stmt.order_by(Patient.id.desc()).limit(limit).offset(offset)
        return list(self.db.scalars(stmt).all())
