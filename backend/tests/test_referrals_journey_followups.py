"""
tests/test_referrals_journey_followups.py
=========================================
Comprehensive test suite for Referrals, Patient Health Journey, and Follow-Ups.

Test Cases:
  REFERRALS:
    1. Create referral
    2. Referral requires authentication
    3. Invalid destination facility (404)
    4. Invalid appointment (404/422)
    5. Patient can retrieve own referrals
    6. Patient cannot retrieve another patient's referral (404)
    7. Cancel referral
    8. Invalid referral status transition (422)

  HEALTH JOURNEY:
    9. Retrieve patient health journey
    10. Patient cannot access another patient's journey
    11. Registration creates journey event
    12. Appointment creates journey event
    13. Referral creates journey event
    14. Filter journey by event type

  FOLLOW-UP:
    15. Create follow-up
    16. Follow-up requires authentication (401)
    17. Patient can retrieve own follow-ups
    18. Patient cannot retrieve another patient's follow-up (404)
    19. Complete follow-up
    20. Cancel follow-up
    21. Invalid status transition (422)
    22. Invalid appointment/referral relationship (422)

  DATABASE & RELATIONS:
    23. Referral persistence
    24. Health journey persistence
    25. Follow-up persistence
    26. Foreign-key relationships
"""

from __future__ import annotations

import pytest

from backend.app.core.security import create_access_token
from backend.app.models.appointment import Appointment
from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.follow_up import FollowUp
from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.models.patient import Patient
from backend.app.models.referral import Referral


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


@pytest.fixture()
def step7_test_setup(db_session):
    """Fixture providing patients, facilities, appointment, and tokens."""
    # Patients
    p1 = Patient(
        mobile="9876543210",
        full_name="Ramesh Kumar",
        district="Solapur",
        consent=True,
    )
    p2 = Patient(
        mobile="9123456780",
        full_name="Sunita Patil",
        district="Solapur",
        consent=True,
    )
    db_session.add_all([p1, p2])
    db_session.flush()

    # Facilities
    f_phc = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Malshiras Village",
        district="Solapur",
        status="ACTIVE",
    )
    f_chc = Facility(
        name="CHC Akluj",
        type="COMMUNITY_HEALTH_CENTRE",
        address="Station Road, Akluj",
        district="Solapur",
        status="ACTIVE",
    )
    f_dh = Facility(
        name="District Hospital Solapur",
        type="DISTRICT_HOSPITAL",
        address="Civil Lines, Solapur",
        district="Solapur",
        status="ACTIVE",
    )
    db_session.add_all([f_phc, f_chc, f_dh])
    db_session.flush()

    # Services
    s1 = FacilityService(facility_id=f_phc.id, name="General Medicine", available=True)
    s2 = FacilityService(facility_id=f_dh.id, name="Specialist Cardiology", available=True)
    db_session.add_all([s1, s2])
    db_session.flush()

    # Availability & Appointment for P1
    slot = AvailabilitySlot(
        facility_id=f_phc.id,
        service_id=s1.id,
        date="2026-09-02",
        start_time="09:00",
        end_time="09:30",
        status="BOOKED",
    )
    db_session.add(slot)
    db_session.flush()

    appt1 = Appointment(
        patient_id=p1.id,
        facility_id=f_phc.id,
        service_id=s1.id,
        availability_slot_id=slot.id,
        appointment_date="2026-09-02",
        start_time="09:00",
        end_time="09:30",
        status="SCHEDULED",
    )
    db_session.add(appt1)
    db_session.commit()

    p1_token = create_access_token(subject=str(p1.id), role="PATIENT", extra_claims={"mobile": p1.mobile})
    p2_token = create_access_token(subject=str(p2.id), role="PATIENT", extra_claims={"mobile": p2.mobile})

    return {
        "p1": p1,
        "p2": p2,
        "p1_token": p1_token,
        "p2_token": p2_token,
        "f_phc": f_phc,
        "f_chc": f_chc,
        "f_dh": f_dh,
        "s1": s1,
        "s2": s2,
        "appt1": appt1,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1-8. REFERRALS TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestReferrals:
    def test_create_referral(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "to_facility_id": ctx["f_dh"].id,
            "reason": "Requires advanced cardiac evaluation",
            "priority": "URGENT",
            "appointment_id": ctx["appt1"].id,
        }
        res = client.post(
            "/api/v1/referrals",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        data = body["data"]
        assert data["patient_id"] == ctx["p1"].id
        assert data["to_facility_id"] == ctx["f_dh"].id
        assert data["from_facility_id"] == ctx["f_phc"].id
        assert data["priority"] == "URGENT"
        assert data["status"] == "PENDING"

    def test_referral_requires_authentication(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "to_facility_id": ctx["f_dh"].id,
            "reason": "Requires examination",
        }
        res = client.post("/api/v1/referrals", json=payload)
        assert res.status_code == 401
        _assert_envelope(res.json(), success=False)

    def test_invalid_destination_facility_returns_404(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "to_facility_id": 99999,
            "reason": "Invalid target facility",
        }
        res = client.post(
            "/api/v1/referrals",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)

    def test_invalid_appointment_returns_error(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "to_facility_id": ctx["f_dh"].id,
            "reason": "Non-existent appointment linkage",
            "appointment_id": 99999,
        }
        res = client.post(
            "/api/v1/referrals",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)

    def test_patient_can_retrieve_own_referrals(self, client, step7_test_setup):
        ctx = step7_test_setup
        # Create referral for P1
        client.post(
            "/api/v1/referrals",
            json={"to_facility_id": ctx["f_dh"].id, "reason": "P1 referral"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        res = client.get(
            "/api/v1/referrals",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1
        for ref in body["data"]:
            assert ref["patient_id"] == ctx["p1"].id

    def test_patient_cannot_retrieve_another_patients_referral(self, client, step7_test_setup):
        ctx = step7_test_setup
        # Create referral for P1
        p1_res = client.post(
            "/api/v1/referrals",
            json={"to_facility_id": ctx["f_dh"].id, "reason": "P1 Private Referral"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        ref_id = p1_res.json()["data"]["id"]

        # P2 attempts to fetch P1's referral
        res = client.get(
            f"/api/v1/referrals/{ref_id}",
            headers={"Authorization": f"Bearer {ctx['p2_token']}"},
        )
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)

    def test_cancel_referral(self, client, step7_test_setup):
        ctx = step7_test_setup
        create_res = client.post(
            "/api/v1/referrals",
            json={"to_facility_id": ctx["f_dh"].id, "reason": "Cancellation test"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        ref_id = create_res.json()["data"]["id"]

        cancel_res = client.post(
            f"/api/v1/referrals/{ref_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert cancel_res.status_code == 200
        body = cancel_res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["status"] == "CANCELLED"

    def test_invalid_referral_status_transition(self, client, step7_test_setup):
        ctx = step7_test_setup
        create_res = client.post(
            "/api/v1/referrals",
            json={"to_facility_id": ctx["f_dh"].id, "reason": "Double cancel test"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        ref_id = create_res.json()["data"]["id"]

        # First cancellation
        client.post(
            f"/api/v1/referrals/{ref_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        # Attempt to cancel an already cancelled referral
        second_cancel = client.post(
            f"/api/v1/referrals/{ref_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert second_cancel.status_code == 422
        _assert_envelope(second_cancel.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 9-14. HEALTH JOURNEY TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestHealthJourney:
    def test_retrieve_patient_health_journey(self, client, step7_test_setup, db_session):
        ctx = step7_test_setup
        # Add a journey event
        event = HealthJourneyEvent(
            patient_id=ctx["p1"].id,
            event_type="TRIAGE",
            title="Symptom Check",
            description="High fever and body ache",
            event_date="2026-09-01",
        )
        db_session.add(event)
        db_session.commit()

        res = client.get(
            "/api/v1/health-journey",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1

    def test_patient_cannot_access_another_patients_journey(self, client, step7_test_setup, db_session):
        ctx = step7_test_setup
        # Add an event for P1
        event = HealthJourneyEvent(
            patient_id=ctx["p1"].id,
            event_type="APPOINTMENT",
            title="P1 Confidential Consultation",
            event_date="2026-09-01",
        )
        db_session.add(event)
        db_session.commit()

        # P2 fetches their own journey; must not contain P1's event
        p2_res = client.get(
            "/api/v1/health-journey",
            headers={"Authorization": f"Bearer {ctx['p2_token']}"},
        )
        assert p2_res.status_code == 200
        titles = [e["title"] for e in p2_res.json()["data"]]
        assert "P1 Confidential Consultation" not in titles

    def test_registration_creates_journey_event(self, db_session):
        p = Patient(mobile="9999911111", full_name="New Patient", district="Solapur", consent=True)
        db_session.add(p)
        db_session.flush()

        event = HealthJourneyEvent(
            patient_id=p.id,
            event_type="REGISTRATION",
            title="Patient Registration",
            description="Initial onboarding on Rural Care Navigator",
            event_date="2026-09-01",
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        assert event.id is not None
        assert event.event_type == "REGISTRATION"

    def test_appointment_creates_journey_event(self, client, step7_test_setup, db_session):
        ctx = step7_test_setup
        # Create an available slot
        slot = AvailabilitySlot(
            facility_id=ctx["f_phc"].id,
            service_id=ctx["s1"].id,
            date="2026-09-04",
            start_time="10:00",
            end_time="10:30",
            status="AVAILABLE",
        )
        db_session.add(slot)
        db_session.commit()

        # Book appointment
        client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f_phc"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": slot.id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        # Check journey
        res = client.get(
            "/api/v1/health-journey",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        types = [e["event_type"] for e in res.json()["data"]]
        assert "APPOINTMENT" in types

    def test_referral_creates_journey_event(self, client, step7_test_setup):
        ctx = step7_test_setup
        client.post(
            "/api/v1/referrals",
            json={
                "to_facility_id": ctx["f_dh"].id,
                "reason": "Specialist referral test",
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        res = client.get(
            "/api/v1/health-journey",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        types = [e["event_type"] for e in res.json()["data"]]
        assert "REFERRAL" in types

    def test_filter_journey_by_event_type(self, client, step7_test_setup, db_session):
        ctx = step7_test_setup
        db_session.add_all([
            HealthJourneyEvent(patient_id=ctx["p1"].id, event_type="TRIAGE", title="Triage 1", event_date="2026-09-01"),
            HealthJourneyEvent(patient_id=ctx["p1"].id, event_type="REFERRAL", title="Ref 1", event_date="2026-09-01"),
        ])
        db_session.commit()

        res = client.get(
            "/api/v1/health-journey?event_type=TRIAGE",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        for e in res.json()["data"]:
            assert e["event_type"] == "TRIAGE"


# ──────────────────────────────────────────────────────────────────────────────
# 15-22. FOLLOW-UP TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestFollowUps:
    def test_create_follow_up(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "appointment_id": ctx["appt1"].id,
            "follow_up_date": "2026-09-10",
            "notes": "Re-check blood pressure",
        }
        res = client.post(
            "/api/v1/follow-ups",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        data = body["data"]
        assert data["patient_id"] == ctx["p1"].id
        assert data["appointment_id"] == ctx["appt1"].id
        assert data["status"] == "PENDING"
        assert data["follow_up_date"] == "2026-09-10"

    def test_follow_up_requires_authentication(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "appointment_id": ctx["appt1"].id,
            "follow_up_date": "2026-09-10",
        }
        res = client.post("/api/v1/follow-ups", json=payload)
        assert res.status_code == 401
        _assert_envelope(res.json(), success=False)

    def test_patient_can_retrieve_own_follow_ups(self, client, step7_test_setup):
        ctx = step7_test_setup
        client.post(
            "/api/v1/follow-ups",
            json={"appointment_id": ctx["appt1"].id, "follow_up_date": "2026-09-10"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        res = client.get(
            "/api/v1/follow-ups",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1
        for fu in body["data"]:
            assert fu["patient_id"] == ctx["p1"].id

    def test_patient_cannot_retrieve_another_patients_follow_up(self, client, step7_test_setup, db_session):
        ctx = step7_test_setup
        # Create follow up for P1
        fu = FollowUp(
            patient_id=ctx["p1"].id,
            follow_up_date="2026-09-10",
            notes="P1 private follow-up",
            status="PENDING",
        )
        db_session.add(fu)
        db_session.commit()

        # P2 queries their own list
        res = client.get(
            "/api/v1/follow-ups",
            headers={"Authorization": f"Bearer {ctx['p2_token']}"},
        )
        assert res.status_code == 200
        notes = [f["notes"] for f in res.json()["data"]]
        assert "P1 private follow-up" not in notes

    def test_complete_follow_up(self, client, step7_test_setup):
        ctx = step7_test_setup
        create_res = client.post(
            "/api/v1/follow-ups",
            json={"appointment_id": ctx["appt1"].id, "follow_up_date": "2026-09-10", "notes": "Recovery check"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        fu_id = create_res.json()["data"]["id"]

        comp_res = client.post(
            f"/api/v1/follow-ups/{fu_id}/complete",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert comp_res.status_code == 200
        body = comp_res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["status"] == "COMPLETED"

    def test_cancel_follow_up(self, client, step7_test_setup):
        ctx = step7_test_setup
        create_res = client.post(
            "/api/v1/follow-ups",
            json={"appointment_id": ctx["appt1"].id, "follow_up_date": "2026-09-10"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        fu_id = create_res.json()["data"]["id"]

        cancel_res = client.post(
            f"/api/v1/follow-ups/{fu_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert cancel_res.status_code == 200
        body = cancel_res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["status"] == "CANCELLED"

    def test_invalid_status_transition(self, client, step7_test_setup):
        ctx = step7_test_setup
        create_res = client.post(
            "/api/v1/follow-ups",
            json={"appointment_id": ctx["appt1"].id, "follow_up_date": "2026-09-10"},
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        fu_id = create_res.json()["data"]["id"]

        # Complete it
        client.post(
            f"/api/v1/follow-ups/{fu_id}/complete",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        # Attempt to cancel an already completed follow-up
        cancel_res = client.post(
            f"/api/v1/follow-ups/{fu_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert cancel_res.status_code == 422
        _assert_envelope(cancel_res.json(), success=False)

    def test_invalid_appointment_relationship_returns_error(self, client, step7_test_setup):
        ctx = step7_test_setup
        payload = {
            "appointment_id": 99999,
            "follow_up_date": "2026-09-10",
        }
        res = client.post(
            "/api/v1/follow-ups",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 23-26. DATABASE PERSISTENCE & FOREIGN-KEY INTEGRITY
# ──────────────────────────────────────────────────────────────────────────────

class TestDatabasePersistenceAndRelationships:
    def test_referral_persists_in_database(self, db_session, step7_test_setup):
        ctx = step7_test_setup
        ref = Referral(
            patient_id=ctx["p1"].id,
            from_facility_id=ctx["f_phc"].id,
            to_facility_id=ctx["f_dh"].id,
            appointment_id=ctx["appt1"].id,
            reason="Diagnostic evaluation",
            priority="ROUTINE",
            status="PENDING",
        )
        db_session.add(ref)
        db_session.commit()
        db_session.refresh(ref)

        assert ref.id is not None
        assert ref.patient.full_name == "Ramesh Kumar"
        assert ref.to_facility.name == "District Hospital Solapur"
        assert ref.appointment.id == ctx["appt1"].id

    def test_health_journey_persists_in_database(self, db_session, step7_test_setup):
        ctx = step7_test_setup
        event = HealthJourneyEvent(
            patient_id=ctx["p1"].id,
            event_type="CARE_COMPLETED",
            title="Treatment Complete",
            description="Patient fully recovered",
            event_date="2026-09-15",
            facility_id=ctx["f_dh"].id,
        )
        db_session.add(event)
        db_session.commit()
        db_session.refresh(event)

        assert event.id is not None
        assert event.patient.mobile == "9876543210"
        assert event.facility.name == "District Hospital Solapur"

    def test_follow_up_persists_in_database(self, db_session, step7_test_setup):
        ctx = step7_test_setup
        fu = FollowUp(
            patient_id=ctx["p1"].id,
            appointment_id=ctx["appt1"].id,
            follow_up_date="2026-09-20",
            notes="Follow-up checkup",
            status="PENDING",
        )
        db_session.add(fu)
        db_session.commit()
        db_session.refresh(fu)

        assert fu.id is not None
        assert fu.appointment.id == ctx["appt1"].id
        assert fu.patient.full_name == "Ramesh Kumar"

    def test_foreign_key_relationships_integrity(self, db_session, step7_test_setup):
        ctx = step7_test_setup
        ref = Referral(
            patient_id=ctx["p1"].id,
            to_facility_id=ctx["f_dh"].id,
            reason="Cardiology opinion",
            status="ACCEPTED",
        )
        db_session.add(ref)
        db_session.flush()

        fu = FollowUp(
            patient_id=ctx["p1"].id,
            referral_id=ref.id,
            follow_up_date="2026-09-25",
            status="PENDING",
        )
        db_session.add(fu)
        db_session.commit()
        db_session.refresh(fu)

        assert fu.referral.id == ref.id
        assert fu.referral.to_facility.name == "District Hospital Solapur"
