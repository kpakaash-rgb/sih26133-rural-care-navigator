"""
api/v1/routes/schemes.py
========================
Government Healthcare Welfare Scheme discovery endpoints.

Endpoints:
  GET /api/v1/schemes           — List/search active government healthcare schemes
  GET /api/v1/schemes/relevant  — Discover potentially relevant schemes for authenticated patient
  GET /api/v1/schemes/{id}      — Get details of a specific scheme
"""

from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.api.v1.routes.auth import get_current_patient
from backend.app.core.response import success_response
from backend.app.database.connection import get_db
from backend.app.models.patient import Patient
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.scheme_repository import SchemeRepository
from backend.app.services.scheme_service import SchemeService

router = APIRouter(prefix="/schemes", tags=["Government Schemes"])


# ──────────────────────────────────────────────────────────────────────────────
# Dependency Provider
# ──────────────────────────────────────────────────────────────────────────────

def get_scheme_service(db: Session = Depends(get_db)) -> SchemeService:
    """Dependency provider for SchemeService."""
    scheme_repo = SchemeRepository(db)
    patient_repo = PatientRepository(db)
    return SchemeService(scheme_repo=scheme_repo, patient_repo=patient_repo)


# ──────────────────────────────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────────────────────────────

@router.get("", summary="List/search government healthcare schemes")
async def list_schemes(
    state: Optional[str] = Query(None, description="Filter by state (e.g. Maharashtra, National)"),
    search: Optional[str] = Query(None, description="Search keyword in scheme name or benefits"),
    scheme_service: SchemeService = Depends(get_scheme_service),
):
    """
    Public directory of government health schemes, coverage benefits, and eligibility criteria.
    """
    schemes = scheme_service.list_schemes(state=state, search=search)
    return success_response(
        data=schemes,
        message="Government schemes retrieved successfully",
    )


@router.get("/relevant", summary="Get relevant schemes for authenticated patient")
async def get_relevant_schemes(
    patient: Patient = Depends(get_current_patient),
    scheme_service: SchemeService = Depends(get_scheme_service),
):
    """
    Identify government welfare schemes that may be relevant to the authenticated patient.

    NOTE: Does not make unsupported claims of definitive eligibility; matches are flagged as 'Potentially relevant'.
    """
    relevant_schemes = scheme_service.get_relevant_schemes_for_patient(patient_id=patient.id)
    return success_response(
        data=relevant_schemes,
        message="Relevant schemes found",
    )


@router.get("/{scheme_id}", summary="Get government scheme details")
async def get_scheme(
    scheme_id: int,
    scheme_service: SchemeService = Depends(get_scheme_service),
):
    """
    Retrieve full details, coverage amounts, and application instructions for a specific scheme.
    """
    scheme = scheme_service.get_scheme_by_id(scheme_id=scheme_id)
    return success_response(
        data=scheme,
        message="Government scheme details retrieved successfully",
    )
