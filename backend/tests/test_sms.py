"""
tests/test_sms.py
=================
Comprehensive test suite for SMS OTP Delivery and Gateway Adapters.

Test Cases:
  1. Demo OTP still works (returns demo_otp in payload)
  2. OTP is stored HMAC-SHA256 hashed in database
  3. Production mode dispatches OTP via SMS adapter
  4. OTP is NOT returned in production response (demo_otp is null)
  5. SMS provider success produces successful API response
  6. SMS provider failure returns safe error without leaking credentials
  7. API credentials and raw OTP are not exposed in responses
  8. Console SMS adapter records dispatch
  9. Custom mock SMS adapter error handling
"""

from __future__ import annotations

import hmac
import hashlib
import pytest

from backend.app.adapters.sms.base import BaseSMSAdapter, SMSDeliveryResult
from backend.app.adapters.sms.console import ConsoleSMSAdapter
from backend.app.adapters.sms.provider import SmsProviderAdapter
from backend.app.core.config import settings
from backend.app.models.otp import OTPRecord
from backend.app.models.patient import Patient
from backend.app.repositories.otp_repository import OTPRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.services.auth_service import AuthService
from backend.app.services.sms_service import SMSService


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


class MockFailingSMSAdapter(BaseSMSAdapter):
    """SMS adapter that simulates upstream gateway error."""

    def send_otp(self, mobile: str, otp: str) -> SMSDeliveryResult:
        return SMSDeliveryResult(success=False, error="Upstream gateway timeout")


class MockRecordingSMSAdapter(BaseSMSAdapter):
    """SMS adapter that tracks calls."""

    def __init__(self):
        self.dispatches = []

    def send_otp(self, mobile: str, otp: str) -> SMSDeliveryResult:
        self.dispatches.append((mobile, otp))
        return SMSDeliveryResult(success=True, message_id="mock-12345")


class TestSMSDelivery:
    def test_demo_otp_still_works(self, client, db_session, monkeypatch):
        monkeypatch.setattr(settings, "OTP_DEMO_MODE", True)
        monkeypatch.setattr(settings, "DEMO_OTP", "123456")

        res = client.post("/api/v1/auth/request-otp", json={"mobile": "9876543210"})
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["demo_otp"] == "123456"

    def test_otp_is_stored_hashed_in_database(self, client, db_session, monkeypatch):
        monkeypatch.setattr(settings, "OTP_DEMO_MODE", True)
        monkeypatch.setattr(settings, "DEMO_OTP", "654321")

        client.post("/api/v1/auth/request-otp", json={"mobile": "9876543210"})

        # Verify raw OTP is never stored in plaintext
        otp_record = db_session.query(OTPRecord).filter(OTPRecord.mobile == "9876543210").first()
        assert otp_record is not None
        assert otp_record.otp_hash != "654321"

        expected_hash = hmac.new(
            settings.SECRET_KEY.encode(),
            "9876543210:654321".encode(),
            hashlib.sha256,
        ).hexdigest()
        assert otp_record.otp_hash == expected_hash

    def test_production_mode_dispatches_sms_and_hides_otp(self, db_session, monkeypatch):
        # Configure production mode with mock recording adapter
        monkeypatch.setattr(settings, "OTP_DEMO_MODE", False)
        monkeypatch.setattr(settings, "SMS_ENABLED", True)

        recording_adapter = MockRecordingSMSAdapter()
        sms_service = SMSService(adapter=recording_adapter)
        auth_service = AuthService(
            otp_repo=OTPRepository(db_session),
            patient_repo=PatientRepository(db_session),
            sms_service=sms_service,
        )

        res = auth_service.request_otp("9876543210")

        # OTP must NOT be returned in response payload
        assert res["demo_otp"] is None
        assert res["message"] == "OTP sent successfully to your mobile number."

        # Adapter must have received the 6-digit OTP
        assert len(recording_adapter.dispatches) == 1
        dispatched_mobile, dispatched_otp = recording_adapter.dispatches[0]
        assert dispatched_mobile == "9876543210"
        assert len(dispatched_otp) == 6
        assert dispatched_otp.isdigit()

    def test_sms_provider_failure_returns_safe_error(self, db_session, monkeypatch):
        monkeypatch.setattr(settings, "OTP_DEMO_MODE", False)
        monkeypatch.setattr(settings, "SMS_ENABLED", True)

        failing_adapter = MockFailingSMSAdapter()
        sms_service = SMSService(adapter=failing_adapter)
        auth_service = AuthService(
            otp_repo=OTPRepository(db_session),
            patient_repo=PatientRepository(db_session),
            sms_service=sms_service,
        )

        with pytest.raises(Exception) as exc_info:
            auth_service.request_otp("9876543210")

        error_message = str(exc_info.value)
        # Verify safe error message
        assert "Unable to deliver OTP via SMS" in error_message
        # Verify credentials or vendor internals are not in exception message
        assert "Upstream gateway timeout" not in error_message
        assert "api_key" not in error_message.lower()

    def test_console_sms_adapter(self):
        adapter = ConsoleSMSAdapter()
        result = adapter.send_otp("9876543210", "445566")
        assert result.success is True
        assert result.message_id is not None
        assert len(adapter.sent_messages) == 1

    def test_sms_provider_adapter_unconfigured_key_safe_behavior(self, monkeypatch):
        monkeypatch.setattr(settings, "SMS_API_KEY", None)
        monkeypatch.setattr(settings, "MSG91_AUTH_KEY", None)
        adapter = SmsProviderAdapter(api_key=None)
        result = adapter.send_otp("9876543210", "112233")
        assert result.success is False
        assert "API key is not configured" in result.error


from backend.app.core.security import create_access_token
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.availability import AvailabilitySlot


@pytest.fixture()
def care_summary_test_setup(db_session):
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
    f1 = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
    db_session.add_all([p1, p2, f1])
    db_session.flush()

    s1 = FacilityService(
        facility_id=f1.id,
        name="General Medicine",
        description="Outpatient clinic",
        available=True,
    )
    db_session.add(s1)
    db_session.flush()

    slot = AvailabilitySlot(
        facility_id=f1.id,
        service_id=s1.id,
        date="2026-09-15",
        start_time="10:00",
        end_time="10:30",
        status="AVAILABLE",
    )
    db_session.add(slot)
    db_session.commit()

    p1_token = create_access_token(subject=str(p1.id), role="PATIENT", extra_claims={"mobile": p1.mobile})
    p2_token = create_access_token(subject=str(p2.id), role="PATIENT", extra_claims={"mobile": p2.mobile})

    return {
        "p1": p1,
        "p2": p2,
        "p1_token": p1_token,
        "p2_token": p2_token,
        "f1": f1,
        "s1": s1,
        "slot": slot,
    }


class TestCareSummarySMS:
    def test_authenticated_patient_can_request_sms_care_summary(self, client, care_summary_test_setup):
        setup = care_summary_test_setup
        headers = {"Authorization": f"Bearer {setup['p1_token']}"}

        res = client.post(
            "/api/v1/sms/care-summary",
            json={"facility_id": setup["f1"].id},
            headers=headers,
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["success"] is True
        assert body["data"]["demo_mode"] is True
        assert body["data"]["delivery_status"] == "DEMO_PREPARED"
        assert "98XXXX3210" in body["data"]["recipient_masked"]
        assert "PHC Malshiras" in body["data"]["sms_preview"]

    def test_unauthenticated_request_is_rejected(self, client):
        res = client.post("/api/v1/sms/care-summary", json={"facility_id": 1})
        assert res.status_code == 401

    def test_missing_facility_returns_404(self, client, care_summary_test_setup):
        headers = {"Authorization": f"Bearer {care_summary_test_setup['p1_token']}"}
        res = client.post(
            "/api/v1/sms/care-summary",
            json={"facility_id": 99999},
            headers=headers,
        )
        assert res.status_code == 404

    def test_missing_appointment_returns_404(self, client, care_summary_test_setup):
        headers = {"Authorization": f"Bearer {care_summary_test_setup['p1_token']}"}
        res = client.post(
            "/api/v1/sms/care-summary",
            json={"appointment_id": 99999},
            headers=headers,
        )
        assert res.status_code == 404

    def test_patient_cannot_send_another_patient_appointment(self, client, care_summary_test_setup):
        setup = care_summary_test_setup
        headers1 = {"Authorization": f"Bearer {setup['p1_token']}"}

        # Patient 1 books an appointment
        book_res = client.post(
            "/api/v1/appointments",
            json={
                "facility_id": setup["f1"].id,
                "service_id": setup["s1"].id,
                "availability_slot_id": setup["slot"].id,
            },
            headers=headers1,
        )
        assert book_res.status_code == 200
        appt_id = book_res.json()["data"]["id"]

        # Patient 2 attempts to send care summary for Patient 1's appointment
        headers2 = {"Authorization": f"Bearer {setup['p2_token']}"}
        idor_res = client.post(
            "/api/v1/sms/care-summary",
            json={"appointment_id": appt_id},
            headers=headers2,
        )
        assert idor_res.status_code == 403
        assert "not authorized" in idor_res.json().get("detail", idor_res.json().get("message", "")).lower()

    def test_emergency_guidance_sms_includes_safety_text(self, client, care_summary_test_setup):
        headers = {"Authorization": f"Bearer {care_summary_test_setup['p1_token']}"}
        res = client.post(
            "/api/v1/sms/care-summary",
            json={"facility_id": care_summary_test_setup["f1"].id, "emergency_guidance": True},
            headers=headers,
        )
        assert res.status_code == 200
        preview = res.json()["data"]["sms_preview"]
        assert "EMERGENCY" in preview
        assert "108" in preview

    def test_no_credentials_appear_in_api_response(self, client, care_summary_test_setup):
        headers = {"Authorization": f"Bearer {care_summary_test_setup['p1_token']}"}
        res = client.post(
            "/api/v1/sms/care-summary",
            json={"facility_id": care_summary_test_setup["f1"].id},
            headers=headers,
        )
        body_str = res.text.lower()
        assert "api_key" not in body_str
        assert "authkey" not in body_str
        assert "secret" not in body_str
        assert "password" not in body_str


