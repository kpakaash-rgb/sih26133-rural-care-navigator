"""
tests/test_sarvam_stt.py
========================
Automated unit tests for Sarvam AI Speech-to-Text (STT) service and WebSocket audio stream.

All tests are fully MOCKED — no real external API calls or Sarvam accounts required.

Covers:
  1. Service initialization and default configurations (model, 8 kHz, pcm_s16le, en-IN).
  2. Language configuration (en-IN, hi-IN, mr-IN, and fallback behavior).
  3. Safe handling of missing SARVAM_API_KEY without network calls or exceptions.
  4. Query parameter construction for Sarvam real-time WebSocket URL.
  5. WebSocket connection establishment with Api-Subscription-Key header.
  6. Connection failure handling without crashing.
  7. Audio chunk forwarding (raw PCM encoded to base64 audio_input).
  8. Normalization of interim/partial transcripts.
  9. Normalization of final transcripts.
 10. Sanitization of provider error events (preventing secret/error leakage).
 11. Ignoring internal control events (session.begin, vad signals).
 12. Asynchronous listener loop event dispatching.
 13. Provider disconnect handling.
 14. Clean resource teardown on service close().
 15. WebSocket endpoint integration: audio forwarding and transcript stream delivery.
 16. WebSocket endpoint integration: provider connection failure handling.
"""

from __future__ import annotations

import asyncio
import json
from typing import Any, Dict, List
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
import websockets

from backend.app.services.sarvam_stt_service import (
    DEFAULT_AUDIO_CODEC,
    DEFAULT_LANGUAGE,
    DEFAULT_MODEL,
    DEFAULT_SAMPLE_RATE,
    SUPPORTED_LANGUAGES,
    SarvamSTTService,
)


# ==============================================================================
# Service Unit Tests (Isolated Mocking)
# ==============================================================================

def test_stt_service_initialization_defaults():
    """Verify default configurations align with 8 kHz telephone audio standards."""
    service = SarvamSTTService(api_key="mock_test_key")
    assert service.api_key == "mock_test_key"
    assert service.model == DEFAULT_MODEL
    assert service.language_code == DEFAULT_LANGUAGE
    assert service.sample_rate == 8000
    assert service.audio_codec == "pcm_s16le"
    assert "api.sarvam.ai" in service.ws_url
    assert service.is_connected is False


def test_stt_service_language_configuration():
    """Verify configurable Indian languages (en-IN, hi-IN, mr-IN) and fallback."""
    # Explicit Hindi
    hi_service = SarvamSTTService(api_key="mock_key", language_code="hi-IN")
    assert hi_service.language_code == "hi-IN"

    # Explicit Marathi
    mr_service = SarvamSTTService(api_key="mock_key", language_code="mr-IN")
    assert mr_service.language_code == "mr-IN"

    # Unsupported language code falls back to en-IN safely
    fallback_service = SarvamSTTService(api_key="mock_key", language_code="xx-YY")
    assert fallback_service.language_code == DEFAULT_LANGUAGE


def test_stt_service_build_ws_url():
    """Verify query parameters appended to Sarvam WebSocket connection URL."""
    service = SarvamSTTService(
        api_key="mock_key",
        model="saaras:v3-realtime",
        language_code="hi-IN",
        sample_rate=8000,
    )
    url = service.build_ws_url()
    assert "wss://api.sarvam.ai/speech-to-text-realtime/ws?" in url
    assert "model=saaras%3Av3-realtime" in url
    assert "language_code=hi-IN" in url
    assert "sample_rate=8000" in url


@pytest.mark.asyncio
async def test_stt_service_missing_api_key():
    """Verify connect() fails gracefully when SARVAM_API_KEY is missing."""
    with patch("backend.app.services.sarvam_stt_service.settings.SARVAM_API_KEY", None):
        service = SarvamSTTService(api_key=None)
        connected = await service.connect()
        assert connected is False
        assert service.is_connected is False


@pytest.mark.asyncio
async def test_stt_service_connect_success():
    """Verify WebSocket connect succeeds and passes Api-Subscription-Key header."""
    service = SarvamSTTService(api_key="test_secret_key_123")
    mock_ws = AsyncMock()

    with patch("websockets.connect", new=AsyncMock(return_value=mock_ws)) as mock_connect:
        connected = await service.connect()
        assert connected is True
        assert service.is_connected is True

        # Verify additional_headers passed
        mock_connect.assert_called_once()
        _, kwargs = mock_connect.call_args
        headers = kwargs.get("additional_headers", {})
        assert headers.get("api-subscription-key") == "test_secret_key_123"


@pytest.mark.asyncio
async def test_stt_service_connect_failure():
    """Verify connect() handles network/handshake exceptions safely without raising."""
    service = SarvamSTTService(api_key="test_secret_key_123")

    with patch("websockets.connect", new=AsyncMock(side_effect=Exception("Connection refused"))):
        connected = await service.connect()
        assert connected is False
        assert service.is_connected is False


@pytest.mark.asyncio
async def test_stt_service_send_audio_forwarded():
    """Verify binary PCM audio chunk is base64 encoded into audio_input event."""
    service = SarvamSTTService(api_key="test_key")
    mock_ws = AsyncMock()
    service._ws = mock_ws
    service._is_connected = True

    pcm_chunk = b"\x00\x01\x02\x03\x04\x05"
    sent = await service.send_audio(pcm_chunk)
    assert sent is True

    mock_ws.send.assert_called_once()
    payload_str = mock_ws.send.call_args[0][0]
    payload = json.loads(payload_str)

    assert payload["event"] == "audio_input"
    assert "audio" in payload
    # Verify base64 decode matches original bytes
    import base64
    assert base64.b64decode(payload["audio"]) == pcm_chunk


@pytest.mark.asyncio
async def test_stt_service_send_audio_not_connected():
    """Verify send_audio returns False safely if connection is not open."""
    service = SarvamSTTService(api_key="test_key")
    assert service.is_connected is False

    sent = await service.send_audio(b"\x00\x01")
    assert sent is False


# ==============================================================================
# Normalization Unit Tests
# ==============================================================================

def test_stt_normalize_partial_transcripts():
    """Verify varied interim/partial transcript payloads normalize to transcript.partial."""
    service = SarvamSTTService(api_key="test_key")

    # Format 1: event=transcript.partial
    res1 = service.normalize_event({
        "event": "transcript.partial",
        "transcript": "I have fever",
    })
    assert res1 == {
        "success": True,
        "type": "transcript.partial",
        "text": "I have fever",
    }

    # Format 2: type=transcript.partial
    res2 = service.normalize_event({
        "type": "transcript.partial",
        "text": "fever and",
    })
    assert res2 == {
        "success": True,
        "type": "transcript.partial",
        "text": "fever and",
    }

    # Format 3: is_final=False
    res3 = service.normalize_event({
        "transcript": "coughing",
        "is_final": False,
    })
    assert res3 == {
        "success": True,
        "type": "transcript.partial",
        "text": "coughing",
    }


def test_stt_normalize_final_transcripts():
    """Verify varied final transcript payloads normalize to transcript.final."""
    service = SarvamSTTService(api_key="test_key")

    # Format 1: event=transcript.final
    res1 = service.normalize_event({
        "event": "transcript.final",
        "transcript": "I have fever and cough",
    })
    assert res1 == {
        "success": True,
        "type": "transcript.final",
        "text": "I have fever and cough",
    }

    # Format 2: is_final=True
    res2 = service.normalize_event({
        "transcript": "Severe stomach ache since morning",
        "is_final": True,
    })
    assert res2 == {
        "success": True,
        "type": "transcript.final",
        "text": "Severe stomach ache since morning",
    }


def test_stt_normalize_provider_error():
    """Verify provider error events return sanitized error without leaking internal details."""
    service = SarvamSTTService(api_key="test_key")

    err_payload = {
        "event": "error",
        "error": "InternalAuthSecretFailure",
        "message": "Token verification failed on internal cluster ip 10.0.0.1",
    }
    normalized = service.normalize_event(err_payload)
    assert normalized["success"] is False
    assert normalized["type"] == "error"
    assert normalized["error"] == "stt_provider_error"
    assert "internal" not in normalized["message"].lower()
    assert "10.0.0.1" not in normalized["message"]


def test_stt_normalize_ignores_control_signals():
    """Verify control signals (e.g. session.begin, vad signals) return None."""
    service = SarvamSTTService(api_key="test_key")

    assert service.normalize_event({"event": "session.begin", "session_id": "123"}) is None
    assert service.normalize_event({"event": "vad.speech_start"}) is None
    assert service.normalize_event({"event": "vad.speech_end"}) is None
    assert service.normalize_event("not_a_dict") is None


@pytest.mark.asyncio
async def test_stt_listener_loop_and_disconnect():
    """Verify background listener loop processes messages and handles provider disconnect."""
    service = SarvamSTTService(api_key="test_key")
    mock_ws = AsyncMock()

    # Sequence: 1. partial event, 2. final event, 3. ConnectionClosed
    mock_ws.recv.side_effect = [
        json.dumps({"event": "transcript.partial", "transcript": "I have"}),
        json.dumps({"event": "transcript.final", "transcript": "I have cough"}),
        websockets.exceptions.ConnectionClosed(
            rcvd=MagicMock(code=1000, reason="Normal closure"),
            sent=None,
        ),
    ]

    service._ws = mock_ws
    service._is_connected = True

    events_received: List[Dict[str, Any]] = []

    async def on_event(event: Dict[str, Any]) -> None:
        events_received.append(event)

    await service.start_listening(on_event=on_event)

    # Wait for listener task to finish consuming the 3 messages
    await asyncio.sleep(0.1)
    await service.close()

    assert len(events_received) >= 2
    assert events_received[0]["type"] == "transcript.partial"
    assert events_received[0]["text"] == "I have"
    assert events_received[1]["type"] == "transcript.final"
    assert events_received[1]["text"] == "I have cough"


# ==============================================================================
# WebSocket Endpoint Integration Tests (WS /api/v1/ivr/stream)
# ==============================================================================

def test_ivr_stream_with_mocked_stt_transcription(client: TestClient):
    """
    Verify /api/v1/ivr/stream connects audio stream to SarvamSTTService
    and streams back normalized transcripts to the client.
    """
    mock_service_instance = MagicMock()
    mock_service_instance.api_key = "mock_valid_key"
    mock_service_instance.connect = AsyncMock(return_value=True)
    mock_service_instance.send_audio = AsyncMock(return_value=True)
    mock_service_instance.close = AsyncMock()

    # Capture the on_event callback when start_listening is called
    captured_callback = {}

    async def fake_start_listening(on_event):
        await on_event({
            "success": True,
            "type": "transcript.partial",
            "text": "I have fever",
        })
        await on_event({
            "success": True,
            "type": "transcript.final",
            "text": "I have fever and severe headache",
        })

    mock_service_instance.start_listening = AsyncMock(side_effect=fake_start_listening)

    with patch(
        "backend.app.api.v1.routes.ivr.SarvamSTTService",
        return_value=mock_service_instance,
    ):
        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            # 1. Send binary audio chunk
            ws.send_bytes(b"\x00\x01\x02\x03\x04")

            # 2. Receive simulated Sarvam partial transcript
            partial_frame = ws.receive_json()
            assert partial_frame["success"] is True
            assert partial_frame["type"] == "transcript.partial"
            assert partial_frame["text"] == "I have fever"

            # 3. Receive simulated Sarvam final transcript
            final_frame = ws.receive_json()
            assert final_frame["success"] is True
            assert final_frame["type"] == "transcript.final"
            assert final_frame["text"] == "I have fever and severe headache"

            # 4. Receive automated AI triage result triggered by final transcript
            triage_frame = ws.receive_json()
            assert triage_frame["success"] is True
            assert triage_frame["type"] == "triage.result"
            assert triage_frame["transcript"] == "I have fever and severe headache"
            assert "urgency" in triage_frame
            assert "emergency" in triage_frame

            # 5. Receive TTS status and result frames triggered by triage
            tts_status = ws.receive_json()
            assert tts_status["type"] == "tts.status"

            tts_result = ws.receive_json()
            assert tts_result["type"] in ("tts.audio", "tts.error")

            # 6. Verify text test messages still work concurrently
            ws.send_json({"type": "test", "text": "I have fever"})
            ack = ws.receive_json()
            assert ack["success"] is True
            assert ack["type"] == "ack"

            # Verify service connected and sent audio
            assert mock_service_instance.connect.await_count == 1
            assert mock_service_instance.send_audio.await_count == 1


def test_ivr_stream_stt_connection_failure(client: TestClient):
    """Verify endpoint sends stt_connection_failed error if provider connect fails."""
    mock_service_instance = MagicMock()
    mock_service_instance.api_key = "mock_valid_key"
    mock_service_instance.connect = AsyncMock(return_value=False)
    mock_service_instance.close = AsyncMock()

    with patch(
        "backend.app.api.v1.routes.ivr.SarvamSTTService",
        return_value=mock_service_instance,
    ):
        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01\x02")
            err_frame = ws.receive_json()
            assert err_frame["success"] is False
            assert err_frame["type"] == "error"
            assert err_frame["error"] == "stt_connection_failed"
