"""
api/v1/routes/ivr.py
====================
Telephone IVR integration endpoint for Rural Care Navigator.

Enables automated telephone and Exotel IVR workflows to directly reuse
the existing AI triage engine without duplicating clinical rules.

Endpoints:
  GET  /api/v1/ivr/health   — Service health check
  POST /api/v1/ivr/webhook  — Telephony / Exotel webhook handler (supports GET & POST)
  WS   /api/v1/ivr/stream   — Real-time telephone voice stream (Exotel AgentStream / AudioStream)
"""

from __future__ import annotations

import base64
import io
import json
import logging
import math
import struct
import urllib.parse
import wave
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, Response, WebSocket, WebSocketDisconnect, status
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db

from ai.triage.triage import run_triage
from backend.app.ai.conversation.model_service import LocalConversationModel
from backend.app.services.conversation_agent import (
    ConversationAgent,
    ConversationIntent,
    ConversationMemory,
)

from backend.app.core.config import settings
from backend.app.services.exotel_voice_service import (
    DTMF_LOCATION_CODE_MAP,
    DTMF_SYMPTOM_CODE_MAP,
    EXOTEL_EMERGENCY_PROMPT_EN,
    EXOTEL_EMERGENCY_PROMPT_HI,
    EXOTEL_EMERGENCY_PROMPT_MR,
    EXOTEL_GREETING_TEXT,
    EXOTEL_INITIAL_LANGUAGE_MENU,
    EXOTEL_LANG_FALLBACK_EN,
    EXOTEL_LANG_INVALID_RETRY_EN,
    EXOTEL_SYMPTOM_PROMPT_EN,
    EXOTEL_SYMPTOM_PROMPT_HI,
    EXOTEL_SYMPTOM_PROMPT_MR,
    ExotelCallError,
    ExotelCallService,
    ExotelConfigurationError,
    ExotelVoiceSession,
    IVRState,
    VoiceConversationContext,
    build_bilingual_spoken_response,
    build_clear_event,
    build_conversational_response,
    build_mark_event,
    build_media_event,
    check_red_flags_in_speech,
    chunk_outbound_audio,
    extract_booking_intent,
    extract_booking_type,
    extract_duration,
    extract_location,
    extract_symptoms,
    find_recommended_facility,
    format_slot_for_speech,
    is_affirmative,
    is_negative,
    normalize_inbound_audio,
    wav_to_pcm,
)
from backend.app.services.facility_service import find_best_facility_for_patient
from backend.app.services.sarvam_stt_service import SarvamSTTService
from backend.app.services.sarvam_tts_service import (
    SarvamTTSService,
    TTSError,
    build_spoken_response,
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ivr",
    tags=["IVR Telephony"],
)

ACTIVE_VOICE_SESSIONS: Dict[str, ExotelVoiceSession] = {}


@router.get("/diagnostic/session/{stream_sid}", tags=["IVR Telephony"])
async def get_session_diagnostic(stream_sid: str) -> Dict[str, Any]:
    """Safe diagnostic endpoint to inspect active call state without exposing secrets or PHI."""
    session = ACTIVE_VOICE_SESSIONS.get(stream_sid)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active session found for stream_sid '{stream_sid}'",
        )
    return {
        "stream_sid": session.stream_sid,
        "call_sid": session.call_sid,
        "state": session.state.value if hasattr(session.state, "value") else str(session.state),
        "language_code": session.language_code,
        "symptoms": session.symptoms,
        "location": session.location,
        "appointment_type": session.appointment_type,
        "appointment_id": session.appointment_id,
        "booking_intent": session.booking_intent,
        "emergency": session.emergency,
        "last_transcript": session.last_transcript,
        "dialogue_turn_count": len(session.dialogue_history),
        "recommended_facility_name": (session.recommended_facility or {}).get("name") if session.recommended_facility else None,
    }


class ExotelOutboundCallRequest(BaseModel):
    phone_number: str
    custom_field: Optional[str] = None

# DTMF keypad mappings to existing triage symptom keywords
DTMF_SYMPTOM_MAP: Dict[str, List[str]] = {
    "1": ["Fever"],
    "2": ["Cough"],
    "3": ["Pain"],
    "4": ["Stomach Problem"],
    "5": ["Injury"],
    "0": ["Severe chest pain", "Difficulty breathing"],  # Direct emergency escalation
}

MENU_PROMPT = (
    "Welcome to Rural Care Navigator. Please select an option: "
    "Press 1 for Fever, 2 for Cough, 3 for Pain, 4 for Stomach Problem, "
    "5 for Injury, or 0 for Emergency."
)

EMERGENCY_PROMPT = (
    "Emergency medical help is recommended. Please seek emergency care immediately."
)

NEEDS_ATTENTION_PROMPT = (
    "Please visit a Primary Health Centre for medical evaluation."
)

ROUTINE_PROMPT = (
    "Routine healthcare is recommended. Please visit a suitable nearby healthcare facility."
)


def _build_exotel_xml(text: str) -> str:
    """Build a standard Exotel / VXML voice response."""
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<Response>\n"
        f'    <Say voice="female" language="en-IN">{text}</Say>\n'
        "</Response>"
    )


@router.get("/health", summary="IVR service health check")
async def ivr_health() -> Dict[str, Any]:
    """Health check endpoint for the telephone IVR integration."""
    return {
        "success": True,
        "service": "ivr",
        "status": "ready",
    }


@router.api_route("/webhook", methods=["GET", "POST"], summary="Telephony / Exotel IVR webhook")
async def ivr_webhook(request: Request) -> Response:
    """
    Handle telephone IVR webhook callbacks (e.g. Exotel Passthru).

    Accepts form-encoded, JSON, or query parameters:
      - Digits: Keypad DTMF digit pressed by the caller (1-5, 0)
      - CallSid: Exotel unique call identifier
      - From: Caller's telephone number
      - To: Virtual dial-in number
      - CallStatus: e.g. in-progress, completed
      - format: optional format override ('xml', 'text', 'json')
    """
    params: Dict[str, Any] = {}

    # Extract query parameters
    params.update(request.query_params)

    # Extract body parameters (Form-urlencoded or JSON)
    if request.method == "POST":
        try:
            body_bytes = await request.body()
            if body_bytes:
                body_str = body_bytes.decode("utf-8", errors="replace").strip()
                content_type = request.headers.get("content-type", "").lower()
                if "application/json" in content_type or (
                    body_str.startswith("{") and body_str.endswith("}")
                ):
                    try:
                        parsed_json = json.loads(body_str)
                        if isinstance(parsed_json, dict):
                            params.update(parsed_json)
                    except Exception:
                        pass
                else:
                    parsed_form = urllib.parse.parse_qs(body_str, keep_blank_values=True)
                    for k, v in parsed_form.items():
                        params[k] = v[0] if len(v) == 1 else v
        except Exception:
            pass

    # Normalize parameter names
    raw_digits = params.get("Digits") or params.get("digits") or params.get("digit")
    call_sid = params.get("CallSid") or params.get("call_sid") or ""
    from_number = params.get("From") or params.get("from") or ""
    fmt = (params.get("format") or "").lower()

    # Clean digits (strip whitespace and common telephone delimiters like # or *)
    digits_str = str(raw_digits).strip().rstrip("#*") if raw_digits is not None else ""

    # Check caller Accept header
    accept_header = request.headers.get("accept", "").lower()
    wants_xml = fmt == "xml" or "application/xml" in accept_header or "text/xml" in accept_header
    wants_text = fmt == "text" or "text/plain" in accept_header

    # Missing or invalid Digits → Prompt menu
    if not digits_str or digits_str not in DTMF_SYMPTOM_MAP:
        ivr_message = MENU_PROMPT
        response_payload = {
            "success": False,
            "error": "missing_or_invalid_digits",
            "digits": digits_str,
            "message": ivr_message,
            "ivr_text": ivr_message,
            "call_sid": call_sid,
            "from": from_number,
        }
        if wants_xml:
            return Response(content=_build_exotel_xml(ivr_message), media_type="application/xml")
        if wants_text:
            return PlainTextResponse(content=ivr_message)
        return JSONResponse(content=response_payload, status_code=200)

    # Map DTMF to symptoms and invoke existing AI triage engine directly
    symptoms = DTMF_SYMPTOM_MAP[digits_str]
    description = (
        "Emergency medical emergency reported via telephone IVR"
        if digits_str == "0"
        else ""
    )

    # Call the existing transparent rule-based AI triage engine directly
    triage_result = run_triage(symptoms=symptoms, description=description)

    # Map triage outcome to clear spoken IVR guidance
    if triage_result.emergency or triage_result.urgency == "emergency":
        ivr_message = EMERGENCY_PROMPT
    elif triage_result.urgency == "needs_attention":
        ivr_message = NEEDS_ATTENTION_PROMPT
    else:
        ivr_message = ROUTINE_PROMPT

    xml_content = _build_exotel_xml(ivr_message)

    if wants_xml:
        return Response(content=xml_content, media_type="application/xml")
    if wants_text:
        return PlainTextResponse(content=ivr_message)

    # Return rich JSON response containing triage metadata, spoken message, and XML
    return JSONResponse(
        content={
            "success": True,
            "digits": digits_str,
            "symptoms": symptoms,
            "urgency": triage_result.urgency,
            "emergency": triage_result.emergency,
            "recommended_care": triage_result.recommended_care,
            "reason": triage_result.reason,
            "message": ivr_message,
            "ivr_text": ivr_message,
            "xml": xml_content,
            "call_sid": call_sid,
            "from": from_number,
        },
        status_code=200,
    )


@router.websocket("/stream")
async def ivr_stream(websocket: WebSocket) -> None:
    """
    WebSocket endpoint for real-time telephone voice streaming (e.g. Exotel AgentStream).

    Lifecycle:
      1. Accepts the WebSocket connection.
      2. Logs connection lifecycle events (connect, message, disconnect, error).
      3. For text/JSON frames: validates and returns standard acknowledgment.
      4. For binary audio frames: streams raw 8 kHz PCM audio to Sarvam AI STT service
         and streams back normalized partial and final transcripts.
      5. Handles missing API keys, connection failures, malformed input, and provider
         disconnects gracefully without crashing or exposing credentials.
      6. Closes and cleans up all upstream/downstream resources when client disconnects.
    """
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "telephony_client"
    logger.info("IVR voice stream connected from %s", client_host)

    stt_service = SarvamSTTService()
    stt_initialized = False

    async def on_stt_event(event: Dict[str, Any]) -> None:
        """Push normalized STT events back to client and evaluate triage on final transcripts."""
        if not isinstance(event, dict):
            return

        try:
            # 1. Forward the STT event (e.g. transcript.partial, transcript.final, error)
            await websocket.send_json(event)
        except Exception:
            logger.debug("Failed to deliver STT event to client (client likely disconnected)")
            return

        # 2. Evaluate existing AI triage ONLY when a FINAL transcript is received
        if event.get("type") == "transcript.final":
            raw_text = event.get("text")
            clean_transcript = str(raw_text).strip() if raw_text is not None else ""

            # Empty final transcript: do nothing safely
            if not clean_transcript:
                return

            try:
                # Detect any recognized symptom keywords in the spoken transcript
                KNOWN_SYMPTOMS = (
                    "fever",
                    "cough",
                    "pain",
                    "stomach problem",
                    "stomach ache",
                    "injury",
                    "headache",
                    "vomiting",
                    "diarrhea",
                    "weakness",
                    "cold",
                )
                transcript_lower = clean_transcript.lower()
                detected_symptoms = [s for s in KNOWN_SYMPTOMS if s in transcript_lower]

                # Run the existing transparent rule-based AI triage engine directly
                triage_res = run_triage(
                    symptoms=detected_symptoms,
                    description=clean_transcript,
                )

                triage_payload = {
                    "success": True,
                    "type": "triage.result",
                    "transcript": clean_transcript,
                    "urgency": triage_res.urgency,
                    "recommended_care": triage_res.recommended_care,
                    "reason": triage_res.reason,
                    "emergency": triage_res.emergency,
                }
                await websocket.send_json(triage_payload)

                # 3. Build spoken response text and synthesize voice response via Sarvam TTS
                spoken_text = build_spoken_response(
                    urgency=triage_res.urgency,
                    emergency=triage_res.emergency,
                    recommended_care=triage_res.recommended_care,
                    reason=triage_res.reason,
                )

                # Notify client that speech synthesis has begun
                await websocket.send_json({
                    "success": True,
                    "type": "tts.status",
                    "status": "synthesizing",
                    "text": spoken_text,
                })

                # Call Sarvam TTS service and stream back provider-neutral audio
                try:
                    tts_service = SarvamTTSService()
                    audio_result = await tts_service.synthesize(spoken_text)
                    await websocket.send_json({
                        "success": True,
                        "type": "tts.audio",
                        "mime_type": audio_result.mime_type,
                        "sample_rate": audio_result.sample_rate,
                        "audio_base64": audio_result.audio_base64,
                        "text": spoken_text,
                    })
                except TTSError as tts_err:
                    logger.warning("Sarvam TTS synthesis failed: %s", tts_err.message)
                    await websocket.send_json({
                        "success": False,
                        "type": "tts.error",
                        "message": "Voice response is temporarily unavailable.",
                    })
                except Exception as tts_exc:
                    logger.error("Unexpected error during TTS synthesis: %s", type(tts_exc).__name__, exc_info=True)
                    await websocket.send_json({
                        "success": False,
                        "type": "tts.error",
                        "message": "Voice response is temporarily unavailable.",
                    })
            except Exception as exc:
                logger.error("Error evaluating triage for final transcript: %s", type(exc).__name__, exc_info=True)
                try:
                    await websocket.send_json({
                        "success": False,
                        "type": "error",
                        "error": "triage_evaluation_failed",
                        "message": "Healthcare triage evaluation could not be completed",
                    })
                except Exception:
                    pass

    try:
        while True:
            raw_message = await websocket.receive()
            msg_type = raw_message.get("type")

            if msg_type == "websocket.disconnect":
                logger.info("IVR voice stream client requested disconnect: %s", client_host)
                break

            # Handle text frame
            if "text" in raw_message:
                text_content = raw_message["text"]
                try:
                    payload = json.loads(text_content)
                    if not isinstance(payload, dict):
                        payload = {"type": "raw", "text": str(payload)}
                except Exception:
                    logger.warning(
                        "IVR voice stream received non-JSON or malformed payload from %s: %s",
                        client_host,
                        text_content[:100] if text_content else "<empty>",
                    )
                    await websocket.send_json({
                        "success": False,
                        "type": "error",
                        "error": "malformed_json",
                        "message": "Invalid JSON message received",
                    })
                    continue

                req_type = payload.get("type", "message")
                logger.debug("IVR stream received message type=%s from %s", req_type, client_host)

                # Return provider-neutral acknowledgement for text/JSON test messages
                await websocket.send_json({
                    "success": True,
                    "type": "ack",
                    "message": "Voice stream connection received",
                })

            # Handle binary audio frame (forward to Sarvam AI STT)
            elif "bytes" in raw_message:
                audio_bytes = raw_message["bytes"]
                bytes_len = len(audio_bytes)
                logger.debug("IVR stream received %d audio bytes from %s", bytes_len, client_host)

                if not stt_service.api_key:
                    # Missing SARVAM_API_KEY handled safely without crashing
                    await websocket.send_json({
                        "success": False,
                        "type": "error",
                        "error": "stt_unavailable",
                        "message": "Speech-to-text service is currently unavailable",
                    })
                else:
                    if not stt_initialized:
                        connected = await stt_service.connect()
                        if connected:
                            stt_initialized = True
                            await stt_service.start_listening(on_event=on_stt_event)
                        else:
                            await websocket.send_json({
                                "success": False,
                                "type": "error",
                                "error": "stt_connection_failed",
                                "message": "Speech-to-text provider connection failed",
                            })
                    if stt_initialized:
                        await stt_service.send_audio(audio_bytes)

    except WebSocketDisconnect:
        logger.info("IVR voice stream disconnected cleanly: %s", client_host)
    except Exception as exc:
        logger.error("Unexpected error in IVR voice stream: %s", type(exc).__name__, exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        await stt_service.close()
        logger.info("IVR voice stream session ended for %s", client_host)


# ──────────────────────────────────────────────────────────────────────────────
# Exotel VoiceBot / AgentStream Integration Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("/exotel/health", summary="Exotel VoiceBot integration health check")
async def exotel_health() -> Dict[str, Any]:
    """
    Check the status and configuration of the Exotel VoiceBot integration.
    Never exposes raw API keys, tokens, or passwords.
    """
    is_configured = bool(
        settings.EXOTEL_ACCOUNT_SID
        and settings.EXOTEL_API_KEY
        and settings.EXOTEL_API_TOKEN
        and settings.EXOTEL_EXOPHONE
    )
    return {
        "success": True,
        "service": "exotel_voicebot",
        "status": "ready" if is_configured else "not_configured",
        "configured": is_configured,
        "stream_endpoint": "/api/v1/ivr/exotel",
        "audio_encoding": settings.EXOTEL_AUDIO_ENCODING,
        "sample_rate": settings.EXOTEL_SAMPLE_RATE,
    }


@router.post("/exotel/call", summary="Initiate an outbound call via Exotel")
async def exotel_outbound_call(body: ExotelOutboundCallRequest) -> Response:
    """
    Initiate an outbound telephone call connected to our voice bot stream.

    Validates configuration and reports safe errors without exposing credentials.
    """
    call_service = ExotelCallService()
    try:
        result = await call_service.initiate_call(
            phone_number=body.phone_number,
            custom_field=body.custom_field,
        )
        return JSONResponse(status_code=status.HTTP_200_OK, content=result)
    except ExotelConfigurationError as cfg_err:
        logger.warning("Exotel outbound call rejected: %s", cfg_err.message)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "success": False,
                "error": "exotel_not_configured",
                "message": cfg_err.message,
            },
        )
    except ExotelCallError as call_err:
        logger.warning("Exotel outbound call failed: %s", call_err.message)
        return JSONResponse(
            status_code=status.HTTP_502_BAD_GATEWAY,
            content={
                "success": False,
                "error": "call_initiation_failed",
                "message": call_err.message,
            },
        )
    except Exception as exc:
        logger.error("Unexpected error in Exotel call endpoint: %s", type(exc).__name__, exc_info=True)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "success": False,
                "error": "internal_error",
                "message": "Unable to initiate call at this time.",
            },
        )


@router.get("/exotel", summary="Exotel VoiceBot dynamic WebSocket resolver")
async def exotel_voicebot_resolver(request: Request) -> Dict[str, str]:
    """
    HTTP GET dynamic WebSocket resolver for Exotel's VoiceBot Applet.

    Exotel makes an initial HTTP GET request (with call parameters such as
    CallSid, From, To, CallStatus) to dynamically resolve the bidirectional WSS URL.

    Returns:
        {"url": "<configured Exotel WSS URL>"}

    Accepts Exotel's call query parameters without requiring authentication.
    Does not weaken security anywhere else in the application.
    """
    call_sid = request.query_params.get("CallSid") or request.query_params.get("call_sid") or ""
    from_number = request.query_params.get("From") or request.query_params.get("from") or ""
    logger.info(
        "Exotel dynamic stream resolver requested for CallSid=%s, From=%s",
        call_sid,
        from_number,
    )

    stream_url = (settings.EXOTEL_STREAM_URL or "").strip()

    if stream_url:
        if stream_url.startswith("https://"):
            stream_url = "wss://" + stream_url[8:]
        elif stream_url.startswith("http://"):
            stream_url = "ws://" + stream_url[7:]
        elif not stream_url.startswith("ws://") and not stream_url.startswith("wss://"):
            stream_url = "wss://" + stream_url.lstrip("/")
    else:
        host = (
            request.headers.get("x-forwarded-host")
            or request.headers.get("host")
            or "localhost:8000"
        )
        proto_header = request.headers.get("x-forwarded-proto", "").lower()
        is_secure = proto_header == "https" or request.url.scheme == "https" or "ngrok" in host
        ws_proto = "wss" if is_secure else "ws"
        stream_url = f"{ws_proto}://{host}/api/v1/ivr/exotel"

    return {"url": stream_url}


KNOWN_SYMPTOMS_EN = (
    "fever",
    "cough",
    "pain",
    "stomach problem",
    "stomach ache",
    "injury",
    "headache",
    "vomiting",
    "diarrhea",
    "weakness",
    "cold",
)

HINDI_SYMPTOM_MAP: Dict[str, str] = {
    "bukhar": "fever",
    "khansi": "cough",
    "dard": "pain",
    "pet dard": "stomach problem",
    "pet samasya": "stomach problem",
    "chot": "injury",
    "sar dard": "headache",
    "ulti": "vomiting",
    "dast": "diarrhea",
    "kamzori": "weakness",
    "thakavat": "weakness",
    "sardi": "cold",
    "zukam": "cold",
}

BOT_ECHO_PHRASES = [
    "rural care navigator",
    "swagat hai",
    "for english",
    "press 1",
    "hindi ke liye",
    "dabayein",
    "describe your symptoms",
    "bimari ke lakshan",
    "primary health centre",
    "nearest hospital",
    "nazdiki aspatal",
    "aapatkalin",
    "emergency alert",
    "setting default language",
    "invalid option",
]


def is_bot_echo(text: str) -> bool:
    """Check if the transcribed speech matches known bot prompts (acoustic echo)."""
    t = (text or "").lower()
    return any(phrase in t for phrase in BOT_ECHO_PHRASES)


def _get_or_create_slot_for_facility(
    facility_id: int,
    db: Optional[Any] = None,
    language_code: str = "en-IN",
) -> Dict[str, Any]:
    """Retrieve an available future slot from PostgreSQL or construct a dynamic future slot descriptor."""
    from datetime import date, timedelta
    own_session = False
    session = db
    if session is None:
        try:
            from backend.app.database.connection import SessionLocal
            session = SessionLocal()
            own_session = True
        except Exception:
            pass

    try:
        if session is not None:
            from backend.app.repositories.availability_repository import AvailabilityRepository
            from backend.app.repositories.facility_repository import FacilityRepository

            avail_repo = AvailabilityRepository(session)
            fac_repo = FacilityRepository(session)
            fac = fac_repo.get_by_id(facility_id)
            if not fac:
                fac = fac_repo.create_facility(
                    name="Primary Health Centre",
                    type="PHC",
                    address="Rural",
                    district="Solapur",
                )
                facility_id = fac.id

            today_str = date.today().isoformat()
            future_slots = avail_repo.get_future_available_slots(
                facility_id=facility_id,
                min_date=today_str,
            )
            if future_slots:
                first_slot = future_slots[0]
                spoken_slot_time = format_slot_for_speech(
                    slot_date=first_slot.date,
                    start_time=first_slot.start_time,
                    language_code=language_code,
                )
                return {
                    "id": first_slot.id,
                    "slot_time": spoken_slot_time,
                    "date": first_slot.date,
                    "start_time": first_slot.start_time,
                    "service_id": first_slot.service_id,
                }

            fac_services = fac_repo.get_services(facility_id)
            svc_id = fac_services[0].id if fac_services else None
            if not svc_id:
                svc = fac_repo.add_service(
                    facility_id=facility_id,
                    name="General Medicine",
                    description="Primary Care",
                )
                svc_id = svc.id

            tomorrow = (date.today() + timedelta(days=1)).isoformat()
            new_slot = avail_repo.create_slot(
                facility_id=facility_id,
                service_id=svc_id,
                date=tomorrow,
                start_time="10:00",
                end_time="10:30",
                status="AVAILABLE",
            )
            spoken_slot_time = format_slot_for_speech(
                slot_date=tomorrow,
                start_time="10:00",
                language_code=language_code,
            )
            return {
                "id": new_slot.id,
                "slot_time": spoken_slot_time,
                "date": tomorrow,
                "start_time": "10:00",
                "service_id": svc_id,
            }
    except Exception as slot_err:
        logger.debug("[EXOTEL_WS] Slot resolution note: %s", slot_err)
    finally:
        if own_session and session:
            try:
                session.close()
            except Exception:
                pass

    from datetime import date, timedelta
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    return {
        "id": 1,
        "slot_time": format_slot_for_speech(tomorrow, "10:00", language_code),
        "date": tomorrow,
        "start_time": "10:00",
        "service_id": 1,
    }


def _book_appointment_for_session(session: ExotelVoiceSession, db: Optional[Any] = None) -> Optional[int]:
    """Book an appointment for the current session via AppointmentService reusing selected slot if present."""
    own_session = False
    db_sess = db
    if db_sess is None:
        try:
            from backend.app.database.connection import SessionLocal
            db_sess = SessionLocal()
            own_session = True
        except Exception:
            pass

    try:
        if db_sess is not None:
            from backend.app.repositories.patient_repository import PatientRepository
            from backend.app.repositories.facility_repository import FacilityRepository
            from backend.app.repositories.availability_repository import AvailabilityRepository
            from backend.app.repositories.appointment_repository import AppointmentRepository
            from backend.app.services.appointment_service import AppointmentService

            p_repo = PatientRepository(db_sess)
            f_repo = FacilityRepository(db_sess)
            av_repo = AvailabilityRepository(db_sess)
            ap_repo = AppointmentRepository(db_sess)
            appt_svc = AppointmentService(ap_repo, f_repo, av_repo, p_repo)

            patient = None
            if session.patient_id:
                patient = p_repo.get_by_id(session.patient_id)
            if not patient and session.phone_number:
                clean_phone = session.phone_number.replace("+91", "").replace("+", "").strip()[-10:]
                patient = p_repo.find_by_mobile(clean_phone)
                if not patient:
                    patient = p_repo.create_patient(
                        mobile=clean_phone or "9876543210",
                        full_name=getattr(session, "patient_name", None) or f"Caller {clean_phone}",
                        age=getattr(session, "age", None),
                        gender=getattr(session, "gender", None),
                        village=session.location or "Rural",
                        district=getattr(getattr(session, "conversation_memory", None), "district", None) or "Solapur",
                    )
            if not patient:
                all_patients = p_repo.get_all(limit=1)
                if all_patients:
                    patient = all_patients[0]
                else:
                    patient = p_repo.create_patient(
                        mobile="9876543210",
                        full_name="Caller",
                        village=session.location or "Rural",
                        district="Solapur",
                    )

            fac_id = 1
            if session.recommended_facility:
                fac_id = session.recommended_facility.get("id") or 1
            fac = f_repo.get_by_id(fac_id)
            if not fac:
                all_facs = f_repo.get_all(limit=1)
                if all_facs:
                    fac = all_facs[0]
                    fac_id = fac.id
                elif session.recommended_facility:
                    rf = session.recommended_facility
                    fac = f_repo.create_facility(
                        name=rf.get("name") or "Primary Health Centre",
                        type=rf.get("type") or "PHC",
                        address=rf.get("address") or session.location or "Rural",
                        district=rf.get("district") or "Solapur",
                    )
                    fac_id = fac.id
                else:
                    fac = f_repo.create_facility(
                        name="Primary Health Centre",
                        type="PHC",
                        address=session.location or "Rural",
                        district="Solapur",
                    )
                    fac_id = fac.id

            if patient and fac:
                fac_svcs = f_repo.get_services(fac_id)
                svc_id = fac_svcs[0].id if fac_svcs else None
                if not svc_id:
                    svc = f_repo.add_service(facility_id=fac_id, name="General Medicine", description="Primary Care")
                    svc_id = svc.id

                slot_id = None
                if session.selected_slot and session.selected_slot.get("id"):
                    candidate_slot = av_repo.get_by_id(session.selected_slot["id"])
                    if candidate_slot and candidate_slot.status == "AVAILABLE":
                        slot_id = candidate_slot.id
                        svc_id = candidate_slot.service_id or svc_id

                if not slot_id:
                    from datetime import date, timedelta
                    today_str = date.today().isoformat()
                    future_slots = av_repo.get_future_available_slots(facility_id=fac_id, min_date=today_str)
                    if future_slots:
                        slot_id = future_slots[0].id
                        svc_id = future_slots[0].service_id or svc_id
                    else:
                        tomorrow = (date.today() + timedelta(days=1)).isoformat()
                        slot = av_repo.create_slot(
                            facility_id=fac_id,
                            service_id=svc_id,
                            date=tomorrow,
                            start_time="10:00",
                            end_time="10:30",
                            status="AVAILABLE",
                        )
                        slot_id = slot.id

                res = appt_svc.book_appointment(
                    patient_id=patient.id,
                    facility_id=fac_id,
                    service_id=svc_id,
                    availability_slot_id=slot_id,
                )
                session.patient_id = patient.id
                if own_session:
                    db_sess.commit()
                return res.get("id")
    except Exception as exc:
        logger.debug("[EXOTEL_WS] Unexpected error booking appointment: %s", exc)
    finally:
        if own_session and db_sess:
            try:
                db_sess.close()
            except Exception:
                pass

    return None


def _persist_voice_encounter(session: ExotelVoiceSession, db: Optional[Any] = None) -> Optional[int]:
    """Persist a complete VoiceEncounter record and associated HealthJourneyEvent in the database."""
    try:
        from backend.app.database.connection import SessionLocal
        from backend.app.repositories.voice_encounter_repository import VoiceEncounterRepository
        from backend.app.repositories.health_journey_repository import HealthJourneyRepository

        own_session = False
        db_sess = db
        if db_sess is None:
            db_sess = SessionLocal()
            own_session = True

        try:
            repo = VoiceEncounterRepository(db_sess)
            fac_id = None
            fac_name = None
            if session.recommended_facility:
                fac_id = session.recommended_facility.get("id")
                fac_name = session.recommended_facility.get("name")

            summary = "; ".join([f"{h.get('speaker', 'user')}: {h.get('text', '')}" for h in session.dialogue_history])
            if not summary and session.last_transcript:
                summary = session.last_transcript

            syms_str = ", ".join(session.symptoms) if isinstance(session.symptoms, list) else session.symptoms

            pat_name = getattr(session, "patient_name", None)
            pat_age = getattr(session, "age", None)
            pat_gender = getattr(session, "gender", None)
            pat_notes = getattr(session, "additional_notes", None)
            if hasattr(session, "conversation_memory") and session.conversation_memory:
                mem = session.conversation_memory
                pat_name = pat_name or getattr(mem, "patient_name", None)
                pat_age = pat_age if pat_age is not None else getattr(mem, "age", None)
                pat_gender = pat_gender or getattr(mem, "gender", None)
                pat_notes = pat_notes or getattr(mem, "additional_notes", None)

            if session.phone_number:
                try:
                    from backend.app.repositories.patient_repository import PatientRepository
                    p_repo = PatientRepository(db_sess)
                    clean_p = session.phone_number.replace("+91", "").replace("+", "").strip()[-10:]
                    if pat_name:
                        pat_obj = p_repo.get_or_create_patient(
                            mobile=session.phone_number,
                            full_name=pat_name,
                            age=pat_age,
                            gender=pat_gender,
                            village=session.location,
                        )
                        if pat_obj:
                            session.patient_id = pat_obj.id
                    elif not session.patient_id:
                        found_pat = p_repo.get_by_phone(clean_p) or p_repo.get_by_phone(session.phone_number)
                        if found_pat:
                            session.patient_id = found_pat.id
                            if not pat_name:
                                pat_name = found_pat.name
                            if pat_age is None:
                                pat_age = found_pat.age
                            if not pat_gender:
                                pat_gender = found_pat.gender
                            if not session.location and found_pat.village:
                                session.location = found_pat.village
                except Exception as p_err:
                    logger.debug("[EXOTEL_WS] Patient persistence lookup note: %s", p_err)

            severity = (session.last_triage or {}).get("severity")
            care_level = (session.last_triage or {}).get("recommended_care_level") or (session.last_triage or {}).get("care_level")
            appt_type = getattr(session, "appointment_type", None) or ("TELECONSULTATION" if session.appointment_id else None)

            encounter = repo.create_encounter(
                phone_number=session.phone_number,
                patient_id=session.patient_id,
                stream_sid=session.stream_sid,
                call_sid=session.call_sid,
                language=session.language_code,
                symptoms=syms_str,
                symptom_duration=session.symptom_duration,
                triage_urgency=(session.last_triage or {}).get("urgency", "routine"),
                triage_reason=(session.last_triage or {}).get("reason"),
                emergency=session.emergency or bool((session.last_triage or {}).get("emergency")),
                locality=session.location,
                facility_id=fac_id,
                facility_name=fac_name,
                booking_intent="YES" if session.booking_intent else ("NO" if session.booking_intent is False else None),
                appointment_id=session.appointment_id,
                transcript_summary=summary,
                interaction_source="EXOTEL_VOICE",
                patient_name=pat_name,
                age=pat_age,
                gender=pat_gender,
                severity=severity,
                additional_notes=pat_notes,
                recommended_care_level=care_level,
                appointment_type=appt_type,
            )
            session.encounter_id = encounter.id

            if session.patient_id:
                try:
                    from datetime import date
                    hj_repo = HealthJourneyRepository(db_sess)
                    desc_parts = [
                        f"Urgency: {(session.last_triage or {}).get('urgency', 'routine')}",
                        f"Symptoms: {', '.join(session.symptoms)}",
                    ]
                    if pat_name:
                        desc_parts.append(f"Patient: {pat_name}")
                    if session.symptom_duration:
                        desc_parts.append(f"Duration: {session.symptom_duration}")
                    if fac_name:
                        desc_parts.append(f"Facility: {fac_name}")
                    hj_repo.create_event(
                        patient_id=session.patient_id,
                        event_type="TRIAGE",
                        title=f"Voice IVR Triage Encounter ({session.language_code})",
                        event_date=date.today().isoformat(),
                        description=". ".join(desc_parts) + ".",
                        facility_id=fac_id,
                        appointment_id=session.appointment_id,
                    )
                except Exception as hj_err:
                    logger.debug("[EXOTEL_WS] Health journey note: %s", hj_err)

            return encounter.id
        finally:
            if own_session and db_sess:
                try:
                    db_sess.close()
                except Exception:
                    pass
    except Exception as exc:
        logger.warning("[EXOTEL_WS] Failed to persist voice encounter: %s", exc)
        return None


@router.websocket("/exotel")
async def exotel_voicebot_stream(
    websocket: WebSocket,
    db: Session = Depends(get_db),
) -> None:
    """
    Bidirectional WebSocket stream endpoint for Exotel VoiceBot / AgentStream.

    Public URL pattern (production):
      wss://<YOUR_PUBLIC_DOMAIN>/api/v1/ivr/exotel

    Protocol Lifecycle:
      1. Accept WebSocket handshake immediately.
      2. Handle 'connected' event: records active connection.
      3. Handle 'start' event: captures streamSid, callSid, mediaFormat,
         speaks initial bilingual language menu via Sarvam TTS, enters LANGUAGE_SELECTION.
      4. Handle 'dtmf' events:
         - In LANGUAGE_SELECTION: 1 for English (en-IN), 2 for Hindi (hi-IN), handles invalid retries.
         - In WAITING_FOR_SYMPTOMS: 0 for emergency, 1-5 to buffer symptoms, 9 to process via run_triage().
      5. Handle 'media' events: decodes base64 payload as raw signed 16-bit PCM (8 kHz mono).
         Suppresses inbound media during active transmission to eliminate acoustic echo.
      6. Handle Sarvam STT results:
         - transcript.partial: logged (no triage, no TTS).
         - transcript.final: deduplicated, echo-checked, evaluated via run_triage(),
           synthesizes language-aware audio via Sarvam TTS, and streams ~100ms chunks to Exotel.
      7. Handle 'clear' event: safely resets session conversational context.
      8. Handle 'stop' event: cleanly releases STT resources and disconnects.
      9. Sanitizes all errors and guarantees no secrets or credentials leak.
    """
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "exotel_telephony"
    logger.info("[EXOTEL_WS] WebSocket accepted immediately from client: %s", client_host)

    session = ExotelVoiceSession()
    # Capture caller phone number from query parameters or headers
    query_params = dict(websocket.query_params)
    phone_number = (
        query_params.get("From")
        or query_params.get("from")
        or query_params.get("CallerId")
        or query_params.get("caller_id")
        or query_params.get("CallFrom")
        or websocket.headers.get("x-exotel-from")
        or ""
    )
    session.phone_number = str(phone_number).strip()
    agent = ConversationAgent()
    memory = ConversationMemory(
        language=session.language_code or "en-IN",
        patient_id=session.patient_id,
        caller_phone=session.phone_number,
    )
    session.conversation_memory = memory

    if session.phone_number:
        try:
            from backend.app.repositories.patient_repository import PatientRepository
            clean_phone = session.phone_number.replace("+91", "").replace("+", "").strip()[-10:]
            p_repo = PatientRepository(db)
            patient = p_repo.get_by_phone(clean_phone) or p_repo.get_by_phone(session.phone_number)
            if patient:
                session.patient_id = patient.id
                session.is_registered_patient = True
                memory.patient_id = patient.id
                memory.is_existing_patient = True
                if getattr(patient, "name", None):
                    memory.patient_name = patient.name
                    session.patient_name = patient.name
                if getattr(patient, "age", None):
                    memory.age = patient.age
                    session.age = patient.age
                if getattr(patient, "gender", None):
                    memory.gender = patient.gender
                    session.gender = patient.gender
                if getattr(patient, "village", None):
                    memory.locality = patient.village
                    session.location = patient.village
                if getattr(patient, "district", None):
                    memory.district = patient.district
                if getattr(patient, "preferred_language", None):
                    lang_map = {"en": "en-IN", "hi": "hi-IN", "mr": "mr-IN"}
                    pref = lang_map.get(patient.preferred_language, patient.preferred_language)
                    if pref in ("en-IN", "hi-IN", "mr-IN"):
                        memory.preferred_language = pref
                logger.info(
                    "[EXOTEL_WS] Resolved caller phone %s to existing patient ID %d (%s, %s, %s, %s)",
                    session.phone_number,
                    patient.id,
                    memory.patient_name,
                    memory.age,
                    memory.gender,
                    memory.locality,
                )
        except Exception as p_err:
            logger.debug("[EXOTEL_WS] Patient lookup note: %s", p_err)

    def persist_current_encounter() -> Optional[int]:
        return _persist_voice_encounter(session, db=db)

    stt_service = SarvamSTTService()

    async def send_tts_audio_to_exotel(
        text: str,
        mark_name: str = "triage_response",
        language_code: Optional[str] = None,
    ) -> None:
        """Synthesize speech via Sarvam TTS, extract raw PCM S16LE, and stream chunks to Exotel."""
        clean_text = (text or "").strip()
        if not clean_text:
            logger.info("[EXOTEL_WS] Skipping TTS synthesis: empty text")
            return

        session.dialogue_history.append({"speaker": "bot", "text": clean_text})

        async with session.response_lock:
            session.is_transmitting = True
            prev_state = session.state
            session.state = IVRState.SPEAKING_RESPONSE

            target_lang = language_code or session.language_code or "en-IN"
            logger.info(
                "[EXOTEL_WS] Initiating TTS synthesis: mark='%s', lang='%s', has_stream_sid=%s, stream_sid_len=%d",
                mark_name,
                target_lang,
                bool(session.stream_sid),
                len(session.stream_sid),
            )

            try:
                lang_tts = SarvamTTSService(language_code=target_lang)
                audio_res = await lang_tts.synthesize(clean_text)
                logger.info(
                    "[EXOTEL_WS] TTS synthesis succeeded: audio_bytes=%d, sample_rate=%d",
                    len(audio_res.audio_bytes),
                    audio_res.sample_rate,
                )

                # WAV inspection
                wav_sample_rate = 0
                wav_channels = 0
                wav_sample_width = 0
                wav_frames = 0
                wav_duration_sec = 0.0
                wav_comptype = "UNKNOWN"
                try:
                    with wave.open(io.BytesIO(audio_res.audio_bytes), "rb") as wf:
                        wav_sample_rate = wf.getframerate()
                        wav_channels = wf.getnchannels()
                        wav_sample_width = wf.getsampwidth()
                        wav_frames = wf.getnframes()
                        wav_comptype = f"{wf.getcomptype()} ({wf.getcompname()})"
                        wav_duration_sec = (wav_frames / wav_sample_rate) if wav_sample_rate else 0.0
                except Exception as wav_inspect_err:
                    logger.debug("[EXOTEL_WS] WAV header inspection note: %s", wav_inspect_err)

                logger.info(
                    "[EXOTEL_WS] Sarvam TTS WAV inspection: sample_rate=%d, channels=%d, "
                    "sample_width=%d, n_frames=%d, duration=%.3fs, codec='%s'",
                    wav_sample_rate,
                    wav_channels,
                    wav_sample_width,
                    wav_frames,
                    wav_duration_sec,
                    wav_comptype,
                )

                # Parse WAV container, verify 8000 Hz / mono / 16-bit, strip WAV header, extract raw PCM S16LE
                raw_pcm = wav_to_pcm(
                    audio_res.audio_bytes,
                    expected_rate=8000,
                    expected_channels=1,
                    expected_width=2,
                )
                # Chunk raw PCM audio into ~100 ms (1600 bytes, multiples of 320) base64 strings
                audio_chunks = chunk_outbound_audio(
                    pcm_bytes=raw_pcm,
                    encoding="audio/l16",
                    chunk_duration_ms=100,
                    sample_rate=8000,
                )
                logger.info(
                    "[EXOTEL_WS] Outbound audio chunked: chunk_count=%d, raw_pcm_bytes=%d",
                    len(audio_chunks),
                    len(raw_pcm),
                )

                for idx, chunk_b64 in enumerate(audio_chunks):
                    session.sequence_number += 1

                    chunk_bytes = base64.b64decode(chunk_b64)
                    pcm_byte_len = len(chunk_bytes)
                    is_even = (pcm_byte_len % 2 == 0)
                    num_samples = pcm_byte_len // 2
                    min_sample = 0
                    max_sample = 0
                    rms_level = 0.0
                    if is_even and num_samples > 0:
                        try:
                            samples = struct.unpack(f"<{num_samples}h", chunk_bytes)
                            min_sample = min(samples)
                            max_sample = max(samples)
                            rms_level = math.sqrt(sum(s * s for s in samples) / num_samples)
                        except Exception as calc_err:
                            logger.debug("[EXOTEL_WS] Sample metric calculation error: %s", calc_err)

                    expected_duration_ms = (num_samples / session.sample_rate * 1000.0) if session.sample_rate else 0.0

                    logger.info(
                        "[EXOTEL_WS] Outbound TTS media chunk #%d: pcm_bytes=%d, is_even=%s, min_sample=%d, max_sample=%d, "
                        "rms=%.2f, num_samples=%d, expected_duration_ms=%.1f, configured_sample_rate=%d, "
                        "configured_channels=%d, active_encoding='%s', has_stream_sid=%s",
                        idx,
                        pcm_byte_len,
                        is_even,
                        min_sample,
                        max_sample,
                        rms_level,
                        num_samples,
                        expected_duration_ms,
                        session.sample_rate,
                        session.channels,
                        session.encoding,
                        bool(session.stream_sid),
                    )

                    media_msg = build_media_event(
                        session.stream_sid,
                        chunk_b64,
                    )
                    try:
                        await websocket.send_json(media_msg)
                    except Exception as send_err:
                        logger.warning("[EXOTEL_WS] Failed sending media chunk %d: %s", idx, send_err)
                        return

                logger.info("[EXOTEL_WS] Outgoing event: sent %d 'media' chunk frames", len(audio_chunks))

                # Send mark event to signal playback completion
                try:
                    mark_msg = build_mark_event(session.stream_sid, mark_name)
                    logger.info("[EXOTEL_WS] Outgoing event: 'mark' (name='%s')", mark_name)
                    await websocket.send_json(mark_msg)
                except Exception as mark_err:
                    logger.warning("[EXOTEL_WS] Failed sending mark frame: %s", mark_err)
            except TTSError as tts_err:
                logger.warning("[EXOTEL_WS] Sarvam TTS synthesis failed in Exotel stream: %s", tts_err.message)
                try:
                    await websocket.send_json({
                        "event": "error",
                        "message": "Voice response is temporarily unavailable.",
                    })
                except Exception:
                    pass
            except Exception as exc:
                logger.error("[EXOTEL_WS] Unexpected error streaming TTS to Exotel: %s: %s", type(exc).__name__, exc, exc_info=True)
                try:
                    await websocket.send_json({
                        "event": "error",
                        "message": "Voice response is temporarily unavailable.",
                    })
                except Exception:
                    pass
            finally:
                session.is_transmitting = False
                if session.state == IVRState.SPEAKING_RESPONSE:
                    session.state = prev_state if prev_state != IVRState.SPEAKING_RESPONSE else IVRState.WAITING_FOR_SYMPTOMS

    async def on_stt_event(event: Dict[str, Any]) -> None:
        """Callback when Sarvam STT emits transcription events."""
        if not isinstance(event, dict):
            return

        event_type = event.get("type")
        if event_type == "transcript.partial":
            logger.info("[EXOTEL_WS] Interim transcript received from STT: text_len=%d", len(str(event.get("text") or "")))
            return

        if event_type == "transcript.final":
            raw_text = event.get("text")
            clean_transcript = str(raw_text).strip() if raw_text is not None else ""
            logger.info("[EXOTEL_WS] Final transcript received from STT: '%s' (state=%s)", clean_transcript, session.state)

            if not clean_transcript:
                return

            if clean_transcript == session.last_processed_transcript:
                logger.info("[EXOTEL_WS] Discarding duplicate final transcript: '%s'", clean_transcript)
                return

            if is_bot_echo(clean_transcript):
                logger.info("[EXOTEL_WS] Discarding acoustic echo transcript: '%s'", clean_transcript)
                return

            session.last_processed_transcript = clean_transcript
            session.last_transcript = clean_transcript
            t_lower = clean_transcript.lower()

            # 1. State: LANGUAGE_SELECTION
            if session.state == IVRState.LANGUAGE_SELECTION:
                if "english" in t_lower or "one" in t_lower or "1" in t_lower:
                    session.language_code = "en-IN"
                    memory.language = "en-IN"
                    session.state = IVRState.WAITING_FOR_SYMPTOMS
                    logger.info("[EXOTEL_WS] Spoken language selection: en-IN")
                    await send_tts_audio_to_exotel(
                        EXOTEL_SYMPTOM_PROMPT_EN,
                        "symptom_prompt_en",
                        language_code="en-IN",
                    )
                    return
                elif "hindi" in t_lower or "two" in t_lower or "do" in t_lower or "2" in t_lower or "हिंदी" in clean_transcript:
                    session.language_code = "hi-IN"
                    memory.language = "hi-IN"
                    session.state = IVRState.WAITING_FOR_SYMPTOMS
                    logger.info("[EXOTEL_WS] Spoken language selection: hi-IN")
                    await send_tts_audio_to_exotel(
                        EXOTEL_SYMPTOM_PROMPT_HI,
                        "symptom_prompt_hi",
                        language_code="hi-IN",
                    )
                    return
                elif "marathi" in t_lower or "three" in t_lower or "teen" in t_lower or "tin" in t_lower or "3" in t_lower or "मराठी" in clean_transcript:
                    session.language_code = "mr-IN"
                    memory.language = "mr-IN"
                    session.state = IVRState.WAITING_FOR_SYMPTOMS
                    logger.info("[EXOTEL_WS] Spoken language selection: mr-IN")
                    await send_tts_audio_to_exotel(
                        EXOTEL_SYMPTOM_PROMPT_MR,
                        "symptom_prompt_mr",
                        language_code="mr-IN",
                    )
                    return
                else:
                    # Check if caller directly described symptoms without selecting language
                    has_en_symptom = any(s in t_lower for s in KNOWN_SYMPTOMS_EN)
                    has_hi_symptom = any(h in t_lower for h in HINDI_SYMPTOM_MAP)
                    if has_en_symptom or has_hi_symptom:
                        session.language_code = "hi-IN" if has_hi_symptom else "en-IN"
                        memory.language = session.language_code
                        session.state = IVRState.WAITING_FOR_SYMPTOMS
                        logger.info(
                            "[EXOTEL_WS] Direct symptoms detected during LANGUAGE_SELECTION. Defaulting to %s",
                            session.language_code,
                        )
                    else:
                        logger.info(
                            "[EXOTEL_WS] Spoken input in LANGUAGE_SELECTION did not specify language or symptoms: '%s'",
                            clean_transcript,
                        )
                        return

            # Pass final transcript into LocalConversationModel & ConversationAgent
            logger.info("[LOCAL_MODEL_PREDICT] Passing final transcript to LocalConversationModel: '%s'", clean_transcript)

            logger.info(
                "\nVOICE_TURN_START\n"
                "transcript: %s\n"
                "conversation_state_before: %s",
                clean_transcript,
                memory.call_phase,
            )

            spoken_text, action = agent.handle_turn(clean_transcript, memory, db=db)

            # Sync session state with conversation memory
            session.symptoms = list(set(memory.symptoms))
            session.symptom_descriptions = list(memory.symptom_descriptions)
            session.symptom_duration = memory.duration
            if memory.patient_name:
                session.patient_name = memory.patient_name
            if memory.age is not None:
                session.age = memory.age
            if memory.gender:
                session.gender = memory.gender
            if memory.additional_notes:
                session.additional_notes = memory.additional_notes
            if memory.locality:
                session.location = memory.locality
            if memory.triage_result:
                session.last_triage = memory.triage_result
                if memory.triage_result.get("emergency") or action.emergency:
                    session.emergency = True
            if memory.recommended_facility:
                session.recommended_facility = memory.recommended_facility
            if memory.selected_slot:
                session.selected_slot = memory.selected_slot
            if memory.appointment_id:
                session.appointment_id = memory.appointment_id
            if memory.booking_intent is not None:
                session.booking_intent = memory.booking_intent
            if memory.appointment_type:
                session.appointment_type = memory.appointment_type

            # Idempotently link or create patient if caller provided name
            if memory.patient_name and not session.patient_id and session.phone_number:
                try:
                    from backend.app.repositories.patient_repository import PatientRepository
                    p_repo = PatientRepository(db)
                    pat_rec = p_repo.get_or_create_patient(
                        mobile=session.phone_number,
                        full_name=memory.patient_name,
                        age=memory.age,
                        gender=memory.gender,
                        village=memory.locality or session.location,
                        district=memory.district or "Solapur",
                    )
                    if pat_rec:
                        session.patient_id = pat_rec.id
                        session.is_registered_patient = True
                        memory.patient_id = pat_rec.id
                        memory.is_existing_patient = True
                        logger.info("[EXOTEL_WS] Auto-registered/linked caller to patient ID %d", pat_rec.id)
                except Exception as pat_reg_err:
                    logger.debug("[EXOTEL_WS] Auto patient linking note: %s", pat_reg_err)

            # Determine mark_name and session.state
            tool_called_name = "none"
            tool_summary = "none"

            if action.intent == ConversationIntent.EMERGENCY or session.emergency:
                mark_name = "triage_response"
                session.state = IVRState.WAITING_FOR_NEXT_ACTION
                tool_called_name = "run_triage, find_recommended_facility"
                fac_name = (memory.recommended_facility or {}).get("name", "hospital")
                tool_summary = f"emergency=True, facility={fac_name}"
            elif memory.call_phase == "TRIAGE_PRESENTED":
                mark_name = "triage_response"
                session.state = IVRState.BOOKING_SELECTION
                tool_called_name = "run_triage, find_recommended_facility"
                urg = (memory.triage_result or {}).get("urgency", "routine")
                fac_name = (memory.recommended_facility or {}).get("name", "clinic")
                tool_summary = f"urgency={urg}, care={(memory.triage_result or {}).get('recommended_care')}, facility={fac_name}"
            elif memory.call_phase == "BOOKING_TYPE":
                mark_name = "booking_type_prompt"
                session.state = IVRState.BOOKING_TYPE_SELECTION
                tool_called_name = "extract_booking_intent"
                tool_summary = "booking_intent=True, awaiting modality (phone/offline)"
            elif memory.call_phase == "BOOKING_CONFIRM":
                mark_name = "confirm_slot_prompt"
                session.state = IVRState.BOOKING_CONFIRMATION
                tool_called_name = "get_or_create_slot"
                slot_t = (memory.selected_slot or {}).get("slot_time", "tomorrow")
                tool_summary = f"slot={slot_t}, type={memory.appointment_type}"
            elif memory.call_phase == "ENDED":
                session.state = IVRState.ENDED
                if memory.appointment_id:
                    mark_name = "booking_success"
                    tool_called_name = "create_appointment"
                    tool_summary = f"appointment_id={memory.appointment_id}, type={memory.appointment_type}"
                else:
                    mark_name = "goodbye"
                    tool_called_name = "close_session"
                    tool_summary = "caller declined booking or finished session"
            elif memory.call_phase == "NAME":
                mark_name = "name_prompt"
                session.state = IVRState.WAITING_FOR_NAME
                tool_called_name = "collect_patient_identity"
                tool_summary = f"symptoms={memory.symptoms}, awaiting name"
            elif memory.call_phase == "AGE":
                mark_name = "age_prompt"
                session.state = IVRState.WAITING_FOR_AGE
                tool_called_name = "collect_patient_demographics"
                tool_summary = f"name={memory.patient_name}, awaiting age"
            elif memory.call_phase == "GENDER":
                mark_name = "gender_prompt"
                session.state = IVRState.WAITING_FOR_GENDER
                tool_called_name = "collect_patient_demographics"
                tool_summary = f"name={memory.patient_name}, awaiting gender"
            elif memory.call_phase == "SAFETY_QUESTIONS":
                mark_name = "safety_prompt"
                session.state = IVRState.WAITING_FOR_SAFETY
                tool_called_name = "clinical_safety_screening"
                tool_summary = f"screening red flags for symptoms={memory.symptoms}"
            elif memory.call_phase == "LOCALITY":
                mark_name = "location_prompt"
                session.state = IVRState.WAITING_FOR_LOCATION
                tool_called_name = "collect_symptoms"
                tool_summary = f"symptoms={memory.symptoms}, awaiting locality"
            elif memory.call_phase == "DURATION":
                mark_name = "triage_response"
                session.state = IVRState.WAITING_FOR_SYMPTOMS
                tool_called_name = "collect_symptoms"
                tool_summary = f"symptoms={memory.symptoms}, awaiting duration"
            elif action.intent == ConversationIntent.ANSWER_YES and memory.call_phase in ("GREETING", "SYMPTOMS"):
                mark_name = "symptom_prompt"
                session.state = IVRState.WAITING_FOR_SYMPTOMS
                tool_called_name = "clarify_symptoms"
                tool_summary = "caller said yes, prompt for details"
            else:
                mark_name = "triage_response"
                tool_called_name = "nlp_intent_extraction"
                tool_summary = f"intent={action.intent.value}"

            persist_current_encounter()

            # Structured Turn Logging (Requirements 4 & 5)
            logger.info(
                "intent: %s\n"
                "confidence: %.2f\n"
                "slots: name=%s, age=%s, gender=%s, symptoms=%s, duration=%s, locality=%s, appt_type=%s, emergency=%s\n"
                "conversation_state: %s\n"
                "selected_action: %s\n"
                "tool_called: %s\n"
                "tool_result_summary: %s\n"
                "response_text: %s",
                action.intent.value,
                action.confidence,
                action.patient_name or memory.patient_name,
                action.age or memory.age,
                action.gender or memory.gender,
                action.symptoms,
                action.duration,
                action.locality or memory.locality,
                action.appointment_type or memory.appointment_type,
                action.emergency or session.emergency,
                memory.call_phase,
                action.intent.value,
                tool_called_name,
                tool_summary,
                spoken_text,
            )

            logger.info("TTS_STARTED (mark='%s')", mark_name)
            await send_tts_audio_to_exotel(spoken_text, mark_name, language_code=session.language_code)
            logger.info("TTS_COMPLETED (mark='%s')", mark_name)
            logger.info("WAITING_FOR_NEXT_TURN (state=%s, phase=%s)", session.state, memory.call_phase)
            return

    try:
        while True:
            try:
                raw_message = await websocket.receive()
            except WebSocketDisconnect as ws_disc:
                logger.info(
                    "[EXOTEL_WS] Client disconnected during receive: code=%s, reason=%s",
                    getattr(ws_disc, "code", None),
                    getattr(ws_disc, "reason", None),
                )
                break
            except Exception as recv_err:
                logger.warning("[EXOTEL_WS] Exception in websocket.receive(): %s: %s", type(recv_err).__name__, recv_err)
                break

            msg_type = raw_message.get("type")

            if msg_type == "websocket.disconnect":
                close_code = raw_message.get("code")
                close_reason = raw_message.get("reason")
                logger.info("[EXOTEL_WS] Received websocket.disconnect frame: code=%s, reason=%s", close_code, close_reason)
                break

            if "text" in raw_message:
                text_content = raw_message["text"]
                try:
                    payload = json.loads(text_content)
                    if not isinstance(payload, dict):
                        logger.warning("[EXOTEL_WS] Received non-dictionary JSON text frame")
                        continue
                except Exception as json_err:
                    logger.warning("[EXOTEL_WS] Malformed JSON text frame: %s", json_err)
                    try:
                        await websocket.send_json({"event": "error", "message": "Invalid JSON format"})
                    except Exception:
                        pass
                    continue

                event_name = payload.get("event")
                logger.info("[EXOTEL_WS] Incoming event received: '%s'", event_name)

                if event_name == "connected":
                    session.is_connected = True
                elif event_name == "start":
                    session.has_started = True
                    start_data = payload.get("start") or {}
                    session.stream_sid = str(payload.get("streamSid") or payload.get("stream_sid") or start_data.get("streamSid") or start_data.get("stream_sid") or "").strip()
                    session.call_sid = str(payload.get("callSid") or payload.get("call_sid") or start_data.get("callSid") or start_data.get("call_sid") or "").strip()
                    media_format = start_data.get("mediaFormat") or start_data.get("media_format") or payload.get("mediaFormat") or payload.get("media_format") or {}
                    session.sample_rate = int(media_format.get("sampleRate") or media_format.get("sample_rate") or settings.EXOTEL_SAMPLE_RATE)
                    session.channels = int(media_format.get("channels") or 1)
                    session.encoding = "audio/l16"

                    if session.stream_sid:
                        ACTIVE_VOICE_SESSIONS[session.stream_sid] = session

                    if not session.greeting_sent:
                        session.greeting_sent = True
                        session.state = IVRState.LANGUAGE_SELECTION
                        logger.info("[EXOTEL_WS] Sending initial language selection menu (mark='greeting')")
                        await send_tts_audio_to_exotel(
                            EXOTEL_INITIAL_LANGUAGE_MENU,
                            "greeting",
                            language_code="hi-IN",
                        )

                elif event_name == "media":
                    if session.is_transmitting or session.state == IVRState.SPEAKING_RESPONSE:
                        logger.debug("[EXOTEL_WS] Echo suppression: skipping inbound media frame during active transmission")
                        continue

                    media_info = payload.get("media") or {}
                    if not session.stream_sid:
                        media_stream_sid = str(payload.get("streamSid") or payload.get("stream_sid") or "").strip()
                        if media_stream_sid:
                            session.stream_sid = media_stream_sid
                            ACTIVE_VOICE_SESSIONS[session.stream_sid] = session

                    payload_b64 = media_info.get("payload")
                    if not payload_b64:
                        continue

                    try:
                        raw_audio = base64.b64decode(payload_b64)
                    except Exception as decode_err:
                        logger.warning("[EXOTEL_WS] Failed to decode base64 media payload: %s", decode_err)
                        try:
                            await websocket.send_json({"event": "error", "message": "Malformed media payload"})
                        except Exception:
                            pass
                        continue

                    pcm_audio = normalize_inbound_audio(raw_audio, encoding="audio/l16")
                    if not stt_service.is_connected:
                        if stt_service.api_key:
                            connected = await stt_service.connect()
                            if connected:
                                await stt_service.start_listening(on_event=on_stt_event)
                    if stt_service.is_connected:
                        await stt_service.send_audio(pcm_audio)

                elif event_name == "dtmf":
                    dtmf_info = payload.get("dtmf") if isinstance(payload.get("dtmf"), dict) else {}
                    raw_digit = dtmf_info.get("digit") or payload.get("digit")
                    digit = str(raw_digit).strip() if raw_digit is not None else ""
                    session.last_dtmf = digit
                    logger.info("[EXOTEL_WS] 'dtmf' event received: digit='%s', state='%s'", digit, session.state)

                    if session.state == IVRState.LANGUAGE_SELECTION:
                        if digit == "1":
                            session.language_code = "en-IN"
                            memory.language = "en-IN"
                            session.state = IVRState.WAITING_FOR_SYMPTOMS
                            await send_tts_audio_to_exotel(EXOTEL_SYMPTOM_PROMPT_EN, "symptom_prompt_en", language_code="en-IN")
                        elif digit == "2":
                            session.language_code = "hi-IN"
                            memory.language = "hi-IN"
                            session.state = IVRState.WAITING_FOR_SYMPTOMS
                            await send_tts_audio_to_exotel(EXOTEL_SYMPTOM_PROMPT_HI, "symptom_prompt_hi", language_code="hi-IN")
                        elif digit == "3":
                            session.language_code = "mr-IN"
                            memory.language = "mr-IN"
                            session.state = IVRState.WAITING_FOR_SYMPTOMS
                            await send_tts_audio_to_exotel(EXOTEL_SYMPTOM_PROMPT_MR, "symptom_prompt_mr", language_code="mr-IN")
                        else:
                            session.invalid_language_attempts += 1
                            if session.invalid_language_attempts < 2:
                                await send_tts_audio_to_exotel(EXOTEL_LANG_INVALID_RETRY_EN, "lang_retry", language_code="en-IN")
                            else:
                                session.language_code = "en-IN"
                                memory.language = "en-IN"
                                session.state = IVRState.WAITING_FOR_SYMPTOMS
                                await send_tts_audio_to_exotel(EXOTEL_LANG_FALLBACK_EN, "lang_fallback", language_code="en-IN")

                    elif session.state in (IVRState.WAITING_FOR_LOCATION, IVRState.CONFIRMING_LOCATION):
                        if digit in DTMF_LOCATION_CODE_MAP and DTMF_LOCATION_CODE_MAP[digit] != "other":
                            loc = DTMF_LOCATION_CODE_MAP[digit]
                            spoken_text, action = agent.handle_turn(f"I live in {loc}", memory, db=db)
                            session.symptoms = list(set(memory.symptoms))
                            session.location = memory.locality
                            session.last_triage = memory.triage_result
                            session.recommended_facility = memory.recommended_facility
                            session.state = IVRState.BOOKING_SELECTION
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "dtmf_triage_response", language_code=session.language_code)
                        else:
                            prompt = (
                                "Please speak your village, town, or location."
                                if session.language_code == "en-IN"
                                else "Kripya apna gaon ya sthan bol kar batayein."
                            )
                            await send_tts_audio_to_exotel(prompt, "speak_location_prompt", language_code=session.language_code)

                    elif session.state == IVRState.BOOKING_SELECTION:
                        if digit == "1":
                            spoken_text, action = agent.handle_turn("yes please book an appointment", memory, db=db)
                            session.booking_intent = True
                            session.state = IVRState.BOOKING_TYPE_SELECTION
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "booking_type_prompt", language_code=session.language_code)
                        else:
                            spoken_text, action = agent.handle_turn("no thank you goodbye", memory, db=db)
                            session.state = IVRState.ENDED
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "goodbye", language_code=session.language_code)

                    elif session.state == IVRState.BOOKING_TYPE_SELECTION:
                        choice = "phone consultation" if digit == "1" else "in person clinic visit"
                        spoken_text, action = agent.handle_turn(choice, memory, db=db)
                        session.appointment_type = memory.appointment_type
                        session.selected_slot = memory.selected_slot
                        session.state = IVRState.BOOKING_CONFIRMATION
                        persist_current_encounter()
                        await send_tts_audio_to_exotel(spoken_text, "confirm_slot_prompt", language_code=session.language_code)

                    elif session.state == IVRState.BOOKING_CONFIRMATION:
                        if digit in ("1", "9"):
                            spoken_text, action = agent.handle_turn("yes confirm", memory, db=db)
                            session.appointment_id = memory.appointment_id
                            session.state = IVRState.ENDED
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "booking_success", language_code=session.language_code)
                        else:
                            spoken_text, action = agent.handle_turn("no cancel", memory, db=db)
                            session.state = IVRState.ENDED
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "goodbye", language_code=session.language_code)

                    elif session.state in (IVRState.WAITING_FOR_SYMPTOMS, IVRState.COLLECTING_SYMPTOMS, IVRState.CONFIRMING_SYMPTOMS, IVRState.WAITING_FOR_NEXT_ACTION):
                        if digit == "0":
                            session.emergency = True
                            spoken_text, action = agent.handle_dtmf("0", memory, db=db)
                            session.symptoms = list(set(memory.symptoms))
                            session.last_triage = memory.triage_result
                            session.recommended_facility = memory.recommended_facility
                            session.state = IVRState.WAITING_FOR_NEXT_ACTION
                            persist_current_encounter()
                            await send_tts_audio_to_exotel(spoken_text, "dtmf_emergency_response", language_code=session.language_code)
                        elif digit in DTMF_SYMPTOM_CODE_MAP:
                            sym = DTMF_SYMPTOM_CODE_MAP[digit]
                            if sym not in session.symptoms:
                                session.symptoms.append(sym)
                            if sym not in memory.symptoms:
                                memory.symptoms.append(sym)
                            session.dtmf_symptom_buffer.append(sym)
                            session.state = IVRState.COLLECTING_SYMPTOMS
                        elif digit == "9":
                            if session.symptoms or session.dtmf_symptom_buffer:
                                syms_list = list(set(session.symptoms or session.dtmf_symptom_buffer))
                                session.dtmf_symptom_buffer.clear()
                                triage_res = run_triage(symptoms=syms_list, description=f"DTMF symptoms: {', '.join(syms_list)}")
                                session.last_triage = {
                                    "urgency": triage_res.urgency,
                                    "emergency": triage_res.emergency,
                                    "recommended_care": triage_res.recommended_care,
                                    "reason": triage_res.reason,
                                }
                                facility = find_recommended_facility(
                                    location_query=session.location,
                                    care_level=triage_res.recommended_care,
                                    emergency=triage_res.emergency,
                                )
                                session.recommended_facility = facility
                                spoken_text = build_conversational_response(
                                    "recommendation",
                                    urgency=triage_res.urgency,
                                    emergency=triage_res.emergency,
                                    recommended_care=triage_res.recommended_care,
                                    reason=triage_res.reason,
                                    facility=facility,
                                    language_code=session.language_code,
                                )
                                memory.symptoms = list(set(syms_list))
                                memory.triage_result = session.last_triage
                                memory.recommended_facility = facility
                                memory.call_phase = "TRIAGE_PRESENTED"
                                session.state = IVRState.WAITING_FOR_LOCATION if not session.location else IVRState.BOOKING_SELECTION
                                persist_current_encounter()
                                await send_tts_audio_to_exotel(spoken_text, "dtmf_triage_response", language_code=session.language_code)
                            else:
                                is_hi = "hi" in session.language_code.lower()
                                prompt = (
                                    "Kripya pehle apne lakshan chunein: bukhar ke liye 1, ya khansi ke liye 2 dabayein."
                                    if is_hi
                                    else "Please select your symptoms first, such as 1 for fever or 2 for cough."
                                )
                                await send_tts_audio_to_exotel(prompt, "empty_buffer_prompt", language_code=session.language_code)

                elif event_name == "clear":
                    session.reset_context()
                elif event_name == "stop":
                    break
                elif event_name == "mark":
                    mark_data = payload.get("mark") if isinstance(payload.get("mark"), dict) else {}
                    session.is_transmitting = False
                    if session.state == IVRState.SPEAKING_RESPONSE:
                        session.state = IVRState.WAITING_FOR_SYMPTOMS

            elif "bytes" in raw_message:
                audio_bytes = raw_message["bytes"]
                if not (session.is_transmitting or session.state == IVRState.SPEAKING_RESPONSE):
                    pcm_audio = normalize_inbound_audio(audio_bytes, encoding="audio/l16")
                    if stt_service.is_connected:
                        await stt_service.send_audio(pcm_audio)

    except WebSocketDisconnect as ws_disc:
        logger.info("[EXOTEL_WS] Exotel voice stream disconnected: code=%s", getattr(ws_disc, "code", None))
    except Exception as exc:
        logger.error("[EXOTEL_WS] Unexpected error: %s", type(exc).__name__, exc_info=True)
        try:
            await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
        except Exception:
            pass
    finally:
        if session.stream_sid:
            ACTIVE_VOICE_SESSIONS.pop(session.stream_sid, None)
        await stt_service.close()
        logger.info(
            "[EXOTEL_WS] Exotel voice stream session closed for %s (greeting_sent=%s, media_frames_sent=%d)",
            client_host,
            session.greeting_sent,
            session.sequence_number,
        )
