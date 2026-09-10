"""
tests/test_ivr_voice_triage.py
==============================
Automated tests verifying the integration between Sarvam STT final transcripts
and the existing AI triage engine (run_triage).

Covers:
  - TEST A: FINAL TRANSCRIPT ("I have fever and cough") calls run_triage() once,
            returns type="triage.result", and includes original transcript.
  - TEST B: PARTIAL TRANSCRIPT ("I have fev") returns transcript.partial and NEVER
            calls run_triage().
  - TEST C: EMPTY FINAL TRANSCRIPT ("   ") skips run_triage(), does not crash,
            and keeps the WebSocket active.
  - TEST D: EMERGENCY utterance ("severe chest pain and trouble breathing")
            evaluates to emergency=True via existing triage engine.
  - TEST E: MALFORMED STT MESSAGE does not crash the WebSocket and skips triage.
  - TEST F: Exception in run_triage() returns safe provider-neutral error
            without crashing or leaking internals.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from ai.triage.schemas import TriageResult


def _create_mock_stt_service(transcript_events: list[Dict[str, Any]]) -> MagicMock:
    """Helper to mock SarvamSTTService emitting a sequence of STT events upon listening."""
    mock_service = MagicMock()
    mock_service.api_key = "mock_api_key_valid"
    mock_service.connect = AsyncMock(return_value=True)
    mock_service.send_audio = AsyncMock(return_value=True)
    mock_service.close = AsyncMock()

    async def fake_start_listening(on_event):
        for ev in transcript_events:
            await on_event(ev)

    mock_service.start_listening = AsyncMock(side_effect=fake_start_listening)
    return mock_service


def test_a_final_transcript_calls_run_triage_once(client: TestClient):
    """
    TEST A — FINAL TRANSCRIPT:
    Input: "I have fever and cough"
    Mock run_triage().
    Verify:
      - run_triage() is called exactly once.
      - triage.result is returned with transcript included.
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have fever and cough"},
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    mock_triage_result = TriageResult(
        urgency="needs_attention",
        recommended_care="Primary Health Centre (PHC)",
        reason="Your reported symptoms should be assessed by a healthcare professional.",
        emergency=False,
    )

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage", return_value=mock_triage_result) as mock_run_triage:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01\x02\x03")

            # 1. Final transcript forwarded to client
            final_frame = ws.receive_json()
            assert final_frame["success"] is True
            assert final_frame["type"] == "transcript.final"
            assert final_frame["text"] == "I have fever and cough"

            # 2. Automated triage.result returned
            triage_frame = ws.receive_json()
            assert triage_frame["success"] is True
            assert triage_frame["type"] == "triage.result"
            assert triage_frame["transcript"] == "I have fever and cough"
            assert triage_frame["urgency"] == "needs_attention"
            assert triage_frame["recommended_care"] == "Primary Health Centre (PHC)"
            assert triage_frame["emergency"] is False

            # Verify run_triage was called exactly once
            assert mock_run_triage.call_count == 1
            call_kwargs = mock_run_triage.call_args[1]
            assert call_kwargs["description"] == "I have fever and cough"
            assert "fever" in call_kwargs["symptoms"]


def test_b_partial_transcript_never_calls_run_triage(client: TestClient):
    """
    TEST B — PARTIAL TRANSCRIPT:
    Input: "I have fev"
    Verify:
      - transcript.partial is returned.
      - run_triage() is NOT called.
    """
    stt_events = [
        {"success": True, "type": "transcript.partial", "text": "I have fev"},
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_run_triage:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01\x02")

            partial_frame = ws.receive_json()
            assert partial_frame["success"] is True
            assert partial_frame["type"] == "transcript.partial"
            assert partial_frame["text"] == "I have fev"

            # Verify run_triage was NEVER called for interim partial speech
            assert mock_run_triage.call_count == 0


def test_c_empty_final_transcript_handled_safely(client: TestClient):
    """
    TEST C — EMPTY FINAL TRANSCRIPT:
    Input: "   "
    Verify:
      - run_triage() is NOT called.
      - no crash occurs.
      - WebSocket remains usable for subsequent messages.
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "   "},
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_run_triage:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            # Final frame for whitespace is passed, but triage is skipped
            final_frame = ws.receive_json()
            assert final_frame["type"] == "transcript.final"

            # Verify run_triage was not called
            assert mock_run_triage.call_count == 0

            # WebSocket remains usable for next request
            ws.send_json({"type": "test", "text": "keep alive"})
            ack = ws.receive_json()
            assert ack["success"] is True
            assert ack["type"] == "ack"


def test_d_emergency_evaluated_by_existing_triage_engine(client: TestClient):
    """
    TEST D — EMERGENCY:
    Input: "I have severe chest pain and trouble breathing"
    Uses the REAL existing run_triage() engine (unmocked triage logic).
    Verify:
      - triage.result is returned.
      - emergency is True according to the existing triage rules.
    """
    stt_events = [
        {
            "success": True,
            "type": "transcript.final",
            "text": "I have severe chest pain and trouble breathing",
        },
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt):
        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01\x02\x03")

            final_frame = ws.receive_json()
            assert final_frame["type"] == "transcript.final"

            triage_frame = ws.receive_json()
            assert triage_frame["success"] is True
            assert triage_frame["type"] == "triage.result"
            assert triage_frame["emergency"] is True
            assert triage_frame["urgency"] == "emergency"
            assert "Emergency medical help" in triage_frame["recommended_care"]
            assert "emergency warning sign" in triage_frame["reason"]


def test_e_malformed_stt_message_does_not_crash(client: TestClient):
    """
    TEST E — MALFORMED STT MESSAGE:
    Send malformed/invalid STT data structures from provider.
    Verify:
      - WebSocket does not crash.
      - No triage call occurs.
    """
    # Non-dict and missing-field payloads
    stt_events = [
        "raw_string_not_dict",  # type: ignore
        {"type": "unknown_event"},
        {"type": "transcript.final"},  # Missing text
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage") as mock_run_triage:

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            # Only the valid dict {"type": "unknown_event"} and {"type": "transcript.final"} are sent
            f1 = ws.receive_json()
            assert f1["type"] == "unknown_event"

            f2 = ws.receive_json()
            assert f2["type"] == "transcript.final"

            # No triage call triggered because text is missing
            assert mock_run_triage.call_count == 0

            # WebSocket continues functioning normally
            ws.send_json({"type": "test", "text": "still alive"})
            ack = ws.receive_json()
            assert ack["success"] is True
            assert ack["type"] == "ack"


def test_f_triage_exception_returns_safe_error_without_crash(client: TestClient):
    """
    TEST F — RUN_TRIAGE EXCEPTION:
    If run_triage() raises an unexpected exception:
    Verify:
      - Safe provider-neutral error message is returned.
      - Internal exception details/stack traces are not leaked.
      - WebSocket remains connected and usable.
    """
    stt_events = [
        {"success": True, "type": "transcript.final", "text": "I have fever"},
    ]
    mock_stt = _create_mock_stt_service(stt_events)

    with patch("backend.app.api.v1.routes.ivr.SarvamSTTService", return_value=mock_stt), \
         patch("backend.app.api.v1.routes.ivr.run_triage", side_effect=RuntimeError("InternalDBTimeout secret_key_abc")):

        with client.websocket_connect("/api/v1/ivr/stream") as ws:
            ws.send_bytes(b"\x00\x01")

            # Final transcript
            final_frame = ws.receive_json()
            assert final_frame["type"] == "transcript.final"

            # Safe error frame
            err_frame = ws.receive_json()
            assert err_frame["success"] is False
            assert err_frame["type"] == "error"
            assert err_frame["error"] == "triage_evaluation_failed"
            # Ensure no secret_key or internal detail leaked
            assert "secret_key" not in err_frame["message"]
            assert "InternalDBTimeout" not in err_frame["message"]

            # Connection remains open
            ws.send_json({"type": "test", "text": "healthy"})
            ack = ws.receive_json()
            assert ack["success"] is True
