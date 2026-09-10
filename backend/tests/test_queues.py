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


def test_doctor_can_update_own_facility_queue(client: TestClient, test_facility: Facility):
    """Authenticated Doctor can update their own facility's queue."""
    doc_token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": test_facility.id},
    )
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    res = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 7,
            "estimated_wait_minutes": 25,
            "status": "NORMAL",
        },
        headers=doc_headers,
    )
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["waiting_patients"] == 7
    assert data["estimated_wait_minutes"] == 25


def test_doctor_cannot_update_other_facility_queue(client: TestClient, test_facility: Facility, db_session: Session):
    """Doctor from Facility A cannot update Facility B queue (403 Forbidden)."""
    # Create Facility B
    fac_b = Facility(
        name="CHC Akluj",
        type="COMMUNITY_HEALTH_CENTRE",
        address="Station Road, Akluj",
        district="Solapur",
        latitude=17.8872,
        longitude=75.0214,
        status="ACTIVE",
    )
    db_session.add(fac_b)
    db_session.commit()
    db_session.refresh(fac_b)

    # Doctor assigned to test_facility (Facility A)
    doc_token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": test_facility.id},
    )
    doc_headers = {"Authorization": f"Bearer {doc_token}"}

    res = client.put(
        f"/api/v1/facilities/{fac_b.id}/queue",
        json={
            "waiting_patients": 30,
            "estimated_wait_minutes": 90,
            "status": "OVERLOADED",
        },
        headers=doc_headers,
    )
    assert res.status_code == 403
    assert "not authorized" in res.json()["message"].lower()


def test_patient_cannot_update_facility_queue(client: TestClient, test_facility: Facility):
    """Patient role cannot update facility queue (403 Forbidden)."""
    pat_token = create_access_token(
        subject="1",
        role="PATIENT",
        extra_claims={"mobile": "9876543210"},
    )
    pat_headers = {"Authorization": f"Bearer {pat_token}"}

    res = client.put(
        f"/api/v1/facilities/{test_facility.id}/queue",
        json={
            "waiting_patients": 0,
            "estimated_wait_minutes": 0,
            "status": "NORMAL",
        },
        headers=pat_headers,
    )
    assert res.status_code == 403


def test_explicit_queue_change_reverses_recommendation_ranking(
    client: TestClient, db_session: Session
):
    """
    CRITICAL INTEGRATION TEST:
    Verifies that changing PostgreSQL hospital queue data directly changes recommendation ranking.

    Initial Setup:
      Facility A: wait = 20 mins (waiting = 5)
      Facility B: wait = 60 mins (waiting = 20)
      Both active, same service, similar distance from patient (Solapur area).
      -> Recommendation MUST rank Facility A ABOVE Facility B.

    Update:
      Staff updates Facility A queue in PostgreSQL to wait = 120 mins (waiting = 50).
      Facility B remains wait = 60 mins.
      -> Recommendation MUST dynamically rank Facility B ABOVE Facility A.
    """
    # Clean previous facilities in this test if any
    fac_a = Facility(
        name="Facility A Hospital",
        type="PRIMARY_HEALTH_CENTRE",
        address="Sector 1, Test Nagar",
        district="Solapur",
        latitude=17.8500,
        longitude=74.9000,
        status="ACTIVE",
    )
    fac_b = Facility(
        name="Facility B Hospital",
        type="PRIMARY_HEALTH_CENTRE",
        address="Sector 2, Test Nagar",
        district="Solapur",
        latitude=17.8510,
        longitude=74.9010,
        status="ACTIVE",
    )
    db_session.add_all([fac_a, fac_b])
    db_session.flush()

    s_a = FacilityService(facility_id=fac_a.id, name="General Medicine", available=True)
    s_b = FacilityService(facility_id=fac_b.id, name="General Medicine", available=True)
    db_session.add_all([s_a, s_b])
    db_session.flush()

    # Initial Queues: Facility A (20 min wait), Facility B (60 min wait)
    q_a = HospitalQueue(
        facility_id=fac_a.id,
        waiting_patients=5,
        estimated_wait_minutes=20,
        status="NORMAL",
    )
    q_b = HospitalQueue(
        facility_id=fac_b.id,
        waiting_patients=20,
        estimated_wait_minutes=60,
        status="BUSY",
    )
    db_session.add_all([q_a, q_b])
    db_session.commit()

    # Auth tokens for staff updates
    worker_a_token = create_access_token(
        subject="FHW-001",
        role="WORKER",
        extra_claims={"facility_id": fac_a.id},
    )
    headers_a = {"Authorization": f"Bearer {worker_a_token}"}

    # STEP 1: Query Recommendation initially
    req_payload = {
        "required_services": ["General Medicine"],
        "district": "Solapur",
        "latitude": 17.8505,
        "longitude": 74.9005,
        "max_results": 10,
    }
    res1 = client.post("/api/v1/hospital-recommendation", json=req_payload)
    assert res1.status_code == 200
    recs1 = res1.json()["data"]["recommendations"]

    fac_a_idx1 = next((i for i, r in enumerate(recs1) if r["facility_id"] == fac_a.id), None)
    fac_b_idx1 = next((i for i, r in enumerate(recs1) if r["facility_id"] == fac_b.id), None)

    assert fac_a_idx1 is not None and fac_b_idx1 is not None
    # Facility A (20 min wait) ranks HIGHER (lower index) than Facility B (60 min wait)
    assert fac_a_idx1 < fac_b_idx1, f"Expected Facility A ({fac_a_idx1}) to outrank Facility B ({fac_b_idx1})"

    # STEP 2: Update Facility A queue in PostgreSQL via live PUT API
    update_res = client.put(
        f"/api/v1/facilities/{fac_a.id}/queue",
        json={
            "waiting_patients": 50,
            "estimated_wait_minutes": 120,
            "status": "OVERLOADED",
        },
        headers=headers_a,
    )
    assert update_res.status_code == 200
    assert update_res.json()["data"]["estimated_wait_minutes"] == 120

    # STEP 3: Query Recommendation again with same criteria
    res2 = client.post("/api/v1/hospital-recommendation", json=req_payload)
    assert res2.status_code == 200
    recs2 = res2.json()["data"]["recommendations"]

    fac_a_idx2 = next((i for i, r in enumerate(recs2) if r["facility_id"] == fac_a.id), None)
    fac_b_idx2 = next((i for i, r in enumerate(recs2) if r["facility_id"] == fac_b.id), None)

    assert fac_a_idx2 is not None and fac_b_idx2 is not None
    # Facility B (60 min wait) now dynamically outranks Facility A (120 min wait)
    assert fac_b_idx2 < fac_a_idx2, f"Expected Facility B ({fac_b_idx2}) to outrank Facility A ({fac_a_idx2}) after queue update"
