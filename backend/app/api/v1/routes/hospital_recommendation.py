"""
api/v1/routes/hospital_recommendation.py
========================================
API endpoint for AI-powered hospital recommendation.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.core.response import success_response
from backend.app.database.connection import get_db

from ai.hospital_recommendation.recommender import recommend_hospitals
from ai.hospital_recommendation.schemas import (
    HospitalRecommendationRequest,
)

router = APIRouter(
    prefix="/hospital-recommendation",
    tags=["AI Hospital Recommendation"],
)


@router.post(
    "",
    summary="Recommend the best hospital using AI",
)
async def hospital_recommendation(
    request: HospitalRecommendationRequest,
    db: Session = Depends(get_db),
):
    """
    Recommend hospitals based on:

    - Required medical services/equipment
    - Current hospital queue
    - Estimated waiting time
    - Distance from patient
    """

    result = recommend_hospitals(
        db=db,
        request=request,
    )

    return success_response(
        data=result.model_dump(),
        message=result.message,
    )