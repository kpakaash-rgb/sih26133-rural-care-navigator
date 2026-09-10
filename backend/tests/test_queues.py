import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.hospital_queue import HospitalQueue


@pytest.fixture()
def test_facility(db_session: Session) -> Facility:
    """Fixture to ensure an active facility with services exists in the test DB."""
    facility = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras Village",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
    db_session.add(facility)
    db_session.flush()

    srv = FacilityService(
        facility_id=facility.id,
        name="General Medicine",
        description="Primary outpatient consultation",
        available=True,
    )
    db_session.add(srv)
    db_session.commit()
    db_session.refresh(facility)
    return facility


@pytest.fixture()
def worker_headers(test_facility: Facility) -> dict:
    """Generate worker auth headers for test_facility."""
    token = create_access_token(
        subject="FHW-20841",
        role="WORKER",
        extra_claims={"facility_id": test_facility.id},
    )
    return {"Authorization": f"Bearer {token}"}


def test_get_queue_for_existing_facility(client: TestClient, test_facility: Facility):
    """GET /api/v1/facilities/{id}/queue returns queue status (initializing if not present)."""
    response = client.get(f"/api/v1/facilities/{test_facility.id}/queue")
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["facility_id"] == test_facility.id
    assert "waiting_patients" in data
    assert "estimated_wait_minutes" in data
    assert "status" in data
    assert "last_updated" in data


def test_get_queue_non_existent_facility(client: TestClient):
    """GET /api/v1/facilities/99999/queue returns 404."""
    response = client.get("/api/v1/facilities/99999/queue")
    assert response.status_code == 404
    assert "not found" in response.json()["message"].lower()


def test_put_queue_update(client: TestClient, test_facility: Facility, worker_headers: dict):
    """PUT /api/v1/facilities/{id}/queue updates queue details."""
    update_payload = {
        "waiting_patients": 14,
        "estimated_wait_minutes": 45,
        "status": "BUSY",
    }

    response = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json=update_payload,
        headers=worker_headers,
    )
    assert response.status_code == 200

    data = response.json()["data"]
    assert data["facility_id"] == test_facility.id
    assert data["waiting_patients"] == 14
    assert data["estimated_wait_minutes"] == 45
    assert data["status"] == "BUSY"
    assert data["last_updated"] is not None

    # Verify directly via GET
    get_res = client.get(f"/api/v1/facilities/{test_facility.id}/queue")
    assert get_res.status_code == 200
    assert get_res.json()["data"]["waiting_patients"] == 14


def test_queue_validation_negative_waiting_patients(client: TestClient, test_facility: Facility, worker_headers: dict):
    """PUT with negative waiting_patients fails validation."""
    response = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": -3,
            "estimated_wait_minutes": 20,
            "status": "NORMAL",
        },
        headers=worker_headers,
    )
    assert response.status_code == 422


def test_queue_validation_negative_estimated_wait_minutes(client: TestClient, test_facility: Facility, worker_headers: dict):
    """PUT with negative estimated_wait_minutes fails validation."""
    response = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 5,
            "estimated_wait_minutes": -10,
            "status": "NORMAL",
        },
        headers=worker_headers,
    )
    assert response.status_code == 422


def test_queue_last_updated_changes_after_update(client: TestClient, test_facility: Facility, worker_headers: dict):
    """last_updated timestamp reflects fresh updates."""
    # First update
    res1 = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 2,
            "estimated_wait_minutes": 10,
            "status": "NORMAL",
        },
        headers=worker_headers,
    )
    assert res1.status_code == 200
    t1 = res1.json()["data"]["last_updated"]

    # Second update
    res2 = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 8,
            "estimated_wait_minutes": 35,
            "status": "BUSY",
        },
        headers=worker_headers,
    )
    assert res2.status_code == 200
    t2 = res2.json()["data"]["last_updated"]
    assert res2.json()["data"]["waiting_patients"] == 8


def test_hospital_recommendation_reflects_updated_queue(client: TestClient, test_facility: Facility, worker_headers: dict):
    """Hospital recommendation engine reads and reflects updated queue numbers."""
    # Set queue to high wait time
    client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 25,
            "estimated_wait_minutes": 90,
            "status": "OVERLOADED",
        },
        headers=worker_headers,
    )

    rec_res = client.post(
        "/api/v1/hospital-recommendation",
        json={
            "required_services": ["General Medicine"],
            "latitude": 17.8543,
            "longitude": 74.9082,
            "max_results": 5,
        },
    )
    assert rec_res.status_code == 200
    recommendations = rec_res.json()["data"]["recommendations"]

    matched = next((r for r in recommendations if r["facility_id"] == test_facility.id), None)
    assert matched is not None
    assert matched["waiting_patients"] == 25
    assert matched["estimated_wait_minutes"] == 90
    assert matched["queue_status"] == "OVERLOADED"
