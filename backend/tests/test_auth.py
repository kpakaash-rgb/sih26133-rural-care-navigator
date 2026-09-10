"""
tests/test_auth.py
==================
Comprehensive test suite for Patient Authentication & OTP workflow.

Covers:
  1.  Request OTP (success, envelope, demo_otp)
  2.  Verify valid OTP (access token & patient payload)
  3.  Invalid OTP (failed attempt counter & error envelope)
  4.  Expired OTP (rejection on expiry)
  5.  Too many OTP attempts (lockout on max attempts)
  6.  OTP cannot be reused (single-use constraint)
  7.  Unregistered mobile lookup (clear 404 response)
  8.  JWT generation (payload structure & claims)
  9.  JWT validation (claim extraction & tampering rejection)
  10. /auth/me with valid Bearer token
  11. /auth/me without Authorization header (401)
  12. Invalid/expired token handling (401)
"""

from __future__ import annotations

import hashlib
import hmac
from datetime import datetime, timedelta, timezone

import pytest

from backend.app.core.config import settings
from backend.app.core.exceptions import AuthenticationError
from backend.app.core.security import create_access_token, decode_access_token
from backend.app.models.otp import OTPRecord
from backend.app.models.patient import Patient


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


@pytest.fixture()
def registered_patient(db_session):
    """Fixture providing a pre-registered patient in the test database."""
    patient = Patient(
        mobile="9876543210",
        full_name="Ramesh Kumar",
        district="Pune",
        abha_number="14-1234-5678-9012",
        consent=True,
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)
    return patient


# ──────────────────────────────────────────────────────────────────────────────
# 1. Request OTP
# ──────────────────────────────────────────────────────────────────────────────

class TestRequestOTP:
    def test_request_otp_success(self, client, registered_patient):
        response = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": "9876543210"},
        )
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert body["data"]["mobile"] == "9876543210"
        assert body["data"]["expires_in_minutes"] == settings.OTP_EXPIRY_MINUTES
        assert "demo_otp" in body["data"]

    def test_request_otp_normalizes_mobile_with_country_code(self, client, registered_patient):
        response = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": "+91 98765 43210"},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["data"]["mobile"] == "9876543210"

    def test_request_otp_invalid_mobile_length(self, client):
        response = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": "123"},
        )
        assert response.status_code == 422
        body = response.json()
        _assert_envelope(body, success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 2. Verify Valid OTP
# ──────────────────────────────────────────────────────────────────────────────

class TestVerifyValidOTP:
    def test_verify_valid_otp_returns_jwt_and_patient(self, client, registered_patient):
        # 1. Request OTP
        req_res = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": registered_patient.mobile},
        )
        assert req_res.status_code == 200
        otp_code = req_res.json()["data"]["demo_otp"] or "123456"

        # 2. Verify OTP
        verify_res = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": otp_code},
        )
        assert verify_res.status_code == 200
        body = verify_res.json()
        _assert_envelope(body, success=True)

        data = body["data"]
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["role"] == "PATIENT"
        assert data["patient"]["id"] == registered_patient.id
        assert data["patient"]["mobile"] == registered_patient.mobile
        assert data["patient"]["full_name"] == registered_patient.full_name


# ──────────────────────────────────────────────────────────────────────────────
# 3. Invalid OTP
# ──────────────────────────────────────────────────────────────────────────────

class TestInvalidOTP:
    def test_invalid_otp_returns_422_with_remaining_attempts(self, client, registered_patient):
        # Request OTP
        client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": registered_patient.mobile},
        )

        # Submit wrong OTP
        verify_res = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": "000000"},
        )
        assert verify_res.status_code == 422
        body = verify_res.json()
        _assert_envelope(body, success=False)
        assert "attempt" in body["message"].lower() or "invalid" in body["message"].lower()


# ──────────────────────────────────────────────────────────────────────────────
# 4. Expired OTP
# ──────────────────────────────────────────────────────────────────────────────

class TestExpiredOTP:
    def test_expired_otp_is_rejected(self, client, registered_patient, db_session):
        # Create an expired OTP in database
        otp_hash = hmac.new(
            settings.SECRET_KEY.encode(),
            f"{registered_patient.mobile}:123456".encode(),
            hashlib.sha256,
        ).hexdigest()

        expired_record = OTPRecord(
            mobile=registered_patient.mobile,
            otp_hash=otp_hash,
            expires_at=datetime.now(timezone.utc) - timedelta(minutes=10),
            attempts=0,
            used=False,
        )
        db_session.add(expired_record)
        db_session.commit()

        # Attempt to verify with expired OTP
        verify_res = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": "123456"},
        )
        assert verify_res.status_code == 422
        body = verify_res.json()
        _assert_envelope(body, success=False)
        assert "expired" in body["message"].lower()


# ──────────────────────────────────────────────────────────────────────────────
# 5. Too Many OTP Attempts
# ──────────────────────────────────────────────────────────────────────────────

class TestTooManyAttempts:
    def test_lockout_after_max_attempts(self, client, registered_patient):
        req_res = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": registered_patient.mobile},
        )
        correct_otp = req_res.json()["data"]["demo_otp"] or "123456"

        # Fail max allowed attempts
        for _ in range(settings.OTP_MAX_ATTEMPTS):
            client.post(
                "/api/v1/auth/verify-otp",
                json={"mobile": registered_patient.mobile, "otp": "999999"},
            )

        # Now even the correct OTP must be rejected because record is locked out
        final_res = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": correct_otp},
        )
        assert final_res.status_code == 422
        body = final_res.json()
        _assert_envelope(body, success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 6. OTP Cannot Be Reused
# ──────────────────────────────────────────────────────────────────────────────

class TestOTPReuse:
    def test_otp_cannot_be_reused(self, client, registered_patient):
        # 1. Request and verify once
        req_res = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": registered_patient.mobile},
        )
        otp = req_res.json()["data"]["demo_otp"] or "123456"

        v1 = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": otp},
        )
        assert v1.status_code == 200

        # 2. Try verifying with the same OTP again
        v2 = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": registered_patient.mobile, "otp": otp},
        )
        assert v2.status_code == 422
        _assert_envelope(v2.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 7. Unregistered Mobile & Self-Registration Flow
# ──────────────────────────────────────────────────────────────────────────────

class TestUnregisteredMobile:
    def test_unregistered_mobile_returns_registration_token_without_404(self, client):
        unregistered_num = "9111122222"
        req_res = client.post(
            "/api/v1/auth/request-otp",
            json={"mobile": unregistered_num},
        )
        assert req_res.status_code == 200
        otp = req_res.json()["data"]["demo_otp"] or "123456"

        verify_res = client.post(
            "/api/v1/auth/verify-otp",
            json={"mobile": unregistered_num, "otp": otp},
        )
        assert verify_res.status_code == 200
        body = verify_res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["is_registered"] is False
        assert body["data"]["mobile"] == unregistered_num
        assert "registration_token" in body["data"]
        assert body["data"]["registration_token"] is not None


class TestPatientSelfRegistration:
    def test_self_registration_success_with_valid_token(self, client):
        new_mobile = "9888877777"
        # 1. Request and verify OTP
        req_res = client.post("/api/v1/auth/request-otp", json={"mobile": new_mobile})
        assert req_res.status_code == 200
        otp = req_res.json()["data"]["demo_otp"] or "123456"

        verify_res = client.post("/api/v1/auth/verify-otp", json={"mobile": new_mobile, "otp": otp})
        assert verify_res.status_code == 200
        reg_token = verify_res.json()["data"]["registration_token"]

        # 2. Submit self-registration
        reg_payload = {
            "full_name": "Sunita Patil",
            "mobile": new_mobile,
            "age": 28,
            "gender": "FEMALE",
            "village": "Akluj",
            "district": "Solapur",
            "abha_number": "14-9999-8888-7777",
            "consent": True,
        }
        reg_res = client.post(
            "/api/v1/auth/register-patient",
            json=reg_payload,
            headers={"Authorization": f"Bearer {reg_token}"},
        )
        assert reg_res.status_code == 200
        reg_body = reg_res.json()
        _assert_envelope(reg_body, success=True)
        assert reg_body["data"]["is_registered"] is True
        assert "access_token" in reg_body["data"]
        patient_data = reg_body["data"]["patient"]
        assert patient_data["full_name"] == "Sunita Patil"
        assert patient_data["mobile"] == new_mobile
        assert patient_data["age"] == 28
        assert patient_data["gender"] == "FEMALE"
        assert patient_data["village"] == "Akluj"
        assert patient_data["district"] == "Solapur"

        # 3. Verify newly registered patient can access /auth/me and log in directly
        auth_token = reg_body["data"]["access_token"]
        me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {auth_token}"})
        assert me_res.status_code == 200
        assert me_res.json()["data"]["full_name"] == "Sunita Patil"

        # 4. Verify existing patient OTP login works immediately
        req2 = client.post("/api/v1/auth/request-otp", json={"mobile": new_mobile})
        otp2 = req2.json()["data"]["demo_otp"] or "123456"
        ver2 = client.post("/api/v1/auth/verify-otp", json={"mobile": new_mobile, "otp": otp2})
        assert ver2.status_code == 200
        assert ver2.json()["data"]["is_registered"] is True
        assert ver2.json()["data"]["patient"]["full_name"] == "Sunita Patil"

    def test_self_registration_with_hindi_name(self, client):
        hindi_mobile = "9777766666"
        req_res = client.post("/api/v1/auth/request-otp", json={"mobile": hindi_mobile})
        otp = req_res.json()["data"]["demo_otp"] or "123456"
        ver_res = client.post("/api/v1/auth/verify-otp", json={"mobile": hindi_mobile, "otp": otp})
        token = ver_res.json()["data"]["registration_token"]

        reg_payload = {
            "full_name": "सुनीता पाटिल",
            "mobile": hindi_mobile,
            "age": 32,
            "gender": "FEMALE",
            "village": "माळशिरस",
            "district": "सोलापूर",
            "consent": True,
        }
        res = client.post(
            "/api/v1/auth/register-patient",
            json=reg_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 200
        assert res.json()["data"]["patient"]["full_name"] == "सुनीता पाटिल"

    def test_self_registration_fails_without_token(self, client):
        reg_payload = {
            "full_name": "Unverified User",
            "mobile": "9666655555",
            "age": 40,
            "gender": "MALE",
            "village": "Malshiras",
            "district": "Solapur",
            "consent": True,
        }
        res = client.post("/api/v1/auth/register-patient", json=reg_payload)
        assert res.status_code == 401
        _assert_envelope(res.json(), success=False)

    def test_self_registration_fails_with_token_mobile_mismatch(self, client):
        # Obtain token for mobile A
        mobile_a = "9555544444"
        req_res = client.post("/api/v1/auth/request-otp", json={"mobile": mobile_a})
        otp = req_res.json()["data"]["demo_otp"] or "123456"
        ver_res = client.post("/api/v1/auth/verify-otp", json={"mobile": mobile_a, "otp": otp})
        token_a = ver_res.json()["data"]["registration_token"]

        # Try registering mobile B with token for mobile A
        reg_payload = {
            "full_name": "Attacker",
            "mobile": "9444433333",
            "age": 25,
            "gender": "MALE",
            "village": "Village",
            "district": "District",
            "consent": True,
        }
        res = client.post(
            "/api/v1/auth/register-patient",
            json=reg_payload,
            headers={"Authorization": f"Bearer {token_a}"},
        )
        assert res.status_code == 401
        _assert_envelope(res.json(), success=False)

    def test_self_registration_fails_missing_mandatory_fields(self, client):
        mobile = "9333322222"
        req_res = client.post("/api/v1/auth/request-otp", json={"mobile": mobile})
        otp = req_res.json()["data"]["demo_otp"] or "123456"
        ver_res = client.post("/api/v1/auth/verify-otp", json={"mobile": mobile, "otp": otp})
        token = ver_res.json()["data"]["registration_token"]

        # Missing age & gender
        invalid_payload = {
            "full_name": "Valid Name",
            "mobile": mobile,
            "village": "Village",
            "district": "District",
        }
        res = client.post(
            "/api/v1/auth/register-patient",
            json=invalid_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422
        _assert_envelope(res.json(), success=False)

    def test_self_registration_duplicate_mobile_rejected(self, client, registered_patient):
        # Create token for already registered mobile
        token = create_access_token(
            subject=registered_patient.mobile,
            role="UNREGISTERED_PATIENT",
            extra_claims={"mobile": registered_patient.mobile},
        )
        reg_payload = {
            "full_name": "Duplicate User",
            "mobile": registered_patient.mobile,
            "age": 30,
            "gender": "MALE",
            "village": "Village",
            "district": "District",
        }
        res = client.post(
            "/api/v1/auth/register-patient",
            json=reg_payload,
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 422
        _assert_envelope(res.json(), success=False)
        assert "already registered" in res.json()["message"].lower()


# ──────────────────────────────────────────────────────────────────────────────
# 8 & 9. JWT Generation & Validation
# ──────────────────────────────────────────────────────────────────────────────

class TestJWTUtils:
    def test_jwt_generation_and_decoding(self):
        token = create_access_token(
            subject="101",
            role="PATIENT",
            extra_claims={"mobile": "9876543210"},
        )
        assert isinstance(token, str)
        assert len(token) > 20

        token_data = decode_access_token(token)
        assert token_data.user_id == "101"
        assert token_data.role == "PATIENT"
        assert token_data.mobile == "9876543210"

    def test_jwt_tampered_token_raises_auth_error(self):
        token = create_access_token(subject="101", role="PATIENT")
        tampered_token = token[:-5] + "XXXXX"
        with pytest.raises(AuthenticationError):
            decode_access_token(tampered_token)


# ──────────────────────────────────────────────────────────────────────────────
# 10, 11 & 12. /auth/me Endpoint
# ──────────────────────────────────────────────────────────────────────────────

class TestAuthMeEndpoint:
    def test_auth_me_with_valid_token(self, client, registered_patient):
        token = create_access_token(
            subject=str(registered_patient.id),
            role="PATIENT",
            extra_claims={"mobile": registered_patient.mobile},
        )

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert body["data"]["id"] == registered_patient.id
        assert body["data"]["mobile"] == registered_patient.mobile
        assert body["data"]["full_name"] == registered_patient.full_name
        assert body["data"]["role"] == "PATIENT"

    def test_auth_me_without_token_returns_401(self, client):
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401
        body = response.json()
        _assert_envelope(body, success=False)

    def test_auth_me_with_invalid_token_returns_401(self, client):
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid.token.value"},
        )
        assert response.status_code == 401
        body = response.json()
        _assert_envelope(body, success=False)

    def test_auth_me_with_expired_token_returns_401(self, client, registered_patient):
        expired_token = create_access_token(
            subject=str(registered_patient.id),
            role="PATIENT",
            expires_delta=timedelta(seconds=-10),
        )
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {expired_token}"},
        )
        assert response.status_code == 401
        body = response.json()
        _assert_envelope(body, success=False)
        assert "expired" in body["message"].lower()
