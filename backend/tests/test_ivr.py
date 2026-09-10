"""
tests/test_ivr.py
=================
Automated backend tests for the telephone IVR integration layer.

Covers:
  1. GET  /api/v1/ivr/health health check
  2. POST /api/v1/ivr/webhook with Digits=1 (Fever → needs_attention)
  3. POST /api/v1/ivr/webhook with Digits=2 (Cough → routine)
  4. POST /api/v1/ivr/webhook with Digits=3 (Pain → needs_attention)
  5. POST /api/v1/ivr/webhook with Digits=4 (Stomach Problem → needs_attention)
  6. POST /api/v1/ivr/webhook with Digits=5 (Injury → needs_attention)
  7. POST /api/v1/ivr/webhook with Digits=0 (Emergency warning escalation)
  8. Missing or empty Digits handling
  9. Invalid Digits handling (e.g. Digits=9, Digits=abc)
 10. Form-encoded payload handling (Exotel standard)
 11. Query parameter payload handling (GET /api/v1/ivr/webhook)
 12. XML response format support (Accept: application/xml or format=xml)
 13. Plain text response format support (Accept: text/plain or format=text)
 14. Verification that existing AI triage endpoint (/api/v1/triage) is unchanged
"""

from __future__ import annotations

import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient


def test_ivr_health_endpoint(client: TestClient):
    """Verify IVR health endpoint returns success and status: ready."""
    response = client.get("/api/v1/ivr/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["service"] == "ivr"
    assert data["status"] == "ready"


def test_ivr_webhook_digits_1_fever(client: TestClient):
    """Digits=1 maps to Fever, invoking existing triage to return needs_attention guidance."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "1", "CallSid": "call_fever_001", "From": "+919876543210"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "1"
    assert "Fever" in data["symptoms"]
    assert data["urgency"] == "needs_attention"
    assert data["emergency"] is False
    assert "Primary Health Centre" in data["message"]
    assert "Primary Health Centre" in data["recommended_care"]


def test_ivr_webhook_digits_2_cough(client: TestClient):
    """Digits=2 maps to Cough, invoking existing triage to return routine guidance."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "2", "CallSid": "call_cough_002", "From": "+919876543211"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "2"
    assert "Cough" in data["symptoms"]
    assert data["urgency"] == "routine"
    assert data["emergency"] is False
    assert "Routine healthcare" in data["message"]


def test_ivr_webhook_digits_3_pain(client: TestClient):
    """Digits=3 maps to Pain, invoking existing triage to return needs_attention guidance."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "3", "CallSid": "call_pain_003", "From": "+919876543212"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "3"
    assert "Pain" in data["symptoms"]
    assert data["urgency"] == "needs_attention"
    assert data["emergency"] is False
    assert "Primary Health Centre" in data["message"]


def test_ivr_webhook_digits_4_stomach_problem(client: TestClient):
    """Digits=4 maps to Stomach Problem, invoking existing triage to return needs_attention."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "4", "CallSid": "call_stomach_004", "From": "+919876543213"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "4"
    assert "Stomach Problem" in data["symptoms"]
    assert data["urgency"] == "needs_attention"


def test_ivr_webhook_digits_5_injury(client: TestClient):
    """Digits=5 maps to Injury, invoking existing triage to return needs_attention."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "5", "CallSid": "call_injury_005", "From": "+919876543214"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "5"
    assert "Injury" in data["symptoms"]
    assert data["urgency"] == "needs_attention"


def test_ivr_webhook_digits_0_emergency(client: TestClient):
    """Digits=0 triggers emergency warning escalation through the existing triage safety check."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "0", "CallSid": "call_emer_006", "From": "+919876543215"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "0"
    assert data["urgency"] == "emergency"
    assert data["emergency"] is True
    assert "Emergency medical help" in data["message"]
    assert "emergency care immediately" in data["message"]


def test_ivr_webhook_missing_digits(client: TestClient):
    """When Digits is missing, return IVR menu asking caller to choose an option."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"CallSid": "call_empty_007", "From": "+919876543216"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "missing_or_invalid_digits"
    assert "Welcome to Rural Care Navigator" in data["message"]
    assert "Press 1 for Fever" in data["message"]


def test_ivr_webhook_invalid_digit(client: TestClient):
    """When an invalid digit (e.g. 9 or abc) is pressed, prompt with valid options."""
    response = client.post(
        "/api/v1/ivr/webhook",
        data={"Digits": "9", "CallSid": "call_invalid_008"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["error"] == "missing_or_invalid_digits"
    assert "Welcome to Rural Care Navigator" in data["message"]


def test_ivr_webhook_json_payload(client: TestClient):
    """Accepts JSON payload as well as form-encoded data."""
    response = client.post(
        "/api/v1/ivr/webhook",
        json={"digits": "1", "call_sid": "call_json_009"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "1"
    assert data["urgency"] == "needs_attention"


def test_ivr_webhook_query_params_get(client: TestClient):
    """Supports GET request with query parameters (Exotel GET passthru)."""
    response = client.get("/api/v1/ivr/webhook?Digits=2&CallSid=call_get_010")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["digits"] == "2"
    assert data["urgency"] == "routine"


def test_ivr_webhook_xml_format(client: TestClient):
    """Supports returning Exotel/VXML compliant XML when requested."""
    response = client.post(
        "/api/v1/ivr/webhook?format=xml",
        data={"Digits": "1"},
    )
    assert response.status_code == 200
    assert "application/xml" in response.headers.get("content-type", "")
    assert "<Response>" in response.text
    assert "<Say" in response.text
    assert "Primary Health Centre" in response.text


def test_ivr_webhook_text_format(client: TestClient):
    """Supports returning text/plain for basic telephony TTS."""
    response = client.post(
        "/api/v1/ivr/webhook?format=text",
        data={"Digits": "2"},
    )
    assert response.status_code == 200
    assert "text/plain" in response.headers.get("content-type", "")
    assert "Routine healthcare is recommended" in response.text


def test_existing_triage_endpoint_unchanged(client: TestClient):
    """Ensure existing POST /api/v1/triage endpoint behavior is 100% intact."""
    # Test fever -> needs_attention
    res1 = client.post("/api/v1/triage", json={"symptoms": ["Fever"], "description": ""})
    assert res1.status_code == 200
    d1 = res1.json()
    assert d1["urgency"] == "needs_attention"
    assert d1["emergency"] is False

    # Test chest pain -> emergency
    res2 = client.post(
        "/api/v1/triage",
        json={"symptoms": [], "description": "Patient experiencing severe chest pain"},
    )
    assert res2.status_code == 200
    d2 = res2.json()
    assert d2["urgency"] == "emergency"
    assert d2["emergency"] is True


# ==============================================================================
# WebSocket Stream (/api/v1/ivr/stream) Tests
# ==============================================================================

def test_ivr_stream_connection_succeeds(client: TestClient):
    """Verify WebSocket connection to /api/v1/ivr/stream succeeds cleanly."""
    with client.websocket_connect("/api/v1/ivr/stream") as websocket:
        # Connection established without raising exceptions
        assert websocket is not None


def test_ivr_stream_test_json_accepted(client: TestClient):
    """Verify provider-neutral test JSON message is accepted and acknowledged."""
    with client.websocket_connect("/api/v1/ivr/stream") as websocket:
        websocket.send_json({
            "type": "test",
            "text": "I have fever and cough",
        })
        ack = websocket.receive_json()
        assert ack["success"] is True
        assert ack["type"] == "ack"
        assert ack["message"] == "Voice stream connection received"


def test_ivr_stream_malformed_message_does_not_crash(client: TestClient):
    """Verify non-JSON/malformed messages return an error without crashing the server."""
    with client.websocket_connect("/api/v1/ivr/stream") as websocket:
        # Send broken/malformed raw text
        websocket.send_text("this is not valid json {{{ broken")
        err = websocket.receive_json()
        assert err["success"] is False
        assert err["type"] == "error"
        assert err["error"] == "malformed_json"

        # Server is still alive and processes next valid message
        websocket.send_json({
            "type": "test",
            "text": "Subsequent valid message",
        })
        ack = websocket.receive_json()
        assert ack["success"] is True
        assert ack["type"] == "ack"


def test_ivr_stream_disconnect_handled_safely(client: TestClient):
    """Verify client disconnect and explicit close are handled safely by the server."""
    with client.websocket_connect("/api/v1/ivr/stream") as websocket:
        websocket.send_json({"type": "test", "text": "ping"})
        ack = websocket.receive_json()
        assert ack["success"] is True
        # Explicitly close from client side
        websocket.close()


def test_ivr_stream_binary_bytes_without_api_key(client: TestClient):
    """Verify binary audio frames without SARVAM_API_KEY return safe error without crashing."""
    with patch("backend.app.api.v1.routes.ivr.settings.SARVAM_API_KEY", None):
        with client.websocket_connect("/api/v1/ivr/stream") as websocket:
            websocket.send_bytes(b"\x00\x01\x02\x03\x04\x05")
            err = websocket.receive_json()
            assert err["success"] is False
            assert err["type"] == "error"
            assert err["error"] == "stt_unavailable"
            assert "unavailable" in err["message"].lower()
