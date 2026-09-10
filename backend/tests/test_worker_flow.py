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


def test_worker_can_retrieve_facility_follow_ups_and_referrals(client: TestClient, worker_test_setup: dict, db_session: Session):
    """12. Worker retrieves only their facility's follow-ups and referrals with patient profile data."""
    ctx = worker_test_setup
    # Create patient registered to Facility 1
    p1 = Patient(
        full_name="Radha Rani",
        mobile="9876599001",
        age=30,
        gender="Female",
        village="Kovilur",
        district="Solapur",
        facility_id=ctx["f1"].id,
    )
    # Create patient registered to Facility 2
    p2 = Patient(
        full_name="Kishore Kumar",
        mobile="9876599002",
        age=42,
        gender="Male",
        village="Old Colony",
        district="Solapur",
        facility_id=ctx["f2"].id,
    )
    db_session.add_all([p1, p2])
    db_session.flush()

    # Create follow-up for p1 (Facility 1) and p2 (Facility 2)
    from backend.app.models.follow_up import FollowUp
    fu1 = FollowUp(
        patient_id=p1.id,
        follow_up_date="2026-09-10",
        notes="Review blood pressure",
        status="PENDING",
    )
    fu2 = FollowUp(
        patient_id=p2.id,
        follow_up_date="2026-09-11",
        notes="Diabetic foot check",
        status="PENDING",
    )
    db_session.add_all([fu1, fu2])
    db_session.commit()

    # Worker 1 queries follow-ups
    res1 = client.get("/api/v1/follow-ups", headers=ctx["w1_headers"])
    assert res1.status_code == 200
    fu_list = res1.json()["data"]
    fu_ids = [f["id"] for f in fu_list]
    assert fu1.id in fu_ids
    assert fu2.id not in fu_ids
    # Check patient profile is populated
    matched_fu = next(f for f in fu_list if f["id"] == fu1.id)
    assert matched_fu["patient"]["full_name"] == "Radha Rani"
    assert matched_fu["patient"]["village"] == "Kovilur"

    # Worker 2 queries follow-ups
    res2 = client.get("/api/v1/follow-ups", headers=ctx["w2_headers"])
    assert res2.status_code == 200
    w2_fu_ids = [f["id"] for f in res2.json()["data"]]
    assert fu2.id in w2_fu_ids
    assert fu1.id not in w2_fu_ids


def test_worker_can_complete_follow_up(client: TestClient, worker_test_setup: dict, db_session: Session):
    """13. Worker can mark a follow-up complete for their facility."""
    ctx = worker_test_setup
    p1 = Patient(
        full_name="Gopal Das",
        mobile="9876599003",
        facility_id=ctx["f1"].id,
    )
    db_session.add(p1)
    db_session.flush()

    from backend.app.models.follow_up import FollowUp
    fu = FollowUp(
        patient_id=p1.id,
        follow_up_date="2026-09-10",
        notes="Post-fever recovery check",
        status="PENDING",
    )
    db_session.add(fu)
    db_session.commit()

    # Worker 1 completes the follow up
    res = client.post(f"/api/v1/follow-ups/{fu.id}/complete", headers=ctx["w1_headers"])
    assert res.status_code == 200
    assert res.json()["data"]["status"] == "COMPLETED"


def test_worker_cannot_complete_other_facility_follow_up(client: TestClient, worker_test_setup: dict, db_session: Session):
    """14. Worker 2 cannot complete Worker 1's facility follow-up (facility isolation)."""
    ctx = worker_test_setup
    p1 = Patient(
        full_name="Gopal Das 2",
        mobile="9876599004",
        facility_id=ctx["f1"].id,
    )
    db_session.add(p1)
    db_session.flush()

    from backend.app.models.follow_up import FollowUp
    fu = FollowUp(
        patient_id=p1.id,
        follow_up_date="2026-09-10",
        notes="Facility 1 only checkup",
        status="PENDING",
    )
    db_session.add(fu)
    db_session.commit()

    # Worker 2 attempts to complete Worker 1's follow up
    res = client.post(f"/api/v1/follow-ups/{fu.id}/complete", headers=ctx["w2_headers"])
    assert res.status_code == 403
    assert "outside assigned facility" in res.json()["message"].lower()


def test_worker_dashboard_stats_success(client: TestClient, worker_test_setup: dict):
    """15. Authenticated worker retrieves dashboard stats."""
    ctx = worker_test_setup
    res = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w1_headers"])
    assert res.status_code == 200
    body = res.json()
    assert body["success"] is True
    data = body["data"]
    for key in (
        "total_patients",
        "pending_tasks",
        "urgent_cases",
        "completed_today",
        "follow_ups_due",
        "pending_referrals",
        "today_screenings",
        "urgent_alert",
        "recent_tasks",
    ):
        assert key in data


def test_worker_dashboard_stats_facility_isolation(
    client: TestClient, worker_test_setup: dict, db_session: Session
):
    """16. Statistics belong only to worker's assigned facility and do not count another facility's records."""
    ctx = worker_test_setup
    from backend.app.models.follow_up import FollowUp
    from backend.app.models.referral import Referral

    # Facility 1 patient and records
    p1 = Patient(
        full_name="Facility 1 Patient",
        mobile="9876500011",
        facility_id=ctx["f1"].id,
    )
    # Facility 2 patient and records
    p2 = Patient(
        full_name="Facility 2 Patient",
        mobile="9876500022",
        facility_id=ctx["f2"].id,
    )
    db_session.add_all([p1, p2])
    db_session.flush()

    fu1 = FollowUp(
        patient_id=p1.id,
        follow_up_date="2026-09-10",
        notes="F1 checkup",
        status="PENDING",
    )
    fu2 = FollowUp(
        patient_id=p2.id,
        follow_up_date="2026-09-10",
        notes="F2 checkup",
        status="PENDING",
    )
    r1 = Referral(
        patient_id=p1.id,
        to_facility_id=ctx["f1"].id,
        reason="F1 Referral",
        priority="ROUTINE",
        status="PENDING",
    )
    r2 = Referral(
        patient_id=p2.id,
        to_facility_id=ctx["f2"].id,
        reason="F2 Referral",
        priority="ROUTINE",
        status="PENDING",
    )
    db_session.add_all([fu1, fu2, r1, r2])
    db_session.commit()

    # Worker 1 query
    res1 = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w1_headers"])
    assert res1.status_code == 200
    d1 = res1.json()["data"]
    assert d1["total_patients"] >= 1
    assert d1["follow_ups_due"] >= 1
    assert d1["pending_referrals"] >= 1

    # Worker 2 query
    res2 = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w2_headers"])
    assert res2.status_code == 200
    d2 = res2.json()["data"]

    # Verify task IDs in recent_tasks for Worker 1 do not contain F2 records
    w1_task_ids = [t["id"] for t in d1["recent_tasks"]]
    assert fu1.id in w1_task_ids or r1.id in w1_task_ids
    assert fu2.id not in w1_task_ids
    assert r2.id not in w1_task_ids


def test_worker_dashboard_stats_completion_updates(
    client: TestClient, worker_test_setup: dict, db_session: Session
):
    """17. Task completion reflects in updated statistics."""
    ctx = worker_test_setup
    from backend.app.models.follow_up import FollowUp

    p = Patient(
        full_name="Updatable Patient",
        mobile="9876500033",
        facility_id=ctx["f1"].id,
    )
    db_session.add(p)
    db_session.flush()

    fu = FollowUp(
        patient_id=p.id,
        follow_up_date="2026-09-10",
        notes="Dynamic stat test",
        status="PENDING",
    )
    db_session.add(fu)
    db_session.commit()

    # Initial stats
    res_before = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w1_headers"])
    before = res_before.json()["data"]

    # Complete follow-up
    res_comp = client.post(f"/api/v1/follow-ups/{fu.id}/complete", headers=ctx["w1_headers"])
    assert res_comp.status_code == 200

    # Refetched stats
    res_after = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w1_headers"])
    after = res_after.json()["data"]

    assert after["follow_ups_due"] == before["follow_ups_due"] - 1
    assert after["completed_today"] == before["completed_today"] + 1


def test_worker_dashboard_stats_unauthorized_rejected(
    client: TestClient, worker_test_setup: dict
):
    """18. Unauthorized and non-worker roles are rejected."""
    # 1. No token
    res_no_auth = client.get("/api/v1/worker/dashboard/stats")
    assert res_no_auth.status_code == 401

    # 2. Patient token
    patient_token = create_access_token(
        subject="1",
        role="PATIENT",
        extra_claims={"mobile": "9876543210"},
    )
    res_patient = client.get(
        "/api/v1/worker/dashboard/stats",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert res_patient.status_code == 403


def test_worker_dashboard_stats_urgent_alert(
    client: TestClient, worker_test_setup: dict, db_session: Session
):
    """19. Urgent referrals or screenings trigger urgent alert card."""
    ctx = worker_test_setup
    from backend.app.models.referral import Referral

    p = Patient(
        full_name="Emergency Mother",
        mobile="9876500099",
        village="Kovilur Hamlet",
        facility_id=ctx["f1"].id,
    )
    db_session.add(p)
    db_session.flush()

    ref = Referral(
        patient_id=p.id,
        to_facility_id=ctx["f1"].id,
        reason="Severe antenatal hypertension",
        priority="EMERGENCY",
        status="PENDING",
    )
    db_session.add(ref)
    db_session.commit()

    res = client.get("/api/v1/worker/dashboard/stats", headers=ctx["w1_headers"])
    assert res.status_code == 200
    data = res.json()["data"]
    assert data["urgent_cases"] >= 1
    alert = data["urgent_alert"]
    assert alert["has_urgent"] is True
    assert alert["patient_name"] == "Emergency Mother"
    assert alert["priority"] == "EMERGENCY"
    assert "antenatal hypertension" in alert["reason"].lower()

