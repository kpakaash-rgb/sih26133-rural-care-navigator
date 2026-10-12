"""
Verification script for Nalam Connect OTP & Patient Registration Flow.
Tests:
1. POST /api/v1/auth/request-otp
2. POST /api/v1/auth/verify-otp with invalid OTP (must fail)
3. POST /api/v1/auth/verify-otp with valid OTP (returns registration token)
4. POST /api/v1/auth/register-patient (creates patient, returns access token)
5. GET /api/v1/auth/me (verifies authenticated patient session)
"""

import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000/api/v1"

def http_post(url, payload, headers=None):
    data = json.dumps(payload).encode("utf-8")
    req_headers = {"Content-Type": "application/json"}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, data=data, headers=req_headers, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode("utf-8"))

def http_get(url, headers=None):
    req_headers = {}
    if headers:
        req_headers.update(headers)
    req = urllib.request.Request(url, headers=req_headers, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as err:
        return err.code, json.loads(err.read().decode("utf-8"))

def main():
    print("=== STARTING OTP & REGISTRATION INTEGRATION VERIFICATION ===")
    test_mobile = f"9{int(time.time()) % 1000000000:09d}"
    print(f"Testing with mobile: {test_mobile}")

    # Step 1: Request OTP
    status, res = http_post(f"{BASE_URL}/auth/request-otp", {"mobile": test_mobile})
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, f"Expected success=True: {res}"
    otp = res["data"].get("demo_otp")
    assert otp, f"Expected demo_otp in development: {res}"
    print(f"[PASS] Step 1: request-otp returned HTTP 200 with OTP: {otp}")

    # Step 2: Test Invalid OTP
    status, res = http_post(f"{BASE_URL}/auth/verify-otp", {"mobile": test_mobile, "otp": "000000"})
    assert status in (400, 422), f"Expected 400 or 422 for invalid OTP, got {status}: {res}"
    assert res.get("success") is False, f"Expected success=False: {res}"
    print(f"[PASS] Step 2: verify-otp rejected invalid OTP with message: {res.get('message')}")

    # Step 3: Test Valid OTP for New Patient
    status, res = http_post(f"{BASE_URL}/auth/verify-otp", {"mobile": test_mobile, "otp": otp})
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, f"Expected success=True: {res}"
    reg_token = res["data"].get("registration_token")
    assert reg_token, f"Expected registration_token for new patient: {res}"
    assert res["data"].get("is_registered") is False, "Expected is_registered=False"
    print(f"[PASS] Step 3: verify-otp returned registration token for new patient")

    # Step 4: Register Patient
    patient_payload = {
        "full_name": "Kavitha Priya",
        "mobile": test_mobile,
        "age": 29,
        "gender": "FEMALE",
        "village": "Thiruvallur",
        "district": "Chennai",
        "preferred_language": "ta",
        "emergency_contact": "9876543211",
        "abha_number": "14-5555-6666-7777",
        "consent": True,
        "registration_token": reg_token,
    }
    status, res = http_post(
        f"{BASE_URL}/auth/register-patient",
        patient_payload,
        headers={"Authorization": f"Bearer {reg_token}"},
    )
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res.get("success") is True, f"Expected success=True: {res}"
    access_token = res["data"].get("access_token")
    assert access_token, f"Expected access_token in registration response: {res}"
    patient_data = res["data"].get("patient", {})
    assert patient_data.get("full_name") == "Kavitha Priya", "Name mismatch"
    assert patient_data.get("district") == "Chennai", "District mismatch"
    print(f"[PASS] Step 4: register-patient created profile and issued JWT access token")

    # Step 5: Verify /auth/me with JWT
    status, res = http_get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {access_token}"})
    assert status == 200, f"Expected 200, got {status}: {res}"
    assert res["data"]["mobile"] == test_mobile, "Profile mobile mismatch"
    print(f"[PASS] Step 5: GET /auth/me retrieved authenticated patient profile")

    # Step 6: Test Existing Patient Login Flow
    status, res = http_post(f"{BASE_URL}/auth/request-otp", {"mobile": test_mobile})
    assert status == 200, f"Expected 200: {res}"
    otp2 = res["data"]["demo_otp"]
    status, res = http_post(f"{BASE_URL}/auth/verify-otp", {"mobile": test_mobile, "otp": otp2})
    assert status == 200, f"Expected 200: {res}"
    assert res["data"]["is_registered"] is True, "Expected is_registered=True for existing patient"
    assert res["data"]["patient"]["full_name"] == "Kavitha Priya", "Expected existing patient profile"
    print(f"[PASS] Step 6: Returning patient login verified and recognized existing profile")

    print("\nALL OTP & REGISTRATION FLOW TESTS COMPLETED SUCCESSFULLY!")

if __name__ == "__main__":
    main()
