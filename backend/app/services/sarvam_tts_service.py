"""
services/sarvam_tts_service.py
==============================
Text-to-Speech (TTS) service interfacing with Sarvam AI's REST API (Bulbul models).

Specifically tailored for telephone audio streaming:
  - 8000 Hz sample rate (narrowband telephony standard)
  - WAV format with PCM audio data
  - Single-channel mono speech synthesis

Spoken response formatting:
  - Translates structured TriageResult objects into concise, empathetic spoken guidance
  - Urgent immediate medical direction for emergency situations
  - Professional guidance directing patients to Primary Health Centres (PHC)
  - Clear routine healthcare advice
"""

from __future__ import annotations

import base64
from dataclasses import dataclass
import logging
from typing import Any, Dict, Optional

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Supported Indian languages + English (extensible for all Sarvam TTS Bulbul languages)
SUPPORTED_TTS_LANGUAGES: Dict[str, str] = {
    "en-IN": "English (India)",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
    "bn-IN": "Bengali",
    "te-IN": "Telugu",
    "ta-IN": "Tamil",
    "kn-IN": "Kannada",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "ml-IN": "Malayalam",
    "od-IN": "Odia",
}

DEFAULT_MODEL: str = "bulbul:v3"
DEFAULT_LANGUAGE: str = "en-IN"
DEFAULT_SPEAKER: str = "shubh"
DEFAULT_SAMPLE_RATE: int = 8000
DEFAULT_OUTPUT_CODEC: str = "wav"
DEFAULT_API_URL: str = "https://api.sarvam.ai/text-to-speech"


@dataclass(frozen=True)
class TTSAudioResult:
    """Standard container for synthesized audio bytes and metadata."""
    audio_base64: str
    audio_bytes: bytes
    mime_type: str = "audio/wav"
    sample_rate: int = 8000
    request_id: Optional[str] = None


class TTSError(Exception):
    """Sanitized exception raised when TTS synthesis fails."""
    def __init__(self, message: str = "Voice response is temporarily unavailable."):
        super().__init__(message)
        self.message = message


def build_spoken_response(
    urgency: str,
    emergency: bool,
    recommended_care: str = "",
    reason: str = "",
) -> str:
    """
    Construct a concise, telephone-friendly spoken response based on triage outcome.

    Keeps the spoken text short, natural, and clear for phone callers.
    Does not claim an ambulance has already been dispatched.
    """
    if emergency or urgency == "emergency":
        return "This may be an emergency. Please seek emergency medical care immediately."

    if urgency == "needs_attention":
        care_target = recommended_care or "a Primary Health Centre"
        return (
            f"I understand. Based on the symptoms you described, you should visit {care_target} "
            "for assessment by a healthcare professional."
        )

    return (
        "Routine healthcare is recommended based on your symptoms. "
        "Please visit a nearby healthcare facility if your symptoms persist."
    )


class SarvamTTSService:
    """
    Client service for converting text to speech using Sarvam AI's REST API.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        language_code: Optional[str] = None,
        speaker: Optional[str] = None,
        sample_rate: Optional[int] = None,
        output_codec: Optional[str] = None,
        api_url: Optional[str] = None,
        timeout: float = 15.0,
    ) -> None:
        self.api_key: Optional[str] = api_key or settings.SARVAM_API_KEY
        self.model: str = model or settings.SARVAM_TTS_MODEL or DEFAULT_MODEL
        lang = language_code or settings.SARVAM_TTS_LANGUAGE_CODE or DEFAULT_LANGUAGE
        self.language_code: str = lang if lang in SUPPORTED_TTS_LANGUAGES else DEFAULT_LANGUAGE
        self.speaker: str = speaker or settings.SARVAM_TTS_SPEAKER or DEFAULT_SPEAKER
        self.sample_rate: int = sample_rate or settings.SARVAM_TTS_SAMPLE_RATE or DEFAULT_SAMPLE_RATE
        self.output_codec: str = output_codec or settings.SARVAM_TTS_OUTPUT_CODEC or DEFAULT_OUTPUT_CODEC
        self.api_url: str = api_url or settings.SARVAM_TTS_API_URL or DEFAULT_API_URL
        self.timeout: float = timeout

    async def synthesize(self, text: str) -> TTSAudioResult:
        """
        Convert text into natural spoken audio via Sarvam Text-to-Speech API.

        Raises:
          TTSError: If API key is missing, network fails, or provider returns error.
        """
        clean_text = (text or "").strip()
        if not clean_text:
            raise TTSError("Cannot synthesize empty text.")

        if not self.api_key:
            logger.warning("Sarvam TTS request skipped: SARVAM_API_KEY is not configured.")
            raise TTSError("Voice response is temporarily unavailable.")

        payload: Dict[str, Any] = {
            "text": clean_text,
            "language_code": self.language_code,
            "model": self.model,
            "speaker": self.speaker,
            "sample_rate": self.sample_rate,
            "audio_format": self.output_codec,
        }

        headers: Dict[str, str] = {
            "api-subscription-key": self.api_key,
            "Content-Type": "application/json",
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.api_url,
                    json=payload,
                    headers=headers,
                )

            if response.status_code != 200:
                logger.warning(
                    "Sarvam TTS API returned non-200 status: %d",
                    response.status_code,
                )
                raise TTSError("Voice response is temporarily unavailable.")

            data = response.json()
            audios = data.get("audios", [])
            if not audios or not isinstance(audios[0], str):
                logger.warning("Sarvam TTS API returned empty or invalid audio data.")
                raise TTSError("Voice response is temporarily unavailable.")

            audio_b64 = audios[0]
            try:
                audio_bytes = base64.b64decode(audio_b64)
            except Exception:
                audio_bytes = b""

            return TTSAudioResult(
                audio_base64=audio_b64,
                audio_bytes=audio_bytes,
                mime_type=f"audio/{self.output_codec}",
                sample_rate=self.sample_rate,
                request_id=data.get("request_id"),
            )

        except TTSError:
            raise
        except Exception as exc:
            # Mask API key, headers, and internal socket details
            logger.error("Error connecting to Sarvam TTS API: %s", type(exc).__name__)
            raise TTSError("Voice response is temporarily unavailable.")
