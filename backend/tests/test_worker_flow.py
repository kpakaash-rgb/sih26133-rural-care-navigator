"""
tests/test_worker_flow.py
=========================
Comprehensive test suite for Frontline Worker authentication, patient registration,
field screening, referral creation, and facility-scoped operational security.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.patient import Patient
from backend.app.models.worker import Worker


@pytest.fixture()
def worker_test_setup(db_session: Session):
    """Fixture initializing facilities, workers, and authorization headers."""
    # Facility 1 (PHC Malshiras)
    f1 = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras Village",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
    # Facility 2 (District Hospital Solapur)
    f2 = Facility(
        name="Solapur District Hospital",
        type="DISTRICT_HOSPITAL",
        address="Station Road, Solapur",
        district="Solapur",
        latitude=17.6599,
        longitude=75.9064,
        status="ACTIVE",
    )
    db_session.add_all([f1, f2])
    db_session.flush()

    # Worker 1 for Facility 1
    w1 = Worker(
        worker_id="FHW-20841",
        name="Meena Devi",
        mobile="9842182000",
        role="WORKER",
        facility_id=f1.id,
    )
    # Worker 2 for Facility 2
    w2 = Worker(
        worker_id="FHW-99999",
        name="Sunita Patil",
        mobile="9842199999",
        role="WORKER",
        facility_id=f2.id,
    )
    db_session.add_all([w1, w2])
    db_session.commit()
    db_session.refresh(f1)
    db_session.refresh(f2)
    db_session.refresh(w1)
    db_session.refresh(w2)

    w1_token = create_access_token(
        subject=w1.worker_id,
        role="WORKER",
        extra_claims={"facility_id": f1.id, "mobile": w1.mobile, "worker_name": w1.name},
    )
    w2_token = create_access_token(
        subject=w2.worker_id,
        role="WORKER",
        extra_claims={"facility_id": f2.id, "mobile": w2.mobile, "worker_name": w2.name},
    )

    return {
        "f1": f1,
        "f2": f2,
        "w1": w1,
        "w2": w2,
        "w1_headers": {"Authorization": f"Bearer {w1_token}"},
        "w2_headers": {"Authorization": f"Bearer {w2_token}"},
    }


def test_worker_login_success(client: TestClient, worker_test_setup: dict):
    """1. Worker login success returns JWT access token and worker profile."""
    ctx = worker_test_setup
    payload = {
        "worker_id": "FHW-20841",
        "password": "password123",
    }
    res = client.post("/api/v1/auth/worker/login", json=payload)
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    assert "access_token" in data
    assert data["role"] == "WORKER"
    assert data["worker"]["worker_id"] == "FHW-20841"
    assert data["worker"]["facility_id"] == ctx["f1"].id
    assert data["worker"]["name"] == "Meena Devi"


def test_worker_login_invalid_credentials(client: TestClient, worker_test_setup: dict):
    """2. Invalid Worker login rejects with 401."""
    res = client.post(
        "/api/v1/auth/worker/login",
        json={"worker_id": "FHW-20841", "password": "wrongpassword"},
    )
    assert res.status_code == 401


def test_worker_jwt_role_and_profile(client: TestClient, worker_test_setup: dict):
    """3 & 4. Worker JWT role and facility association returned from /auth/worker/me."""
    ctx = worker_test_setup
    res = client.get("/api/v1/auth/worker/me", headers=ctx["w1_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "WORKER"
    assert data["worker_id"] == "FHW-20841"
    assert data["facility_id"] == ctx["f1"].id


def test_worker_can_create_patient(client: TestClient, worker_test_setup: dict):
    """5. Worker can register a new patient via POST /api/v1/patients."""
    ctx = worker_test_setup
    payload = {
        "full_name": "Ramesh Kumar",
        "mobile": "9876543210",
        "age": 45,
        "gender": "Male",
        "district": "Solapur",
        "village": "Kovilur Village, Sector 4",
    }
    res = client.post("/api/v1/patients", json=payload, headers=ctx["w1_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["id"] > 0
    assert data["full_name"] == "Ramesh Kumar"
    assert data["mobile"] == "9876543210"
    assert data["facility_id"] == ctx["f1"].id


def test_patient_appears_in_worker_patient_list(client: TestClient, worker_test_setup: dict):
    """6. Registered patient appears in worker's patient list."""
    ctx = worker_test_setup
    # Create patient
    client.post(
        "/api/v1/patients",
        json={
            "full_name": "Anitha Devi",
            "mobile": "9876500001",
            "age": 28,
            "gender": "Female",
            "district": "Solapur",
            "village": "Main Basti",
        },
        headers=ctx["w1_headers"],
    )

    res = client.get("/api/v1/patients", headers=ctx["w1_headers"])
    assert res.status_code == 200
    patients = res.json()["data"]
    assert len(patients) >= 1
    matched = next((p for p in patients if p["mobile"] == "9876500001"), None)
    assert matched is not None
    assert matched["full_name"] == "Anitha Devi"


def test_worker_can_retrieve_patient_summary(client: TestClient, worker_test_setup: dict):
    """7. Worker can retrieve patient details."""
    ctx = worker_test_setup
    create_res = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Pooja Sharma",
            "mobile": "9876500002",
            "age": 32,
            "gender": "Female",
            "district": "Solapur",
            "village": "Khera Mod",
        },
        headers=ctx["w1_headers"],
    )
    pid = create_res.json()["data"]["id"]

    res = client.get(f"/api/v1/patients/{pid}", headers=ctx["w1_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["id"] == pid
    assert data["full_name"] == "Pooja Sharma"


def test_worker_can_save_and_retrieve_screening(client: TestClient, worker_test_setup: dict):
    """8 & 9. Worker can save screening and retrieve latest screening."""
    ctx = worker_test_setup
    p_res = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Deepak Verma",
            "mobile": "9876500003",
            "age": 50,
            "gender": "Male",
            "district": "Solapur",
            "village": "Rampur Tola",
        },
        headers=ctx["w1_headers"],
    )
    pid = p_res.json()["data"]["id"]

    # Submit screening
    screening_payload = {
        "temperature": 38.2,
        "systolic_bp": 138,
        "diastolic_bp": 88,
        "heart_rate": 96,
        "spo2": 95.0,
        "symptoms": ["Fever", "Cough", "Weakness"],
        "notes": "Mild fever with persistent dry cough.",
        "triage_level": "ATTENTION",
    }
    sc_res = client.post(
        f"/api/v1/patients/{pid}/screening",
        json=screening_payload,
        headers=ctx["w1_headers"],
    )
    assert sc_res.status_code == 200
    sc_data = sc_res.json()["data"]
    assert sc_data["patient_id"] == pid
    assert sc_data["temperature"] == 38.2
    assert sc_data["systolic_bp"] == 138
    assert sc_data["triage_level"] == "ATTENTION"

    # Retrieve latest screening
    latest_res = client.get(f"/api/v1/patients/{pid}/screening/latest", headers=ctx["w1_headers"])
    assert latest_res.status_code == 200
    latest_data = latest_res.json()["data"]
    assert latest_data["id"] == sc_data["id"]
    assert latest_data["systolic_bp"] == 138


def test_worker_can_create_referral(client: TestClient, worker_test_setup: dict):
    """10. Worker can create referral with patient_id and worker facility origin."""
    ctx = worker_test_setup
    p_res = client.post(
        "/api/v1/patients",
        json={
            "full_name": "Laxmi Bai",
            "mobile": "9876500004",
            "age": 38,
            "gender": "Female",
            "district": "Solapur",
            "village": "Old Colony",
        },
        headers=ctx["w1_headers"],
    )
    pid = p_res.json()["data"]["id"]

    ref_payload = {
        "patient_id": pid,
        "to_facility_id": ctx["f2"].id,
        "reason": "Severe uncontrolled hypertension requiring specialist care",
        "priority": "URGENT",
    }
    ref_res = client.post("/api/v1/referrals", json=ref_payload, headers=ctx["w1_headers"])
    assert ref_res.status_code == 200
    ref_data = ref_res.json()["data"]
    assert ref_data["patient_id"] == pid
    assert ref_data["to_facility_id"] == ctx["f2"].id
    assert ref_data["from_facility_id"] == ctx["f1"].id
    assert ref_data["priority"] == "URGENT"


def test_worker_cannot_modify_other_facility_queue(client: TestClient, worker_test_setup: dict):
    """11. Worker cannot modify another facility's operational queue."""
    ctx = worker_test_setup
    # Worker 1 (assigned to f1) tries to update f2's queue
    res = client.put(
        f"/api/v1/facilities/{ctx['f2'].id}/queue",
        json={
            "waiting_patients": 50,
            "estimated_wait_minutes": 120,
            "status": "OVERLOADED",
        },
        headers=ctx["w1_headers"],
    )
    assert res.status_code == 403
    assert "not authorized" in res.json()["message"].lower()
