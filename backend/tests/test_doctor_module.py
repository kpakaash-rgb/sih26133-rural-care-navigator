"""
tests/test_doctor_module.py
===========================
Automated test suite verifying the Doctor Module implementation for SIH 26133.

Covers:
  1. Doctor login still works
  2. Doctor can access Doctor profile
  3. Worker cannot access Doctor endpoint
  4. Patient cannot access Doctor endpoint
  5. Unauthenticated request returns 401
  6. Doctor can access authorized patient (clinical summary, queue)
  7. Doctor cannot access unauthorized facility data
  8. Doctor can create consultation
  9. Consultation is stored correctly
  10. Consultation appears in patient history/health journey
  11. Follow-up is created when requested
  12. Referral is created using existing referral system
  13. Invalid patient/appointment is handled safely
"""

from __future__ import annotations

import pytest
from starlette.testclient import TestClient

from backend.app.core.security import create_access_token
from backend.app.models.appointment import Appointment
from backend.app.models.doctor import Doctor
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.models.patient import Patient
from backend.app.models.screening import Screening
from backend.app.models.consultation import Consultation
from backend.app.models.follow_up import FollowUp
from backend.app.models.referral import Referral


@pytest.fixture
def doctor_test_data(db_session):
    """Seed facilities, doctor, worker, patient, and initial clinical records for doctor testing."""
    # Facility 1
    fac1 = db_session.query(Facility).filter_by(id=1).first()
    if not fac1:
        fac1 = Facility(
            id=1,
            name="PHC Malshiras",
            type="PRIMARY_HEALTH_CENTRE",
            address="Main Road, Malshiras",
            district="Solapur",
            latitude=17.8543,
            longitude=74.9082,
            status="ACTIVE",
        )
        db_session.add(fac1)
        db_session.flush()

    # Facility 2 (for isolation / referral test)
    fac2 = db_session.query(Facility).filter_by(id=2).first()
    if not fac2:
        fac2 = Facility(
            id=2,
            name="District Hospital Solapur",
            type="DISTRICT_HOSPITAL",
            address="Civil Hospital Road",
            district="Solapur",
            latitude=17.6599,
            longitude=75.9064,
            status="ACTIVE",
        )
        db_session.add(fac2)
        db_session.flush()

    # Service
    srv = db_session.query(FacilityService).filter_by(facility_id=1).first()
    if not srv:
        srv = FacilityService(
            facility_id=1,
            name="General Medicine",
            description="OPD consultations",
            available=True,
        )
        db_session.add(srv)
        db_session.flush()

    # Doctor
    doc = db_session.query(Doctor).filter_by(doctor_id="DOC-10101").first()
    if not doc:
        doc = Doctor(
            doctor_id="DOC-10101",
            name="Dr. S. Patil",
            mobile="9842183000",
            role="DOCTOR",
            specialization="General Medicine",
            facility_id=1,
        )
        db_session.add(doc)
        db_session.flush()

    # Doctor at facility 2 (for isolation testing)
    doc2 = db_session.query(Doctor).filter_by(doctor_id="DOC-20202").first()
    if not doc2:
        doc2 = Doctor(
            doctor_id="DOC-20202",
            name="Dr. R. Deshmukh",
            mobile="9842183999",
            role="DOCTOR",
            specialization="Cardiology",
            facility_id=2,
        )
        db_session.add(doc2)
        db_session.flush()

    # Patient
    patient = db_session.query(Patient).filter_by(mobile="9876500001").first()
    if not patient:
        patient = Patient(
            mobile="9876500001",
            full_name="Anand Shinde",
            age=45,
            gender="Male",
            village="Malshiras Rural",
            district="Solapur",
            facility_id=1,
            consent=True,
        )
        db_session.add(patient)
        db_session.flush()

    # Worker screening for patient
    scr = db_session.query(Screening).filter_by(patient_id=patient.id).first()
    if not scr:
        scr = Screening(
            patient_id=patient.id,
            facility_id=1,
            worker_id="FHW-20841",
            temperature=38.2,
            systolic_bp=130,
            diastolic_bp=85,
            heart_rate=88,
            spo2=97.0,
            symptoms="High fever, body ache, severe headache",
            notes="Patient reports symptoms for 2 days. Hydration encouraged.",
            triage_level="URGENT",
        )
        db_session.add(scr)
        db_session.flush()

    db_session.commit()
    return {
        "facility_1": fac1,
        "facility_2": fac2,
        "doctor": doc,
        "doctor_2": doc2,
        "patient": patient,
        "screening": scr,
    }


def test_1_doctor_login_still_works(client: TestClient, doctor_test_data):
    """Test 1: Staff login with valid doctor ID and password issues role=DOCTOR token."""
    response = client.post(
        "/api/v1/auth/staff/login",
        json={"staff_id": "DOC-10101", "password": "password123"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["role"] == "DOCTOR"
    assert "access_token" in body["data"]
    assert body["data"]["user"]["staff_id"] == "DOC-10101"
    assert "password_hash" not in str(body)


def test_2_doctor_can_access_doctor_profile(client: TestClient, doctor_test_data):
    """Test 2: Authenticated doctor can retrieve /api/v1/auth/doctor/me."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1, "mobile": "9842183000"},
    )
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/auth/doctor/me", headers=headers)
    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["data"]["doctor_id"] == "DOC-10101"
    assert body["data"]["role"] == "DOCTOR"
    assert body["data"]["facility_id"] == 1
    assert "password_hash" not in str(body)


def test_3_worker_cannot_access_doctor_endpoint(client: TestClient, doctor_test_data):
    """Test 3: Worker Bearer token gets 403 Forbidden on doctor-only endpoints."""
    worker_token = create_access_token(
        subject="FHW-20841",
        role="WORKER",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {worker_token}"}
    response = client.get("/api/v1/doctor/dashboard", headers=headers)
    assert response.status_code == 403


def test_4_patient_cannot_access_doctor_endpoint(client: TestClient, doctor_test_data):
    """Test 4: Patient Bearer token gets 403 Forbidden on doctor-only endpoints."""
    patient_token = create_access_token(
        subject="1",
        role="PATIENT",
        extra_claims={"mobile": "9876500001"},
    )
    headers = {"Authorization": f"Bearer {patient_token}"}
    response = client.get("/api/v1/doctor/dashboard", headers=headers)
    assert response.status_code == 403


def test_5_unauthenticated_request_returns_401(client: TestClient):
    """Test 5: Unauthenticated call without Bearer token gets 401 Unauthorized."""
    response = client.get("/api/v1/doctor/dashboard")
    assert response.status_code == 401


def test_6_doctor_can_access_authorized_patient_and_queue(client: TestClient, doctor_test_data):
    """Test 6: Doctor can access patient clinical summary and live queue."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}
    patient = doctor_test_data["patient"]

    # 1. Access clinical summary
    resp = client.get(f"/api/v1/doctor/patients/{patient.id}/clinical-summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["patient"]["id"] == patient.id
    assert data["patient"]["name"] == "Anand Shinde"
    # Worker screening info
    assert data["screening"]["temperature"] == 38.2
    assert data["screening"]["heart_rate"] == 88
    # AI-assisted triage
    assert "ai_triage" in data
    assert "disclaimer" in data["ai_triage"]
    assert "AI-assisted triage" in data["ai_triage"]["disclaimer"]
    assert "Final clinical decision remains with the healthcare professional" in data["ai_triage"]["disclaimer"]

    # 2. Access doctor patient queue
    resp_q = client.get("/api/v1/doctor/queue", headers=headers)
    assert resp_q.status_code == 200
    queue = resp_q.json()["data"]
    assert isinstance(queue, list)
    # Patient should be in the queue
    matching = [q for q in queue if q["patient_id"] == patient.id]
    assert len(matching) > 0
    assert matching[0]["priority"] == "URGENT"


def test_7_doctor_cannot_access_unauthorized_facility_consultation(
    client: TestClient, doctor_test_data, db_session
):
    """Test 7: Doctor cannot access consultations from an unrelated facility."""
    # Create consultation belonging to facility 2
    cons_other = Consultation(
        patient_id=doctor_test_data["patient"].id,
        doctor_id="DOC-20202",
        facility_id=2,  # Facility 2
        notes="Cardiology evaluation at District Hospital",
    )
    db_session.add(cons_other)
    db_session.commit()

    # Doctor 1 attempts to access consultation from facility 2
    token_doc1 = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token_doc1}"}

    resp = client.get(f"/api/v1/doctor/consultations/{cons_other.id}", headers=headers)
    assert resp.status_code == 403


def test_8_and_9_doctor_can_create_consultation_and_persisted(
    client: TestClient, doctor_test_data, db_session
):
    """Test 8 & 9: Doctor can create a consultation and record is properly stored."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}
    patient = doctor_test_data["patient"]

    payload = {
        "patient_id": patient.id,
        "notes": "Throat congested, chest clear, temperature elevated.",
        "assessment": "Acute Viral Pharyngitis",
        "advice": "Drink warm fluids, steam inhalation 2x daily, adequate rest.",
        "prescription": "Paracetamol 500mg TDS x 3 days, Azithromycin 500mg OD x 3 days",
        "follow_up_required": False,
    }

    resp = client.post("/api/v1/doctor/consultations", json=payload, headers=headers)
    assert resp.status_code == 200
    created = resp.json()["data"]
    assert created["patient_id"] == patient.id
    assert created["doctor_id"] == "DOC-10101"
    assert created["assessment"] == "Acute Viral Pharyngitis"

    # Verify directly from database
    cons = db_session.query(Consultation).filter_by(id=created["id"]).first()
    assert cons is not None
    assert cons.patient_id == patient.id
    assert cons.facility_id == 1
    assert cons.prescription == "Paracetamol 500mg TDS x 3 days, Azithromycin 500mg OD x 3 days"


def test_10_consultation_appears_in_health_journey(client: TestClient, doctor_test_data, db_session):
    """Test 10: Consultation automatically generates CONSULTATION_COMPLETED event in health journey."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}
    patient = doctor_test_data["patient"]

    payload = {
        "patient_id": patient.id,
        "notes": "Follow-up checkup completed.",
        "assessment": "Recovering well from viral infection.",
        "advice": "Continue hydration.",
        "prescription": "None needed.",
        "follow_up_required": False,
    }

    resp = client.post("/api/v1/doctor/consultations", json=payload, headers=headers)
    assert resp.status_code == 200

    # Check health journey table
    event = (
        db_session.query(HealthJourneyEvent)
        .filter_by(patient_id=patient.id, event_type="CONSULTATION_COMPLETED")
        .order_by(HealthJourneyEvent.id.desc())
        .first()
    )
    assert event is not None
    assert "Doctor Consultation Completed" in event.title
    assert "Recovering well" in event.description


def test_11_follow_up_created_when_requested(client: TestClient, doctor_test_data, db_session):
    """Test 11: If follow_up_required is True, a FollowUp record is created."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}
    patient = doctor_test_data["patient"]

    payload = {
        "patient_id": patient.id,
        "notes": "Suspected bacterial infection.",
        "assessment": "Bacterial tonsillitis",
        "advice": "Review after 5 days of antibiotic course.",
        "prescription": "Amoxicillin 500mg TDS",
        "follow_up_required": True,
        "follow_up_date": "2026-09-15",
    }

    resp = client.post("/api/v1/doctor/consultations", json=payload, headers=headers)
    assert resp.status_code == 200

    # Verify FollowUp entity created in database
    fu = (
        db_session.query(FollowUp)
        .filter_by(patient_id=patient.id, follow_up_date="2026-09-15")
        .first()
    )
    assert fu is not None
    assert fu.status == "PENDING"
    assert "Review after 5 days" in fu.notes


def test_12_referral_created_using_existing_referral_system(
    client: TestClient, doctor_test_data, db_session
):
    """Test 12: Doctor can refer patient to another facility using referral integration."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}
    patient = doctor_test_data["patient"]

    payload = {
        "patient_id": patient.id,
        "to_facility_id": 2,  # District Hospital Solapur
        "reason": "Requires echocardiography and specialist cardiologist review.",
        "priority": "URGENT",
    }

    resp = client.post("/api/v1/doctor/referrals", json=payload, headers=headers)
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["patient_id"] == patient.id
    assert data["from_facility_id"] == 1
    assert data["to_facility_id"] == 2
    assert data["priority"] == "URGENT"

    # Verify in database
    ref = db_session.query(Referral).filter_by(id=data["id"]).first()
    assert ref is not None
    assert ref.status == "PENDING"

    # Verify Health Journey event REFERRAL was generated by existing referral service
    event = (
        db_session.query(HealthJourneyEvent)
        .filter_by(patient_id=patient.id, event_type="REFERRAL")
        .order_by(HealthJourneyEvent.id.desc())
        .first()
    )
    assert event is not None


def test_13_invalid_patient_or_appointment_handled_safely(
    client: TestClient, doctor_test_data
):
    """Test 13: Non-existent patient or invalid appointment returns appropriate 404/validation error."""
    token = create_access_token(
        subject="DOC-10101",
        role="DOCTOR",
        extra_claims={"facility_id": 1},
    )
    headers = {"Authorization": f"Bearer {token}"}

    # Non-existent patient
    resp1 = client.get("/api/v1/doctor/patients/999999/clinical-summary", headers=headers)
    assert resp1.status_code == 404

    # Consultation with non-existent patient
    resp2 = client.post(
        "/api/v1/doctor/consultations",
        json={"patient_id": 999999, "assessment": "None"},
        headers=headers,
    )
    assert resp2.status_code == 404

    # Consultation with invalid appointment
    resp3 = client.post(
        "/api/v1/doctor/consultations",
        json={
            "patient_id": doctor_test_data["patient"].id,
            "appointment_id": 888888,
            "assessment": "None",
        },
        headers=headers,
    )
    assert resp3.status_code == 404
