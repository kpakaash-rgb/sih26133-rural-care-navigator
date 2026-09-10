"""
tests/test_sarvam_tts.py
========================
Automated unit and integration tests for Sarvam AI Text-to-Speech (TTS) service
and WebSocket audio streaming.

All external calls to Sarvam API are MOCKED — no real API calls or credentials required.

Covers:
  - Test A: TTS service converts text to audio (base64, audio bytes, 8 kHz WAV).
  - Test B: TTS service handles Sarvam API failure (status != 200 or network error) safely.
  - Test C: API key is read from configuration/environment and never hardcoded.
  - Test D: FINAL transcript -> run_triage() -> triage.result -> TTS -> tts.audio.
  - Test E: PARTIAL transcript -> transcript.partial -> no triage -> no TTS.
  - Test F: Empty final transcript -> no triage -> no TTS -> no crash.
  - Test G: Emergency triage result -> emergency triage.result -> urgent spoken response -> tts.audio.
  - Test H: TTS failure yields safe tts.error message without crashing WebSocket.
  - Test I: Spoken response generator format for emergency, needs_attention, and routine.
"""

from __future__ import annotations

import base64
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.services.sarvam_tts_service import (
    DEFAULT_MODEL,
    DEFAULT_OUTPUT_CODEC,
    DEFAULT_SAMPLE_RATE,
    SarvamTTSService,
    TTSAudioResult,
    TTSError,
    build_spoken_response,
)


# ==============================================================================
# Helper to Mock STT stream
# ==============================================================================

def _create_mock_stt(events: list[Dict[str, Any]]) -> MagicMock:
    """Mock SarvamSTTService emitting sequence of events upon start_listening."""
    mock_stt = MagicMock()
    mock_stt.api_key = "mock_stt_key_valid"
    mock_stt.connect = AsyncMock(return_value=True)
    mock_stt.send_audio = AsyncMock(return_value=True)
    mock_stt.close = AsyncMock()

    async def fake_start_listening(on_event):
        for ev in events:
            await on_event(ev)

    mock_stt.start_listening = AsyncMock(side_effect=fake_start_listening)
    return mock_stt


# ==============================================================================
# Test A: TTS Service Converts Text to Audio
# ==============================================================================

@pytest.mark.asyncio
async def test_a_tts_service_converts_text_to_audio():
    """Verify SarvamTTSService successfully synthesizes text to 8 kHz audio bytes."""
    service = SarvamTTSService(api_key="mock_secret_key")
    dummy_wav_bytes = b"RIFF....WAVEfmt ....data...."
    dummy_b64 = base64.b64encode(dummy_wav_bytes).decode("utf-8")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "request_id": "req_mock_001",
        "audios": [dummy_b64],
    }

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_response)) as mock_post:
        result = await service.synthesize("Please visit a Primary Health Centre.")

        assert isinstance(result, TTSAudioResult)
        assert result.audio_base64 == dummy_b64
        assert result.audio_bytes == dummy_wav_bytes
        assert result.mime_type == "audio/wav"
        assert result.sample_rate == 8000
        assert result.request_id == "req_mock_001"

        # Verify request parameters
        mock_post.assert_called_once()
        _, kwargs = mock_post.call_args
        assert kwargs["headers"]["api-subscription-key"] == "mock_secret_key"
        assert kwargs["json"]["text"] == "Please visit a Primary Health Centre."
        assert kwargs["json"]["sample_rate"] == 8000
        assert kwargs["json"]["audio_format"] == "wav"


# ==============================================================================
# Test B: TTS Service Handles API Failure Safely
# ==============================================================================

@pytest.mark.asyncio
async def test_b_tts_service_handles_api_failure_safely():
    """Verify SarvamTTSService catches API errors and raises sanitized TTSError."""
    service = SarvamTTSService(api_key="mock_secret_key")

    # 1. Non-200 HTTP response
    mock_err_response = MagicMock(spec=httpx.Response)
    mock_err_response.status_code = 500

    with patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_err_response)):
        with pytest.raises(TTSError) as exc_info:
            await service.synthesize("Test text")
        assert "temporarily unavailable" in str(exc_info.value)
        # Ensure no secrets or internal URLs leaked
        assert "mock_secret_key" not in str(exc_info.value)

    # 2. Network connection exception
    with patch("httpx.AsyncClient.post", new=AsyncMock(side_effect=httpx.ConnectError("Connection refused"))):
        with pytest.raises(TTSError) as exc_info:
            await service.synthesize("Test text")
        assert "temporarily unavailable" in str(exc_info.value)


# ==============================================================================
# Test C: API Key Read From Configuration / Never Hardcoded
# ==============================================================================

@pytest.mark.asyncio
async def test_c_api_key_read_from_configuration():
    """Verify API key is injected from settings and missing key raises TTSError safely."""
    # When settings has a key
    with patch.object(settings, "SARVAM_API_KEY", "env_api_key_xyz"):
        service = SarvamTTSService()
        assert service.api_key == "env_api_key_xyz"

    # When no key is configured
    service_no_key = SarvamTTSService(api_key=None)
    service_no_key.api_key = None
    with pytest.raises(TTSError) as exc_info:
        await service_no_key.synthesize("Test text without key")
    assert "temporarily unavailable" in str(exc_info.value)


# ==============================================================================
# Test D: FINAL Transcript -> run_triage() -> triage.result -> TTS -> tts.audio
# ==============================================================================

def test_d_final_transcript_triggers_triage_and_tts_audio(client: TestClient):
    """
    Verify complete flow:
      transcript.final -> run_triage() -> triage.result -> tts.status -> tts.audio
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have fever and cough"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    dummy_audio = TTSAudioResult(
        audio_base64="dGVzdF93YXZfYXVkaW9fYnl0ZXM=",
        audio_bytes=b"test_wav_audio_bytes",
        mime_type="audio/wav",
        sample_rate=8000,
        request_id="req_tts_001",
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=dummy_audio)):

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01\x02")

            # 1. Final transcript
            f1 = ws.receive_json()
            assert f1["type"] == "transcript.final"
            assert f1["text"] == "I have fever and cough"

            # 2. Triage result
            f2 = ws.receive_json()
            assert f2["type"] == "triage.result"
            assert f2["urgency"] == "needs_attention"

            # 3. TTS status
            f3 = ws.receive_json()
            assert f3["type"] == "tts.status"
            assert f3["status"] == "synthesizing"
            assert "Primary Health Centre" in f3["text"]

            # 4. TTS audio
            f4 = ws.receive_json()
            assert f4["success"] is True
            assert f4["type"] == "tts.audio"
            assert f4["mime_type"] == "audio/wav"
            assert f4["sample_rate"] == 8000
            assert f4["audio_base64"] == "dGVzdF93YXZfYXVkaW9fYnl0ZXM="


# ==============================================================================
# Test E: PARTIAL Transcript -> transcript.partial -> No Triage -> No TTS
# ==============================================================================

def test_e_partial_transcript_no_triage_no_tts(client: TestClient):
    """Verify partial speech does not trigger triage or TTS synthesis."""
    stt_events = [
        {"success": True, "type": "transcript.partial", "text": "I have fev"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_triage, \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize") as mock_synth:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            f1 = ws.receive_json()
            assert f1["type"] == "transcript.partial"
            assert f1["text"] == "I have fev"

            assert mock_triage.call_count == 0
            assert mock_synth.call_count == 0


# ==============================================================================
# Test F: Empty Final Transcript -> No Triage -> No TTS -> No Crash
# ==============================================================================

def test_f_empty_final_transcript_no_triage_no_tts(client: TestClient):
    """Verify empty/whitespace final transcript skips triage and TTS safely."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "   "},
    ]
    mock_stt = _create_mock_stt(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_triage, \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize") as mock_synth:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            f1 = ws.receive_json()
            assert f1["type"] == "transcript.final"

            assert mock_triage.call_count == 0
            assert mock_synth.call_count == 0

            # WebSocket remains usable
            ws.send_json({"type": "test", "text": "ping"})
            ack = ws.receive_json()
            assert ack["success"] is True


# ==============================================================================
# Test G: Emergency Triage -> Urgent Spoken Response -> tts.audio
# ==============================================================================

def test_g_emergency_triage_result_to_urgent_spoken_tts_audio(client: TestClient):
    """Verify emergency symptoms generate urgent spoken phrasing delivered via tts.audio."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have severe chest pain and difficulty breathing"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    dummy_audio = TTSAudioResult(
        audio_base64="ZW1lcmdlbmN5X2F1ZGlv",
        audio_bytes=b"emergency_audio",
        mime_type="audio/wav",
        sample_rate=8000,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=dummy_audio)) as mock_synth:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            f1 = ws.receive_json()
            assert f1["type"] == "transcript.final"

            f2 = ws.receive_json()
            assert f2["type"] == "triage.result"
            assert f2["emergency"] is True
            assert f2["urgency"] == "emergency"

            f3 = ws.receive_json()
            assert f3["type"] == "tts.status"
            assert "emergency" in f3["text"].lower()

            f4 = ws.receive_json()
            assert f4["type"] == "tts.audio"
            assert f4["audio_base64"] == "ZW1lcmdlbmN5X2F1ZGlv"

            # Verify urgent spoken text was passed to synthesis
            mock_synth.assert_called_once()
            called_text = mock_synth.call_args[0][0]
            assert "emergency" in called_text.lower()


# ==============================================================================
# Test H: TTS Failure Handled Safely Without WebSocket Crash
# ==============================================================================

def test_h_tts_failure_returns_tts_error_without_crash(client: TestClient):
    """Verify that if Sarvam TTS fails, client receives tts.error and socket stays alive."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have fever"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(side_effect=TTSError("Voice response is temporarily unavailable."))):

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            # Final transcript
            ws.receive_json()

            # Caller still receives the complete triage result!
            triage_frame = ws.receive_json()
            assert triage_frame["type"] == "triage.result"
            assert triage_frame["urgency"] == "needs_attention"

            # TTS status
            ws.receive_json()

            # TTS error frame is received safely
            err_frame = ws.receive_json()
            assert err_frame["success"] is False
            assert err_frame["type"] == "tts.error"
            assert "temporarily unavailable" in err_frame["message"]

            # Socket remains alive for subsequent messages
            ws.send_json({"type": "test", "text": "healthy socket"})
            ack = ws.receive_json()
            assert ack["success"] is True


# ==============================================================================
# Test I: Spoken Response Generator Formatting
# ==============================================================================

def test_i_spoken_response_formatting():
    """Verify build_spoken_response produces appropriate telephone guidance."""
    # Emergency
    emer_text = build_spoken_response(urgency="emergency", emergency=True)
    assert "emergency" in emer_text.lower()
    assert "ambulance" not in emer_text.lower()  # Doesn't falsely claim ambulance dispatched

    # Needs attention with recommended care
    attn_text = build_spoken_response(
        urgency="needs_attention",
        emergency=False,
        recommended_care="Community Health Centre (CHC)",
    )
    assert "Community Health Centre" in attn_text
    assert "assessment" in attn_text

    # Routine care
    routine_text = build_spoken_response(urgency="routine", emergency=False)
    assert "routine healthcare" in routine_text.lower()
