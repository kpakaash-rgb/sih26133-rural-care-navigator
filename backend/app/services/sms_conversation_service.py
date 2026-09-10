"""
services/sms_conversation_service.py
====================================
Two-Way SMS Healthcare Assistant Service for Rural Care Navigator.

Orchestrates multi-turn SMS conversation state, patient identification,
rule-based clinical triage, facility discovery, live queue estimation,
atomic appointment booking, and patient self-service (referrals/follow-ups).
"""

from __future__ import annotations

import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from ai.triage.safety import EMERGENCY_TERMS, check_safety
from ai.triage.triage import run_triage
from backend.app.adapters.sms import get_sms_adapter
from backend.app.core.config import settings
from backend.app.models.facility import Facility
from backend.app.models.sms_conversation import SMSConversation
from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.hospital_queue_repository import HospitalQueueRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.repositories.sms_conversation_repository import SMSConversationRepository
from backend.app.services.appointment_service import AppointmentService
from backend.app.services.facility_service import FacilityService, find_best_facility_for_patient
from backend.app.services.follow_up_service import FollowUpService
from backend.app.services.referral_service import ReferralService
from backend.app.services.sms_service import SMSService

logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────────────────────────────────────
# Multilingual Prompts & Translations (EN, HI, MR)
# ──────────────────────────────────────────────────────────────────────────────

MESSAGES = {
    "emergency": {
        "en": (
            "EMERGENCY:\n"
            "Please seek immediate medical attention.\n"
            "Call 108 for ambulance assistance.\n"
            "Do not delay emergency care."
        ),
        "hi": (
            "आपातकालीन (EMERGENCY):\n"
            "कृपया तुरंत नजदीकी अस्पताल जाएं।\n"
            "एंबुलेंस के लिए 108 पर कॉल करें।\n"
            "इलाज में देरी न करें।"
        ),
        "mr": (
            "तात्काळ मदत (EMERGENCY):\n"
            "कृपया लगेच जवळच्या रुग्णालयात जा.\n"
            "रुग्णवाहिकेसाठी 108 वर कॉल करा.\n"
            "उपचारास विलंब करू नका."
        ),
    },
    "greeting_new": {
        "en": "Welcome to Rural Care Navigator. Please reply with your full name.\n(Reply HI for Hindi, MR for Marathi)",
        "hi": "रूरल केयर नेविगेटर में आपका स्वागत है। कृपया अपना पूरा नाम भेजें।",
        "mr": "रूरल केअर नेव्हिगेटरमध्ये आपले स्वागत आहे. कृपया आपले पूर्ण नाव पाठवा.",
    },
    "greeting_returning": {
        "en": (
            "Hello {name}! Welcome to Rural Care Navigator.\n"
            "Please reply with your symptoms (e.g. Fever for 2 days) or send:\n"
            "1-Book, 2-Facility, 4-Referral, 5-Followup, 0-Emergency"
        ),
        "hi": (
            "नमस्ते {name}! रूरल केयर नेविगेटर में आपका स्वागत है।\n"
            "कृपया अपने लक्षण बताएं (उदा. 2 दिन से बुखार) या भेजें:\n"
            "1-बुक, 2-अस्पताल, 4-रेफरल, 5-फॉलोअप, 0-इमरजेंसी"
        ),
        "mr": (
            "नमस्ते {name}! रूरल केअर नेव्हिगेटरमध्ये आपले स्वागत आहे.\n"
            "कृपया आपली लक्षणे सांगा (उदा. 2 दिवस ताप) किंवा पाठवा:\n"
            "1-बुक, 2-रुग्णालय, 4-रेफरल, 5-फॉलोअप, 0-तातडीची मदत"
        ),
    },
    "ask_age": {
        "en": "Thank you {name}. Please reply with your age.",
        "hi": "धन्यवाद {name}। कृपया अपनी उम्र (आयु) बताएं।",
        "mr": "धन्यवाद {name}. कृपया आपले वय सांगा.",
    },
    "ask_location": {
        "en": "Please reply with your village or town name (e.g. Malshiras).",
        "hi": "कृपया अपने गांव या कस्बे का नाम भेजें (उदा. Malshiras)।",
        "mr": "कृपया आपल्या गावाचे किंवा शहराचे नाव पाठवा (उदा. Malshiras).",
    },
    "ask_symptoms": {
        "en": "What symptoms are you experiencing? (e.g. fever, cough, stomach pain)",
        "hi": "आपको क्या तकलीफ/लक्षण हैं? (उदा. बुखार, खांसी, पेट दर्द)",
        "mr": "आपल्याला काय त्रास किंवा लक्षणे आहेत? (उदा. ताप, खोकला, पोटदुखी)",
    },
    "ask_duration": {
        "en": "How many days have you had these symptoms? (e.g. 2 days)",
        "hi": "यह लक्षण आपको कितने दिनों से हैं? (उदा. 2 दिन)",
        "mr": "ही लक्षणे आपल्याला किती दिवसांपासून आहेत? (उदा. 2 दिवस)",
    },
    "no_facility": {
        "en": "We couldn't find a nearby facility in the current service area. Please contact your local health worker or emergency services if this is urgent.",
        "hi": "वर्तमान सेवा क्षेत्र में कोई नजदीकी स्वास्थ्य केंद्र नहीं मिला। यदि समस्या गंभीर है तो आशा वर्कर या 108 से संपर्क करें।",
        "mr": "सध्याच्या कार्यक्षेत्रात जवळचे रुग्णालय आढळले नाही. निकड असल्यास स्थानिक आरोग्य सेवक किंवा 108 शी संपर्क साधा.",
    },
    "lang_switched": {
        "en": "Language set to English. Please reply with your symptoms or name.",
        "hi": "भाषा हिन्दी पर सेट की गई है। कृपया अपना नाम भेजें।",
        "mr": "भाषा मराठीवर सेट केली आहे. कृपया आपले नाव पाठवा.",
    },
}


# ──────────────────────────────────────────────────────────────────────────────
# NLP / Deterministic Extraction Helpers
# ──────────────────────────────────────────────────────────────────────────────

HINDI_CHAR_REGEX = re.compile(r"[\u0900-\u097F]")
MARATHI_SPECIFIC_WORDS = {"आहे", "आहात", "माझे", "नाव", "त्रास", "ताप", "खोकला", "दिवस", "सांगा", "हवे", "नाही", "होय", "रुग्णालय", "वय", "गाव"}
HINDI_SPECIFIC_WORDS = {"है", "हूँ", "मेरा", "नाम", "दर्द", "बुखार", "खांसी", "दिन", "बताएं", "चाहिए", "नहीं", "हाँ", "अस्पताल", "उम्र", "गाँव", "गांव"}


def detect_language(text: str, current_lang: str = "en") -> str:
    """Detect language from text (EN, HI, MR) or keep current."""
    raw = text.strip()
    upper = raw.upper()

    if upper in ("EN", "ENGLISH", "LANG EN"):
        return "en"
    if upper in ("HINDI", "HIN", "LANG HI") or raw == "हिन्दी":
        return "hi"
    if upper in ("MARATHI", "MAR", "MR", "LANG MR") or raw == "मराठी":
        return "mr"

    t_lower = raw.lower()
    words = set(re.findall(r"\w+", t_lower))

    if words.intersection(MARATHI_SPECIFIC_WORDS):
        return "mr"
    if words.intersection(HINDI_SPECIFIC_WORDS):
        return "hi"

    if HINDI_CHAR_REGEX.search(raw):
        return current_lang if current_lang in ("hi", "mr") else "hi"

    return current_lang


def extract_age(text: str) -> Optional[int]:
    """Extract integer age from text (e.g. '42', 'age 42', '42 years', 'I am Ravi 42')."""
    clean = text.strip()
    if clean.isdigit():
        val = int(clean)
        if 1 <= val <= 120:
            return val

    # Compound regex "I am Ravi 42"
    m_compound = re.search(r"(?:i am|im|name is|naam|माझे नाव|मेरा नाम)\s+([A-Za-z\u0900-\u097F]+)\s+(\d{1,3})\b", text, re.IGNORECASE)
    if m_compound:
        try:
            val = int(m_compound.group(2))
            if 1 <= val <= 120:
                return val
        except ValueError:
            pass

    patterns = [
        r"(?:age|umar|aayu|vay|वय|उम्र|आयु)\s*[:=]?\s*(\d{1,3})",
        r"(\d{1,3})\s*(?:years?|yrs?|saal|varsha|sal|साल|वर्ष|वर्षे)",
        r"(?:i am|am|mein)\s*(\d{1,3})\b",
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            try:
                val = int(m.group(1))
                if 1 <= val <= 120:
                    return val
            except ValueError:
                pass

    # Look for any 2-digit number not followed by day/days/din/divas/am/pm
    for match in re.finditer(r"\b(\d{1,2})\b", text):
        val = int(match.group(1))
        # Check text right after match
        after = text[match.end():].lstrip().lower()
        if not any(after.startswith(p) for p in ("day", "din", "divas", "week", "month", "am", "pm", "year", "saal", "sal", "वर्ष", "दिवस", "दिन")):
            if 10 <= val <= 100:
                return val

    return None


def extract_duration_str(text: str, is_duration_state: bool = False) -> Optional[str]:
    """Extract duration string from text."""
    patterns = [
        (r"(\d+)\s*(?:day|days|din|divas|दिन|दिवस)", lambda m: f"{m.group(1)} days"),
        (r"(\d+)\s*(?:week|weeks|hafte|hafta|आठवडे|हफ्ते)", lambda m: f"{m.group(1)} weeks"),
        (r"(\d+)\s*(?:month|months|mahine|महिने|महीने)", lambda m: f"{m.group(1)} months"),
        (r"since\s+yesterday|kal\s+se|कालपासून", lambda m: "since yesterday"),
        (r"today|aaj\s+se|आजपासून", lambda m: "today"),
        (r"ek\s+din|one\s+day|एक\s+दिवस", lambda m: "1 day"),
        (r"do\s+din|two\s+days|दोन\s+दिवस", lambda m: "2 days"),
        (r"teen\s+din|three\s+days|तीन\s+दिवस", lambda m: "3 days"),
    ]
    for pat, handler in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return handler(m)

    if is_duration_state and text.strip().isdigit():
        return f"{text.strip()} days"
    return None


def extract_location_str(text: str, is_location_state: bool = False) -> Optional[str]:
    """Extract location from text."""
    clean = text.strip()
    if is_location_state:
        if len(clean.split()) <= 3 and not any(clean.lower().startswith(c) for c in ("hi", "hello", "book", "fever", "pain", "cough", "reset")):
            cleaned = re.sub(r"^(?:i am from|from|in|at|living in|village|gav|gao|गाँव|गाव|गावचे नाव)\s+", "", clean, flags=re.IGNORECASE)
            if cleaned and not cleaned.isdigit() and len(cleaned) >= 3:
                return cleaned.title()

    m = re.search(r"(?:from|in|living in|at|village|गाव|गाँव)\s+([A-Za-z\u0900-\u097F]+)", text, re.IGNORECASE)
    if m:
        return m.group(1).title()

    # Search for known districts/villages
    known_locs = ["Malshiras", "Akluj", "Pandharpur", "Solapur", "Natepute", "Kurduwadi", "Sangola", "Barshi", "Karmala"]
    for loc in known_locs:
        if re.search(rf"\b{re.escape(loc)}\b", text, re.IGNORECASE):
            return loc

    return None


def extract_symptoms_str(text: str, is_symptoms_state: bool = False) -> Optional[str]:
    """Extract recognized symptoms from text."""
    t_lower = text.lower()
    symptoms = []

    symptom_map = {
        "fever": ["fever", "bukhar", "taap", "tap", "ताप", "बुखार", "badan garm"],
        "cough": ["cough", "khansi", "kasi", "khasi", "खोका", "खोकला", "खांसी"],
        "cold": ["cold", "sardi", "jukam", "सर्दी", "पडसे"],
        "pain": ["pain", "dard", "dukh", "वेदना", "दर्द", "दुखणे"],
        "headache": ["headache", "sar dard", "doke dukhi", "डोकेदुखी", "सिर दर्द"],
        "stomach pain": ["stomach", "pet dard", "pot dukhi", "उलटी", "जुलाब", "पेट दर्द", "पोटदुखी"],
        "injury": ["injury", "wound", "chot", "cut", "lag gaya", "जख्म", "मार लागला", "चोट"],
        "vomiting": ["vomiting", "ulti", "उलटी", "वमन"],
    }

    for sym, keywords in symptom_map.items():
        if any(kw in t_lower for kw in keywords):
            symptoms.append(sym)

    if symptoms:
        return ", ".join(symptoms)

    if is_symptoms_state and len(text.strip()) > 2 and not text.strip().isdigit() and not text.lower() in ("hi", "hello", "yes", "no", "1", "2"):
        return text.strip()
    return None


def is_affirmative_reply(text: str) -> bool:
    """Check if message is affirmative (yes, 1, haan, ho, etc.)."""
    clean = text.strip().lower()
    tokens = set(re.findall(r"\w+", clean))
    if clean in ("1", "yes", "y", "haan", "ha", "ji haan", "ho", "hoy", "sure", "ok", "confirm", "हो", "होय", "हाँ"):
        return True
    if tokens.intersection({"yes", "yeah", "haan", "haanji", "ho", "hoy", "sahi", "theek", "confirm", "हो", "होय", "हाँ"}):
        return True
    return False


def is_negative_reply(text: str) -> bool:
    """Check if message is negative (no, 2, nahi, nako, cancel, etc.)."""
    clean = text.strip().lower()
    tokens = set(re.findall(r"\w+", clean))
    if clean in ("2", "no", "n", "nahi", "nahin", "nako", "cancel", "stop", "rehne do", "नाही", "नको", "नहीं"):
        return True
    if tokens.intersection({"no", "nope", "nahi", "nahin", "nako", "cancel", "नाही", "नको", "नहीं"}):
        return True
    return False


# ──────────────────────────────────────────────────────────────────────────────
# SMS Conversation Service
# ──────────────────────────────────────────────────────────────────────────────

class SMSConversationService:
    """
    Two-Way SMS conversation state engine and multi-service orchestrator.
    """

    def __init__(self, db: Session):
        self.db = db
        self.patient_repo = PatientRepository(db)
        self.conv_repo = SMSConversationRepository(db)
        self.facility_repo = FacilityRepository(db)
        self.availability_repo = AvailabilityRepository(db)
        self.queue_repo = HospitalQueueRepository(db)
        self.appointment_repo = AppointmentRepository(db)
        self.referral_repo = ReferralRepository(db)
        self.follow_up_repo = FollowUpRepository(db)
        self.appointment_service = AppointmentService(
            appointment_repo=self.appointment_repo,
            facility_repo=self.facility_repo,
            availability_repo=self.availability_repo,
            patient_repo=self.patient_repo,
        )
        self.referral_service = ReferralService(
            referral_repo=self.referral_repo,
            facility_repo=self.facility_repo,
            patient_repo=self.patient_repo,
            appointment_repo=self.appointment_repo,
        )
        self.follow_up_service = FollowUpService(
            follow_up_repo=self.follow_up_repo,
            patient_repo=self.patient_repo,
            appointment_repo=self.appointment_repo,
            referral_repo=self.referral_repo,
        )
        self.sms_service = SMSService()

    def process_inbound_message(
        self,
        mobile: str,
        message: str,
        provider_message_id: Optional[str] = None,
        is_demo: bool = False,
    ) -> Dict[str, Any]:
        """
        Process an inbound SMS message from a mobile number.
        """
        clean_mobile = (mobile or "").replace("+91", "").replace("+", "").strip()[-10:]
        clean_text = (message or "").strip()

        if not clean_mobile or len(clean_mobile) < 10:
            return {
                "success": False,
                "reply": "Invalid mobile number format.",
                "next_state": "ERROR",
                "demo_mode": is_demo,
            }

        # 1. Retrieve or Initialize Conversation Session
        conv = self.conv_repo.get_or_create_conversation(clean_mobile)

        # 2. Idempotency Check
        if provider_message_id and conv.last_provider_message_id == provider_message_id:
            logger.info("[SMS] Duplicate provider message %s detected for %s; returning cached reply", provider_message_id, clean_mobile)
            return {
                "success": True,
                "reply": conv.last_reply or "Message already received and processed.",
                "next_state": conv.state,
                "demo_mode": is_demo,
                "conversation": self._format_conversation_state(conv),
            }

        # 3. Detect and update Language
        new_lang = detect_language(clean_text, conv.language)
        if new_lang != conv.language:
            conv.language = new_lang

        lang = conv.language

        # 4. Check for Explicit Language Switch Command (e.g. "MR", "HINDI", "ENGLISH")
        if clean_text.upper() in ("MR", "MARATHI", "HINDI", "ENGLISH", "LANG HI", "LANG MR", "LANG EN") or clean_text in ("हिन्दी", "मराठी"):
            if clean_text.upper() in ("MR", "MARATHI", "LANG MR") or clean_text == "मराठी":
                conv.language = "mr"
            elif clean_text.upper() in ("HINDI", "LANG HI") or clean_text == "हिन्दी":
                conv.language = "hi"
            elif clean_text.upper() in ("ENGLISH", "LANG EN"):
                conv.language = "en"

            lang = conv.language
            reply = MESSAGES["lang_switched"].get(lang, MESSAGES["lang_switched"]["en"])
            conv.last_reply = reply
            conv.last_provider_message_id = provider_message_id
            self.conv_repo.save(conv)
            return {
                "success": True,
                "reply": reply,
                "next_state": "ASK_NAME" if not conv.collected_name else conv.state,
                "demo_mode": is_demo,
                "conversation": self._format_conversation_state(conv),
            }

        # 5. Check Emergency Bypass (Highest Priority, Deterministic)
        safety = check_safety([], clean_text)
        if safety.emergency:
            conv.state = "EMERGENCY"
            reply = MESSAGES["emergency"].get(lang, MESSAGES["emergency"]["en"])
            conv.last_reply = reply
            conv.last_provider_message_id = provider_message_id
            self.conv_repo.save(conv)
            return {
                "success": True,
                "reply": reply,
                "next_state": "EMERGENCY",
                "demo_mode": is_demo,
                "conversation": self._format_conversation_state(conv),
            }

        # 6. Global Care / Menu Commands Handling (Available anytime)
        global_reply, global_next_state = self._handle_global_commands(conv, clean_text, lang)
        if global_reply is not None:
            conv.state = global_next_state
            conv.last_reply = global_reply
            conv.last_provider_message_id = provider_message_id
            self.conv_repo.save(conv)
            return {
                "success": True,
                "reply": global_reply,
                "next_state": global_next_state,
                "demo_mode": is_demo,
                "conversation": self._format_conversation_state(conv),
            }

        # 7. Check for Existing Patient Record
        patient = self.patient_repo.find_by_mobile(clean_mobile)
        if patient:
            conv.patient_id = patient.id
            if patient.full_name and not conv.collected_name:
                conv.collected_name = patient.full_name
            if patient.age and not conv.collected_age:
                conv.collected_age = patient.age
            if patient.village and not conv.collected_location:
                conv.collected_location = patient.village

        # 8. State Machine Step Execution
        reply, next_state = self._advance_state_machine(conv, clean_text, lang, patient)

        conv.state = next_state
        conv.last_reply = reply
        conv.last_provider_message_id = provider_message_id
        self.conv_repo.save(conv)

        return {
            "success": True,
            "reply": reply,
            "next_state": next_state,
            "demo_mode": is_demo,
            "conversation": self._format_conversation_state(conv),
        }

    # ──────────────────────────────────────────────────────────────────────────
    # Global Menu Actions
    # ──────────────────────────────────────────────────────────────────────────

    def _handle_global_commands(
        self,
        conv: SMSConversation,
        text: str,
        lang: str,
    ) -> Tuple[Optional[str], str]:
        """Handle standalone menu commands."""
        clean = text.strip().lower()

        # 0 - Emergency
        if clean in ("0", "emergency", "108", "ambulance", "madad", "तातडी"):
            return MESSAGES["emergency"].get(lang, MESSAGES["emergency"]["en"]), "EMERGENCY"

        # 4 - Referral status
        if clean in ("4", "referral", "referrals", "ref", "रेफरल"):
            return self._handle_referral_query(conv, lang), conv.state

        # 5 - Followup status
        if clean in ("5", "followup", "follow up", "follow-up", "फॉलोअप"):
            return self._handle_followup_query(conv, lang), conv.state

        # 2 - Facility details
        if clean in ("2", "facility", "facility details", "hospital", "रुग्णालय", "अस्पताल") and conv.state not in ("CONFIRM_BOOKING", "SELECT_SLOT"):
            return self._handle_facility_details_query(conv, lang), conv.state

        # Appointments lookup
        if clean in ("my appointments", "appointments", "appointment", "booking status"):
            return self._handle_my_appointments_query(conv, lang), conv.state

        # RESET / START OVER
        if clean in ("reset", "restart", "start over", "shuru", "पुन्हा"):
            self.conv_repo.reset_conversation(conv, language=lang)
            p_name = conv.collected_name
            if p_name:
                greeting = MESSAGES["greeting_returning"].get(lang, MESSAGES["greeting_returning"]["en"]).format(name=p_name)
                return greeting, "ASK_SYMPTOMS"
            return MESSAGES["greeting_new"].get(lang, MESSAGES["greeting_new"]["en"]), "ASK_NAME"

        return None, conv.state

    # ──────────────────────────────────────────────────────────────────────────
    # Multi-turn State Machine Handler
    # ──────────────────────────────────────────────────────────────────────────

    def _advance_state_machine(
        self,
        conv: SMSConversation,
        text: str,
        lang: str,
        patient: Any,
    ) -> Tuple[str, str]:
        """Advance the conversation based on current state and incoming text."""
        state = conv.state

        # One-shot entity extraction for compound natural messages
        self._extract_any_present_entities(conv, text)

        # If GREETING
        if state in ("GREETING", "START"):
            if patient and patient.full_name:
                conv.collected_name = patient.full_name
                conv.collected_age = patient.age
                conv.collected_location = patient.village or patient.district
                if conv.symptoms:
                    if conv.duration:
                        return self._execute_triage_and_recommendation(conv, lang)
                    return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
                greeting = MESSAGES["greeting_returning"].get(lang, MESSAGES["greeting_returning"]["en"]).format(name=patient.full_name)
                return greeting, "ASK_SYMPTOMS"

            # New patient with extracted entities from first turn
            if conv.collected_name:
                if conv.collected_age:
                    if conv.collected_location:
                        if conv.symptoms:
                            if conv.duration:
                                return self._execute_triage_and_recommendation(conv, lang)
                            return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
                        return MESSAGES["ask_symptoms"].get(lang, MESSAGES["ask_symptoms"]["en"]), "ASK_SYMPTOMS"
                    return MESSAGES["ask_location"].get(lang, MESSAGES["ask_location"]["en"]), "ASK_LOCATION"
                return MESSAGES["ask_age"].get(lang, MESSAGES["ask_age"]["en"]).format(name=conv.collected_name), "ASK_AGE"

            # Default greeting
            return MESSAGES["greeting_new"].get(lang, MESSAGES["greeting_new"]["en"]), "ASK_NAME"

        # State: ASK_NAME
        if state == "ASK_NAME":
            name = conv.collected_name or self._clean_name_input(text)
            if name:
                conv.collected_name = name
                if conv.collected_age:
                    if conv.collected_location:
                        if conv.symptoms:
                            if conv.duration:
                                return self._execute_triage_and_recommendation(conv, lang)
                            return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
                        return MESSAGES["ask_symptoms"].get(lang, MESSAGES["ask_symptoms"]["en"]), "ASK_SYMPTOMS"
                    return MESSAGES["ask_location"].get(lang, MESSAGES["ask_location"]["en"]), "ASK_LOCATION"
                return MESSAGES["ask_age"].get(lang, MESSAGES["ask_age"]["en"]).format(name=name), "ASK_AGE"
            return MESSAGES["greeting_new"].get(lang, MESSAGES["greeting_new"]["en"]), "ASK_NAME"

        # State: ASK_AGE
        if state == "ASK_AGE":
            age = conv.collected_age or extract_age(text)
            if age:
                conv.collected_age = age
                if conv.collected_location:
                    if conv.symptoms:
                        if conv.duration:
                            return self._execute_triage_and_recommendation(conv, lang)
                        return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
                    return MESSAGES["ask_symptoms"].get(lang, MESSAGES["ask_symptoms"]["en"]), "ASK_SYMPTOMS"
                return MESSAGES["ask_location"].get(lang, MESSAGES["ask_location"]["en"]), "ASK_LOCATION"
            p_name = conv.collected_name or "there"
            return MESSAGES["ask_age"].get(lang, MESSAGES["ask_age"]["en"]).format(name=p_name), "ASK_AGE"

        # State: ASK_LOCATION
        if state == "ASK_LOCATION":
            location = extract_location_str(text, is_location_state=True) or conv.collected_location
            if location:
                conv.collected_location = location
                self._sync_patient_profile(conv)
                if conv.symptoms:
                    if conv.duration:
                        return self._execute_triage_and_recommendation(conv, lang)
                    return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
                return MESSAGES["ask_symptoms"].get(lang, MESSAGES["ask_symptoms"]["en"]), "ASK_SYMPTOMS"
            return MESSAGES["ask_location"].get(lang, MESSAGES["ask_location"]["en"]), "ASK_LOCATION"

        # State: ASK_SYMPTOMS
        if state == "ASK_SYMPTOMS":
            symptoms = extract_symptoms_str(text, is_symptoms_state=True) or conv.symptoms
            if symptoms:
                conv.symptoms = symptoms
                if conv.duration:
                    return self._execute_triage_and_recommendation(conv, lang)
                return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"
            return MESSAGES["ask_symptoms"].get(lang, MESSAGES["ask_symptoms"]["en"]), "ASK_SYMPTOMS"

        # State: ASK_DURATION
        if state == "ASK_DURATION":
            duration = extract_duration_str(text, is_duration_state=True) or conv.duration
            if duration:
                conv.duration = duration
                return self._execute_triage_and_recommendation(conv, lang)
            if text.strip():
                conv.duration = text.strip()
                return self._execute_triage_and_recommendation(conv, lang)
            return MESSAGES["ask_duration"].get(lang, MESSAGES["ask_duration"]["en"]), "ASK_DURATION"

        # State: SELECT_SLOT
        if state in ("SELECT_SLOT", "APPOINTMENT_MENU"):
            return self._handle_slot_selection(conv, text, lang)

        # State: CONFIRM_BOOKING
        if state == "CONFIRM_BOOKING":
            return self._handle_booking_confirmation(conv, text, lang)

        # State: BOOKED / OPTIONS_MENU
        if state in ("BOOKED", "OPTIONS_MENU"):
            if text.strip() == "1" or "book" in text.lower():
                return self._render_available_slots(conv, lang)
            if text.strip() == "2" or "facility" in text.lower():
                return self._handle_facility_details_query(conv, lang), "BOOKED"
            if text.strip() == "3" or "care" in text.lower():
                return self._handle_care_guidance(conv, lang), "BOOKED"

            return (
                "Send:\n1 - Book another slot\n2 - Facility info\n4 - Referral status\n5 - Follow-up info\n0 - Emergency",
                "OPTIONS_MENU",
            )

        return MESSAGES["greeting_new"].get(lang, MESSAGES["greeting_new"]["en"]), "GREETING"

    # ──────────────────────────────────────────────────────────────────────────
    # Entity Extraction & Patient Sync
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_any_present_entities(self, conv: SMSConversation, text: str) -> None:
        """Extract all possible entities from compound natural messages."""
        # Age
        if not conv.collected_age:
            age = extract_age(text)
            if age:
                conv.collected_age = age

        # Duration
        if not conv.duration:
            duration = extract_duration_str(text, is_duration_state=(conv.state == "ASK_DURATION"))
            if duration:
                conv.duration = duration

        # Symptoms
        if not conv.symptoms:
            symptoms = extract_symptoms_str(text, is_symptoms_state=(conv.state == "ASK_SYMPTOMS"))
            if symptoms:
                conv.symptoms = symptoms

        # Location
        if not conv.collected_location:
            loc = extract_location_str(text, is_location_state=(conv.state == "ASK_LOCATION"))
            if loc:
                conv.collected_location = loc

        # Name
        if not conv.collected_name:
            m = re.search(r"(?:i am|my name is|naam|नाव|नाम|माझे नाव|मेरा नाम)\s+([A-Za-z\u0900-\u097F]+)", text, re.IGNORECASE)
            if m:
                conv.collected_name = m.group(1).title()

    def _clean_name_input(self, text: str) -> Optional[str]:
        """Clean simple name input."""
        clean = text.strip()
        if clean.isdigit() or len(clean) < 2:
            return None
        if clean.lower() in ("hi", "hello", "namaste", "yes", "no", "ok", "reset"):
            return None
        cleaned = re.sub(r"^(?:my name is|i am|iam|naam|नाव|नाम|माझे नाव|मेरा नाम)\s+([A-Za-z\u0900-\u097F\s]+)", r"\1", clean, flags=re.IGNORECASE)
        words = cleaned.split()[:2]
        return " ".join(words).title() if words else None

    def _sync_patient_profile(self, conv: SMSConversation) -> None:
        """Create or update patient profile in PostgreSQL."""
        try:
            patient = self.patient_repo.get_or_create_patient(
                mobile=conv.mobile,
                full_name=conv.collected_name,
                age=conv.collected_age,
                village=conv.collected_location,
            )
            conv.patient_id = patient.id
        except Exception as exc:
            logger.warning("[SMS] Could not sync patient profile: %s", exc)

    # ──────────────────────────────────────────────────────────────────────────
    # Triage & Facility Recommendation Flow
    # ──────────────────────────────────────────────────────────────────────────

    def _execute_triage_and_recommendation(
        self,
        conv: SMSConversation,
        lang: str,
    ) -> Tuple[str, str]:
        """Call existing run_triage() and find_best_facility_for_patient()."""
        self._sync_patient_profile(conv)

        # 1. Run Clinical Triage
        symptom_list = [s.strip() for s in (conv.symptoms or "general illness").split(",")]
        description = f"{conv.symptoms or 'illness'} for {conv.duration or 'recent'}"
        triage_res = run_triage(symptoms=symptom_list, description=description)

        if triage_res.emergency:
            conv.state = "EMERGENCY"
            return MESSAGES["emergency"].get(lang, MESSAGES["emergency"]["en"]), "EMERGENCY"

        # 2. Discover Facility
        locality = conv.collected_location or "Maharashtra"
        care_level = triage_res.recommended_care or "Primary Health Centre (PHC)"
        best_fac = find_best_facility_for_patient(
            db=self.db,
            locality=locality,
            care_level=care_level,
            emergency=False,
            required_service=symptom_list[0] if symptom_list else None,
        )

        if not best_fac:
            return MESSAGES["no_facility"].get(lang, MESSAGES["no_facility"]["en"]), "OPTIONS_MENU"

        conv.selected_facility_id = best_fac["id"]

        # 3. Retrieve Live Queue
        queue = self.queue_repo.find_by_facility_id(best_fac["id"])
        queue_text = ""
        if queue:
            is_stale = self._is_queue_stale(queue.last_updated)
            if is_stale:
                queue_text = f"\nQueue: {queue.waiting_patients} patients (Queue info may be outdated)"
            else:
                queue_text = f"\nQueue: {queue.waiting_patients} patients (~{queue.estimated_wait_minutes} min wait)"

        # 4. Retrieve Available Slots
        slots = self.availability_repo.get_slots(
            facility_id=best_fac["id"],
            status="AVAILABLE",
        )

        # 5. Build SMS Text
        lines = []

        if triage_res.urgency == "needs_attention":
            if lang == "hi":
                lines.append("जांच परिणाम: आपको डॉक्टर से परामर्श लेने की आवश्यकता है।")
            elif lang == "mr":
                lines.append("तपासणी निष्कर्ष: आपल्याला डॉक्टरांचा सल्ला घेण्याची गरज आहे.")
            else:
                lines.append("Triage: Your symptoms should be assessed by a healthcare professional.")
        else:
            if lang == "hi":
                lines.append("जांच परिणाम: सामान्य देखभाल परामर्श।")
            elif lang == "mr":
                lines.append("तपासणी निष्कर्ष: नियमित आरोग्य सल्ला.")
            else:
                lines.append("Triage: Routine healthcare consultation recommended.")

        lines.append(f"\nRecommended Facility:\n{best_fac['name']}")
        if queue_text:
            lines.append(queue_text)

        if slots:
            lines.append("\nAvailable appointments:")
            display_slots = slots[:2]
            for idx, s in enumerate(display_slots, start=1):
                svc_name = s.service.name if s.service else "General Medicine"
                lines.append(f"{idx}. {s.date} {s.start_time} ({svc_name})")
            lines.append("\nReply 1 or 2 to book, or 2 for Facility info.")
            next_state = "SELECT_SLOT"
        else:
            lines.append("\nNo online slots currently open.\nSend 2 for Facility details or 0 for Emergency.")
            next_state = "OPTIONS_MENU"

        return "\n".join(lines), next_state

    # ──────────────────────────────────────────────────────────────────────────
    # Appointment Booking Flow
    # ──────────────────────────────────────────────────────────────────────────

    def _render_available_slots(self, conv: SMSConversation, lang: str) -> Tuple[str, str]:
        """Render available appointment slots for selected facility."""
        fac_id = conv.selected_facility_id
        if not fac_id:
            facs = self.facility_repo.list_facilities(status="ACTIVE")
            if facs:
                fac_id = facs[0].id
                conv.selected_facility_id = fac_id

        if not fac_id:
            return MESSAGES["no_facility"].get(lang, MESSAGES["no_facility"]["en"]), "OPTIONS_MENU"

        slots = self.availability_repo.get_slots(facility_id=fac_id, status="AVAILABLE")
        if not slots:
            return "No open appointment slots available at this facility currently.", "OPTIONS_MENU"

        lines = ["Available appointments:"]
        for idx, s in enumerate(slots[:2], start=1):
            svc_name = s.service.name if s.service else "General Medicine"
            lines.append(f"{idx}. {s.date} {s.start_time} ({svc_name})")
        lines.append("\nReply 1 or 2 to book.")
        return "\n".join(lines), "SELECT_SLOT"

    def _handle_slot_selection(
        self,
        conv: SMSConversation,
        text: str,
        lang: str,
    ) -> Tuple[str, str]:
        """Handle patient replying with slot index (1 or 2)."""
        clean = text.strip()
        fac_id = conv.selected_facility_id
        if not fac_id:
            return self._render_available_slots(conv, lang)

        slots = self.availability_repo.get_slots(facility_id=fac_id, status="AVAILABLE")
        if not slots:
            return "No slots available. Reply 2 for facility address.", "OPTIONS_MENU"

        selected_slot = None
        if clean == "1" and len(slots) >= 1:
            selected_slot = slots[0]
        elif clean == "2" and len(slots) >= 2:
            selected_slot = slots[1]
        elif clean.isdigit():
            idx = int(clean) - 1
            if 0 <= idx < len(slots):
                selected_slot = slots[idx]

        if not selected_slot:
            return f"Please reply with a valid option (1 or {len(slots[:2])}).", "SELECT_SLOT"

        conv.selected_slot_id = selected_slot.id
        conv.selected_service_id = selected_slot.service_id
        fac = self.facility_repo.get_by_id(fac_id)
        fac_name = fac.name if fac else "Healthcare Centre"
        svc_name = selected_slot.service.name if selected_slot.service else "General Medicine"

        if lang == "hi":
            reply = (
                f"कृपया बुकिंग की पुष्टि करें:\n"
                f"{fac_name} ({svc_name})\n"
                f"{selected_slot.date} समय {selected_slot.start_time}\n\n"
                f"जवाब दें:\n"
                f"1 हाँ (YES)\n"
                f"2 नहीं (NO)"
            )
        elif lang == "mr":
            reply = (
                f"कृपया बुकिंग निश्चित करा:\n"
                f"{fac_name} ({svc_name})\n"
                f"{selected_slot.date} वेळ {selected_slot.start_time}\n\n"
                f"उत्तर पाठवा:\n"
                f"1 होय (YES)\n"
                f"2 नाही (NO)"
            )
        else:
            reply = (
                f"Confirm booking for:\n"
                f"{fac_name} ({svc_name})\n"
                f"{selected_slot.date} at {selected_slot.start_time}\n\n"
                f"Reply:\n"
                f"1 YES\n"
                f"2 NO"
            )

        return reply, "CONFIRM_BOOKING"

    def _handle_booking_confirmation(
        self,
        conv: SMSConversation,
        text: str,
        lang: str,
    ) -> Tuple[str, str]:
        """Handle YES / NO confirmation and invoke AppointmentService."""
        if is_affirmative_reply(text):
            self._sync_patient_profile(conv)
            patient_id = conv.patient_id
            if not patient_id:
                patient = self.patient_repo.find_by_mobile(conv.mobile)
                if patient:
                    patient_id = patient.id
                    conv.patient_id = patient_id

            if not patient_id:
                return "Unable to identify patient profile. Please reply with your full name to restart.", "ASK_NAME"

            fac_id = conv.selected_facility_id
            slot_id = conv.selected_slot_id
            service_id = conv.selected_service_id

            if not fac_id or not slot_id:
                return "No slot selected. Reply 1 to view slots.", "SELECT_SLOT"

            if not service_id:
                svcs = self.facility_repo.get_services(fac_id)
                service_id = svcs[0].id if svcs else 1

            try:
                appt = self.appointment_service.book_appointment(
                    patient_id=patient_id,
                    facility_id=fac_id,
                    service_id=service_id,
                    availability_slot_id=slot_id,
                )
                conv.appointment_id = appt["id"]
                ref_code = f"RC{appt['id']}"

                fac_name = (appt.get("facility") or {}).get("name") or "Healthcare Facility"
                svc_name = (appt.get("service") or {}).get("name") or "General Medicine"

                if lang == "hi":
                    reply = (
                        f"अपॉइंटमेंट सफलतापूर्वक बुक हो गया!\n\n"
                        f"{fac_name}\n"
                        f"{svc_name}\n"
                        f"{appt['appointment_date']} समय {appt['start_time']}\n"
                        f"रेफरेंस कोड: {ref_code}\n\n"
                        f"भेजें: 2-अस्पताल विवरण, 4-रेफरल, 5-फॉलोअप"
                    )
                elif lang == "mr":
                    reply = (
                        f"अपॉइंटमेंट यशस्वीरित्या बुक झाली!\n\n"
                        f"{fac_name}\n"
                        f"{svc_name}\n"
                        f"{appt['appointment_date']} वेळ {appt['start_time']}\n"
                        f"संदर्भ क्रमांक: {ref_code}\n\n"
                        f"पाठवा: 2-माहिती, 4-रेफरल, 5-फॉलोअप"
                    )
                else:
                    reply = (
                        f"Appointment booked successfully.\n\n"
                        f"{fac_name}\n"
                        f"{svc_name}\n"
                        f"{appt['appointment_date']} {appt['start_time']}\n"
                        f"Reference: {ref_code}\n\n"
                        f"Send: 2-Facility details, 4-Referral, 5-Followup"
                    )
                return reply, "BOOKED"

            except Exception as exc:
                logger.error("[SMS Booking] Failed to book appointment: %s", exc)
                return f"Unable to complete booking: {exc}. Reply 1 to choose another slot.", "SELECT_SLOT"

        elif is_negative_reply(text):
            return "Booking cancelled. Reply 1 to choose another slot, or 2 for facility information.", "OPTIONS_MENU"

        return "Please reply 1 for YES or 2 for NO.", "CONFIRM_BOOKING"

    # ──────────────────────────────────────────────────────────────────────────
    # Self-Service Query Handlers (Referrals, Follow-ups, Facility Details)
    # ──────────────────────────────────────────────────────────────────────────

    def _handle_referral_query(self, conv: SMSConversation, lang: str) -> str:
        """Query referrals for the authenticated patient."""
        self._sync_patient_profile(conv)
        patient_id = conv.patient_id
        if not patient_id:
            return "No registered records found for this mobile number."

        referrals = self.referral_service.get_patient_referrals(patient_id)
        if not referrals:
            return "You have no active referrals on record."

        latest = referrals[0]
        to_fac = (latest.get("to_facility") or {}).get("name", "Specialist Hospital")
        priority = latest.get("priority", "ROUTINE")
        reason = latest.get("reason", "Consultation")
        ref_id = latest.get("id")

        return f"Referral Status:\nRef #{ref_id} ({priority})\nTo: {to_fac}\nReason: {reason}\nStatus: {latest.get('status')}"

    def _handle_followup_query(self, conv: SMSConversation, lang: str) -> str:
        """Query follow-ups for the authenticated patient."""
        self._sync_patient_profile(conv)
        patient_id = conv.patient_id
        if not patient_id:
            return "No registered records found for this mobile number."

        follow_ups = self.follow_up_service.get_patient_follow_ups(patient_id)
        if not follow_ups:
            return "You have no pending follow-up consultations."

        latest = follow_ups[0]
        fu_date = latest.get("follow_up_date", "Scheduled")
        notes = latest.get("notes") or "Routine follow-up"
        status = latest.get("status", "PENDING")

        return f"Follow-Up Details:\nDate: {fu_date}\nStatus: {status}\nNotes: {notes}"

    def _handle_facility_details_query(self, conv: SMSConversation, lang: str) -> str:
        """Return concise details for the selected or nearest facility."""
        fac_id = conv.selected_facility_id
        if not fac_id:
            facs = self.facility_repo.list_facilities(status="ACTIVE")
            if facs:
                fac_id = facs[0].id

        if not fac_id:
            return MESSAGES["no_facility"].get(lang, MESSAGES["no_facility"]["en"])

        fac = self.facility_repo.get_by_id(fac_id)
        if not fac:
            return "Facility details currently unavailable."

        queue = self.queue_repo.find_by_facility_id(fac.id)
        q_line = ""
        if queue:
            if self._is_queue_stale(queue.last_updated):
                q_line = f"\nQueue: {queue.waiting_patients} patients (Queue info may be outdated)"
            else:
                q_line = f"\nQueue: {queue.waiting_patients} patients (~{queue.estimated_wait_minutes} min wait)"

        return (
            f"Facility Details:\n"
            f"{fac.name}\n"
            f"Type: {fac.type}\n"
            f"Address: {fac.address}, {fac.district}"
            f"{q_line}\n"
            f"Send 1 to book appointment."
        )

    def _handle_my_appointments_query(self, conv: SMSConversation, lang: str) -> str:
        """Return patient's scheduled appointments."""
        self._sync_patient_profile(conv)
        patient_id = conv.patient_id
        if not patient_id:
            return "No appointments found for this mobile number."

        appts = self.appointment_service.get_patient_appointments(patient_id)
        scheduled = [a for a in appts if a.get("status") == "SCHEDULED"]
        if not scheduled:
            return "You have no upcoming scheduled appointments. Send 1 to book one."

        latest = scheduled[0]
        fac_name = (latest.get("facility") or {}).get("name", "Healthcare Facility")
        return (
            f"Your Appointment:\n"
            f"Reference: RC{latest['id']}\n"
            f"{fac_name}\n"
            f"Date: {latest['appointment_date']} at {latest['start_time']}"
        )

    def _handle_care_guidance(self, conv: SMSConversation, lang: str) -> str:
        """Return basic care advice."""
        return (
            "Care Guidance:\n"
            "Rest, stay hydrated, and monitor temperature.\n"
            "Visit the recommended health centre if symptoms persist.\n"
            "In case of emergency, call 108 immediately."
        )

    # ──────────────────────────────────────────────────────────────────────────
    # Helper Utilities
    # ──────────────────────────────────────────────────────────────────────────

    def _is_queue_stale(self, last_updated: Optional[datetime]) -> bool:
        """Check if queue timestamp is older than 2 hours (120 minutes)."""
        if not last_updated:
            return False
        now = datetime.now(timezone.utc)
        if not last_updated.tzinfo:
            last_updated = last_updated.replace(tzinfo=timezone.utc)
        diff_minutes = (now - last_updated).total_seconds() / 60.0
        return diff_minutes > 120

    def _format_conversation_state(self, conv: SMSConversation) -> Dict[str, Any]:
        """Format debug conversation state dict."""
        return {
            "id": conv.id,
            "mobile": conv.mobile,
            "state": conv.state,
            "language": conv.language,
            "collected_name": conv.collected_name,
            "collected_age": conv.collected_age,
            "collected_location": conv.collected_location,
            "symptoms": conv.symptoms,
            "duration": conv.duration,
            "selected_facility_id": conv.selected_facility_id,
            "selected_slot_id": conv.selected_slot_id,
            "appointment_id": conv.appointment_id,
        }
