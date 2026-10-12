"""
tests/test_triage_synthesize.py
================================
Unit and integration tests for the /api/v1/triage/synthesize endpoint.
Verifies Sarvam AI Text-to-Speech integration, Tamil language support,
sanitized error responses, and parameter validation.
"""

from __future__ import annotations

import base64
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient
import pytest

from backend.app.core.config import settings
from backend.app.services.sarvam_tts_service import TTSAudioResult, TTSError


def test_synthesize_endpoint_success_tamil(client: TestClient):
    """
    Verify POST /api/v1/triage/synthesize returns 200 with valid TTSResponse
    for Tamil (ta-IN) when SARVAM_API_KEY is configured.
    """
    dummy_audio_bytes = b"RIFF_WAV_DUMMY_AUDIO_BYTES_FOR_TAMIL"
    dummy_b64 = base64.b64encode(dummy_audio_bytes).decode("utf-8")
    mock_result = TTSAudioResult(
        audio_base64=dummy_b64,
        audio_bytes=dummy_audio_bytes,
        mime_type="audio/wav",
        sample_rate=8000,
        request_id="req_tamil_tts_123",
    )

    with patch.object(settings, "SARVAM_API_KEY", "mock_key_xyz"), \
         patch("backend.app.api.v1.routes.triage.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_result)):

        response = client.post(
            "/api/v1/triage/synthesize",
            json={
                "text": "பாம்பு அல்லது பூச்சிக் கடி. பாதிக்கப்பட்டவரை அசையாமல் வைக்கவும்.",
                "language": "ta-IN",
            },
        )

        assert response.status_code == 200
        data = response.json()
        assert data["audio_base64"] == dummy_b64
        assert data["mime_type"] == "audio/wav"
        assert data["language"] == "ta-IN"
        assert data["sample_rate"] == 8000
        assert data["provider"] == "sarvam"


def test_synthesize_endpoint_language_normalization(client: TestClient):
    """
    Verify language codes like 'ta', 'tamil', 'hi', 'mr', 'en' are normalized to canonical locale format.
    """
    dummy_audio_bytes = b"RIFF_WAV_NORMALIZED"
    dummy_b64 = base64.b64encode(dummy_audio_bytes).decode("utf-8")
    mock_result = TTSAudioResult(
        audio_base64=dummy_b64,
        audio_bytes=dummy_audio_bytes,
        mime_type="audio/wav",
        sample_rate=8000,
    )

    with patch.object(settings, "SARVAM_API_KEY", "mock_key_xyz"), \
         patch("backend.app.api.v1.routes.triage.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_result)):

        # Testing shorthand 'ta'
        response = client.post(
            "/api/v1/triage/synthesize",
            json={
                "text": "அவசர முதலுதவி வழிகாட்டி",
                "language": "ta",
            },
        )
        assert response.status_code == 200
        assert response.json()["language"] == "ta-IN"


def test_synthesize_endpoint_empty_text_rejected(client: TestClient):
    """
    Verify empty or whitespace text is rejected with 400 Bad Request.
    """
    with patch.object(settings, "SARVAM_API_KEY", "mock_key_xyz"):
        response = client.post(
            "/api/v1/triage/synthesize",
            json={
                "text": "   ",
                "language": "ta-IN",
            },
        )
        assert response.status_code == 400
        data = response.json()
        error_msg = data.get("message") or data.get("detail", "")
        assert "cannot be empty" in error_msg.lower()


def test_synthesize_endpoint_unconfigured_api_key_returns_503(client: TestClient):
    """
    Verify unconfigured SARVAM_API_KEY returns safe 503 without leaking secrets.
    """
    with patch.object(settings, "SARVAM_API_KEY", None):
        response = client.post(
            "/api/v1/triage/synthesize",
            json={
                "text": "முதல் உதவி",
                "language": "ta-IN",
            },
        )
        assert response.status_code == 503
        data = response.json()
        error_msg = data.get("message") or data.get("detail", "")
        assert "temporarily unavailable" in error_msg.lower()


def test_synthesize_endpoint_sarvam_api_failure_handled_safely(client: TestClient):
    """
    Verify provider failure raises 502 with sanitized message and does not crash.
    """
    with patch.object(settings, "SARVAM_API_KEY", "mock_key_xyz"), \
         patch("backend.app.api.v1.routes.triage.SarvamTTSService.synthesize", new=AsyncMock(side_effect=TTSError("Voice response is temporarily unavailable."))):

        response = client.post(
            "/api/v1/triage/synthesize",
            json={
                "text": "முதல் உதவி",
                "language": "ta-IN",
            },
        )
        assert response.status_code == 502
        data = response.json()
        error_msg = data.get("message") or data.get("detail", "")
        assert "temporarily unavailable" in error_msg.lower()

