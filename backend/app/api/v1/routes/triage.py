"""
api/v1/routes/triage.py
=======================

AI-assisted symptom triage and multilingual speech-to-text transcription endpoints.

POST /api/v1/triage
POST /api/v1/triage/transcribe

The triage endpoint accepts symptoms and a patient description,
runs the transparent rule-based triage engine, and returns
a structured care-navigation result.

The transcribe endpoint accepts recorded patient audio,
submits it to Sarvam AI speech-to-text service with regional language support
(Tamil, Hindi, Marathi, English), and returns the transcription.
"""

from __future__ import annotations

import logging
import os
from typing import Dict

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
import httpx

from ai.triage.schemas import TriageRequest, TriageResult, TranscribeResponse, TTSRequest, TTSResponse
from ai.triage.triage import run_triage
from backend.app.core.config import settings
from backend.app.services.sarvam_tts_service import SarvamTTSService, TTSError

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/triage",
    tags=["Triage"],
)

LANGUAGE_MAPPING: Dict[str, str] = {
    "ta": "ta-IN",
    "ta-in": "ta-IN",
    "tamil": "ta-IN",
    "hi": "hi-IN",
    "hi-in": "hi-IN",
    "hindi": "hi-IN",
    "mr": "mr-IN",
    "mr-in": "mr-IN",
    "marathi": "mr-IN",
    "en": "en-IN",
    "en-in": "en-IN",
    "english": "en-IN",
    "te": "te-IN",
    "te-in": "te-IN",
    "kn": "kn-IN",
    "kn-in": "kn-IN",
    "bn": "bn-IN",
    "bn-in": "bn-IN",
}

DEMO_TRANSCRIPTS: Dict[str, str] = {
    "ta-IN": "எனக்கு இரண்டு நாட்களாக தலைவலியும் கடுமையான காய்ச்சலும் இருக்கிறது",
    "hi-IN": "मुझे दो दिनों से तेज सिरदर्द और बुखार की शिकायत है",
    "mr-IN": "मला दोन दिवसांपासून तीव्र डोकेदुखी आणि ताप येत आहे",
    "en-IN": "I have had a severe headache and high fever for two days.",
}


def resolve_sarvam_api_key() -> str | None:
    """
    Resolve SARVAM_API_KEY from settings, os.environ, or active .env files dynamically.
    Ensures that adding the key to .env immediately takes effect without requiring a server restart.
    """
    key = settings.SARVAM_API_KEY or os.environ.get("SARVAM_API_KEY")
    if key and str(key).strip():
        return str(key).strip()

    from pathlib import Path
    backend_dir = Path(__file__).resolve().parent.parent.parent.parent
    root_dir = backend_dir.parent
    for candidate in [root_dir / ".env", backend_dir / ".env", Path(".env"), Path("backend/.env")]:
        if candidate.is_file():
            try:
                for line in candidate.read_text(encoding="utf-8").splitlines():
                    line = line.strip()
                    if line.startswith("SARVAM_API_KEY=") or line.startswith("SARVAM_API_KEY ="):
                        val = line.split("=", 1)[1].strip().strip('"').strip("'")
                        if val:
                            return val
            except Exception:
                pass
    return None


@router.post(
    "",
    response_model=TriageResult,
    summary="Run symptom triage",
)
async def triage(request: TriageRequest) -> TriageResult:
    """
    Run rule-based symptom triage.

    The system:
    1. Checks for explicit emergency warning signs.
    2. Checks for symptoms requiring attention.
    3. Otherwise provides routine care guidance.

    It does not diagnose diseases or prescribe medication.
    """

    return run_triage(
        symptoms=request.symptoms,
        description=request.description,
        duration_days=request.duration_days,
    )


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribe patient voice recording into text via Sarvam AI",
)
async def transcribe(
    audio: UploadFile = File(..., description="Recorded audio file (WebM/WAV/OGG)"),
    language: str = Form("en-IN", description="Language code (e.g. ta-IN, hi-IN, mr-IN, en-IN)"),
) -> TranscribeResponse:
    """
    Transcribe recorded patient voice input using Sarvam AI Speech-to-Text.

    Accepts multipart audio blob and target language code.
    Calls Sarvam AI speech-to-text service or provides seamless regional demo fallback
    if API key is unconfigured.
    """
    audio_bytes = await audio.read()
    if not audio_bytes or len(audio_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Recorded audio file is empty.",
        )

    clean_lang = (language or "en-IN").strip().lower()
    normalized_lang = LANGUAGE_MAPPING.get(clean_lang, language or "en-IN")

    api_key = resolve_sarvam_api_key()
    if api_key:
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    "https://api.sarvam.ai/speech-to-text",
                    headers={"api-subscription-key": api_key},
                    files={
                        "file": (
                            audio.filename or "patient_recording.webm",
                            audio_bytes,
                            audio.content_type or "audio/webm",
                        )
                    },
                    data={
                        "language_code": normalized_lang,
                        "model": (
                            getattr(settings, "SARVAM_STT_REST_MODEL", "saaras:v4")
                            if "realtime" in getattr(settings, "SARVAM_STT_MODEL", "")
                            else getattr(settings, "SARVAM_STT_MODEL", "saaras:v4")
                        ),
                    },
                )
                if response.status_code == 200:
                    payload = response.json()
                    transcript = payload.get("transcript", "").strip()
                    if transcript:
                        return TranscribeResponse(
                            transcript=transcript,
                            language=normalized_lang,
                            demo_mode=False,
                            provider="sarvam",
                        )
                logger.warning(
                    "Sarvam STT returned status %s: %s. Falling back to demo mode.",
                    response.status_code,
                    response.text,
                )
        except Exception as exc:
            logger.warning(
                "Error calling Sarvam STT REST API (%s): %s. Falling back to demo mode.",
                type(exc).__name__,
                exc,
            )

    demo_text = DEMO_TRANSCRIPTS.get(
        normalized_lang,
        DEMO_TRANSCRIPTS["en-IN"],
    )
    return TranscribeResponse(
        transcript=demo_text,
        language=normalized_lang,
        demo_mode=True,
        provider="sarvam",
    )


@router.post(
    "/synthesize",
    response_model=TTSResponse,
    summary="Synthesize speech from text via Sarvam AI TTS",
)
async def synthesize(request: TTSRequest) -> TTSResponse:
    """
    Synthesize speech from text using Sarvam AI Text-to-Speech (Bulbul models).
    Supports Indian regional languages (ta-IN, hi-IN, mr-IN, en-IN).
    """
    clean_text = (request.text or "").strip()
    if not clean_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text to synthesize cannot be empty.",
        )

    clean_lang = (request.language or "ta-IN").strip().lower()
    normalized_lang = LANGUAGE_MAPPING.get(clean_lang, request.language or "ta-IN")

    api_key = resolve_sarvam_api_key()
    if not api_key:
        logger.warning("TTS request rejected: SARVAM_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Voice response is temporarily unavailable.",
        )

    try:
        service = SarvamTTSService(
            api_key=api_key,
            language_code=normalized_lang,
            speaker=request.speaker,
            sample_rate=request.sample_rate or 8000,
        )
        result = await service.synthesize(clean_text)
        return TTSResponse(
            audio_base64=result.audio_base64,
            mime_type=result.mime_type,
            language=normalized_lang,
            sample_rate=result.sample_rate,
            provider="sarvam",
        )
    except TTSError as tts_err:
        logger.warning("Sarvam TTS synthesis failed: %s", tts_err.message)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=tts_err.message or "Voice response is temporarily unavailable.",
        )
    except Exception as exc:
        logger.error("Unexpected error in TTS synthesis: %s", type(exc).__name__, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice response is temporarily unavailable.",
        )