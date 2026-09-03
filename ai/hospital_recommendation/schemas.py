"""
ai/hospital_recommendation/schemas.py
======================================
Pydantic schemas for AI-powered hospital recommendation.
"""

from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class HospitalRecommendationRequest(BaseModel):
    """
    Input received when recommending a hospital.

    required_services:
        Services/equipment required for the patient's current situation.
        Examples:
            ["X-Ray"]
            ["CT Scan", "Orthopedics"]
            ["Basic Tests", "Doctor"]

    latitude / longitude:
        Optional patient location used for distance calculation.
    """

    required_services: List[str] = Field(
        default_factory=list,
        description="Medical services or equipment required by the patient.",
    )

    latitude: Optional[float] = Field(
        None,
        description="Patient latitude.",
    )

    longitude: Optional[float] = Field(
        None,
        description="Patient longitude.",
    )

    max_results: int = Field(
        5,
        ge=1,
        le=20,
        description="Maximum number of hospitals to recommend.",
    )


class HospitalRecommendation(BaseModel):
    """
    Single hospital recommendation.
    """

    facility_id: int
    hospital_name: str
    facility_type: str
    address: str

    distance_km: Optional[float] = None

    matched_services: List[str] = Field(
        default_factory=list,
    )

    missing_services: List[str] = Field(
        default_factory=list,
    )

    waiting_patients: int = 0

    estimated_wait_minutes: int = 0

    queue_status: str = "UNKNOWN"

    score: float = 0.0

    recommendation_reason: str


class HospitalRecommendationResponse(BaseModel):
    """
    Complete recommendation response.
    """

    required_services: List[str]

    recommendations: List[HospitalRecommendation]

    message: str