"""
services/scheme_service.py
==========================
Business logic for Government Healthcare Scheme discovery and patient relevance matching.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from backend.app.core.exceptions import NotFoundError
from backend.app.models.scheme import GovernmentScheme
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.scheme_repository import SchemeRepository


class SchemeService:
    """Service handling government welfare scheme search and structured relevance matching."""

    def __init__(
        self,
        scheme_repo: SchemeRepository,
        patient_repo: Optional[PatientRepository] = None,
    ):
        self.scheme_repo = scheme_repo
        self.patient_repo = patient_repo

    def _format_scheme(self, scheme: GovernmentScheme) -> Dict[str, Any]:
        """Format GovernmentScheme ORM instance into an API dictionary response."""
        return {
            "id": scheme.id,
            "name": scheme.name,
            "short_description": scheme.short_description,
            "description": scheme.description,
            "eligibility": scheme.eligibility,
            "benefits": scheme.benefits,
            "application_process": scheme.application_process,
            "official_link": scheme.official_link,
            "state": scheme.state,
            "active": scheme.active,
            "created_at": scheme.created_at,
            "updated_at": scheme.updated_at,
        }

    def list_schemes(
        self,
        state: Optional[str] = None,
        search: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List active government healthcare schemes matching state or keyword search."""
        schemes = self.scheme_repo.list_active(state=state, search=search)
        return [self._format_scheme(s) for s in schemes]

    def get_scheme_by_id(self, scheme_id: int) -> Dict[str, Any]:
        """Retrieve details for a specific healthcare scheme."""
        scheme = self.scheme_repo.get_by_id(scheme_id)
        if not scheme or not scheme.active:
            raise NotFoundError(f"Government scheme with ID {scheme_id} not found.")

        return self._format_scheme(scheme)

    def get_relevant_schemes_for_patient(self, patient_id: int) -> List[Dict[str, Any]]:
        """
        Identify potentially relevant schemes based solely on available structured patient profile attributes.

        NOTE: Does not make unsupported claims that a patient is definitively eligible.
        Flags matches as 'Potentially relevant' for awareness and exploration.
        """
        if not self.patient_repo:
            schemes = self.scheme_repo.list_active()
            return [
                {
                    "id": s.id,
                    "name": s.name,
                    "short_description": s.short_description,
                    "state": s.state,
                    "relevance": "Potentially relevant",
                }
                for s in schemes
            ]

        patient = self.patient_repo.get_by_id(patient_id)
        if not patient:
            raise NotFoundError(f"Patient with ID {patient_id} not found.")

        # Determine state filter from district/patient profile
        state_filter = None
        if patient.district:
            # Common districts mapping for Maharashtra demo prototype
            maharashtra_districts = {"solapur", "pune", "satara", "mumbai", "thane", "kolhapur", "sangli", "nashik", "aurangabad", "nagpur"}
            if patient.district.strip().lower() in maharashtra_districts:
                state_filter = "Maharashtra"

        schemes = self.scheme_repo.list_active(state=state_filter)

        return [
            {
                "id": s.id,
                "name": s.name,
                "short_description": s.short_description,
                "state": s.state,
                "relevance": "Potentially relevant",
            }
            for s in schemes
        ]
