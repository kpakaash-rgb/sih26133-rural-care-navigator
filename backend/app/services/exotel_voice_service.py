"""
services/exotel_voice_service.py
================================
Adapter service for Exotel VoiceBot / AgentStream bidirectional WebSocket audio.

Responsibilities:
  1. Audio normalization:
     - Inbound: Exotel raw linear PCM16 (pcm_s16le / slin, 8000 Hz, mono) -> 8 kHz linear PCM16 (pcm_s16le) for Sarvam STT.
     - Outbound: Sarvam TTS 8 kHz WAV -> raw PCM16 S16LE (WAV header stripped), chunked to ~100ms (1600 bytes, multiples of 320 bytes) base64 payloads.
  2. Protocol events:
     - Serialization and parsing for connected, start, media, dtmf, mark, clear, and stop events.
  3. Session management:
     - Isolated, in-memory call and stream metadata per connection (call_sid, stream_sid, encoding).
  4. Outbound call helper:
     - Initiate calls via Exotel REST API with strict credential sanitization.
"""

from __future__ import annotations

import asyncio
import base64
from dataclasses import dataclass, field
from enum import Enum
import io
import json
import logging
import math
import re
from typing import Any, Dict, List, Optional, Tuple
import warnings
import wave

import httpx

from backend.app.core.config import settings

logger = logging.getLogger(__name__)


class IVRState(str, Enum):
    """Lifecycle states for conversational Exotel VoiceBot session."""
    LANGUAGE_SELECTION = "LANGUAGE_SELECTION"
    WAITING_FOR_SYMPTOMS = "WAITING_FOR_SYMPTOMS"
    COLLECTING_SYMPTOMS = "COLLECTING_SYMPTOMS"
    ASKING_DURATION = "ASKING_DURATION"
    ASKING_RED_FLAGS = "ASKING_RED_FLAGS"
    CONFIRMING_SYMPTOMS = "CONFIRMING_SYMPTOMS"
    PROCESSING_TRIAGE = "PROCESSING_TRIAGE"
    WAITING_FOR_NAME = "WAITING_FOR_NAME"
    WAITING_FOR_AGE = "WAITING_FOR_AGE"
    WAITING_FOR_GENDER = "WAITING_FOR_GENDER"
    WAITING_FOR_SAFETY = "WAITING_FOR_SAFETY"
    WAITING_FOR_LOCALITY = "WAITING_FOR_LOCALITY"
    CONFIRMING_LOCALITY = "CONFIRMING_LOCALITY"
    WAITING_FOR_LOCATION = "WAITING_FOR_LOCATION"
    CONFIRMING_LOCATION = "CONFIRMING_LOCATION"
    FACILITY_SELECTION = "FACILITY_SELECTION"
    FACILITY_RECOMMENDATION = "FACILITY_RECOMMENDATION"
    BOOKING_SELECTION = "BOOKING_SELECTION"
    BOOKING_TYPE_SELECTION = "BOOKING_TYPE_SELECTION"
    BOOKING_CONFIRMATION = "BOOKING_CONFIRMATION"
    PRESENTING_RECOMMENDATION = "PRESENTING_RECOMMENDATION"
    SPEAKING_RESPONSE = "SPEAKING_RESPONSE"
    WAITING_FOR_NEXT_ACTION = "WAITING_FOR_NEXT_ACTION"
    ENDED = "ENDED"


# Bilingual Prompts
EXOTEL_INITIAL_LANGUAGE_MENU: str = (
    "Namaste. Rural Care Navigator mein aapka swagat hai. "
    "For English, press 1. Hindi ke liye 2 dabayein."
)
EXOTEL_GREETING_TEXT: str = EXOTEL_INITIAL_LANGUAGE_MENU

EXOTEL_SYMPTOM_PROMPT_EN: str = (
    "Please describe your symptoms, or use your keypad: "
    "1 for fever, 2 for cough, 3 for pain, 4 for stomach issues, "
    "5 for injury, 0 for emergency."
)

EXOTEL_SYMPTOM_PROMPT_HI: str = (
    "Kripya apni bimari ke lakshan batayein, ya keypad dabayein: "
    "bukhar ke liye 1, khansi ke liye 2, dard ke liye 3, "
    "pet samasya ke liye 4, chot ke liye 5, aapatkal ke liye 0."
)

EXOTEL_EMERGENCY_PROMPT_EN: str = (
    "This may be an emergency. Please tell me your current village, town, or location immediately."
)

EXOTEL_EMERGENCY_PROMPT_HI: str = (
    "Yeh ek aapatkalin sthiti ho sakti hai. Kripya turant apna gaon ya sthan batayein."
)

EXOTEL_LANG_INVALID_RETRY_EN: str = (
    "Invalid option. For English, press 1. Hindi ke liye 2 dabayein."
)

EXOTEL_LANG_FALLBACK_EN: str = (
    "Setting default language to English. Please describe your symptoms "
    "or press digits on your keypad."
)

DTMF_SYMPTOM_CODE_MAP: Dict[str, str] = {
    "1": "fever",
    "2": "cough",
    "3": "pain",
    "4": "stomach problem",
    "5": "injury",
}

DTMF_LOCATION_CODE_MAP: Dict[str, str] = {
    "1": "Malshiras",
    "2": "Akluj",
    "3": "Pandharpur",
    "4": "other",
}

KNOWN_LOCATIONS: Dict[str, str] = {
    "malshiras": "Malshiras",
    "akluj": "Akluj",
    "pandharpur": "Pandharpur",
    "solapur": "Solapur",
}

AFFIRMATIVE_WORDS = {
    "yes", "yeah", "yep", "correct", "right", "sure", "haan", "haanji", "hanji",
    "sahi", "theek", "bilkul", "yes please", "हाँ", "हा", "सही", "हाँजी", "जी हाँ", "ji haan", "ji han"
}

NEGATIVE_WORDS = {
    "no", "nope", "nah", "not really", "nothing", "nothing else", "none",
    "nahin", "nahi", "na", "kuch nahi", "kuch nahin", "नहीं", "ना", "कुछ नहीं", "जी नहीं", "ji nahi"
}

SYMPTOM_KEYWORD_MAP: Dict[str, List[str]] = {
    "fever": [
        "fever", "high temperature", "bukhar", "hot body", "pyrexia", "feverish", "shivering", "taap"
    ],
    "cough": [
        "cough", "coughing", "dry cough", "wet cough", "khasi", "khansi", "throat infection", "cold", "sardi", "jukham"
    ],
    "chest_pain": [
        "chest pain", "pain in chest", "heart pain", "pressure on chest", "chhati mein dard", "seene mein dard"
    ],
    "shortness_of_breath": [
        "shortness of breath", "breathless", "difficulty breathing", "trouble breathing",
        "saans phoolna", "saans lene mein dikkat", "saans lene mein takleef"
    ],
    "abdominal_pain": [
        "stomach pain", "abdominal pain", "tummy ache", "belly pain", "pet dard", "pet mein dard", "stomach ache"
    ],
    "injury": [
        "injury", "injured", "injured my", "fell down", "fall", "wound", "bleeding", "accident",
        "fracture", "cut", "bruise", "trauma", "sprain", "broken bone", "hurt my leg", "hurt my arm",
        "hurt my hand", "hurt my foot", "injured leg", "injured hand", "injured arm", "injured foot",
        "chot", "chot lag", "gir gaya", "gir gayi", "ghayal", "khoon nikal", "haddi toot", "zakhm"
    ],
    "headache": [
        "headache", "head pain", "sir dard", "sar dard", "sar ghumna", "dizziness"
    ],
    "vomiting": [
        "vomiting", "vomit", "throwing up", "ulti", "ji machlana", "nausea"
    ],
    "diarrhea": [
        "diarrhea", "loose motion", "dast", "loose stools"
    ],
}

RED_FLAG_TERMS: List[str] = [
    "difficulty breathing", "severe chest pain", "unconscious", "heavy bleeding",
    "unable to breathe", "loss of consciousness", "bluish lips", "seene mein tez dard",
    "chhati mein tez dard", "saans lene mein bahut dikkat", "behosh", "tez khoon behna",
    "severe bleeding", "heart attack", "stroke", "poisoning"
]


def extract_symptoms(text: str) -> List[str]:
    """Extract clinical symptom keys from transcribed speech text in English or Hindi."""
    clean = (text or "").lower()
    found: List[str] = []
    for symptom_key, terms in SYMPTOM_KEYWORD_MAP.items():
        for term in terms:
            if re.search(r"\b" + re.escape(term) + r"\b", clean):
                if symptom_key not in found:
                    found.append(symptom_key)
                break
    return found


def extract_duration(text: str) -> Optional[str]:
    """Extract symptom duration from speech (e.g. '2 days', 'since yesterday', 'kal se')."""
    clean = (text or "").lower().strip()
    if not clean:
        return None

    # Number + day/week/month patterns
    match = re.search(r"(\d+|one|two|three|four|five|six|seven|ten)\s*(day|days|week|weeks|month|months|din|hafte|mahine)", clean)
    if match:
        return match.group(0)

    # Relative time phrases
    time_phrases = [
        ("since yesterday", "since yesterday"),
        ("yesterday", "since yesterday"),
        ("kal se", "since yesterday"),
        ("parson se", "for 2 days"),
        ("today", "since today"),
        ("aaj se", "since today"),
        ("aaj subah se", "since this morning"),
        ("morning", "since this morning"),
        ("few days", "for a few days"),
        ("kuch din se", "for a few days"),
        ("ek hafte se", "for 1 week"),
        ("do din se", "for 2 days"),
        ("teen din se", "for 3 days"),
    ]
    for phrase, norm in time_phrases:
        if phrase in clean:
            return norm

    return None


def check_red_flags_in_speech(text: str) -> bool:
    """Check if speech contains life-threatening red-flag indicators."""
    clean = (text or "").lower()
    for rf in RED_FLAG_TERMS:
        if rf in clean:
            return True
    return False


def extract_booking_intent(text: str) -> Optional[bool]:
    """Check if caller indicates intent to book an appointment or see a doctor."""
    clean = (text or "").lower()
    if is_affirmative(clean):
        return True
    if is_negative(clean):
        return False
    book_keywords = ["book", "appointment", "doctor", "milna", "dikha", "visit", "schedule", "slot", "chahiye"]
    if any(k in clean for k in book_keywords):
        return True
    decline_keywords = ["no need", "cancel", "not now", "baad mein", "nahi chahiye", "rehne do"]
    if any(k in clean for k in decline_keywords):
        return False
    return None


def extract_booking_type(text: str) -> str:
    """Extract preferred consultation type: phone or offline (default offline)."""
    clean = (text or "").lower()
    if any(k in clean for k in ("phone", "call", "audio", "teleconsultation", "phone par", "call par", "1")):
        return "phone"
    if any(k in clean for k in ("offline", "in person", "visit", "clinic", "hospital", "aspatal", "kendra", "2")):
        return "offline"
    return "offline"


def is_affirmative(text: str) -> bool:
    """Check if transcribed speech indicates affirmative confirmation."""
    clean = (text or "").strip().lower().rstrip(".,!?")
    if clean in AFFIRMATIVE_WORDS:
        return True
    tokens = [w.strip(".,!?:;\"'") for w in clean.split()]
    return any(w in tokens for w in ("yes", "haan", "haanji", "हाँ", "हा", "sahi", "theek", "sure", "yep", "yeah", "bilkul"))


def is_negative(text: str) -> bool:
    """Check if transcribed speech indicates negative confirmation."""
    clean = (text or "").strip().lower().rstrip(".,!?")
    if clean in NEGATIVE_WORDS:
        return True
    tokens = [w.strip(".,!?:;\"'") for w in clean.split()]
    return any(w in tokens for w in ("no", "nahin", "nahi", "nope", "nah", "none", "nothing", "नहीं", "ना", "never"))


def extract_location(text: str) -> Optional[str]:
    """Extract village/town/city name from speech text."""
    t = (text or "").lower().strip()
    for loc_key, loc_name in KNOWN_LOCATIONS.items():
        if loc_key in t:
            return loc_name
    # Strip common conversational prepositions to capture user-spoken village names
    clean_loc = re.sub(r"^(i am from|i live in|i am at|at|in|near|se|mein|me)\s+", "", t)
    clean_loc = clean_loc.strip(".,!? ")
    if clean_loc and len(clean_loc.split()) <= 3 and not any(w in clean_loc for w in ("yes", "no", "doctor", "appointment")):
        return clean_loc.title()
    return None


DEFAULT_FACILITIES_DATA = [
    {
        "id": 1,
        "name": "PHC Malshiras",
        "type": "PRIMARY_HEALTH_CENTRE",
        "address": "Main Road, Malshiras Village, Taluka Malshiras",
        "district": "Solapur",
        "status": "ACTIVE",
        "emergency_capable": False,
        "services": ["General Medicine", "Doctor", "Basic Tests", "Medicines"],
    },
    {
        "id": 2,
        "name": "CHC Akluj",
        "type": "COMMUNITY_HEALTH_CENTRE",
        "address": "Station Road, Akluj",
        "district": "Solapur",
        "status": "ACTIVE",
        "emergency_capable": True,
        "services": ["General Medicine", "Doctor", "Basic Tests", "Advanced Tests", "Medicines", "Specialist Consultation"],
    },
    {
        "id": 3,
        "name": "District Hospital Solapur",
        "type": "DISTRICT_HOSPITAL",
        "address": "Civil Hospital Road, Solapur City",
        "district": "Solapur",
        "status": "ACTIVE",
        "emergency_capable": True,
        "services": ["General Medicine", "Doctor", "Basic Tests", "Advanced Tests", "Medicines", "Specialist Consultation"],
    },
    {
        "id": 4,
        "name": "Mobile Medical Unit Pandharpur",
        "type": "MOBILE_CLINIC",
        "address": "Pandharpur Rural Route - Stops at designated Gram Panchayats",
        "district": "Solapur",
        "status": "ACTIVE",
        "emergency_capable": False,
        "services": ["General Medicine", "Basic Tests", "Medicines"],
    },
]


def find_recommended_facility(
    location_query: Optional[str] = None,
    care_level: Optional[str] = None,
    emergency: bool = False,
    db: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Discover and rank real facilities from the database based on location, care level,
    and emergency suitability. Uses DEMO_FACILITIES fallback if database is inaccessible.
    """
    facilities: List[Dict[str, Any]] = []
    own_session = False
    session = db

    if session is None:
        try:
            from backend.app.database.connection import SessionLocal
            session = SessionLocal()
            own_session = True
        except Exception as conn_err:
            logger.debug("find_recommended_facility: could not create SessionLocal: %s", conn_err)

    if session is not None:
        try:
            from sqlalchemy import select
            from backend.app.models.facility import Facility
            stmt = select(Facility).where(Facility.status == "ACTIVE")
            db_facs = session.scalars(stmt).all()
            for fac in db_facs:
                svc_names = [s.name for s in (fac.services or []) if s.available]
                facilities.append({
                    "id": fac.id,
                    "name": fac.name,
                    "type": fac.type,
                    "address": fac.address,
                    "district": fac.district,
                    "status": fac.status,
                    "emergency_capable": fac.type in ("DISTRICT_HOSPITAL", "COMMUNITY_HEALTH_CENTRE"),
                    "services": svc_names,
                })
        except Exception as q_err:
            logger.debug("find_recommended_facility: query failed (%s), using fallback records", q_err)
        finally:
            if own_session and session is not None:
                try:
                    session.close()
                except Exception:
                    pass

    if not facilities:
        facilities = list(DEFAULT_FACILITIES_DATA)

    loc_str = (location_query or "").strip().lower()

    # 1. Emergency ranking
    if emergency:
        emergency_candidates = [f for f in facilities if f.get("emergency_capable") or f.get("type") in ("DISTRICT_HOSPITAL", "COMMUNITY_HEALTH_CENTRE")]
        if not emergency_candidates:
            emergency_candidates = facilities

        # Match location if present
        if loc_str:
            for fac in emergency_candidates:
                if loc_str in fac["name"].lower() or loc_str in fac["address"].lower():
                    return fac

        # Prioritize District Hospital for highest-acuity emergency
        for fac in emergency_candidates:
            if fac.get("type") == "DISTRICT_HOSPITAL":
                return fac
        return emergency_candidates[0]

    # 2. Non-emergency care level matching
    target_type = "PRIMARY_HEALTH_CENTRE"
    care_str = (care_level or "").lower()
    if "primary health centre" in care_str or "phc" in care_str:
        target_type = "PRIMARY_HEALTH_CENTRE"
    elif "community health" in care_str or "chc" in care_str:
        target_type = "COMMUNITY_HEALTH_CENTRE"
    elif "district hospital" in care_str:
        target_type = "DISTRICT_HOSPITAL"

    # Match location if caller provided one
    if loc_str:
        for fac in facilities:
            if loc_str in fac["name"].lower() or loc_str in fac["address"].lower():
                return fac

    # Match by target care type
    for fac in facilities:
        if fac.get("type") == target_type:
            return fac

    return facilities[0]


def build_conversational_response(
    response_type: str,
    urgency: Optional[str] = None,
    emergency: bool = False,
    recommended_care: Optional[str] = None,
    reason: Optional[str] = None,
    facility: Optional[Dict[str, Any]] = None,
    language_code: str = "en-IN",
    symptoms: Optional[List[str]] = None,
    location: Optional[str] = None,
) -> str:
    """
    Generate dynamic, telephone-friendly spoken responses in English or Hindi.
    Integrates clinical triage findings and real facility data.
    """
    lang = (language_code or "en-IN").strip().lower()
    is_hindi = "hi" in lang

    if response_type == "symptom_ack":
        sym_list = symptoms or []
        if is_hindi:
            sym_str = ", ".join(sym_list) if sym_list else "lakshan"
            return (
                f"Maine {sym_str} darj kar liya hai. "
                "Yeh lakshan kitne din se hain, aur kya saans lene mein takleef ya chhati mein tez dard hai?"
            )
        sym_str = ", ".join(sym_list) if sym_list else "your symptoms"
        return (
            f"I noted {sym_str}. How many days have you had these symptoms, "
            "and do you have any difficulty breathing or severe chest pain?"
        )

    if response_type == "ask_duration":
        if is_hindi:
            return "Yeh lakshan kitne samay se hain? Jaise kal se, do din se, ya ek hafte se?"
        return "How long have you had these symptoms? For example, since yesterday, two days, or a week?"

    if response_type == "ask_red_flags":
        if is_hindi:
            return "Kya aapko saans lene mein bahut dikkat, chhati mein tez dard, ya behoshi lag rahi hai?"
        return "Are you experiencing any severe chest pain, extreme difficulty breathing, or dizziness?"

    if response_type == "emergency_location_prompt":
        if is_hindi:
            return (
                "Yeh ek aapatkalin sthiti ho sakti hai. Kripya turant apna gaon ya sthan batayein "
                "taaki main nazdiki aapatkalin aspatal ki jankari de sakoon."
            )
        return (
            "This is an emergency. Please tell me your current village, town, or location immediately "
            "so I can identify the nearest suitable hospital."
        )

    if response_type == "location_prompt" or response_type == "ask_locality":
        if is_hindi:
            return "Dhanyawad. Kripya apna gaon, kasba, ya sthan batayein taaki main upyukt chikitsa kendra dhoondh sakoon."
        return "Thank you. Please tell me your village, town, or current location so I can find a suitable healthcare facility for you."

    if response_type == "emergency_guidance":
        fac_name = facility.get("name", "District Hospital Solapur") if facility else "nearest emergency hospital"
        fac_address = facility.get("address", "Solapur") if facility else "nearby"
        if is_hindi:
            return (
                f"Aapatkalin suvidha {fac_name}, {fac_address} par uplabdh hai. "
                "Kripya turant ambulance ke liye 108 par call karein ya seedhe is aspatal jayein."
            )
        return (
            f"Emergency care is available at {fac_name}, located at {fac_address}. "
            "Please call 108 for an ambulance immediately, or proceed directly to this emergency hospital."
        )

    if response_type == "recommendation":
        fac_name = facility.get("name", "District Hospital Solapur") if facility else "Primary Health Centre"
        fac_address = facility.get("address", "Solapur") if facility else "nearby"

        if emergency or urgency == "emergency":
            if is_hindi:
                return (
                    f"Yeh ek aapatkalin sthiti hai. Sabse upyukt aapatkalin aspatal {fac_name}, {fac_address} hai. "
                    "Kripya turant ambulance ke liye 108 par call karein ya aspatal jayein."
                )
            return (
                f"This is an emergency. The most suitable emergency facility is {fac_name} located at {fac_address}. "
                "Please call 108 for an ambulance immediately or seek emergency medical attention."
            )

        if urgency == "needs_attention":
            if is_hindi:
                return (
                    f"Aapke lakshanon ke aadhar par, Primary Health Centre ya doctor se jaanch karwayein. "
                    f"Mainne {fac_name}, {fac_address} ko upyukt kendra ke roop mein paya hai. "
                    "Kya aap yahan doctor se appointment book karna chahte hain?"
                )
            return (
                f"Based on your symptoms, please visit a Primary Health Centre or doctor for evaluation. "
                f"I found {fac_name} at {fac_address} as a suitable facility. "
                "Would you like to book an appointment with a doctor here?"
            )

        # Routine
        if is_hindi:
            return (
                f"Aapke lakshan samanya lag rahe hain. Routine healthcare ki sifarish ki jaati hai. "
                f"Aap {fac_name}, {fac_address} par jaanch karwa sakte hain. "
                "Kya aap yahan doctor se appointment book karna chahte hain?"
            )
        return (
            f"Your symptoms appear routine. Routine healthcare is recommended. "
            f"You can visit {fac_name} at {fac_address}. "
            "Would you like to book an appointment with a doctor here?"
        )

    if response_type == "ask_booking":
        if is_hindi:
            return "Kya aap is kendra mein doctor se appointment book karna chahte hain?"
        return "Would you like to book an appointment with a doctor at this facility?"

    if response_type == "ask_booking_type":
        if is_hindi:
            return "Aap kis prakar ki jaanch chahenge? Phone par doctor se baat karne ke liye 1 dabayein, ya aspatal jakar milne ke liye 2 dabayein."
        return "What type of appointment would you prefer? Press 1 or say Phone for a call consultation, or press 2 or say Visit for an in-person clinic visit."

    if response_type == "confirm_slot":
        slot_time = facility.get("slot_time", "today at 11:00 AM") if facility else "upcoming slot"
        fac_name = facility.get("name", "the healthcare centre") if facility else "the healthcare centre"
        if is_hindi:
            return f"Hamare paas {fac_name} mein {slot_time} par slot uplabdh hai. Kya main ise confirm kar doon?"
        return f"We have an available slot at {fac_name} on {slot_time}. Would you like me to confirm this booking?"

    if response_type == "booking_success":
        apt_id = facility.get("appointment_id", "") if facility else ""
        apt_type = str(facility.get("appointment_type", "") if facility else "").lower()
        if "phone" in apt_type:
            type_label = "phone consultation"
            type_label_hi = "phone consultation"
        else:
            type_label = "appointment"
            type_label_hi = "appointment"
        if is_hindi:
            id_txt = f"Aapka booking number {apt_id} hai. " if apt_id else ""
            return f"Aapka {type_label_hi} book ho gaya hai. {id_txt}Kripya samay par uplabdh rahein. Apna khayal rakhein. Namaste."
        id_txt = f"Your booking number is {apt_id}. " if apt_id else ""
        return f"Your {type_label} has been booked. {id_txt}Please be available at the scheduled time. Take care and goodbye."

    if response_type == "booking_declined" or response_type == "negative_confirmation":
        if is_hindi:
            return "Samajh gaya. Kripya nirdeshit chikitsa kendra jayein. Apna khayal rakhein. Namaste."
        return "Understood. Please visit the recommended facility as advised. Take care and goodbye."

    # Default fallback
    if is_hindi:
        return "Kripya apna agla sandesh batayein."
    return "Please let me know how else I can help."


def build_bilingual_spoken_response(
    urgency: str,
    emergency: bool = False,
    recommended_care: Optional[str] = None,
    reason: Optional[str] = None,
    language_code: str = "en-IN",
    facility: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Build a culturally appropriate spoken response in the selected language.
    English (en-IN) or Hindi (hi-IN).
    Preserves clinical recommendation and urgency from run_triage().
    """
    if facility:
        return build_conversational_response(
            response_type="recommendation",
            urgency=urgency,
            emergency=emergency,
            recommended_care=recommended_care,
            reason=reason,
            facility=facility,
            language_code=language_code,
        )

    lang = (language_code or "en-IN").strip().lower()
    is_hindi = "hi" in lang

    if emergency or urgency == "emergency":
        if is_hindi:
            return (
                "Yeh ek aapatkalin sthiti hai. Kripya turant nazdiki "
                "aspatal ya aapatkalin chikitsa seva se sampark karein."
            )
        return (
            "This is an emergency. Please seek emergency medical attention "
            "immediately at the nearest hospital or emergency department."
        )

    if urgency == "needs_attention":
        if is_hindi:
            return (
                "Aapke lakshanon ke aadhar par, kripya jald se jald "
                "Primary Health Centre ya nazdiki chikitsak se jaanch karwayein."
            )
        return (
            "Based on your symptoms, please visit a Primary Health Centre "
            "or consult a doctor soon for medical evaluation."
        )

    # Default routine / self-care
    if is_hindi:
        return (
            "Aapke lakshan samanya lag rahe hain. Kripya aaram karein aur "
            "yadi sthiti bigade toh nazdiki chikitsa kendra jayein."
        )
    return (
        "Your symptoms appear routine. Routine healthcare is recommended. "
        "Please monitor your health and visit a local healthcare facility if you feel worse."
    )


class ExotelConfigurationError(Exception):
    """Raised when required Exotel credentials or configurations are missing."""
    def __init__(self, message: str = "Exotel credentials are not configured."):
        super().__init__(message)
        self.message = message


class ExotelCallError(Exception):
    """Raised when Exotel call initiation fails."""
    def __init__(self, message: str = "Failed to initiate telephone call."):
        super().__init__(message)
        self.message = message


def resample_pcm_audio(
    pcm_bytes: bytes,
    source_rate: int,
    target_rate: int = 8000,
    channels: int = 1,
    sample_width: int = 2,
) -> bytes:
    """
    Resample signed 16-bit linear PCM audio to target_rate (default 8000 Hz).

    - If source_rate == target_rate or pcm_bytes is empty, returns pcm_bytes unchanged.
    - Uses scipy.signal.resample_poly for high-quality polyphase FIR anti-aliased resampling.
    - Fallback: uses audioop.ratecv for fast fractional rate conversion.
    - Preserves signed 16-bit little-endian PCM format, clips to [-32768, 32767] to prevent distortion,
      and preserves approximate duration.
    """
    if not pcm_bytes or source_rate == target_rate:
        return pcm_bytes

    if sample_width != 2:
        logger.warning("resample_pcm_audio: unexpected sample width %d bytes, expected 2", sample_width)

    # 1. Preferred: scipy.signal.resample_poly
    try:
        import numpy as np
        from scipy import signal

        samples_in = np.frombuffer(pcm_bytes, dtype=np.int16)
        gcd = math.gcd(target_rate, source_rate)
        up = target_rate // gcd
        down = source_rate // gcd

        resampled = signal.resample_poly(samples_in, up, down)
        resampled_int16 = np.clip(resampled, -32768, 32767).astype(np.int16)
        return resampled_int16.tobytes()
    except Exception as scipy_err:
        logger.debug("scipy.signal.resample_poly unavailable (%s), falling back to audioop", scipy_err)

    # 2. Fallback: Python standard library audioop.ratecv
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            import audioop
            resampled, _ = audioop.ratecv(pcm_bytes, sample_width, channels, source_rate, target_rate, None)
            if len(resampled) % 2 != 0:
                resampled = resampled[: len(resampled) - 1]
            return resampled
    except Exception as audioop_err:
        logger.error("All PCM audio resampling methods failed: %s", audioop_err)
        return pcm_bytes


def wav_to_pcm(
    wav_bytes: bytes,
    expected_rate: int = 8000,
    expected_channels: int = 1,
    expected_width: int = 2,
) -> bytes:
    """
    Parse a WAV container, verify parameters (8000 Hz, mono, 16-bit PCM),
    extract PCM frames, and resample to expected_rate (8000 Hz) if needed.

    Guarantees:
      - Valid signed 16-bit little-endian PCM (pcm_s16le).
      - Mono (single channel).
      - Exactly expected_rate (8000 Hz).
      - No WAV container headers.
      - No mu-law conversion.
    """
    if not wav_bytes:
        return b""

    try:
        with wave.open(io.BytesIO(wav_bytes), "rb") as wf:
            framerate = wf.getframerate()
            nchannels = wf.getnchannels()
            sampwidth = wf.getsampwidth()
            comptype = wf.getcomptype()
            nframes = wf.getnframes()

            if comptype != "NONE":
                logger.warning("WAV compression type is not PCM: %s", comptype)
            if nchannels != expected_channels:
                logger.warning("WAV has %d channel(s), expected %d", nchannels, expected_channels)
            if sampwidth != expected_width:
                logger.warning("WAV sample width is %d bytes, expected %d", sampwidth, expected_width)

            pcm_frames = wf.readframes(nframes)
            # Ensure valid PCM frame boundary (multiple of 2 bytes for 16-bit)
            if len(pcm_frames) % 2 != 0:
                pcm_frames = pcm_frames[: len(pcm_frames) - 1]

            # If sample rate matches target (8000 Hz), return frames unchanged
            if framerate == expected_rate:
                return pcm_frames

            # If sample rate differs (e.g. Sarvam 22050 Hz), resample to target rate (8000 Hz)
            source_duration = nframes / framerate if framerate else 0.0
            resampled_pcm = resample_pcm_audio(
                pcm_bytes=pcm_frames,
                source_rate=framerate,
                target_rate=expected_rate,
                channels=nchannels,
                sample_width=sampwidth,
            )

            output_samples = len(resampled_pcm) // (expected_width * expected_channels)
            output_duration = output_samples / expected_rate if expected_rate else 0.0

            logger.info(
                "[EXOTEL_AUDIO] Resampling completed: source_rate=%d, target_rate=%d, "
                "source_frame_count=%d, output_sample_count=%d, source_duration=%.3fs, "
                "output_duration=%.3fs, output_pcm_byte_length=%d",
                framerate,
                expected_rate,
                nframes,
                output_samples,
                source_duration,
                output_duration,
                len(resampled_pcm),
            )
            return resampled_pcm

    except Exception as exc:
        logger.debug("wave.open inspection failed (%s), attempting raw header fallback", exc)
        if (
            len(wav_bytes) > 44
            and wav_bytes[:4] == b"RIFF"
            and wav_bytes[8:12] == b"WAVE"
        ):
            # Locate 'data' subchunk to strip header cleanly
            data_idx = wav_bytes.find(b"data", 12)
            if data_idx != -1 and len(wav_bytes) >= data_idx + 8:
                raw = wav_bytes[data_idx + 8:]
            else:
                raw = wav_bytes[44:]
            if len(raw) % 2 != 0:
                raw = raw[: len(raw) - 1]
            return raw
        # If not a WAV container, assume already raw PCM bytes
        if len(wav_bytes) % 2 != 0:
            return wav_bytes[: len(wav_bytes) - 1]
        return wav_bytes


def mulaw_to_pcm16(data: bytes) -> bytes:
    """
    Convert 8-bit ITU-T G.711 mu-law audio to 16-bit linear PCM (little-endian).
    Generic helper retained for standalone/legacy use; not used in active Exotel VoiceBot path.
    """
    if not data:
        return b""

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            import audioop
            return audioop.ulaw2lin(data, 2)
    except Exception as exc:
        logger.warning("audioop.ulaw2lin failed (%s), returning unmodified bytes", exc)
        return data


def pcm16_to_mulaw(data: bytes) -> bytes:
    """
    Convert 16-bit linear PCM (little-endian) to 8-bit ITU-T G.711 mu-law audio.
    Generic helper retained for standalone/legacy use; not used in active Exotel VoiceBot path.
    """
    if not data:
        return b""

    try:
        with warnings.catch_warnings():
            warnings.simplefilter("ignore", DeprecationWarning)
            import audioop
            return audioop.lin2ulaw(data, 2)
    except Exception as exc:
        logger.warning("audioop.lin2ulaw failed (%s), returning unmodified bytes", exc)
        return data


def normalize_inbound_audio(audio_bytes: bytes, encoding: str = "audio/l16") -> bytes:
    """
    Normalize incoming audio from Exotel to 16-bit linear PCM (8 kHz mono) for Sarvam STT.

    Exotel VoiceBot sends raw signed 16-bit PCM (slin, 8000 Hz, mono).
    By default, inbound audio is treated directly as linear PCM S16LE without μ-law conversion.
    """
    if not audio_bytes:
        return b""

    enc = (encoding or "").lower()
    # Only convert if explicitly configured for mu-law (legacy non-VoiceBot use)
    if "mulaw" in enc or "ulaw" in enc or "pcmu" in enc:
        return mulaw_to_pcm16(audio_bytes)

    # Ensure valid 16-bit PCM alignment (multiple of 2 bytes)
    if len(audio_bytes) % 2 != 0:
        return audio_bytes[: len(audio_bytes) - 1]
    return audio_bytes


def chunk_outbound_audio(
    pcm_bytes: bytes,
    encoding: str = "audio/l16",
    chunk_duration_ms: int = 100,
    sample_rate: int = 8000,
) -> List[str]:
    """
    Convert raw 16-bit PCM bytes to Exotel stream format and slice into base64 chunks.

    For Exotel VoiceBot (16-bit signed PCM S16LE @ 8 kHz mono):
      - 8000 samples/sec * 2 bytes/sample = 16,000 bytes/sec
      - 100 ms chunk = 1600 PCM bytes (5 * 320 bytes, exactly a multiple of 320 bytes)
      - Chunks are valid PCM boundaries and multiples of 320 bytes as required by Exotel.
      - Outbound audio is NOT converted to μ-law.
    """
    if not pcm_bytes:
        return []

    enc = (encoding or "").lower()
    is_mulaw = "mulaw" in enc or "ulaw" in enc or "pcmu" in enc

    if is_mulaw:
        formatted_bytes = pcm16_to_mulaw(pcm_bytes)
        bytes_per_second = sample_rate * 1
        chunk_size = max(1, int(bytes_per_second * (chunk_duration_ms / 1000.0)))
    else:
        formatted_bytes = pcm_bytes
        # 16-bit PCM: 2 bytes per sample -> 8000 * 2 = 16000 bytes/sec
        bytes_per_second = sample_rate * 2
        # Target 1600 bytes (100 ms) which is exactly 5 * 320 bytes
        chunk_size = max(320, int(bytes_per_second * (chunk_duration_ms / 1000.0)))
        # Snap to multiple of 320 bytes
        chunk_size = (chunk_size // 320) * 320

    chunks: List[str] = []

    for i in range(0, len(formatted_bytes), chunk_size):
        slice_bytes = formatted_bytes[i : i + chunk_size]
        if not is_mulaw:
            # Ensure valid PCM boundary (even number of bytes)
            if len(slice_bytes) % 2 != 0:
                slice_bytes = slice_bytes[: len(slice_bytes) - 1]
            # Pad remainder to multiple of 320 bytes with zero-amplitude silence
            rem = len(slice_bytes) % 320
            if rem != 0:
                pad_len = 320 - rem
                slice_bytes = slice_bytes + (b"\x00" * pad_len)
        chunks.append(base64.b64encode(slice_bytes).decode("ascii"))

    return chunks


def build_media_event(
    stream_sid: str,
    payload_b64: str,
    sequence_number: Optional[str] = None,
) -> Dict[str, Any]:
    """Build an Exotel AgentStream media event containing base64 audio."""
    msg: Dict[str, Any] = {
        "event": "media",
        "stream_sid": stream_sid,
        "streamSid": stream_sid,
        "media": {
            "payload": payload_b64,
        },
    }
    if sequence_number is not None:
        msg["sequence_number"] = str(sequence_number)
        msg["sequenceNumber"] = str(sequence_number)
    return msg


def build_mark_event(stream_sid: str, mark_name: str) -> Dict[str, Any]:
    """Build an Exotel mark event for tracking playback boundaries."""
    return {
        "event": "mark",
        "stream_sid": stream_sid,
        "streamSid": stream_sid,
        "mark": {
            "name": mark_name,
        },
    }


def build_clear_event(stream_sid: str) -> Dict[str, Any]:
    """Build an Exotel clear event to flush queued audio playback on the telephone."""
    return {
        "event": "clear",
        "stream_sid": stream_sid,
        "streamSid": stream_sid,
    }


@dataclass
class ExotelVoiceSession:
    """Isolated state container for an active Exotel telephone WebSocket stream."""

    stream_sid: str = ""
    call_sid: str = ""
    account_sid: str = ""
    phone_number: str = ""
    patient_id: Optional[int] = None
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    additional_notes: Optional[str] = None
    encoding: str = "audio/l16"
    declared_encoding: str = ""
    sample_rate: int = 8000
    channels: int = 1
    is_connected: bool = False
    has_started: bool = False
    greeting_sent: bool = False
    sequence_number: int = 0
    last_transcript: str = ""
    last_triage: Optional[Dict[str, Any]] = None
    custom_parameters: Dict[str, Any] = field(default_factory=dict)

    # Conversational state machine & multi-turn tracking
    state: IVRState = IVRState.LANGUAGE_SELECTION
    language_code: str = "en-IN"
    symptoms: List[str] = field(default_factory=list)
    symptom_descriptions: List[str] = field(default_factory=list)
    symptom_duration: Optional[str] = None
    red_flags_checked: bool = False
    red_flags_present: bool = False
    dtmf_symptom_buffer: List[str] = field(default_factory=list)
    location: Optional[str] = None
    emergency: bool = False
    recommended_facility: Optional[Dict[str, Any]] = None
    booking_intent: bool = False
    appointment_type: str = "OFFLINE"
    selected_slot: Optional[Dict[str, Any]] = None
    appointment_id: Optional[int] = None
    encounter_id: Optional[int] = None
    dialogue_history: List[Dict[str, str]] = field(default_factory=list)
    invalid_language_attempts: int = 0
    active_response_id: Optional[str] = None
    is_transmitting: bool = False
    last_processed_transcript: str = ""
    last_dtmf: str = ""
    clarification_count: int = 0
    response_lock: asyncio.Lock = field(default_factory=asyncio.Lock)

    def reset_context(self) -> None:
        """
        Safely reset the conversational state (e.g. upon receiving a 'clear' event).
        Preserves call and stream identifiers.
        """
        self.last_transcript = ""
        self.last_triage = None
        self.symptoms.clear()
        self.symptom_descriptions.clear()
        self.symptom_duration = None
        self.patient_name = None
        self.age = None
        self.gender = None
        self.additional_notes = None
        self.red_flags_checked = False
        self.red_flags_present = False
        self.dtmf_symptom_buffer.clear()
        self.location = None
        self.emergency = False
        self.recommended_facility = None
        self.booking_intent = False
        self.appointment_type = "OFFLINE"
        self.selected_slot = None
        self.appointment_id = None
        self.encounter_id = None
        self.dialogue_history.clear()
        self.last_processed_transcript = ""
        self.last_dtmf = ""
        self.clarification_count = 0


# Convenient alias for conversational context
VoiceConversationContext = ExotelVoiceSession


class ExotelCallService:
    """
    Service for managing Exotel outbound phone calls and stream connections.
    """

    def __init__(
        self,
        account_sid: Optional[str] = None,
        api_key: Optional[str] = None,
        api_token: Optional[str] = None,
        exophone: Optional[str] = None,
        stream_url: Optional[str] = None,
        timeout: float = 10.0,
    ) -> None:
        self.account_sid = account_sid or settings.EXOTEL_ACCOUNT_SID
        self.api_key = api_key or settings.EXOTEL_API_KEY
        self.api_token = api_token or settings.EXOTEL_API_TOKEN
        self.exophone = exophone or settings.EXOTEL_EXOPHONE
        self.stream_url = stream_url or settings.EXOTEL_STREAM_URL
        self.timeout = timeout

    def validate_configuration(self) -> None:
        """
        Verify that all required Exotel telephony credentials are configured.
        Raises ExotelConfigurationError without exposing secrets.
        """
        missing = []
        if not self.account_sid:
            missing.append("EXOTEL_ACCOUNT_SID")
        if not self.api_key:
            missing.append("EXOTEL_API_KEY")
        if not self.api_token:
            missing.append("EXOTEL_API_TOKEN")
        if not self.exophone:
            missing.append("EXOTEL_EXOPHONE")

        if missing:
            raise ExotelConfigurationError(
                f"Missing required Exotel configuration: {', '.join(missing)}"
            )

    async def initiate_call(
        self,
        phone_number: str,
        custom_field: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Initiate an outbound telephone call via Exotel API.

        Never logs or leaks credentials.
        """
        self.validate_configuration()

        clean_number = (phone_number or "").strip()
        if not clean_number:
            raise ExotelCallError("Phone number is required to initiate an outbound call.")

        url = settings.EXOTEL_OUTBOUND_CALL_URL.format(account_sid=self.account_sid)
        form_data: Dict[str, str] = {
            "From": clean_number,
            "CallerId": str(self.exophone),
            "CallType": "trans",
        }
        if self.stream_url:
            form_data["Url"] = self.stream_url
        if custom_field:
            form_data["CustomField"] = custom_field

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    url,
                    data=form_data,
                    auth=(str(self.api_key), str(self.api_token)),
                )

            if response.status_code not in (200, 201):
                logger.warning("Exotel outbound call returned status %d", response.status_code)
                raise ExotelCallError(
                    f"Exotel call initiation failed with status {response.status_code}."
                )

            try:
                data = response.json()
                call_info = data.get("Call", data)
                return {
                    "success": True,
                    "call_sid": call_info.get("Sid") or call_info.get("call_sid") or "",
                    "status": call_info.get("Status") or "queued",
                    "phone_number": clean_number,
                }
            except Exception:
                return {
                    "success": True,
                    "status": "queued",
                    "phone_number": clean_number,
                }

        except (ExotelConfigurationError, ExotelCallError):
            raise
        except httpx.RequestError as req_err:
            logger.error("Network error during Exotel call initiation: %s", type(req_err).__name__)
            raise ExotelCallError("Network error while connecting to Exotel telephony service.")
        except Exception as exc:
            logger.error("Unexpected error in Exotel call service: %s", type(exc).__name__, exc_info=True)
            raise ExotelCallError("Unexpected error while initiating telephone call.")
