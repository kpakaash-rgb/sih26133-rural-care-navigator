"""
api/v1/routes/triage.py
=======================

AI-assisted symptom triage endpoint.

POST /api/v1/triage

The endpoint accepts symptoms and a patient description,
runs the transparent rule-based triage engine, and returns
a structured care-navigation result.

This is NOT a diagnosis or treatment system.
"""

from __future__ import annotations

from fastapi import APIRouter

from ai.triage.schemas import TriageRequest, TriageResult
from ai.triage.triage import run_triage

router = APIRouter(
    prefix="/triage",
    tags=["Triage"],
)


@router.post(
    "",
    response_model=TriageResult,
    summary="Run symptom triage",
)
async def triage(request: TriageRequest) -> TriageResult:
    """
    Run rule-based symptom triage.

    The system:
    1. Checks for explicit emergency warning signs.
    2. Checks for symptoms requiring attention.
    3. Otherwise provides routine care guidance.

    It does not diagnose diseases or prescribe medication.
    """

    return run_triage(
        symptoms=request.symptoms,
        description=request.description,
    )