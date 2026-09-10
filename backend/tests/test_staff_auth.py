"""
tests/test_staff_auth.py
========================
Focused test suite for Unified Healthcare Staff Authentication (Doctors & Frontline Workers),
role-based authorization security (PATIENT, DOCTOR, WORKER), and facility isolation.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from backend.app.core.security import create_access_token
from backend.app.models.facility import Facility
from backend.app.models.patient import Patient
from backend.app.models.worker import Worker
from backend.app.models.doctor import Doctor


@pytest.fixture()
def staff_test_setup(db_session: Session):
    """Fixture creating facilities, doctors, workers, and patients with tokens."""
    f1 = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras Village",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
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

    worker = Worker(
        worker_id="FHW-20841",
        name="Meena Devi",
        mobile="9842182000",
        role="WORKER",
        facility_id=f1.id,
    )
    doctor = Doctor(
        doctor_id="DOC-10101",
        name="Dr. S. Patil",
        mobile="9842183000",
        role="DOCTOR",
        specialization="General Medicine",
        facility_id=f1.id,
    )
    patient = Patient(
        mobile="9876543210",
        full_name="Ramesh Kumar",
        district="Solapur",
        abha_number="14-1234-5678-9012",
        consent=True,
    )
    db_session.add_all([worker, doctor, patient])
    db_session.commit()
    db_session.refresh(f1)
    db_session.refresh(f2)
    db_session.refresh(worker)
    db_session.refresh(doctor)
    db_session.refresh(patient)

    worker_token = create_access_token(
        subject=worker.worker_id,
        role="WORKER",
        extra_claims={"facility_id": f1.id, "mobile": worker.mobile, "worker_name": worker.name},
    )
    doctor_token = create_access_token(
        subject=doctor.doctor_id,
        role="DOCTOR",
        extra_claims={"facility_id": f1.id, "mobile": doctor.mobile, "doctor_name": doctor.name},
    )
    patient_token = create_access_token(
        subject=str(patient.id),
        role="PATIENT",
        extra_claims={"mobile": patient.mobile},
    )

    return {
        "f1": f1,
        "f2": f2,
        "worker": worker,
        "doctor": doctor,
        "patient": patient,
        "worker_headers": {"Authorization": f"Bearer {worker_token}"},
        "doctor_headers": {"Authorization": f"Bearer {doctor_token}"},
        "patient_headers": {"Authorization": f"Bearer {patient_token}"},
    }


def test_patient_login_still_works(client: TestClient, staff_test_setup: dict):
    """1. Patient mobile OTP request and verification remains intact and returns role PATIENT."""
    # Request OTP
    req_res = client.post("/api/v1/auth/request-otp", json={"mobile": "9876543210"})
    assert req_res.status_code == 200
    demo_otp = req_res.json()["data"]["demo_otp"]
    assert demo_otp is not None

    # Verify OTP
    ver_res = client.post("/api/v1/auth/verify-otp", json={"mobile": "9876543210", "otp": demo_otp})
    assert ver_res.status_code == 200
    data = ver_res.json()["data"]
    assert data["role"] == "PATIENT"
    assert "access_token" in data
    assert data["patient"]["mobile"] == "9876543210"


def test_staff_login_worker_success(client: TestClient, staff_test_setup: dict):
    """2. Worker credentials on /auth/staff/login return WORKER role and facility_id."""
    ctx = staff_test_setup
    payload = {
        "staff_id": "FHW-20841",
        "password": "password123",
    }
    res = client.post("/api/v1/auth/staff/login", json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "WORKER"
    assert data["user"]["staff_id"] == "FHW-20841"
    assert data["user"]["role"] == "WORKER"
    assert data["user"]["facility_id"] == ctx["f1"].id
    assert "access_token" in data


def test_staff_login_doctor_success(client: TestClient, staff_test_setup: dict):
    """3. Doctor credentials on /auth/staff/login return DOCTOR role and facility_id."""
    ctx = staff_test_setup
    payload = {
        "staff_id": "DOC-10101",
        "password": "password123",
    }
    res = client.post("/api/v1/auth/staff/login", json=payload)
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "DOCTOR"
    assert data["user"]["staff_id"] == "DOC-10101"
    assert data["user"]["role"] == "DOCTOR"
    assert data["user"]["facility_id"] == ctx["f1"].id
    assert data["user"]["name"] == "Dr. S. Patil"
    assert "access_token" in data


def test_staff_login_invalid_credentials_rejected(client: TestClient, staff_test_setup: dict):
    """4. Invalid password or unknown staff ID returns HTTP 401."""
    # Wrong password for existing doctor
    res1 = client.post("/api/v1/auth/staff/login", json={"staff_id": "DOC-10101", "password": "wrongpassword"})
    assert res1.status_code == 401

    # Non-existent staff ID
    res2 = client.post("/api/v1/auth/staff/login", json={"staff_id": "UNKNOWN-9999", "password": "password123"})
    assert res2.status_code == 401


def test_worker_cannot_access_doctor_endpoint(client: TestClient, staff_test_setup: dict):
    """5. Worker JWT attempting to access Doctor-only endpoint returns 403 Forbidden."""
    ctx = staff_test_setup
    res = client.get("/api/v1/auth/doctor/me", headers=ctx["worker_headers"])
    assert res.status_code == 403
    assert "doctor role required" in res.json()["message"].lower()


def test_doctor_can_access_doctor_endpoint(client: TestClient, staff_test_setup: dict):
    """6. Doctor JWT successfully accesses Doctor-only endpoint."""
    ctx = staff_test_setup
    res = client.get("/api/v1/auth/doctor/me", headers=ctx["doctor_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["role"] == "DOCTOR"
    assert data["doctor_id"] == "DOC-10101"
    assert data["facility_id"] == ctx["f1"].id


def test_doctor_cannot_access_worker_endpoints(client: TestClient, staff_test_setup: dict):
    """7. Doctor JWT attempting to access Worker-only intake returns 403; cross-facility queue update returns 403."""
    ctx = staff_test_setup

    # Worker-only patient creation
    res1 = client.post(
        "/api/v1/patients",
        json={"full_name": "Test Patient", "mobile": "9999988888"},
        headers=ctx["doctor_headers"],
    )
    assert res1.status_code == 403

    # Worker-only profile retrieval
    res_w_me = client.get(
        "/api/v1/auth/worker/me",
        headers=ctx["doctor_headers"],
    )
    assert res_w_me.status_code == 403

    # Doctor can update their own facility queue
    res_own = client.put(
        f"/api/v1/facilities/{ctx['f1'].id}/queue",
        json={"waiting_patients": 10, "estimated_wait_minutes": 30, "status": "NORMAL"},
        headers=ctx["doctor_headers"],
    )
    assert res_own.status_code == 200

    # Doctor cannot update another facility's queue (f2)
    res_other = client.put(
        f"/api/v1/facilities/{ctx['f2'].id}/queue",
        json={"waiting_patients": 10, "estimated_wait_minutes": 30, "status": "NORMAL"},
        headers=ctx["doctor_headers"],
    )
    assert res_other.status_code == 403


def test_unauthenticated_request_returns_401(client: TestClient):
    """8. Unauthenticated request to protected endpoints returns HTTP 401."""
    # Unauthenticated doctor endpoint
    res1 = client.get("/api/v1/auth/doctor/me")
    assert res1.status_code == 401

    # Unauthenticated worker endpoint
    res2 = client.get("/api/v1/auth/worker/me")
    assert res2.status_code == 401

    # Unauthenticated patient endpoint
    res3 = client.get("/api/v1/auth/me")
    assert res3.status_code == 401


def test_worker_facility_isolation_preserved(client: TestClient, staff_test_setup: dict):
    """9. Worker assigned to facility 1 cannot modify facility 2 queue (HTTP 403)."""
    ctx = staff_test_setup
    res = client.put(
        f"/api/v1/facilities/{ctx['f2'].id}/queue",
        json={"waiting_patients": 20, "estimated_wait_minutes": 45, "status": "BUSY"},
        headers=ctx["worker_headers"],
    )
    assert res.status_code == 403


def test_legacy_worker_login_endpoint_preserved(client: TestClient, staff_test_setup: dict):
    """10. Existing /api/v1/auth/worker/login endpoint continues to function."""
    res = client.post(
        "/api/v1/auth/worker/login",
        json={"worker_id": "FHW-20841", "password": "password123"},
    )
    assert res.status_code == 200
    assert res.json()["data"]["role"] == "WORKER"
