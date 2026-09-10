"""
services/sarvam_stt_service.py
==============================
Speech-to-Text (STT) service interfacing with Sarvam AI's real-time streaming
WebSocket API (Saaras models).

Specifically tailored for telephone audio streams:
  - 8000 Hz sample rate (narrowband telephony standard)
  - Raw 16-bit linear PCM little-endian (pcm_s16le)
  - Single channel (mono)

Lifecycle:
  1. Initialize with API key, model, language code, and audio specifications.
  2. Connect to Sarvam streaming WebSocket endpoint (wss://api.sarvam.ai/speech-to-text-realtime/ws).
  3. Stream binary audio chunks encoded as base64 in structured audio_input events.
  4. Receive and parse incoming Sarvam events.
  5. Normalize events into provider-neutral schemas:
       - transcript.partial: Interim hypotheses while speaker is talking
       - transcript.final: Final committed transcript for utterance
       - error: Provider or processing errors sanitized for safety
  6. Graceful cleanup and teardown on disconnect or error.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
import urllib.parse
from typing import Any, Callable, Coroutine, Dict, Optional

import websockets

from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Supported Indian languages + English (extensible for all Saaras languages)
SUPPORTED_LANGUAGES: Dict[str, str] = {
    "en-IN": "English (India)",
    "hi-IN": "Hindi",
    "mr-IN": "Marathi",
    # Extensible for additional Indian languages supported by Sarvam Saaras
    "bn-IN": "Bengali",
    "te-IN": "Telugu",
    "ta-IN": "Tamil",
    "kn-IN": "Kannada",
    "gu-IN": "Gujarati",
    "pa-IN": "Punjabi",
    "ml-IN": "Malayalam",
    "od-IN": "Odia",
}

DEFAULT_LANGUAGE: str = "en-IN"
DEFAULT_MODEL: str = "saaras:v3-realtime"
DEFAULT_SAMPLE_RATE: int = 8000
DEFAULT_AUDIO_CODEC: str = "pcm_s16le"
DEFAULT_WS_URL: str = "wss://api.sarvam.ai/speech-to-text-realtime/ws"


class SarvamSTTService:
    """
    Client service for streaming audio to Sarvam AI Realtime Speech-to-Text WebSocket API.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        language_code: Optional[str] = None,
        sample_rate: Optional[int] = None,
        audio_codec: Optional[str] = None,
        ws_url: Optional[str] = None,
    ) -> None:
        self.api_key: Optional[str] = api_key or settings.SARVAM_API_KEY
        self.model: str = model or settings.SARVAM_STT_MODEL or DEFAULT_MODEL
        lang = language_code or settings.SARVAM_STT_LANGUAGE_CODE or DEFAULT_LANGUAGE
        self.language_code: str = lang if lang in SUPPORTED_LANGUAGES else DEFAULT_LANGUAGE
        self.sample_rate: int = sample_rate or settings.SARVAM_STT_SAMPLE_RATE or DEFAULT_SAMPLE_RATE
        self.audio_codec: str = audio_codec or settings.SARVAM_STT_AUDIO_CODEC or DEFAULT_AUDIO_CODEC
        self.ws_url: str = ws_url or settings.SARVAM_STT_WS_URL or DEFAULT_WS_URL

        self._ws: Optional[Any] = None
        self._is_connected: bool = False
        self._listener_task: Optional[asyncio.Task] = None
        self._on_event: Optional[Callable[[Dict[str, Any]], Coroutine[Any, Any, None]]] = None

    @property
    def is_connected(self) -> bool:
        """Check if WebSocket is actively connected."""
        return self._is_connected and self._ws is not None

    def build_ws_url(self) -> str:
        """Construct the authenticated Sarvam streaming WebSocket URL with query params."""
        params = {
            "model": self.model,
            "language_code": self.language_code,
            "sample_rate": str(self.sample_rate),
        }
        encoded = urllib.parse.urlencode(params)
        return f"{self.ws_url}?{encoded}"

    async def connect(self) -> bool:
        """
        Establish connection to Sarvam real-time STT WebSocket.
        Returns True if connected successfully, False otherwise.
        """
        if not self.api_key:
            logger.warning("Cannot connect to Sarvam STT: SARVAM_API_KEY is missing or empty.")
            return False

        url = self.build_ws_url()
        headers = {
            "api-subscription-key": self.api_key,
        }

        try:
            # Connect via async websockets client
            self._ws = await websockets.connect(
                url,
                additional_headers=headers,
                open_timeout=10.0,
                close_timeout=5.0,
                ping_interval=20,
                ping_timeout=10,
            )
            self._is_connected = True
            logger.info(
                "Connected to Sarvam STT WebSocket (model=%s, lang=%s, sample_rate=%d)",
                self.model,
                self.language_code,
                self.sample_rate,
            )
            return True
        except Exception as exc:
            # Mask API key and internal socket exceptions
            logger.error("Failed to connect to Sarvam STT WebSocket: %s", type(exc).__name__)
            self._is_connected = False
            self._ws = None
            return False

    async def send_audio(self, chunk: bytes) -> bool:
        """
        Send a raw PCM audio chunk (8 kHz, 16-bit mono) to Sarvam STT as base64 audio_input.
        Returns True if sent, False if connection is not ready or send fails.
        """
        if not self.is_connected or not self._ws:
            return False

        if not chunk:
            return True

        try:
            b64_audio = base64.b64encode(chunk).decode("utf-8")
            payload = {
                "event": "audio_input",
                "audio": b64_audio,
            }
            await self._ws.send(json.dumps(payload))
            return True
        except Exception as exc:
            logger.warning("Error forwarding audio chunk to Sarvam STT: %s", type(exc).__name__)
            return False

    def normalize_event(self, raw_data: Any) -> Optional[Dict[str, Any]]:
        """
        Convert raw Sarvam WebSocket payload into clean provider-neutral schema.

        Output formats:
          - transcript.partial: {"success": True, "type": "transcript.partial", "text": "..."}
          - transcript.final:   {"success": True, "type": "transcript.final", "text": "..."}
          - error:              {"success": False, "type": "error", "error": "provider_error", "message": "..."}
        """
        if not isinstance(raw_data, dict):
            return None

        event_type = raw_data.get("event") or raw_data.get("type") or ""

        # Extract text safely from diverse payload variations
        text = (
            raw_data.get("transcript")
            or raw_data.get("text")
            or (raw_data.get("data") if isinstance(raw_data.get("data"), str) else None)
            or (raw_data.get("data", {}).get("transcript") if isinstance(raw_data.get("data"), dict) else None)
            or (raw_data.get("data", {}).get("text") if isinstance(raw_data.get("data"), dict) else None)
            or ""
        )
        text = str(text).strip()

        # Handle provider error event
        if event_type == "error" or raw_data.get("error"):
            logger.warning("Sarvam STT returned provider error event")
            return {
                "success": False,
                "type": "error",
                "error": "stt_provider_error",
                "message": "Speech recognition provider encountered an error",
            }

        # Check for final transcript
        is_final = raw_data.get("is_final") is True or "final" in event_type
        if is_final:
            if text:
                return {
                    "success": True,
                    "type": "transcript.final",
                    "text": text,
                }
            return None

        # Check for partial / interim transcript
        is_partial = (
            raw_data.get("is_final") is False
            or "partial" in event_type
            or "interim" in event_type
        )
        if is_partial or (text and not is_final):
            if text:
                return {
                    "success": True,
                    "type": "transcript.partial",
                    "text": text,
                }
            return None

        # Ignore heartbeat/connection control signals
        return None

    async def start_listening(
        self,
        on_event: Callable[[Dict[str, Any]], Coroutine[Any, Any, None]],
    ) -> None:
        """
        Start the background listener loop consuming messages from Sarvam.
        Calls on_event(normalized_event) for each normalized event.
        """
        self._on_event = on_event
        self._listener_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self) -> None:
        """Consume messages from the Sarvam WebSocket until disconnected or cancelled."""
        try:
            while self._is_connected and self._ws:
                try:
                    raw_msg = await self._ws.recv()
                except websockets.exceptions.ConnectionClosed as cc:
                    close_code = cc.rcvd.code if getattr(cc, "rcvd", None) else getattr(cc, "code", 1000)
                    logger.info("Sarvam STT connection closed by provider (code=%s)", close_code)
                    break
                except Exception as exc:
                    logger.warning("Error reading from Sarvam STT socket: %s", type(exc).__name__)
                    break

                if isinstance(raw_msg, bytes):
                    try:
                        raw_msg = raw_msg.decode("utf-8")
                    except Exception:
                        continue

                try:
                    data = json.loads(raw_msg)
                except Exception:
                    logger.warning("Received non-JSON frame from Sarvam STT")
                    continue

                normalized = self.normalize_event(data)
                if normalized and self._on_event:
                    try:
                        await self._on_event(normalized)
                    except Exception as cb_err:
                        logger.error("Error executing STT event callback: %s", cb_err)

        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.error("Unexpected error in Sarvam STT listener loop: %s", type(exc).__name__, exc_info=True)
        finally:
            self._is_connected = False
            # If closed unexpectedly, notify callback
            if self._on_event:
                try:
                    await self._on_event({
                        "success": False,
                        "type": "error",
                        "error": "stt_disconnected",
                        "message": "Speech-to-text connection closed",
                    })
                except Exception:
                    pass

    async def close(self) -> None:
        """Cleanly cancel the listener loop and close the WebSocket connection."""
        self._is_connected = False

        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except (asyncio.CancelledError, Exception):
                pass
            self._listener_task = None

        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

        logger.debug("Sarvam STT service closed cleanly")
