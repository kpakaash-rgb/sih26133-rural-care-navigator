"""
ai/hospital_recommendation/recommender.py
==========================================
AI-assisted hospital recommendation engine.

The engine considers:

1. Required medical services/equipment
2. Hospital availability
3. Current queue
4. Estimated waiting time
5. Distance from patient

Important:
A hospital with the required equipment/service is prioritised over
a closer hospital that cannot provide what the patient needs.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from backend.app.models.facility import Facility
from backend.app.models.hospital_queue import HospitalQueue

from ai.hospital_recommendation.schemas import (
    HospitalRecommendation,
    HospitalRecommendationRequest,
    HospitalRecommendationResponse,
)


def _normalise(value: str) -> str:
    """Normalise text for reliable service/equipment matching."""
    return " ".join(value.lower().strip().split())


def _calculate_distance(
    user_lat: Optional[float],
    user_lon: Optional[float],
    facility: Facility,
) -> Optional[float]:
    """Calculate distance using the existing facility distance utility."""

    if (
        user_lat is None
        or user_lon is None
        or facility.latitude is None
        or facility.longitude is None
    ):
        return None

    from backend.app.services.facility_service import (
        calculate_haversine_distance,
    )

    return calculate_haversine_distance(
        user_lat,
        user_lon,
        facility.latitude,
        facility.longitude,
    )


def _match_services(
    required_services: List[str],
    facility: Facility,
) -> tuple[List[str], List[str]]:
    """
    Compare requested services/equipment against facility services.

    Matching is case-insensitive and supports partial text matching.
    """

    available_services = [
        _normalise(service.name)
        for service in (facility.services or [])
        if service.available
    ]

    matched: List[str] = []
    missing: List[str] = []

    for required in required_services:
        required_normalised = _normalise(required)

        found = any(
            required_normalised in available
            or available in required_normalised
            for available in available_services
        )

        if found:
            matched.append(required)
        else:
            missing.append(required)

    return matched, missing


def _calculate_score(
    matched_count: int,
    required_count: int,
    estimated_wait_minutes: int,
    distance_km: Optional[float],
) -> float:
    """
    Calculate recommendation score.

    Priority:
        1. Required equipment/service match
        2. Queue/wait time
        3. Distance

    This intentionally gives service/equipment availability the highest
    importance so a farther hospital can outrank a nearby hospital when
    the farther hospital has the required equipment.
    """

    if required_count > 0:
        service_score = (matched_count / required_count) * 60.0
    else:
        service_score = 60.0

    # Lower waiting time = higher score.
    if estimated_wait_minutes <= 15:
        queue_score = 25.0
    elif estimated_wait_minutes <= 30:
        queue_score = 20.0
    elif estimated_wait_minutes <= 60:
        queue_score = 12.0
    elif estimated_wait_minutes <= 120:
        queue_score = 6.0
    else:
        queue_score = 0.0

    # Distance is secondary.
    if distance_km is None:
        distance_score = 5.0
    elif distance_km <= 5:
        distance_score = 15.0
    elif distance_km <= 15:
        distance_score = 10.0
    elif distance_km <= 30:
        distance_score = 5.0
    else:
        distance_score = 0.0

    return round(
        service_score + queue_score + distance_score,
        2,
    )


def _build_reason(
    facility: Facility,
    matched_services: List[str],
    missing_services: List[str],
    waiting_patients: int,
    estimated_wait_minutes: int,
    distance_km: Optional[float],
) -> str:
    """Generate a human-readable recommendation reason."""

    reasons: List[str] = []

    if matched_services:
        reasons.append(
            f"Required service/equipment available: "
            f"{', '.join(matched_services)}"
        )

    if not missing_services and matched_services:
        reasons.append("all requested requirements are available")

    if missing_services:
        reasons.append(
            f"missing: {', '.join(missing_services)}"
        )

    reasons.append(
        f"estimated wait is {estimated_wait_minutes} minutes"
    )

    reasons.append(
        f"{waiting_patients} patient(s) currently waiting"
    )

    if distance_km is not None:
        reasons.append(
            f"approximately {distance_km} km away"
        )

    return ". ".join(reasons) + "."


def recommend_hospitals(
    db: Session,
    request: HospitalRecommendationRequest,
) -> HospitalRecommendationResponse:
    """
    Recommend hospitals based on required services/equipment,
    queue conditions, and distance.
    """

    stmt = (
        select(Facility)
        .where(Facility.status == "ACTIVE")
        .options(selectinload(Facility.services))
    )

    facilities = list(db.scalars(stmt).all())

    if not facilities:
        return HospitalRecommendationResponse(
            required_services=request.required_services,
            recommendations=[],
            message="No active healthcare facilities are available.",
        )

    # Load all queue records in one query.
    queue_stmt = select(HospitalQueue)
    queue_records = list(db.scalars(queue_stmt).all())

    queue_by_facility: Dict[int, HospitalQueue] = {
        queue.facility_id: queue
        for queue in queue_records
    }

    recommendations: List[HospitalRecommendation] = []

    for facility in facilities:

        matched_services, missing_services = _match_services(
            request.required_services,
            facility,
        )

        queue = queue_by_facility.get(facility.id)

        waiting_patients = (
            queue.waiting_patients
            if queue
            else 0
        )

        estimated_wait_minutes = (
            queue.estimated_wait_minutes
            if queue
            else 0
        )

        queue_status = (
            queue.status
            if queue
            else "UNKNOWN"
        )

        distance_km = _calculate_distance(
            request.latitude,
            request.longitude,
            facility,
        )

        score = _calculate_score(
            matched_count=len(matched_services),
            required_count=len(request.required_services),
            estimated_wait_minutes=estimated_wait_minutes,
            distance_km=distance_km,
        )

        reason = _build_reason(
            facility=facility,
            matched_services=matched_services,
            missing_services=missing_services,
            waiting_patients=waiting_patients,
            estimated_wait_minutes=estimated_wait_minutes,
            distance_km=distance_km,
        )

        recommendations.append(
            HospitalRecommendation(
                facility_id=facility.id,
                hospital_name=facility.name,
                facility_type=facility.type,
                address=facility.address,
                distance_km=distance_km,
                matched_services=matched_services,
                missing_services=missing_services,
                waiting_patients=waiting_patients,
                estimated_wait_minutes=estimated_wait_minutes,
                queue_status=queue_status,
                score=score,
                recommendation_reason=reason,
            )
        )

    # Sort primarily by whether all requirements are satisfied,
    # then by recommendation score.
    recommendations.sort(
        key=lambda item: (
            len(item.missing_services) > 0,
            -item.score,
        )
    )

    recommendations = recommendations[
        : request.max_results
    ]

    if request.required_services:
        message = (
            "Hospitals ranked using required medical "
            "services/equipment, queue status, waiting time, "
            "and distance."
        )
    else:
        message = (
            "Hospitals ranked using queue status, waiting time, "
            "and distance."
        )

    return HospitalRecommendationResponse(
        required_services=request.required_services,
        recommendations=recommendations,
        message=message,
    )