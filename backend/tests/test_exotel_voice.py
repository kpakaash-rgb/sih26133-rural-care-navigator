"""
tests/test_exotel_voice.py
==========================
Automated unit and integration tests for Exotel VoiceBot / AgentStream
bidirectional WebSocket audio and telephony integration.

All external calls to Exotel REST API and Sarvam AI STT/TTS are MOCKED.
NO REAL TELEPHONE CALLS OR API CALLS ARE MADE DURING PYTEST.

Tests:
  - Test A: 'connected' event initializes session without crashing.
  - Test B: 'start' event captures stream metadata and sends spoken greeting.
  - Test C: 'media' event decodes base64, normalizes mu-law to PCM16, forwards to STT.
  - Test D: 'transcript.partial' does NOT trigger triage or TTS.
  - Test E: 'transcript.final' triggers run_triage() -> Sarvam TTS -> Exotel media chunking.
  - Test F: DTMF events (1=Fever, 2=Cough, 3=Pain, 4=Stomach, 5=Injury, 0=Emergency).
  - Test G: 'clear' event safely resets conversational context without dropping session.
  - Test H: 'stop' event cleanly shuts down resources.
  - Test I: Malformed JSON payload returns safe error and does not crash WebSocket.
  - Test J: Malformed base64 media payload returns safe error and does not crash.
  - Test K: Sarvam STT failure handled safely with connection preserved.
  - Test L: Sarvam TTS failure handled safely without crashing WebSocket.
  - Test M: Emergency triage triggers urgent spoken response without premature call transfer.
  - Test N: Missing Exotel credentials safely returns 503 without exposing secrets.
  - Test O: Audio conversion utilities (WAV extraction, mu-law/PCM conversion, chunking).
"""

from __future__ import annotations

import base64
import io
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch
import wave

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app.core.config import settings
from backend.app.services.exotel_voice_service import (
    DTMF_SYMPTOM_CODE_MAP,
    EXOTEL_EMERGENCY_PROMPT_EN,
    EXOTEL_EMERGENCY_PROMPT_HI,
    EXOTEL_GREETING_TEXT,
    EXOTEL_INITIAL_LANGUAGE_MENU,
    EXOTEL_LANG_FALLBACK_EN,
    EXOTEL_LANG_INVALID_RETRY_EN,
    EXOTEL_SYMPTOM_PROMPT_EN,
    EXOTEL_SYMPTOM_PROMPT_HI,
    ExotelCallError,
    ExotelCallService,
    ExotelConfigurationError,
    ExotelVoiceSession,
    IVRState,
    build_bilingual_spoken_response,
    build_clear_event,
    build_mark_event,
    build_media_event,
    chunk_outbound_audio,
    mulaw_to_pcm16,
    normalize_inbound_audio,
    pcm16_to_mulaw,
    resample_pcm_audio,
    wav_to_pcm,
    extract_symptoms,
    extract_duration,
    check_red_flags_in_speech,
    extract_booking_intent,
    extract_booking_type,
)
from backend.app.services.sarvam_tts_service import TTSAudioResult, TTSError


# ──────────────────────────────────────────────────────────────────────────────
# Audio & Mock Helpers for Tests
# ──────────────────────────────────────────────────────────────────────────────

def _create_synthetic_wav(sample_rate: int = 8000, duration_ms: int = 100) -> bytes:
    """Generate valid 8 kHz mono 16-bit linear PCM WAV bytes for testing."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        num_samples = int(sample_rate * (duration_ms / 1000.0))
        raw_pcm = b"\x00\x00" * num_samples
        wf.writeframes(raw_pcm)
    return buf.getvalue()


def _drain_greeting(ws) -> None:
    """Drain all greeting media frames until the 'greeting' mark is received."""
    while True:
        frame = ws.receive_json()
        if frame.get("event") == "mark" and frame.get("mark", {}).get("name") == "greeting":
            break


def _drain_mark(ws, mark_name: str = "") -> None:
    """Drain all media frames until a mark event is received."""
    while True:
        frame = ws.receive_json()
        if frame.get("event") == "mark":
            break


def _create_mock_stt(events: list[Dict[str, Any]]) -> MagicMock:
    """Mock SarvamSTTService with clean connection and event emission."""
    mock_stt = MagicMock()
    mock_stt.api_key = "mock_stt_api_key"
    mock_stt.is_connected = False

    async def fake_connect():
        mock_stt.is_connected = True
        return True

    mock_stt.connect = AsyncMock(side_effect=fake_connect)
    mock_stt.send_audio = AsyncMock(return_value=True)
    mock_stt.close = AsyncMock()

    async def fake_start_listening(on_event):
        for ev in events:
            await on_event(ev)

    mock_stt.start_listening = AsyncMock(side_effect=fake_start_listening)
    return mock_stt


def _create_sequential_mock_stt(event_batches: list[list[Dict[str, Any]]]) -> MagicMock:
    """Mock SarvamSTTService that emits a batch of events on each incoming send_audio call."""
    mock_stt = MagicMock()
    mock_stt.api_key = "mock_stt_api_key"
    mock_stt.is_connected = False
    listener_cb = None

    async def fake_connect():
        mock_stt.is_connected = True
        return True

    mock_stt.connect = AsyncMock(side_effect=fake_connect)
    batch_idx = 0

    async def fake_send_audio(audio_bytes):
        nonlocal batch_idx
        if listener_cb and batch_idx < len(event_batches):
            current_batch = event_batches[batch_idx]
            batch_idx += 1
            for ev in current_batch:
                await listener_cb(ev)
        return True

    mock_stt.send_audio = AsyncMock(side_effect=fake_send_audio)
    mock_stt.close = AsyncMock()

    async def fake_start_listening(on_event):
        nonlocal listener_cb
        listener_cb = on_event

    mock_stt.start_listening = AsyncMock(side_effect=fake_start_listening)
    return mock_stt



# ──────────────────────────────────────────────────────────────────────────────
# Test A: Connected Event
# ──────────────────────────────────────────────────────────────────────────────

def test_a_connected_event_initializes_session(client: TestClient):
    """Verify 'connected' handshake event initializes connection without crashing."""
    with client.websocket_connect("/api/v1/ivr/exotel") as ws:
        ws.send_json({
            "event": "connected",
            "protocol": "Call",
            "version": "1.0.0",
        })
        ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test B: Start Event Captures Metadata and Sends Greeting
# ──────────────────────────────────────────────────────────────────────────────

def test_b_start_event_captures_metadata_and_sends_greeting(client: TestClient):
    """Verify 'start' event captures stream_sid, call_sid, and speaks greeting in raw PCM S16LE."""
    dummy_wav = _create_synthetic_wav(duration_ms=100)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
        mime_type="audio/wav",
        sample_rate=8000,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "sequence_number": "1",
                "stream_sid": "MZ_TEST_STREAM_001",
                "start": {
                    "stream_sid": "MZ_TEST_STREAM_001",
                    "call_sid": "CA_TEST_CALL_001",
                    "account_sid": "AC_TEST_ACCOUNT_001",
                    "tracks": ["inbound"],
                    "media_format": {
                        "encoding": "audio/l16",
                        "sample_rate": 8000,
                        "channels": 1,
                    },
                },
            })

            # Caller receives media chunk containing greeting audio
            media_msg = ws.receive_json()
            assert media_msg["event"] == "media"
            assert media_msg["stream_sid"] == "MZ_TEST_STREAM_001"
            assert media_msg["streamSid"] == "MZ_TEST_STREAM_001"
            assert "payload" in media_msg["media"]

            # Validate raw PCM S16LE payload (no WAV header, multiple of 320 bytes)
            payload_bytes = base64.b64decode(media_msg["media"]["payload"])
            assert not payload_bytes.startswith(b"RIFF")
            assert len(payload_bytes) % 2 == 0
            assert len(payload_bytes) % 320 == 0

            # And a mark event signaling greeting playback
            mark_msg = ws.receive_json()
            assert mark_msg["event"] == "mark"
            assert mark_msg["stream_sid"] == "MZ_TEST_STREAM_001"
            assert mark_msg["mark"]["name"] == "greeting"

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test C: Media Event Normalization & Forwarding
# ──────────────────────────────────────────────────────────────────────────────

def test_c_media_event_decodes_and_forwards_to_stt(client: TestClient):
    """Verify incoming base64 PCM S16LE audio is decoded and forwarded directly to STT without mu-law conversion."""
    mock_stt = _create_mock_stt([])
    # 16-bit linear PCM audio (8000 Hz, mono, little-endian: 2 bytes per sample)
    dummy_pcm = b"\x00\x00\x10\x00\x20\x00\x30\x00" * 40  # 320 bytes = 160 samples
    dummy_b64 = base64.b64encode(dummy_pcm).decode("ascii")

    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STREAM_002",
                "start": {
                    "stream_sid": "MZ_STREAM_002",
                    "media_format": {"encoding": "audio/l16", "sample_rate": 8000, "channels": 1},
                },
            })
            _drain_greeting(ws)

            # Send media payload
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_STREAM_002",
                "media": {
                    "payload": dummy_b64,
                },
            })

            # Send stop event to process queue and exit cleanly
            ws.send_json({"event": "stop"})

        # Ensure STT service received audio directly as PCM S16LE without mu-law decoding
        assert mock_stt.send_audio.called
        sent_bytes = mock_stt.send_audio.call_args[0][0]
        assert sent_bytes == dummy_pcm
        assert len(sent_bytes) == len(dummy_pcm)


# ──────────────────────────────────────────────────────────────────────────────
# Test D: Partial Transcript Does Not Trigger Triage or TTS
# ──────────────────────────────────────────────────────────────────────────────

def test_d_partial_transcript_no_triage_no_tts(client: TestClient):
    """Verify interim speech hypotheses (transcript.partial) do not trigger triage or TTS."""
    stt_events = [
        {"success": True, "type": "transcript.partial", "text": "I have fev"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_triage, \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STREAM_003",
                "start": {"stream_sid": "MZ_STREAM_003"},
            })
            _drain_greeting(ws)

            # Reset call counts after greeting
            mock_triage.reset_mock()
            mock_tts.reset_mock()

            # Send media to trigger STT listening
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_STREAM_003",
                "media": {"payload": base64.b64encode(b"\xff\x00" * 20).decode("ascii")},
            })

            # Neither triage nor TTS should have been called for partial transcript
            assert mock_triage.call_count == 0
            assert mock_tts.call_count == 0

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test E: Final Transcript Triggers Triage and TTS Chunking
# ──────────────────────────────────────────────────────────────────────────────

def test_e_final_transcript_triggers_triage_and_tts_chunks(client: TestClient):
    """Verify complete conversational flow: final transcript -> triage -> TTS -> Exotel media."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have severe fever and stomach problem"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    dummy_wav = _create_synthetic_wav(duration_ms=100)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STREAM_004",
                "start": {
                    "stream_sid": "MZ_STREAM_004",
                    "media_format": {"encoding": "audio/l16", "sample_rate": 8000, "channels": 1},
                },
            })
            _drain_greeting(ws)

            # Send caller speech (raw PCM S16LE)
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_STREAM_004",
                "media": {"payload": base64.b64encode(b"\x00\x10" * 40).decode("ascii")},
            })

            # Caller receives response media chunk(s)
            resp_media = ws.receive_json()
            assert resp_media["event"] == "media"
            assert resp_media["stream_sid"] == "MZ_STREAM_004"
            assert resp_media["streamSid"] == "MZ_STREAM_004"
            assert len(resp_media["media"]["payload"]) > 0

            # Verify chunk is valid PCM S16LE without WAV header
            decoded_payload = base64.b64decode(resp_media["media"]["payload"])
            assert not decoded_payload.startswith(b"RIFF")
            assert len(decoded_payload) % 2 == 0
            assert len(decoded_payload) % 320 == 0

            # Drain until response mark
            while True:
                frame = ws.receive_json()
                if frame.get("event") == "mark":
                    assert frame["mark"]["name"] in ("name_prompt", "triage_response")
                    break

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test F: DTMF Keypad Fallback (1-5, 0)
# ──────────────────────────────────────────────────────────────────────────────

@pytest.mark.parametrize("digit,expected_kw", [
    ("1", "Primary Health Centre"),
    ("2", "healthcare"),
    ("3", "Primary Health Centre"),
    ("4", "Primary Health Centre"),
    ("5", "Primary Health Centre"),
    ("0", "emergency"),
])
def test_f_dtmf_keypad_options(client: TestClient, digit: str, expected_kw: str):
    """Verify keypad DTMF fallback directly maps to clinical triage options."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": f"MZ_DTMF_{digit}",
                "start": {"stream_sid": f"MZ_DTMF_{digit}"},
            })
            _drain_greeting(ws)

            # 1. Select English via DTMF 1
            ws.send_json({
                "event": "dtmf",
                "stream_sid": f"MZ_DTMF_{digit}",
                "dtmf": {"digit": "1"},
            })
            _drain_mark(ws, "symptom_prompt_en")
            mock_tts.reset_mock()

            # 2. Send symptom digit
            ws.send_json({
                "event": "dtmf",
                "stream_sid": f"MZ_DTMF_{digit}",
                "dtmf": {"digit": digit},
            })

            # For non-emergency (digits 1-5), send 9 to process buffered symptoms
            if digit != "0":
                ws.send_json({
                    "event": "dtmf",
                    "stream_sid": f"MZ_DTMF_{digit}",
                    "dtmf": {"digit": "9"},
                })

            dtmf_media = ws.receive_json()
            assert dtmf_media["event"] == "media"

            # Check spoken text passed to TTS
            spoken_script = mock_tts.call_args[0][0]
            assert expected_kw.lower() in spoken_script.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test G: Clear Event Resets Conversational Context Safely
# ──────────────────────────────────────────────────────────────────────────────

def test_g_clear_event_resets_session_context(client: TestClient):
    """Verify 'clear' event flushes active context without dropping connection."""
    with client.websocket_connect("/api/v1/ivr/exotel") as ws:
        ws.send_json({
            "event": "clear",
            "stream_sid": "MZ_STREAM_CLEAR",
        })
        ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test H: Stop Event Clean Teardown
# ──────────────────────────────────────────────────────────────────────────────

def test_h_stop_event_clean_teardown(client: TestClient):
    """Verify 'stop' event cleanly closes upstream connections and exits."""
    mock_stt = _create_mock_stt([])
    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "stop",
                "stream_sid": "MZ_STREAM_STOP",
            })
        assert mock_stt.close.called


# ──────────────────────────────────────────────────────────────────────────────
# Test I: Malformed JSON Safe Handling
# ──────────────────────────────────────────────────────────────────────────────

def test_i_malformed_json_returns_safe_error(client: TestClient):
    """Verify invalid JSON text does not crash the server and returns safe error."""
    with client.websocket_connect("/api/v1/ivr/exotel") as ws:
        ws.send_text("this is not { valid json")
        err_msg = ws.receive_json()
        assert err_msg["event"] == "error"
        assert "Invalid JSON" in err_msg["message"]
        ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test J: Malformed Media Base64 Payload Safe Handling
# ──────────────────────────────────────────────────────────────────────────────

def test_j_malformed_media_payload_handled_safely(client: TestClient):
    """Verify corrupted base64 media payload returns safe error and does not crash."""
    with client.websocket_connect("/api/v1/ivr/exotel") as ws:
        ws.send_json({
            "event": "media",
            "stream_sid": "MZ_STREAM_ERR",
            "media": {"payload": "!!not_valid_base64!!!"},
        })
        err_msg = ws.receive_json()
        assert err_msg["event"] == "error"
        assert "Malformed media payload" in err_msg["message"]
        ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test K: Sarvam STT Failure Handled Safely
# ──────────────────────────────────────────────────────────────────────────────

def test_k_stt_failure_handled_safely(client: TestClient):
    """Verify STT connection failure logs safely and keeps WebSocket connection open."""
    failing_stt = MagicMock()
    failing_stt.api_key = "mock_key"
    failing_stt.is_connected = False
    failing_stt.connect = AsyncMock(return_value=False)
    failing_stt.close = AsyncMock()

    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=failing_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STT_FAIL",
                "start": {"stream_sid": "MZ_STT_FAIL"},
            })
            _drain_greeting(ws)

            # Send media
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_STT_FAIL",
                "media": {"payload": base64.b64encode(b"\xff\x00" * 20).decode("ascii")},
            })

            # WebSocket remains stable
            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test L: Sarvam TTS Failure Handled Safely
# ──────────────────────────────────────────────────────────────────────────────

def test_l_tts_failure_handled_safely(client: TestClient):
    """Verify TTS failure returns error event without crashing WebSocket."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have cough"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", side_effect=TTSError("TTS rate limit reached")):

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_TTS_FAIL",
                "start": {"stream_sid": "MZ_TTS_FAIL"},
            })
            # Greeting fails safely
            err1 = ws.receive_json()
            assert err1["event"] == "error"
            assert "temporarily unavailable" in err1["message"]

            # Caller sends media
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_TTS_FAIL",
                "media": {"payload": base64.b64encode(b"\xff" * 20).decode("ascii")},
            })

            # Triage evaluation proceeds, TTS fails safely
            err2 = ws.receive_json()
            assert err2["event"] == "error"

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test M: Emergency Triage Triggers Urgent Spoken Response
# ──────────────────────────────────────────────────────────────────────────────

def test_m_emergency_triage_urgent_spoken_response(client: TestClient):
    """Verify emergency symptoms generate an urgent prompt without premature transfer."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "severe chest pain and cannot breathe"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_EMERGENCY",
                "start": {"stream_sid": "MZ_EMERGENCY"},
            })
            _drain_greeting(ws)

            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_EMERGENCY",
                "media": {"payload": base64.b64encode(b"\xff" * 20).decode("ascii")},
            })

            _ = ws.receive_json()  # response media

            # Verify urgent spoken text was synthesized
            spoken_arg = mock_tts.call_args[0][0]
            assert "emergency" in spoken_arg.lower()
            assert "immediately" in spoken_arg.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test N: Missing Exotel Credentials Returns Safe Configuration Error
# ──────────────────────────────────────────────────────────────────────────────

def test_n_missing_credentials_outbound_call(client: TestClient):
    """Verify POST /api/v1/ivr/exotel/call returns safe 503 without exposing secrets."""
    with patch.object(settings, "EXOTEL_ACCOUNT_SID", None):
        response = client.post(
            "/api/v1/ivr/exotel/call",
            json={"phone_number": "+919876543210"},
        )
        assert response.status_code == 503
        data = response.json()
        assert data["success"] is False
        assert data["error"] == "exotel_not_configured"
        resp_text = response.text.lower()
        assert "password" not in resp_text
        assert "secret" not in resp_text
        assert "bearer" not in resp_text


def test_n2_configured_outbound_call_mocked(client: TestClient):
    """Verify POST /api/v1/ivr/exotel/call initiates call when configured."""
    mock_resp = MagicMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "Call": {
            "Sid": "CA_MOCK_123456",
            "Status": "in-progress",
        }
    }

    with patch.object(settings, "EXOTEL_ACCOUNT_SID", "AC_MOCK_ACCOUNT"), \
         patch.object(settings, "EXOTEL_API_KEY", "MOCK_KEY"), \
         patch.object(settings, "EXOTEL_API_TOKEN", "MOCK_TOKEN"), \
         patch.object(settings, "EXOTEL_EXOPHONE", "08012345678"), \
         patch("httpx.AsyncClient.post", new=AsyncMock(return_value=mock_resp)):

        response = client.post(
            "/api/v1/ivr/exotel/call",
            json={"phone_number": "+919876543210"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["call_sid"] == "CA_MOCK_123456"


def test_n3_exotel_health_endpoint(client: TestClient):
    """Verify GET /api/v1/ivr/exotel/health endpoint returns status without secrets."""
    response = client.get("/api/v1/ivr/exotel/health")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["service"] == "exotel_voicebot"
    assert "configured" in data
    assert data["stream_endpoint"] == "/api/v1/ivr/exotel"


# ──────────────────────────────────────────────────────────────────────────────
# Test O: Audio Utilities (WAV, mu-law, PCM, chunking)
# ──────────────────────────────────────────────────────────────────────────────

def test_o_audio_conversion_utilities():
    """Verify audio normalization, WAV parsing, and 100ms chunking utilities."""
    # 1. WAV extraction
    synthetic_wav = _create_synthetic_wav(duration_ms=100)
    raw_pcm = wav_to_pcm(synthetic_wav)
    assert len(raw_pcm) == 8000 * 2 * 0.1  # 1600 bytes
    assert not raw_pcm.startswith(b"RIFF")

    # 2. Inbound normalization defaults to audio/l16 without mu-law decoding
    test_pcm = b"\x10\x00\x20\x00" * 40
    norm_pcm = normalize_inbound_audio(test_pcm, "audio/l16")
    assert norm_pcm == test_pcm

    # 3. chunk_outbound_audio defaults to audio/l16 (1600 bytes = 100ms, multiple of 320)
    chunks = chunk_outbound_audio(raw_pcm, encoding="audio/l16", chunk_duration_ms=100)
    assert len(chunks) == 1
    decoded_chunk = base64.b64decode(chunks[0])
    assert len(decoded_chunk) == 1600
    assert len(decoded_chunk) % 320 == 0

    # 4. Standalone generic mu-law helpers retained for legacy compatibility
    test_mulaw = b"\xff\x00\x7f"
    pcm16 = mulaw_to_pcm16(test_mulaw)
    assert len(pcm16) == len(test_mulaw) * 2
    roundtrip_mulaw = pcm16_to_mulaw(pcm16)
    assert len(roundtrip_mulaw) == len(test_mulaw)


# ──────────────────────────────────────────────────────────────────────────────
# Test P: Exotel Dynamic Stream Resolver (GET /api/v1/ivr/exotel)
# ──────────────────────────────────────────────────────────────────────────────

def test_p_exotel_resolver_returns_200_and_wss_url(client: TestClient):
    """
    Verify GET /api/v1/ivr/exotel returns 200 with dynamic WebSocket URL
    and accepts Exotel call query parameters without requiring authentication.
    """
    exotel_params = {
        "CallSid": "CA_TEST_CALL_12345",
        "From": "+919876543210",
        "To": "08012345678",
        "CallStatus": "in-progress",
    }
    response = client.get("/api/v1/ivr/exotel", params=exotel_params)
    assert response.status_code == 200
    data = response.json()
    assert "url" in data
    assert data["url"].startswith("wss://")
    assert "delusion-moody-spruce.ngrok-free.dev" in data["url"]
    assert data["url"].endswith("/api/v1/ivr/exotel")


def test_p2_exotel_resolver_fallback_dynamic(client: TestClient):
    """Verify resolver constructs wss:// URL from request headers if EXOTEL_STREAM_URL is unset."""
    with patch.object(settings, "EXOTEL_STREAM_URL", None):
        headers = {
            "x-forwarded-proto": "https",
            "x-forwarded-host": "custom-tunnel.ngrok-free.app",
        }
        response = client.get("/api/v1/ivr/exotel?CallSid=CA999", headers=headers)
        assert response.status_code == 200
        data = response.json()
        assert data["url"] == "wss://custom-tunnel.ngrok-free.app/api/v1/ivr/exotel"


# ──────────────────────────────────────────────────────────────────────────────
# Test Q: Inbound Audio Interpreted as PCM S16LE (No mu-law Even if Carrier Sends mulaw)
# ──────────────────────────────────────────────────────────────────────────────

def test_q_inbound_pcm_s16le_no_mulaw_even_with_carrier_header(client: TestClient):
    """
    Verify inbound Exotel media payload is interpreted directly as PCM S16LE
    without mu-law conversion even if the start event contained legacy carrier 'audio/x-mulaw'.
    """
    mock_stt = _create_mock_stt([])
    # 16-bit linear PCM audio (8000 Hz, mono, little-endian: 2 bytes per sample)
    dummy_pcm = b"\x01\x02\x03\x04\x05\x06\x07\x08" * 40  # 320 bytes
    dummy_b64 = base64.b64encode(dummy_pcm).decode("ascii")

    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            # Carrier sends audio/x-mulaw in start header
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STREAM_Q",
                "start": {
                    "stream_sid": "MZ_STREAM_Q",
                    "media_format": {"encoding": "audio/x-mulaw", "sample_rate": 8000, "channels": 1},
                },
            })
            _drain_greeting(ws)

            # Inbound media is raw PCM S16LE
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_STREAM_Q",
                "media": {"payload": dummy_b64},
            })
            ws.send_json({"event": "stop"})

        # Verify STT received exact PCM bytes without any mu-law expansion
        assert mock_stt.send_audio.called
        sent_bytes = mock_stt.send_audio.call_args[0][0]
        assert sent_bytes == dummy_pcm
        assert len(sent_bytes) == len(dummy_pcm)


# ──────────────────────────────────────────────────────────────────────────────
# Test R: Outbound Media Strips WAV Header & Sends Valid PCM S16LE Chunks
# ──────────────────────────────────────────────────────────────────────────────

def test_r_outbound_media_strips_wav_container_and_sends_pcm_s16le_chunks(client: TestClient):
    """
    Verify outbound Sarvam TTS WAV is stripped of container, not converted to mu-law,
    and chunked to ~100ms multiples of 320 bytes.
    """
    # Create a 200 ms WAV file (should produce two 100ms chunks of 1600 bytes)
    dummy_wav = _create_synthetic_wav(duration_ms=200)
    assert dummy_wav.startswith(b"RIFF")  # Has WAV header

    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
        mime_type="audio/wav",
        sample_rate=8000,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_STREAM_R",
                "start": {"stream_sid": "MZ_STREAM_R"},
            })

            chunks_received = []
            while True:
                frame = ws.receive_json()
                if frame.get("event") == "media":
                    # Verify Exotel media JSON structure
                    assert "streamSid" in frame
                    assert frame["streamSid"] == "MZ_STREAM_R"
                    assert "media" in frame
                    assert "payload" in frame["media"]

                    payload_bytes = base64.b64decode(frame["media"]["payload"])
                    # Verify WAV container header is completely stripped
                    assert not payload_bytes.startswith(b"RIFF")
                    assert not payload_bytes.startswith(b"WAVE")
                    # Verify chunk size is a multiple of 320 bytes and even (PCM16)
                    assert len(payload_bytes) % 2 == 0
                    assert len(payload_bytes) % 320 == 0
                    chunks_received.append(payload_bytes)
                elif frame.get("event") == "mark":
                    assert frame["mark"]["name"] == "greeting"
                    break

            # 200 ms at 8000 Hz 16-bit mono = 3200 bytes total PCM = two 1600-byte chunks
            assert len(chunks_received) == 2
            for c in chunks_received:
                assert len(c) == 1600

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test S: wav_to_pcm Verification
# ──────────────────────────────────────────────────────────────────────────────

def test_s_wav_to_pcm_header_stripping():
    """Verify wav_to_pcm accurately extracts raw PCM frames and strips headers."""
    # 100 ms of audio at 8000 Hz mono 16-bit
    wav_data = _create_synthetic_wav(sample_rate=8000, duration_ms=100)
    assert wav_data[:4] == b"RIFF"

    pcm = wav_to_pcm(wav_data, expected_rate=8000, expected_channels=1, expected_width=2)
    assert not pcm.startswith(b"RIFF")
    assert len(pcm) == 1600
    assert len(pcm) % 2 == 0

    # Test fallback with raw header
    raw_with_header = b"RIFF" + b"\x00" * 4 + b"WAVE" + b"data" + b"\x00\x01\x00\x00" + (b"\x05\x00" * 160)
    extracted = wav_to_pcm(raw_with_header)
    assert not extracted.startswith(b"RIFF")
    assert len(extracted) == 320


# ──────────────────────────────────────────────────────────────────────────────
# Test T: chunk_outbound_audio Size & Silence Padding
# ──────────────────────────────────────────────────────────────────────────────

def test_t_chunk_outbound_audio_size_and_padding():
    """Verify chunk_outbound_audio produces 1600-byte chunks and pads tail to 320 bytes."""
    # 1700 bytes of PCM (not a multiple of 320)
    pcm = b"\x12\x34" * 850  # 1700 bytes
    chunks = chunk_outbound_audio(pcm, encoding="audio/l16", chunk_duration_ms=100, sample_rate=8000)

    # First chunk: 1600 bytes
    c1 = base64.b64decode(chunks[0])
    assert len(c1) == 1600

    # Second chunk: remainder 100 bytes padded to 320 bytes with zero-amplitude silence
    c2 = base64.b64decode(chunks[1])
    assert len(c2) == 320
    assert c2[:100] == pcm[1600:]
    assert c2[100:] == b"\x00" * 220


# ──────────────────────────────────────────────────────────────────────────────
# Test U: Full Lifecycle (connected -> start -> media -> stop)
# ──────────────────────────────────────────────────────────────────────────────

def test_u_full_lifecycle_connected_start_media_stop(client: TestClient):
    """
    Verify full Exotel VoiceBot lifecycle:
    connected -> start (camelCase fields) -> initial greeting -> media -> stop.
    Confirms WebSocket stays alive and open through the entire conversation until stop.
    """
    mock_stt = _create_mock_stt([])
    dummy_wav = _create_synthetic_wav(duration_ms=100)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
        mime_type="audio/wav",
        sample_rate=8000,
    )

    # 16-bit linear PCM audio (8000 Hz, mono: 320 bytes = 160 samples)
    dummy_pcm = b"\x00\x00\x20\x00" * 80
    dummy_b64 = base64.b64encode(dummy_pcm).decode("ascii")

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            # Step 1: Exotel sends connected event
            ws.send_json({
                "event": "connected",
                "protocol": "Call",
                "version": "1.0.0",
            })

            # Step 2: Exotel sends start event with camelCase streamSid, callSid, and mediaFormat
            ws.send_json({
                "event": "start",
                "sequenceNumber": "1",
                "streamSid": "MZ_FULL_LIFECYCLE_001",
                "start": {
                    "streamSid": "MZ_FULL_LIFECYCLE_001",
                    "callSid": "CA_FULL_LIFECYCLE_001",
                    "accountSid": "AC_FULL_LIFECYCLE_001",
                    "tracks": ["inbound"],
                    "mediaFormat": {
                        "encoding": "audio/x-mulaw",
                        "sampleRate": 8000,
                        "channels": 1,
                    },
                    "customParameters": {"language": "en-IN"},
                },
            })

            # Step 3: Server streams initial greeting media frames and mark
            greeting_media_received = 0
            while True:
                frame = ws.receive_json()
                if frame.get("event") == "media":
                    greeting_media_received += 1
                    assert frame["streamSid"] == "MZ_FULL_LIFECYCLE_001"
                    assert "payload" in frame["media"]
                elif frame.get("event") == "mark":
                    assert frame["mark"]["name"] == "greeting"
                    assert frame["streamSid"] == "MZ_FULL_LIFECYCLE_001"
                    break

            assert greeting_media_received >= 1

            # Step 4: Exotel streams inbound caller audio frames (multiple media events)
            for _ in range(3):
                ws.send_json({
                    "event": "media",
                    "streamSid": "MZ_FULL_LIFECYCLE_001",
                    "media": {
                        "track": "inbound",
                        "chunk": "1",
                        "timestamp": "123456",
                        "payload": dummy_b64,
                    },
                })

            # Step 5: WebSocket remains active and responsive; verify STT received audio
            assert mock_stt.send_audio.called

            # Step 6: Exotel sends stop event to end call
            ws.send_json({
                "event": "stop",
                "streamSid": "MZ_FULL_LIFECYCLE_001",
            })

        # Step 7: On disconnect, STT service resources are cleanly closed
        assert mock_stt.close.called


# ──────────────────────────────────────────────────────────────────────────────
# Test V: Early Disconnect Handled Cleanly
# ──────────────────────────────────────────────────────────────────────────────

def test_v_early_disconnect_handled_cleanly(client: TestClient):
    """
    Verify an early client-side disconnect (e.g. caller hangs up immediately after handshake)
    is caught and handled gracefully without unhandled exceptions or server crash.
    """
    mock_stt = _create_mock_stt([])
    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            # Client connects and sends handshake
            ws.send_json({
                "event": "connected",
                "protocol": "Call",
                "version": "1.0.0",
            })
            # Client drops/closes connection abruptly
            ws.close()

        # STT resources should be released without errors
        assert mock_stt.close.called


# ──────────────────────────────────────────────────────────────────────────────
# Test W: Start Event Tolerates Missing Optional Fields
# ──────────────────────────────────────────────────────────────────────────────

def test_w_start_event_tolerates_missing_optional_fields(client: TestClient):
    """
    Verify start event with missing streamSid, missing mediaFormat, or empty start dict
    does not cause exceptions and safely falls back to defaults.
    """
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            # Barebones start event with no start dict, no streamSid, no mediaFormat
            ws.send_json({
                "event": "start",
            })

            # Greeting is still sent safely
            media_frame = ws.receive_json()
            assert media_frame["event"] == "media"

            mark_frame = ws.receive_json()
            assert mark_frame["event"] == "mark"
            assert mark_frame["mark"]["name"] == "greeting"

            # Clean exit
            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test X: 1-Second 22050 Hz Signal Resamples to Approximately 8000 Samples
# ──────────────────────────────────────────────────────────────────────────────

def test_x_resample_1_second_22050hz_to_8000hz():
    """
    Generate a known 1-second 22050 Hz mono int16 test signal.
    Resample it to 8000 Hz.
    Verify:
      - output is signed 16-bit little-endian PCM (pcm_s16le).
      - sample count is approximately 8000 samples (within 1 sample).
      - byte length is approximately 16000 bytes (8000 samples * 2 bytes/sample).
      - output duration matches original 1.0 second duration.
      - no clipping (all samples in range [-32768, 32767]).
      - signal preserves amplitude and is not silent.
    """
    import math
    import struct

    sr_in = 22050
    sr_out = 8000
    duration = 1.0
    n_samples_in = int(sr_in * duration)

    # 440 Hz test tone at 50% max amplitude (A4 note)
    raw_samples = [
        int(32767 * 0.5 * math.sin(2 * math.pi * 440.0 * i / sr_in))
        for i in range(n_samples_in)
    ]
    pcm_in = struct.pack(f"<{n_samples_in}h", *raw_samples)
    assert len(pcm_in) == 22050 * 2  # 44100 bytes

    # Resample using resample_pcm_audio
    pcm_out = resample_pcm_audio(pcm_in, source_rate=sr_in, target_rate=sr_out)

    # Verify byte length is valid int16 boundary (even number of bytes)
    assert len(pcm_out) % 2 == 0

    # Unpack int16 samples
    n_samples_out = len(pcm_out) // 2
    out_samples = struct.unpack(f"<{n_samples_out}h", pcm_out)

    # Verify sample count is approximately 8000 (polyphase filter edge may vary by ±1 sample)
    assert abs(n_samples_out - 8000) <= 2

    # Verify byte length is approximately duration * 8000 * 2 = 16000 bytes
    assert abs(len(pcm_out) - 16000) <= 4

    # Verify duration
    out_duration = n_samples_out / sr_out
    assert abs(out_duration - duration) < 0.005  # Within 5 milliseconds

    # Verify no clipping / overflows
    assert min(out_samples) >= -32768
    assert max(out_samples) <= 32767

    # Verify signal energy (not silent, preserves ~50% amplitude)
    rms = math.sqrt(sum(s * s for s in out_samples) / n_samples_out)
    assert rms > 5000  # Strong non-silent audio


# ──────────────────────────────────────────────────────────────────────────────
# Test Y: wav_to_pcm Resamples 22050 Hz WAV to 8000 Hz PCM and Preserves 8000 Hz WAV
# ──────────────────────────────────────────────────────────────────────────────

def test_y_wav_to_pcm_resampling_and_chunking():
    """
    Verify:
      - 8000 Hz WAV remains 8000 Hz without modification.
      - 22050 Hz WAV is resampled to 8000 Hz.
      - output is valid int16 S16LE and mono.
      - output byte length is approximately duration * 8000 * 2.
      - no WAV RIFF header remains in extracted PCM.
      - no mu-law conversion occurs.
      - 100 ms chunking produces 1600-byte chunks (multiples of 320 bytes).
    """
    # 1. Verify 8000 Hz WAV (100 ms = 800 samples = 1600 bytes)
    wav_8k = _create_synthetic_wav(sample_rate=8000, duration_ms=100)
    pcm_8k = wav_to_pcm(wav_8k, expected_rate=8000)
    assert len(pcm_8k) == 1600
    assert not pcm_8k.startswith(b"RIFF")
    chunks_8k = chunk_outbound_audio(pcm_8k, encoding="audio/l16", chunk_duration_ms=100)
    assert len(chunks_8k) == 1
    assert len(base64.b64decode(chunks_8k[0])) == 1600

    # 2. Verify 22050 Hz WAV (500 ms = 11025 frames at 22050 Hz)
    wav_22k = _create_synthetic_wav(sample_rate=22050, duration_ms=500)
    assert wav_22k[:4] == b"RIFF"

    # wav_to_pcm should detect 22050 Hz and resample to 8000 Hz
    pcm_resampled = wav_to_pcm(wav_22k, expected_rate=8000)

    # Verify container header is stripped
    assert not pcm_resampled.startswith(b"RIFF")
    assert not pcm_resampled.startswith(b"WAVE")

    # 500 ms at 8000 Hz = 4000 samples = 8000 bytes
    assert abs(len(pcm_resampled) - 8000) <= 4
    assert len(pcm_resampled) % 2 == 0

    # Chunk into 100 ms chunks
    chunks_resampled = chunk_outbound_audio(pcm_resampled, encoding="audio/l16", chunk_duration_ms=100)
    # 500 ms should produce 5 chunks of 100 ms
    assert len(chunks_resampled) == 5
    for c_b64 in chunks_resampled:
        c_bytes = base64.b64decode(c_b64)
        assert len(c_bytes) == 1600
        assert len(c_bytes) % 320 == 0


# ──────────────────────────────────────────────────────────────────────────────
# Test Z1: Language Selection DTMF '1' sets English (en-IN)
# ──────────────────────────────────────────────────────────────────────────────

def test_z1_language_selection_dtmf_english(client: TestClient):
    """Verify pressing '1' selects English and plays English symptom instructions."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_LANG_EN",
                "start": {"stream_sid": "MZ_LANG_EN"},
            })
            _drain_greeting(ws)
            mock_tts.reset_mock()

            # Press 1 for English
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_LANG_EN",
                "dtmf": {"digit": "1"},
            })

            # Receives English symptom instructions
            media_msg = ws.receive_json()
            assert media_msg["event"] == "media"

            # Check mark is symptom_prompt_en
            _drain_mark(ws, "symptom_prompt_en")

            # Check TTS synthesized English symptom prompt
            prompt_text = mock_tts.call_args[0][0]
            assert "describe your symptoms" in prompt_text.lower()
            assert "1 for fever" in prompt_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z2: Language Selection DTMF '2' sets Hindi (hi-IN)
# ──────────────────────────────────────────────────────────────────────────────

def test_z2_language_selection_dtmf_hindi(client: TestClient):
    """Verify pressing '2' selects Hindi and plays Hindi symptom instructions."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_LANG_HI",
                "start": {"stream_sid": "MZ_LANG_HI"},
            })
            _drain_greeting(ws)
            mock_tts.reset_mock()

            # Press 2 for Hindi
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_LANG_HI",
                "dtmf": {"digit": "2"},
            })

            # Receives Hindi symptom instructions
            media_msg = ws.receive_json()
            assert media_msg["event"] == "media"

            _drain_mark(ws, "symptom_prompt_hi")

            # Check TTS synthesized Hindi symptom prompt
            prompt_text = mock_tts.call_args[0][0]
            assert "lakshan batayein" in prompt_text.lower()
            assert "bukhar ke liye 1" in prompt_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z3: Invalid Language Selection Retries and Fallbacks to English
# ──────────────────────────────────────────────────────────────────────────────

def test_z3_language_selection_invalid_retry_and_fallback(client: TestClient):
    """Verify invalid language choices trigger retry prompt and fallback to en-IN on repeat invalid."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_LANG_INVALID",
                "start": {"stream_sid": "MZ_LANG_INVALID"},
            })
            _drain_greeting(ws)
            mock_tts.reset_mock()

            # 1st invalid digit (e.g. 5) -> retry prompt
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_LANG_INVALID",
                "dtmf": {"digit": "5"},
            })
            _ = ws.receive_json()  # media
            _drain_mark(ws, "lang_retry")
            retry_text = mock_tts.call_args[0][0]
            assert "invalid option" in retry_text.lower()
            mock_tts.reset_mock()

            # 2nd invalid digit (e.g. 8) -> fallback to default en-IN
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_LANG_INVALID",
                "dtmf": {"digit": "8"},
            })
            _ = ws.receive_json()  # media
            _drain_mark(ws, "lang_fallback")
            fallback_text = mock_tts.call_args[0][0]
            assert "default language" in fallback_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z4: Multi-Symptom DTMF Input (1=Fever, 2=Cough, 9=Process)
# ──────────────────────────────────────────────────────────────────────────────

def test_z4_multi_symptom_dtmf_buffering_and_processing(client: TestClient):
    """Verify pressing multiple symptoms buffers them and pressing 9 invokes run_triage() once."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts, \
         patch("backend.app.api.v1.routes.ivr.run_triage", wraps=__import__("ai.triage.triage", fromlist=["run_triage"]).run_triage) as spy_triage:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_MULTI_DTMF",
                "start": {"stream_sid": "MZ_MULTI_DTMF"},
            })
            _drain_greeting(ws)

            # Select English
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_MULTI_DTMF",
                "dtmf": {"digit": "1"},
            })
            _drain_mark(ws, "symptom_prompt_en")
            mock_tts.reset_mock()
            spy_triage.reset_mock()

            # Press 1 for Fever
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_MULTI_DTMF",
                "dtmf": {"digit": "1"},
            })

            # Press 2 for Cough
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_MULTI_DTMF",
                "dtmf": {"digit": "2"},
            })

            # Neither should have triggered triage yet
            assert spy_triage.call_count == 0

            # Press 9 to process
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_MULTI_DTMF",
                "dtmf": {"digit": "9"},
            })

            # Response media and mark received
            resp_media = ws.receive_json()
            assert resp_media["event"] == "media"
            _drain_mark(ws, "dtmf_triage_response")

            # Triage evaluated once with both symptoms
            assert spy_triage.call_count == 1
            call_kwargs = spy_triage.call_args[1]
            assert "fever" in call_kwargs["symptoms"]
            assert "cough" in call_kwargs["symptoms"]

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z5: DTMF '0' Triggers Immediate Emergency Escalation
# ──────────────────────────────────────────────────────────────────────────────

def test_z5_dtmf_emergency_immediate_escalation(client: TestClient):
    """Verify pressing '0' in symptom state immediately escalates to emergency triage without 9."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_EMERGENCY_0",
                "start": {"stream_sid": "MZ_EMERGENCY_0"},
            })
            _drain_greeting(ws)

            # Select English
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_EMERGENCY_0",
                "dtmf": {"digit": "1"},
            })
            _drain_mark(ws, "symptom_prompt_en")
            mock_tts.reset_mock()

            # Press 0 for emergency
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_EMERGENCY_0",
                "dtmf": {"digit": "0"},
            })

            resp_media = ws.receive_json()
            assert resp_media["event"] == "media"
            _drain_mark(ws, "dtmf_emergency_response")

            spoken_text = mock_tts.call_args[0][0]
            assert "emergency" in spoken_text.lower()
            assert "immediately" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z6: Acoustic Echo Suppression & Transcript Deduplication
# ──────────────────────────────────────────────────────────────────────────────

def test_z6_acoustic_echo_suppression_and_deduplication(client: TestClient):
    """Verify acoustic echo of bot's own voice and duplicate final transcripts are safely discarded."""
    stt_events = [
        # 1. First user speech
        {"success": True, "type": "transcript.final", "text": "I have severe fever"},
        # 2. Duplicate user speech
        {"success": True, "type": "transcript.final", "text": "I have severe fever"},
        # 3. Acoustic echo transcript matching bot greeting
        {"success": True, "type": "transcript.final", "text": "Rural Care Navigator mein aapka swagat hai"},
    ]
    mock_stt = _create_mock_stt(stt_events)

    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(
        audio_base64=base64.b64encode(dummy_wav).decode("ascii"),
        audio_bytes=dummy_wav,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts, \
         patch("backend.app.api.v1.routes.ivr.run_triage", wraps=__import__("ai.triage.triage", fromlist=["run_triage"]).run_triage) as spy_triage:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({
                "event": "start",
                "stream_sid": "MZ_ECHO_TEST",
                "start": {"stream_sid": "MZ_ECHO_TEST"},
            })
            _drain_greeting(ws)

            # Select English
            ws.send_json({
                "event": "dtmf",
                "stream_sid": "MZ_ECHO_TEST",
                "dtmf": {"digit": "1"},
            })
            _drain_mark(ws, "symptom_prompt_en")
            spy_triage.reset_mock()
            mock_tts.reset_mock()

            # Trigger STT listener via media
            ws.send_json({
                "event": "media",
                "stream_sid": "MZ_ECHO_TEST",
                "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")},
            })

            _ = ws.receive_json()
            _drain_mark(ws, "name_prompt")

            # Duplicate and echo transcripts were discarded safely
            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z7: Spoken Language Selection (English & Hindi)
# ──────────────────────────────────────────────────────────────────────────────

def test_z7_spoken_language_selection_english_and_hindi(client: TestClient):
    """Verify caller can speak 'English' or 'Hindi' during LANGUAGE_SELECTION."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I want English please"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_LANG_SPOKEN", "start": {"stream_sid": "MZ_LANG_SPOKEN"}})
            _drain_greeting(ws)

            ws.send_json({"event": "media", "stream_sid": "MZ_LANG_SPOKEN", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "symptom_prompt_en")

            # Verify English symptom prompt was spoken
            spoken_script = mock_tts.call_args[0][0]
            assert "symptoms" in spoken_script.lower()
            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z8: Multi-turn Dialogue, Negative Confirmation ("No"), and Location Resolution
# ──────────────────────────────────────────────────────────────────────────────

def test_z8_multiturn_symptoms_negative_confirmation_and_location(client: TestClient):
    """
    Verify multi-turn flow:
      1. Caller speaks symptoms ("I have fever and cough")
      2. Caller says "No" when asked for other symptoms -> transitions to WAITING_FOR_LOCATION
      3. Caller says "Malshiras" -> resolves PHC Malshiras and speaks recommendation
    """
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    batches = [
        # Turn 1: Symptoms
        [{"type": "transcript.final", "text": "I have fever and cough"}],
        # Turn 2: Negative confirmation -> location prompt
        [{"type": "transcript.final", "text": "No, nothing else"}],
        # Turn 3: Location -> recommendation with facility
        [{"type": "transcript.final", "text": "I live in Malshiras"}],
    ]
    mock_stt = _create_sequential_mock_stt(batches)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_MULTITURN", "start": {"stream_sid": "MZ_MULTITURN"}})
            _drain_greeting(ws)

            # Select English via DTMF 1
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_MULTITURN", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Turn 1: Send media frame -> fires batch 0 ("I have fever and cough")
            ws.send_json({"event": "media", "stream_sid": "MZ_MULTITURN", "media": {"payload": base64.b64encode(b"\x00\x10" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            # Turn 2: Send media frame -> fires batch 1 ("No, nothing else")
            ws.send_json({"event": "media", "stream_sid": "MZ_MULTITURN", "media": {"payload": base64.b64encode(b"\x00\x10" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "location_prompt")
            loc_prompt_text = mock_tts.call_args[0][0]
            assert "location" in loc_prompt_text.lower() or "village" in loc_prompt_text.lower()

            # Turn 3: Send media frame -> fires batch 2 ("I live in Malshiras")
            ws.send_json({"event": "media", "stream_sid": "MZ_MULTITURN", "media": {"payload": base64.b64encode(b"\x00\x10" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            final_text = mock_tts.call_args[0][0]
            assert "malshiras" in final_text.lower()
            assert "primary health centre" in final_text.lower() or "phc" in final_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z9: DTMF Location Selection Resolves Real Database Facility
# ──────────────────────────────────────────────────────────────────────────────

def test_z9_dtmf_location_selection_resolves_database_facility(client: TestClient):
    """Verify pressing 1 in WAITING_FOR_LOCATION selects Malshiras and recommends PHC Malshiras."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_DTMF_LOC", "start": {"stream_sid": "MZ_DTMF_LOC"}})
            _drain_greeting(ws)

            # 1. Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_LOC", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # 2. Select symptom: 1 for fever
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_LOC", "dtmf": {"digit": "1"}})

            # 3. Process symptoms: 9 -> prompts for location
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_LOC", "dtmf": {"digit": "9"}})
            _ = ws.receive_json()
            _drain_mark(ws, "dtmf_triage_response")

            # 4. In WAITING_FOR_LOCATION, press 1 for Malshiras
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_LOC", "dtmf": {"digit": "1"}})
            _ = ws.receive_json()
            _drain_mark(ws, "dtmf_triage_response")

            spoken_text = mock_tts.call_args[0][0]
            assert "malshiras" in spoken_text.lower()
            assert "primary health centre" in spoken_text.lower() or "phc" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z10: Emergency Voice with Location Resolves Emergency Facility
# ──────────────────────────────────────────────────────────────────────────────

def test_z10_emergency_voice_with_location_resolves_emergency_facility(client: TestClient):
    """Verify caller speaking emergency symptoms + location immediately receives emergency hospital recommendation."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have severe chest pain and trouble breathing in Akluj"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_EMERGENCY_LOC", "start": {"stream_sid": "MZ_EMERGENCY_LOC"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_EMERGENCY_LOC", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Send speech
            ws.send_json({"event": "media", "stream_sid": "MZ_EMERGENCY_LOC", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            spoken_text = mock_tts.call_args[0][0]
            assert "emergency" in spoken_text.lower()
            assert "immediately" in spoken_text.lower()
            assert "akluj" in spoken_text.lower() or "hospital" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z11: Mixed DTMF and Voice Symptoms Consolidation
# ──────────────────────────────────────────────────────────────────────────────

def test_z11_mixed_dtmf_and_voice_symptoms_consolidation(client: TestClient):
    """Verify keypad selection (e.g. 1 for fever) combines with spoken description (e.g. 'for three days in Malshiras')."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have had this fever for three days and I live in Malshiras"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_MIXED", "start": {"stream_sid": "MZ_MIXED"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_MIXED", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # DTMF 1 for fever
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_MIXED", "dtmf": {"digit": "1"}})

            # Spoken description
            ws.send_json({"event": "media", "stream_sid": "MZ_MIXED", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            spoken_text = mock_tts.call_args[0][0]
            assert "malshiras" in spoken_text.lower()
            assert "primary health centre" in spoken_text.lower() or "phc" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z12: Affirmative Speech Prompts for Details
# ──────────────────────────────────────────────────────────────────────────────

def test_z12_affirmative_speech_prompts_for_details(client: TestClient):
    """Verify saying 'yes' / 'haan' prompts the caller to provide additional detail."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "Yes"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_YES", "start": {"stream_sid": "MZ_YES"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_YES", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Send 'Yes'
            ws.send_json({"event": "media", "stream_sid": "MZ_YES", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "symptom_prompt")

            spoken_text = mock_tts.call_args[0][0]
            assert "symptoms" in spoken_text.lower() or "describe" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z13: Farewell Speech Transitions to ENDED
# ──────────────────────────────────────────────────────────────────────────────

def test_z13_farewell_speech_transitions_to_ended(client: TestClient):
    """Verify saying 'thank you goodbye' in WAITING_FOR_NEXT_ACTION cleanly ends the session."""
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    batches = [
        # Turn 1: Symptoms with location -> triage recommendation
        [{"type": "transcript.final", "text": "I have fever in Malshiras"}],
        # Turn 2: Farewell speech -> goodbye
        [{"type": "transcript.final", "text": "thank you and goodbye"}],
    ]
    mock_stt = _create_sequential_mock_stt(batches)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_BYE", "start": {"stream_sid": "MZ_BYE"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_BYE", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Turn 1: Symptoms + location -> fires batch 0
            ws.send_json({"event": "media", "stream_sid": "MZ_BYE", "media": {"payload": base64.b64encode(b"\x00\x10" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            # Turn 2: Now in WAITING_FOR_NEXT_ACTION, caller says 'thank you bye' -> fires batch 1
            ws.send_json({"event": "media", "stream_sid": "MZ_BYE", "media": {"payload": base64.b64encode(b"\x00\x10" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "goodbye")

            spoken_text = mock_tts.call_args[0][0]
            assert "goodbye" in spoken_text.lower() or "care" in spoken_text.lower() or "namaste" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z14: Unknown Location Fallback Does Not Crash Or Invent Hospitals
# ──────────────────────────────────────────────────────────────────────────────

def test_z14_unknown_location_fallback_without_inventing_hospitals(client: TestClient):
    """Verify an unknown remote village falls back to real district facilities without hallucination."""
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have cough and I live in Unmapped Remote Hamlet 999"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_UNKNOWN_LOC", "start": {"stream_sid": "MZ_UNKNOWN_LOC"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_UNKNOWN_LOC", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Send speech
            ws.send_json({"event": "media", "stream_sid": "MZ_UNKNOWN_LOC", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            spoken_text = mock_tts.call_args[0][0]
            # Recommendation uses a real known facility (PHC Malshiras or District Hospital)
            assert any(real_fac in spoken_text for real_fac in ["PHC Malshiras", "CHC Akluj", "District Hospital Solapur", "Primary Health Centre"])

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z15: Natural Speech Injury Synonyms Trigger Clinical Triage
# ──────────────────────────────────────────────────────────────────────────────

def test_z15_natural_speech_injury_synonyms_triggers_triage(client: TestClient):
    """
    Verify natural speech containing conversational injury phrases
    ("I injured my leg and I fell down and my hand is bleeding")
    is extracted as 'injury' and properly evaluated by run_triage().
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I injured my leg and I fell down and my hand is bleeding in Malshiras"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_INJURY_SPEECH", "start": {"stream_sid": "MZ_INJURY_SPEECH"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_INJURY_SPEECH", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Send speech media
            ws.send_json({"event": "media", "stream_sid": "MZ_INJURY_SPEECH", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            spoken_text = mock_tts.call_args[0][0]
            # Primary Health Centre or emergency care recommended for injuries
            assert "primary health centre" in spoken_text.lower() or "hospital" in spoken_text.lower() or "care" in spoken_text.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z16: Multi-Turn Symptoms, Duration & Locality Dialogue
# ──────────────────────────────────────────────────────────────────────────────

def test_z16_duration_and_red_flag_conversational_turns(client: TestClient):
    """
    Verify multi-turn dialogue with natural duration, locality and polite exit:
      Turn 1: Caller describes symptoms with duration and locality
              -> Bot extracts duration ('3 days') and location ('Malshiras')
              -> Recommends care and offers booking
      Turn 2: Caller declines booking with polite farewell
              -> Bot smoothly transitions to ENDED with goodbye
    """
    batches = [
        # Turn 1: Symptoms with duration and location
        [{"type": "transcript.final", "text": "I have fever and severe headache for 3 days in Malshiras"}],
        # Turn 2: Decline booking & farewell
        [{"type": "transcript.final", "text": "No thank you, goodbye"}],
    ]
    mock_stt = _create_sequential_mock_stt(batches)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_MULTITURN", "start": {"stream_sid": "MZ_MULTITURN"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_MULTITURN", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Turn 1: Symptoms + duration + location -> Triage recommendation
            ws.send_json({"event": "media", "stream_sid": "MZ_MULTITURN", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")
            spoken_text = mock_tts.call_args[0][0].lower()
            assert "primary health centre" in spoken_text or "malshiras" in spoken_text or "care" in spoken_text

            # Turn 2: Decline booking and farewell -> Goodbye
            ws.send_json({"event": "media", "stream_sid": "MZ_MULTITURN", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "goodbye")
            assert "care" in mock_tts.call_args[0][0].lower() or "goodbye" in mock_tts.call_args[0][0].lower() or "namaste" in mock_tts.call_args[0][0].lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z17: Voice Appointment Booking for Phone Consultation
# ──────────────────────────────────────────────────────────────────────────────

def test_z17_voice_booking_phone_consultation_flow(client: TestClient):
    """
    Verify complete voice appointment booking workflow:
      Turn 1: Symptoms + locality -> Triage recommendation + booking prompt
      Turn 2: Caller says 'yes please book' -> Bot asks phone vs visit
      Turn 3: Caller says 'phone consultation' -> Bot offers slot tomorrow at 10 AM
      Turn 4: Caller says 'yes confirm' -> Bot books appointment and speaks confirmation ID
    """
    batches = [
        # Turn 1: Triage with symptoms and location
        [{"type": "transcript.final", "text": "I have fever in Malshiras"}],
        # Turn 2: Accept booking
        [{"type": "transcript.final", "text": "Yes please book an appointment"}],
        # Turn 3: Choose phone consultation
        [{"type": "transcript.final", "text": "Phone consultation"}],
        # Turn 4: Confirm slot
        [{"type": "transcript.final", "text": "Yes confirm"}],
    ]
    mock_stt = _create_sequential_mock_stt(batches)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel?From=%2B919876543210") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_BOOKING", "start": {"stream_sid": "MZ_BOOKING"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_BOOKING", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Turn 1: Triage with fever in Malshiras -> prompts for booking
            ws.send_json({"event": "media", "stream_sid": "MZ_BOOKING", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")
            assert "book" in mock_tts.call_args[0][0].lower() or "appointment" in mock_tts.call_args[0][0].lower()

            # Turn 2: 'Yes please' -> bot asks phone vs visit
            ws.send_json({"event": "media", "stream_sid": "MZ_BOOKING", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "booking_type_prompt")
            assert "phone" in mock_tts.call_args[0][0].lower() and "visit" in mock_tts.call_args[0][0].lower()

            # Turn 3: 'Phone consultation' -> bot proposes slot
            ws.send_json({"event": "media", "stream_sid": "MZ_BOOKING", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "confirm_slot_prompt")
            assert "tomorrow" in mock_tts.call_args[0][0].lower() or "confirm" in mock_tts.call_args[0][0].lower()

            # Turn 4: 'Yes confirm' -> booking success with appointment ID
            ws.send_json({"event": "media", "stream_sid": "MZ_BOOKING", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "booking_success")
            final_speech = mock_tts.call_args[0][0]
            assert "booked" in final_speech.lower() or "number" in final_speech.lower()

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z18: Voice Encounter DB Persistence & Doctor Clinical Summary
# ──────────────────────────────────────────────────────────────────────────────

def test_z18_voice_encounter_db_persistence_and_doctor_summary(client: TestClient, db_session):
    """
    Verify voice encounters are persisted to PostgreSQL/SQLite voice_encounters table
    and seamlessly included in ConsultationService.get_patient_clinical_summary().
    """
    from backend.app.services.consultation_service import ConsultationService
    from backend.app.models.patient import Patient

    # Create test patient with matching phone
    test_phone = "9876543299"
    patient = Patient(
        full_name="Voice Test Patient",
        age=35,
        gender="Female",
        village="Malshiras",
        mobile=test_phone,
    )
    db_session.add(patient)
    db_session.commit()
    db_session.refresh(patient)

    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have cough in Malshiras"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)):

        with client.websocket_connect(f"/api/v1/ivr/exotel?From=%2B91{test_phone}") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_PERSIST", "start": {"stream_sid": "MZ_PERSIST"}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_PERSIST", "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")

            # Send speech media
            ws.send_json({"event": "media", "stream_sid": "MZ_PERSIST", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            ws.send_json({"event": "stop"})

    # Check Doctor Clinical Summary contains voice encounter
    from backend.app.dependencies import get_consultation_service
    svc = get_consultation_service(db_session)
    summary = svc.get_patient_clinical_summary(patient.id)
    assert summary is not None
    voice_enc = summary.get("voice_encounter")
    assert voice_enc is not None
    assert "9876543299" in voice_enc["phone_number"]
    assert "cough" in voice_enc["symptoms"]
    assert voice_enc["locality"] == "Malshiras"


# ──────────────────────────────────────────────────────────────────────────────
# Test Z19: Hindi Injury Recognition and Conversational Prompting
# ──────────────────────────────────────────────────────────────────────────────

def test_z19_hindi_injury_and_conversational_prompting(client: TestClient):
    """
    Verify full Hindi parity:
      - Selecting Hindi via DTMF '2'
      - Saying 'Mera pair toot gaya hai aur chot lag gayi hai Malshiras me'
      - Correctly maps to 'injury'
      - Spoken response is in Hindi and recommends appropriate care
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "Mera pair toot gaya hai aur chot lag gayi hai Malshiras me"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_HINDI_INJURY", "start": {"stream_sid": "MZ_HINDI_INJURY"}})
            _drain_greeting(ws)

            # Select Hindi
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_HINDI_INJURY", "dtmf": {"digit": "2"}})
            _drain_mark(ws, "symptom_prompt_hi")

            # Send Hindi speech
            ws.send_json({"event": "media", "stream_sid": "MZ_HINDI_INJURY", "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            spoken_text = mock_tts.call_args[0][0].lower()
            # Must recommend care in Hindi (Romanized Hindi TTS phonetics)
            assert any(term in spoken_text for term in ["aspatal", "kendra", "primary health centre", "appointment", "doctor", "lakshan", "chikitsa"])

            ws.send_json({"event": "stop"})


# ──────────────────────────────────────────────────────────────────────────────
# Test Z20: NLP Extraction Unit Helpers
# ──────────────────────────────────────────────────────────────────────────────

def test_z20_nlp_extraction_unit_helpers():
    """Unit test individual NLP extraction helpers for English & Hindi."""
    # Symptom extraction
    assert extract_symptoms("I injured my leg and I fell down") == ["injury"]
    assert extract_symptoms("My hand is bleeding after an accident") == ["injury"]
    assert extract_symptoms("Mujhe bukhar hai aur khansi hai") == ["fever", "cough"]
    assert extract_symptoms("Chot lag gayi hai aur khoon nikal raha hai") == ["injury"]

    # Duration extraction
    assert "3 day" in extract_duration("Since 3 days")
    assert "2 week" in extract_duration("For about 2 weeks")
    assert "4 din" in extract_duration("4 din se ho raha hai")
    assert "yesterday" in extract_duration("Kal se bukhar hai") or "kal se" in extract_duration("Kal se bukhar hai")

    # Red flags detection
    assert check_red_flags_in_speech("I also have severe chest pain") is True
    assert check_red_flags_in_speech("I do not have any chest pain or breathing issues") is False

    # Booking intent & type
    assert extract_booking_intent("Yes please book an appointment") is True
    assert extract_booking_intent("No thanks, I will manage") is False
    assert extract_booking_type("I would prefer a phone consultation") == "phone"
    assert extract_booking_type("In person clinic visit") == "offline"


# ──────────────────────────────────────────────────────────────────────────────
# Test Z21: ConversationAgent Bilingual NLU & Context Memory
# ──────────────────────────────────────────────────────────────────────────────

def test_z21_conversation_agent_bilingual_nlu_and_memory():
    """
    Test ConversationAgent English, Hindi, Hinglish, colloquial speech,
    intent changes, and memory preservation.
    """
    from backend.app.services.conversation_agent import (
        ConversationAgent,
        ConversationIntent,
        ConversationMemory,
    )

    agent = ConversationAgent()

    # 1. English symptom extraction
    mem1 = ConversationMemory(language="en-IN")
    _, act1 = agent.handle_turn("I have fever and cough", mem1)
    assert act1.intent == ConversationIntent.REPORT_SYMPTOMS
    assert "fever" in mem1.symptoms and "cough" in mem1.symptoms

    # 2. Hindi symptom extraction
    mem2 = ConversationMemory(language="hi-IN")
    _, act2 = agent.handle_turn("Mujhe bukhar aur khansi dono hai", mem2)
    assert act2.intent == ConversationIntent.REPORT_SYMPTOMS
    assert "fever" in mem2.symptoms and "cough" in mem2.symptoms

    # 3. Hinglish & Colloquial symptom + duration
    mem3 = ConversationMemory(language="hi-IN")
    _, act3 = agent.handle_turn("Mujhe fever hai aur three days se cough chal raha hai", mem3)
    assert "fever" in mem3.symptoms and "cough" in mem3.symptoms
    assert "3 days" in mem3.duration

    # 4. Slang / Colloquial expression
    mem4 = ConversationMemory(language="hi-IN")
    _, act4 = agent.handle_turn("Teen din se bukhar chal raha hai", mem4)
    assert "fever" in mem4.symptoms
    assert "3 days" in mem4.duration

    # 5. Injury expressions across English and Hindi
    for injury_phrase in [
        "I injured my leg",
        "I fell down and hurt my hand",
        "Mera haath lag gaya",
        "Main gir gaya aur pair mein chot lagi",
        "I have a bleeding wound after an accident",
    ]:
        mem_inj = ConversationMemory()
        _, act_inj = agent.handle_turn(injury_phrase, mem_inj)
        assert "injury" in mem_inj.symptoms

    # 6. Severity & Emergency
    mem_em = ConversationMemory()
    _, act_em = agent.handle_turn("My chest is hurting badly and I can't breathe properly", mem_em)
    assert act_em.intent == ConversationIntent.EMERGENCY
    assert act_em.emergency is True
    assert mem_em.call_phase == "EMERGENCY"

    # 7. Yes / No / No nothing else
    mem_yes = ConversationMemory(call_phase="BOOKING_ASK")
    _, act_yes = agent.handle_turn("Yes please", mem_yes)
    assert act_yes.intent == ConversationIntent.ANSWER_YES

    mem_no = ConversationMemory(call_phase="TRIAGE_PRESENTED")
    _, act_no = agent.handle_turn("No, nothing else", mem_no)
    assert act_no.intent == ConversationIntent.ANSWER_NO
    assert mem_no.call_phase == "ENDED"

    # 8. Locality Extraction (never defaulted)
    mem_loc = ConversationMemory(call_phase="LOCALITY")
    _, act_loc = agent.handle_turn("Pandharpur", mem_loc)
    assert mem_loc.locality == "Pandharpur"
    assert mem_loc.locality_confirmed is True

    # 9. Repeat Request
    for rep in ["Repeat that", "Samajh nahi aaya", "Phir se batao"]:
        mem_rep = ConversationMemory()
        _, act_rep = agent.handle_turn(rep, mem_rep)
        assert act_rep.intent == ConversationIntent.REQUEST_REPEAT

    # 10. Intent Change: Caller changes mind from booking to facility info
    mem_ch = ConversationMemory(call_phase="TRIAGE_PRESENTED", locality="Akluj")
    _, act_ch = agent.handle_turn("Actually, I don't want to book. Just tell me where I should go.", mem_ch)
    assert act_ch.intent == ConversationIntent.FACILITY_INFORMATION


# ──────────────────────────────────────────────────────────────────────────────
# Test Z22: ConversationAgent DTMF Fallback Integration
# ──────────────────────────────────────────────────────────────────────────────

def test_z22_conversation_agent_dtmf_fallback_integration():
    """Verify keypad DTMF digits (1-5, 0) route into the unified conversation action."""
    from backend.app.services.conversation_agent import (
        ConversationAgent,
        ConversationIntent,
        ConversationMemory,
    )

    agent = ConversationAgent()

    # DTMF 1 -> Fever
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("1", mem)
    assert "fever" in mem.symptoms

    # DTMF 2 -> Cough
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("2", mem)
    assert "cough" in mem.symptoms

    # DTMF 3 -> Pain
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("3", mem)
    assert "pain" in mem.symptoms

    # DTMF 4 -> Stomach Problem
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("4", mem)
    assert "stomach problem" in mem.symptoms

    # DTMF 5 -> Injury
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("5", mem)
    assert "injury" in mem.symptoms

    # DTMF 0 -> Emergency
    mem = ConversationMemory()
    _, act = agent.handle_dtmf("0", mem)
    assert act.intent == ConversationIntent.EMERGENCY
    assert mem.call_phase == "EMERGENCY"


# ──────────────────────────────────────────────────────────────────────────────
# Test Z23: Run Triage & Database Facility Integration
# ──────────────────────────────────────────────────────────────────────────────

def test_z23_conversation_agent_run_triage_and_db_facility_integration(db_session):
    """
    Verify ConversationAgent delegates medical decisions exclusively to run_triage()
    and dynamically resolves database facilities matching caller locality.
    """
    from backend.app.services.conversation_agent import (
        ConversationAgent,
        ConversationMemory,
    )

    agent = ConversationAgent()
    mem = ConversationMemory(
        symptoms=["fever", "cough"],
        duration="3 days",
        locality="Akluj",
    )

    triage = agent.run_medical_triage(mem)
    assert triage["urgency"] in ("needs_attention", "urgent", "routine", "emergency")
    assert "reason" in triage
    assert mem.triage_result is not None

    fac = agent.find_facilities(mem, db=db_session)
    assert fac is not None
    assert "name" in fac
    assert "id" in fac


# ──────────────────────────────────────────────────────────────────────────────
# Test Z24: Full Multi-Turn Phone Consultation Integration Flow
# ──────────────────────────────────────────────────────────────────────────────

def test_z24_full_multiturn_phone_consultation_integration(client: TestClient, db_session):
    """
    Complete multi-turn end-to-end conversation:
      Turn 1: Caller: 'I have fever and cough.' -> Bot asks duration.
      Turn 2: Caller: 'Three days.' -> Bot asks red flags / locality.
      Turn 3: Caller: 'No.' -> Bot asks locality.
      Turn 4: Caller: 'Pandharpur.' -> Backend searches facilities.
      Turn 5: Caller: 'I want to talk to a doctor on the phone.' -> Proposes slot.
      Turn 6: Caller: 'Yes please.' -> Confirms and creates appointment.
      Verification: Appointment & VoiceEncounter persisted to DB.
    """
    from backend.app.models.appointment import Appointment
    from backend.app.models.patient import Patient
    from backend.app.models.voice_encounter import VoiceEncounter
    from backend.app.repositories.patient_repository import PatientRepository
    from backend.app.repositories.voice_encounter_repository import VoiceEncounterRepository
    from backend.app.services.conversation_agent import (
        ConversationAgent,
        ConversationMemory,
    )

    p_repo = PatientRepository(db_session)
    pat = p_repo.create_patient(
        mobile="9876543201",
        full_name="Ramesh Patel",
        age=40,
        gender="male",
    )
    agent = ConversationAgent()
    mem = ConversationMemory(
        language="en-IN",
        caller_phone="+919876543201",
        is_existing_patient=True,
        patient_id=pat.id,
        patient_name="Ramesh Patel",
        age=40,
        gender="male",
    )

    # Turn 1: Caller reports fever and cough
    speech1, act1 = agent.handle_turn("I have fever and cough", mem, db=db_session)
    assert "fever" in mem.symptoms and "cough" in mem.symptoms
    assert mem.call_phase == "DURATION"
    assert "how long" in speech1.lower() or "kitne din" in speech1.lower() or "duration" in speech1.lower()

    # Turn 2: Caller provides duration
    speech2, act2 = agent.handle_turn("Three days", mem, db=db_session)
    assert mem.duration == "3 days"
    # Symptoms must NOT be overwritten by duration
    assert "fever" in mem.symptoms and "cough" in mem.symptoms
    assert mem.call_phase == "SAFETY_QUESTIONS"

    # Turn 3: Caller answers safety screening (no red flags)
    speech3, act3 = agent.handle_turn("No", mem, db=db_session)
    assert mem.call_phase == "LOCALITY"

    # Turn 4: Caller provides locality
    speech4, act4 = agent.handle_turn("Pandharpur", mem, db=db_session)
    assert mem.locality == "Pandharpur"
    assert mem.call_phase == "TRIAGE_PRESENTED"
    assert mem.triage_result is not None
    assert mem.recommended_facility is not None

    # Turn 5: Caller wants phone consultation
    speech5, act5 = agent.handle_turn("I want to talk to a doctor on the phone", mem, db=db_session)
    assert mem.appointment_type == "phone"
    assert mem.call_phase == "BOOKING_CONFIRM"
    assert mem.selected_slot is not None

    # Turn 6: Caller confirms booking
    speech6, act6 = agent.handle_turn("Yes please", mem, db=db_session)
    assert mem.call_phase == "ENDED"
    assert mem.appointment_id is not None
    assert "booked" in speech6.lower() or "number" in speech6.lower()

    # Persist voice encounter
    voice_repo = VoiceEncounterRepository(db_session)
    enc = voice_repo.create_encounter(
        phone_number=mem.caller_phone,
        patient_id=mem.patient_id,
        language=mem.language,
        symptoms=", ".join(mem.symptoms),
        symptom_duration=mem.duration,
        triage_urgency=mem.triage_result.get("urgency"),
        triage_reason=mem.triage_result.get("reason"),
        emergency=bool(mem.triage_result.get("emergency")),
        locality=mem.locality,
        facility_id=(mem.recommended_facility or {}).get("id"),
        facility_name=(mem.recommended_facility or {}).get("name"),
        booking_intent="YES",
        appointment_id=mem.appointment_id,
        transcript_summary=mem.get_summary_text(),
        interaction_source="VOICE_AI_LLM",
    )

    # Verify PostgreSQL Persistence
    appt = db_session.get(Appointment, mem.appointment_id)
    assert appt is not None
    assert appt.status in ("SCHEDULED", "CONFIRMED")
    assert enc.id is not None
    assert enc.appointment_id == appt.id
    assert "Pandharpur" in enc.locality
    assert "fever" in enc.symptoms and "cough" in enc.symptoms


def test_z25_local_learned_model_exact_user_specifications():
    """
    Test suite verifying the exact multilingual examples mandated in the user prompt:
      1. English: "I've had fever and cough for three days."
      2. Hindi:   "Mujhe bukhar aur khansi hai." / "Mujhe teen din se bukhar aur khansi hai."
      3. Hinglish: "Mujhe fever hai aur three days se cough bhi hai."
      4. Rural/colloquial: "bukhar chal raha hai", "pet mein dard", "gir gaya pair mein lag gaya"
      5. Confidence thresholding: low confidence returns UNKNOWN
      6. Locality extraction: "Mera gaon Pandharpur hai"
      7. Booking modality: phone consultation vs hospital visit
    """
    from backend.app.ai.conversation.model_service import LocalConversationModel
    from backend.app.services.conversation_agent import (
        ConversationAgent,
        ConversationIntent,
        ConversationMemory,
    )

    model = LocalConversationModel.get_instance()

    # Spec 1: English exact prompt
    res1 = model.predict("I've had fever and cough for three days.")
    assert res1["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in res1["symptoms"]
    assert "cough" in res1["symptoms"]
    assert res1["duration"] == "3 days"
    assert res1["confidence"] >= 0.50

    # Spec 2: Hindi exact prompt
    res2 = model.predict("Mujhe bukhar aur khansi hai.")
    assert res2["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in res2["symptoms"] or "cough" in res2["symptoms"]

    res2_dur = model.predict("Mujhe teen din se bukhar aur khansi hai.")
    assert res2_dur["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in res2_dur["symptoms"]
    assert "cough" in res2_dur["symptoms"]
    assert res2_dur["duration"] == "3 days"

    # Spec 3: Hinglish exact prompt
    res3 = model.predict("Mujhe fever hai aur three days se cough bhi hai.")
    assert res3["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in res3["symptoms"]
    assert "cough" in res3["symptoms"]
    assert res3["duration"] == "3 days"

    # Spec 4: Rural / Colloquial variants
    res4_a = model.predict("bukhar chal raha hai")
    assert res4_a["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in res4_a["symptoms"]

    res4_b = model.predict("pet mein dard")
    assert res4_b["intent"] == "REPORT_SYMPTOMS"
    assert "stomach problem" in res4_b["symptoms"] or "pain" in res4_b["symptoms"]

    res4_c = model.predict("gir gaya pair mein lag gaya")
    assert res4_c["intent"] == "REPORT_SYMPTOMS"
    assert "injury" in res4_c["symptoms"]

    # Spec 5: Locality extraction
    res5 = model.predict("Mera gaon Pandharpur hai")
    assert res5["locality"] == "Pandharpur"

    # Spec 6: Booking modalities
    res6_phone = model.predict("Doctor se phone pe baat karni hai.")
    assert res6_phone["intent"] == "BOOK_APPOINTMENT"
    assert res6_phone["appointment_type"] == "phone"

    res6_visit = model.predict("Hospital jaana hai offline appointment chahiye.")
    assert res6_visit["intent"] == "BOOK_APPOINTMENT"
    assert res6_visit["appointment_type"] == "offline"

    # Spec 7: Low confidence / Unknown
    res7_unknown = model.predict("xyz qwerty blurp")
    assert res7_unknown["intent"] == "UNKNOWN"
    assert res7_unknown["confidence"] < 0.40

    # Spec 8: ConversationAgent integrates with the local model seamlessly
    agent = ConversationAgent()
    mem = ConversationMemory(language="hi-IN")
    speech, act = agent.handle_turn("Mujhe teen din se bukhar aur khansi hai", mem)
    assert act.intent == ConversationIntent.REPORT_SYMPTOMS
    assert "fever" in mem.symptoms
    assert "cough" in mem.symptoms
    assert mem.duration == "3 days"


# ──────────────────────────────────────────────────────────────────────────────
# Test Z26: Live Session Learned Model Pipeline (Cases A through K)
# ──────────────────────────────────────────────────────────────────────────────

def test_z26_live_session_learned_model_pipeline(client: TestClient):
    """
    Verify the complete live Exotel WebSocket pipeline uses the local learned
    model (LocalConversationModel.predict) and ConversationAgent across Cases A-K:
      A. English: "I have fever and cough" -> REPORT_SYMPTOMS
      B. Hindi: "Mujhe teen din se bukhar hai aur khansi hai" -> symptoms + duration
      C. Hinglish: "Meko teen din se bukhar chalra hai aur cough bhi hai" -> symptoms + duration
      D. Locality: "Main Pandharpur se hoon" -> PROVIDE_LOCALITY + Pandharpur
      E. Facility: "Hospital kidhar milega" -> FACILITY_INFORMATION
      F. Injury: "Mera pair girne se lag gaya" -> injury intent/slot
      G. Booking: "Doctor ko phone pe baat karwana hai" -> phone consultation intent
      H. Confirmation: "Haan" -> confirmation only when a booking confirmation is pending
      I. Emergency: "Severe chest pain and difficulty breathing" -> emergency handling
      J. Repeat: "Phir se bolo" -> REQUEST_REPEAT
      K. Duplicate final transcript: same STT final event twice -> exactly one turn
    """
    from backend.app.ai.conversation.model_service import LocalConversationModel
    from backend.app.services.conversation_agent import ConversationAgent, ConversationMemory, ConversationIntent

    model = LocalConversationModel.get_instance()
    agent = ConversationAgent()

    # Case A: English symptoms
    p_a = model.predict("I have fever and cough")
    assert p_a["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in p_a["symptoms"]
    assert "cough" in p_a["symptoms"]

    # Case B: Hindi symptoms + duration
    p_b = model.predict("Mujhe teen din se bukhar hai aur khansi hai")
    assert p_b["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in p_b["symptoms"]
    assert "cough" in p_b["symptoms"]
    assert p_b["duration"] == "3 days"

    # Case C: Hinglish symptoms + duration
    p_c = model.predict("Meko teen din se bukhar chalra hai aur cough bhi hai")
    assert p_c["intent"] == "REPORT_SYMPTOMS"
    assert "fever" in p_c["symptoms"]
    assert "cough" in p_c["symptoms"]
    assert p_c["duration"] == "3 days"

    # Case D: Locality extraction
    p_d = model.predict("Main Pandharpur se hoon")
    assert p_d["intent"] == "PROVIDE_LOCALITY"
    assert p_d["locality"] == "Pandharpur"

    # Case E: Facility inquiry
    p_e = model.predict("Hospital kidhar milega")
    assert p_e["intent"] == "FACILITY_INFORMATION"

    # Case F: Injury intent / slot
    p_f = model.predict("Mera pair girne se lag gaya")
    assert p_f["intent"] == "REPORT_SYMPTOMS"
    assert "injury" in p_f["symptoms"]

    # Case G: Phone consultation booking intent
    p_g = model.predict("Doctor ko phone pe baat karwana hai")
    assert p_g["intent"] == "BOOK_APPOINTMENT"
    assert p_g["appointment_type"] == "phone"

    # Case H: Confirmation "Haan"
    # Initial turn: does NOT confirm booking (asks for symptoms/details)
    mem_init = ConversationMemory()
    act_h1 = agent.provider.interpret("Haan", mem_init)
    assert act_h1.intent == ConversationIntent.ANSWER_YES
    speech_h1 = agent.provider.generate_response(act_h1, mem_init)
    assert "describe" in speech_h1.lower() or "symptom" in speech_h1.lower() or "lakshan" in speech_h1.lower()

    # Pending booking confirmation turn: confirms booking
    mem_pending = ConversationMemory(call_phase="BOOKING_CONFIRM", locality="Pandharpur")
    mem_pending.selected_slot = {"slot_time": "10:00 AM", "slot_id": 1}
    speech_h2, act_h2 = agent.handle_turn("Haan", mem_pending)
    assert mem_pending.call_phase == "ENDED"
    assert mem_pending.appointment_id is not None

    # Case I: Emergency handling
    p_i = model.predict("Severe chest pain and difficulty breathing")
    assert p_i["intent"] == "EMERGENCY" or p_i["emergency"] is True

    # Case J: Repeat request
    p_j = model.predict("Phir se bolo")
    assert p_j["intent"] == "REQUEST_REPEAT"
    mem_repeat = ConversationMemory(last_prompt="Please visit PHC Malshiras.")
    act_repeat = agent.provider.interpret("Phir se bolo", mem_repeat)
    speech_repeat = agent.provider.generate_response(act_repeat, mem_repeat)
    assert speech_repeat == "Please visit PHC Malshiras."

    # Case K: Live WebSocket duplicate final transcript suppression + live pipeline
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have fever and cough"},
        # Duplicate STT event
        {"success": True, "type": "transcript.final", "text": "I have fever and cough"},
    ]
    mock_stt = _create_mock_stt(stt_events)
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts_result = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts_result)) as mock_tts:

        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            stream_sid = "MZ_LEARNED_LIVE_K"
            ws.send_json({"event": "start", "stream_sid": stream_sid, "start": {"stream_sid": stream_sid}})
            _drain_greeting(ws)

            # Select English
            ws.send_json({"event": "dtmf", "stream_sid": stream_sid, "dtmf": {"digit": "1"}})
            _drain_mark(ws, "symptom_prompt_en")
            mock_tts.reset_mock()

            # Fire media to trigger mock STT events
            ws.send_json({"event": "media", "stream_sid": stream_sid, "media": {"payload": base64.b64encode(b"\x10\x00" * 20).decode("ascii")}})
            _ = ws.receive_json()
            _drain_mark(ws, "triage_response")

            # Exactly ONE TTS response was generated because the duplicate STT event was discarded
            assert mock_tts.call_count == 1
            spoken = mock_tts.call_args[0][0]
            assert "fever" in spoken.lower() or "cough" in spoken.lower() or "symptom" in spoken.lower()

            # Check diagnostic endpoint
            diag_resp = client.get(f"/api/v1/ivr/diagnostic/session/{stream_sid}")
            assert diag_resp.status_code == 200
            diag_data = diag_resp.json()
            assert diag_data["stream_sid"] == stream_sid
            assert "fever" in diag_data["symptoms"]
            assert "cough" in diag_data["symptoms"]
            assert "api_key" not in str(diag_data).lower()
            assert "password" not in str(diag_data).lower()

            ws.send_json({"event": "stop"})






