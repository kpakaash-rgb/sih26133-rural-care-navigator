"""
tests/test_appointments.py
==========================
Comprehensive test suite for Patient Appointment Booking, Retrieval, and Cancellation.

Test Cases:
  1. Successful appointment booking
  2. Booking requires authentication (401 without token)
  3. Invalid facility (404)
  4. Invalid service (404)
  5. Service does not belong to facility (422)
  6. Invalid availability slot (404)
  7. Slot already booked (409)
  8. Slot unavailable (409)
  9. Patient cannot book for another patient (patient ID derived strictly from JWT)
  10. Patient can retrieve their appointments
  11. Patient cannot retrieve another patient's appointment (404)
  12. Successful cancellation
  13. Cancelled slot becomes AVAILABLE again
  14. Cancelled appointment cannot be cancelled again (422)
  15. Appointment persists in database with correct relations
  16. Double-booking prevention (second attempt on same slot fails)
"""

from __future__ import annotations

import pytest

from backend.app.core.security import create_access_token
from backend.app.models.appointment import Appointment
from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.patient import Patient


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


@pytest.fixture()
def appointment_test_setup(db_session):
    """Fixture providing patients, facility, services, and availability slots."""
    # Patient 1 (Primary Test Patient)
    p1 = Patient(
        mobile="9876543210",
        full_name="Ramesh Kumar",
        district="Solapur",
        consent=True,
    )
    # Patient 2 (Other Patient)
    p2 = Patient(
        mobile="9123456780",
        full_name="Sunita Patil",
        district="Solapur",
        consent=True,
    )
    db_session.add_all([p1, p2])
    db_session.flush()

    # Facility 1: PHC Malshiras
    f1 = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
    # Facility 2: CHC Akluj
    f2 = Facility(
        name="CHC Akluj",
        type="COMMUNITY_HEALTH_CENTRE",
        address="Station Road, Akluj",
        district="Solapur",
        status="ACTIVE",
    )
    db_session.add_all([f1, f2])
    db_session.flush()

    # Services for F1
    s1 = FacilityService(
        facility_id=f1.id,
        name="General Medicine",
        description="Outpatient clinic",
        available=True,
    )
    s2 = FacilityService(
        facility_id=f1.id,
        name="Basic Tests",
        description="Routine lab investigations",
        available=True,
    )
    # Service for F2
    s3 = FacilityService(
        facility_id=f2.id,
        name="Advanced Diagnostics",
        description="X-Ray / Ultrasound",
        available=True,
    )
    db_session.add_all([s1, s2, s3])
    db_session.flush()

    # Slots for F1
    slot_available = AvailabilitySlot(
        facility_id=f1.id,
        service_id=s1.id,
        date="2026-09-02",
        start_time="10:00",
        end_time="10:30",
        status="AVAILABLE",
    )
    slot_booked = AvailabilitySlot(
        facility_id=f1.id,
        service_id=s1.id,
        date="2026-09-02",
        start_time="10:30",
        end_time="11:00",
        status="BOOKED",
    )
    slot_unavailable = AvailabilitySlot(
        facility_id=f1.id,
        service_id=s2.id,
        date="2026-09-02",
        start_time="11:00",
        end_time="11:30",
        status="UNAVAILABLE",
    )
    slot_cancel_test = AvailabilitySlot(
        facility_id=f1.id,
        service_id=s1.id,
        date="2026-09-03",
        start_time="14:00",
        end_time="14:30",
        status="AVAILABLE",
    )
    db_session.add_all([slot_available, slot_booked, slot_unavailable, slot_cancel_test])
    db_session.commit()

    p1_token = create_access_token(subject=str(p1.id), role="PATIENT", extra_claims={"mobile": p1.mobile})
    p2_token = create_access_token(subject=str(p2.id), role="PATIENT", extra_claims={"mobile": p2.mobile})

    return {
        "p1": p1,
        "p2": p2,
        "p1_token": p1_token,
        "p2_token": p2_token,
        "f1": f1,
        "f2": f2,
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "slot_available": slot_available,
        "slot_booked": slot_booked,
        "slot_unavailable": slot_unavailable,
        "slot_cancel_test": slot_cancel_test,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1-9. Appointment Booking Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAppointmentBooking:
    def test_successful_appointment_booking(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_available"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)

        data = body["data"]
        assert data["patient_id"] == ctx["p1"].id
        assert data["facility_id"] == ctx["f1"].id
        assert data["service_id"] == ctx["s1"].id
        assert data["availability_slot_id"] == ctx["slot_available"].id
        assert data["status"] == "SCHEDULED"
        assert data["appointment_date"] == "2026-09-02"

        # Verify the slot transitioned to BOOKED
        slot_res = client.get(f"/api/v1/facilities/{ctx['f1'].id}/availability")
        for s in slot_res.json()["data"]:
            if s["id"] == ctx["slot_available"].id:
                assert s["status"] == "BOOKED"

    def test_booking_requires_authentication(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_available"].id,
        }
        # No Authorization header
        response = client.post("/api/v1/appointments", json=payload)
        assert response.status_code == 401
        _assert_envelope(response.json(), success=False)

    def test_booking_invalid_facility_returns_404(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": 99999,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_available"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)

    def test_booking_invalid_service_returns_404(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": 99999,
            "availability_slot_id": ctx["slot_available"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)

    def test_booking_service_does_not_belong_to_facility_returns_422(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # s3 belongs to f2, not f1
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s3"].id,
            "availability_slot_id": ctx["slot_available"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 422
        _assert_envelope(response.json(), success=False)

    def test_booking_invalid_availability_slot_returns_404(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": 99999,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)

    def test_booking_already_booked_slot_returns_409(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_booked"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 409
        _assert_envelope(response.json(), success=False)

    def test_booking_unavailable_slot_returns_409(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s2"].id,
            "availability_slot_id": ctx["slot_unavailable"].id,
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 409
        _assert_envelope(response.json(), success=False)

    def test_patient_identity_taken_strictly_from_jwt(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # Attempt to pass an arbitrary patient_id in payload
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_available"].id,
            "patient_id": ctx["p2"].id,  # Trying to impersonate patient 2
        }
        response = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 200
        # Verified: Booked appointment is strictly for patient 1 (from JWT)
        assert response.json()["data"]["patient_id"] == ctx["p1"].id


# ──────────────────────────────────────────────────────────────────────────────
# 10-11. Appointment Retrieval & Access Control Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAppointmentRetrievalAndAccessControl:
    def test_patient_can_retrieve_their_appointments(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # Book an appointment for P1
        client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f1"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": ctx["slot_available"].id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        response = client.get(
            "/api/v1/appointments",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1
        for appt in body["data"]:
            assert appt["patient_id"] == ctx["p1"].id

    def test_patient_cannot_retrieve_another_patients_appointment(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # Book appointment for P1
        book_res = client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f1"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": ctx["slot_available"].id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        appt_id = book_res.json()["data"]["id"]

        # P2 attempts to fetch P1's appointment by ID
        response = client.get(
            f"/api/v1/appointments/{appt_id}",
            headers={"Authorization": f"Bearer {ctx['p2_token']}"},
        )
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 12-14. Cancellation Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAppointmentCancellation:
    def test_successful_cancellation(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # 1. Book slot
        book_res = client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f1"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": ctx["slot_cancel_test"].id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        appt_id = book_res.json()["data"]["id"]

        # 2. Cancel appointment
        cancel_res = client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert cancel_res.status_code == 200
        body = cancel_res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["status"] == "CANCELLED"

    def test_cancelled_slot_becomes_available(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # 1. Book slot
        book_res = client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f1"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": ctx["slot_cancel_test"].id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        appt_id = book_res.json()["data"]["id"]

        # Verify slot is BOOKED
        slot_before = client.get(f"/api/v1/facilities/{ctx['f1'].id}/availability").json()["data"]
        for s in slot_before:
            if s["id"] == ctx["slot_cancel_test"].id:
                assert s["status"] == "BOOKED"

        # 2. Cancel appointment
        client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        # 3. Verify availability slot is now AVAILABLE again
        avail_res = client.get(f"/api/v1/facilities/{ctx['f1'].id}/availability")
        for s in avail_res.json()["data"]:
            if s["id"] == ctx["slot_cancel_test"].id:
                assert s["status"] == "AVAILABLE"

    def test_cannot_cancel_already_cancelled_appointment(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        # Book slot
        book_res = client.post(
            "/api/v1/appointments",
            json={
                "facility_id": ctx["f1"].id,
                "service_id": ctx["s1"].id,
                "availability_slot_id": ctx["slot_cancel_test"].id,
            },
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        appt_id = book_res.json()["data"]["id"]

        # First cancellation
        client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )

        # Second cancellation attempt
        second_cancel = client.post(
            f"/api/v1/appointments/{appt_id}/cancel",
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert second_cancel.status_code == 422
        _assert_envelope(second_cancel.json(), success=False)



# ──────────────────────────────────────────────────────────────────────────────
# 15-16. Database Persistence & Concurrency
# ──────────────────────────────────────────────────────────────────────────────

class TestDatabasePersistenceAndDoubleBooking:
    def test_appointment_persists_in_database(self, db_session, appointment_test_setup):
        ctx = appointment_test_setup
        appt = Appointment(
            patient_id=ctx["p1"].id,
            facility_id=ctx["f1"].id,
            service_id=ctx["s1"].id,
            availability_slot_id=ctx["slot_available"].id,
            appointment_date="2026-09-02",
            start_time="10:00",
            end_time="10:30",
            status="SCHEDULED",
        )
        db_session.add(appt)
        db_session.commit()
        db_session.refresh(appt)

        assert appt.id is not None
        assert appt.patient.mobile == "9876543210"
        assert appt.facility.name == "PHC Malshiras"
        assert appt.service.name == "General Medicine"

    def test_double_booking_prevention(self, client, appointment_test_setup):
        ctx = appointment_test_setup
        payload = {
            "facility_id": ctx["f1"].id,
            "service_id": ctx["s1"].id,
            "availability_slot_id": ctx["slot_available"].id,
        }
        # First booking succeeds
        res1 = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p1_token']}"},
        )
        assert res1.status_code == 200

        # Second booking attempt on same slot fails
        res2 = client.post(
            "/api/v1/appointments",
            json=payload,
            headers={"Authorization": f"Bearer {ctx['p2_token']}"},
        )
        assert res2.status_code == 409
        _assert_envelope(res2.json(), success=False)
