"""
services/conversation_agent.py
==============================
Provider-neutral Conversational Agent and Understanding Layer for Rural Care Navigator.

Replaces rigid IVR scripting with an intelligent, bilingual (English/Hindi/Hinglish)
conversational engine that extracts structured actions, maintains multi-turn memory,
and delegates medical decisions exclusively to run_triage().
"""

from __future__ import annotations

import logging
import re
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple

from ai.triage.triage import run_triage

try:
    from backend.app.ai.conversation.model_service import (
        extract_name_from_text,
        extract_age_from_text,
        extract_gender_from_text,
        extract_additional_notes_from_text,
    )
except ImportError:
    from app.ai.conversation.model_service import (
        extract_name_from_text,
        extract_age_from_text,
        extract_gender_from_text,
        extract_additional_notes_from_text,
    )

logger = logging.getLogger("rural_care.conversation_agent")


# ──────────────────────────────────────────────────────────────────────────────
# Structured Intents & Action Models
# ──────────────────────────────────────────────────────────────────────────────

class ConversationIntent(str, Enum):
    REPORT_SYMPTOMS = "REPORT_SYMPTOMS"
    PROVIDE_DURATION = "PROVIDE_DURATION"
    PROVIDE_SEVERITY = "PROVIDE_SEVERITY"
    PROVIDE_LOCALITY = "PROVIDE_LOCALITY"
    PROVIDE_NAME = "PROVIDE_NAME"
    PROVIDE_AGE = "PROVIDE_AGE"
    PROVIDE_GENDER = "PROVIDE_GENDER"
    PROVIDE_ADDITIONAL_NOTES = "PROVIDE_ADDITIONAL_NOTES"
    ANSWER_YES = "ANSWER_YES"
    ANSWER_NO = "ANSWER_NO"
    REQUEST_REPEAT = "REQUEST_REPEAT"
    REQUEST_HELP = "REQUEST_HELP"
    FACILITY_INFORMATION = "FACILITY_INFORMATION"
    BOOK_APPOINTMENT = "BOOK_APPOINTMENT"
    CHANGE_APPOINTMENT_TYPE = "CHANGE_APPOINTMENT_TYPE"
    CONFIRM_BOOKING = "CONFIRM_BOOKING"
    CANCEL_BOOKING = "CANCEL_BOOKING"
    EMERGENCY = "EMERGENCY"
    FINISH = "FINISH"
    UNKNOWN = "UNKNOWN"


# Phase-Based Generative Control: Strict Allowlist and Blocklist
ALLOWED_GENERATIVE_PHASES = {
    "GREETING",
    "SYMPTOMS",
    "DURATION",
    "LOCALITY",
    "NAME",
    "AGE",
    "SAFETY_QUESTIONS",
    "REQUEST_REPEAT",
    "UNKNOWN",
    "FOLLOW_UP",
}

DISALLOWED_GENERATIVE_PHASES = {
    "TRIAGE_PRESENTED",
    "BOOKING_TYPE",
    "BOOKING_CONFIRM",
    "CHANGE_APPOINTMENT_TYPE",
    "CANCEL_BOOKING",
    "EMERGENCY",
    "ENDED",
}


@dataclass
class ConversationAction:
    """Structured intent and entities extracted from caller speech or DTMF."""
    intent: ConversationIntent
    symptoms: List[str] = field(default_factory=list)
    duration: Optional[str] = None
    severity: Optional[str] = None
    red_flags: List[str] = field(default_factory=list)
    locality: Optional[str] = None
    appointment_type: Optional[str] = None  # "phone" or "offline"
    booking_intent: Optional[bool] = None
    confirmation: Optional[bool] = None  # True (yes), False (no)
    emergency: bool = False
    confidence: float = 1.0
    language: Optional[str] = None
    raw_text: str = ""
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    additional_notes: Optional[str] = None


@dataclass
class ConversationMemory:
    """Multi-turn conversation state maintained across the entire call."""
    language: str = "en-IN"  # "en-IN" or "hi-IN"
    patient_id: Optional[int] = None
    caller_phone: Optional[str] = None
    phone_number: Optional[str] = None
    patient_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    symptoms: List[str] = field(default_factory=list)
    symptom_descriptions: List[str] = field(default_factory=list)
    duration: Optional[str] = None
    severity: Optional[str] = None
    red_flags: List[str] = field(default_factory=list)
    locality: Optional[str] = None
    locality_confirmed: bool = False
    additional_notes: Optional[str] = None
    medical_history_summary: Optional[str] = None
    current_medications: Optional[str] = None
    allergies: Optional[str] = None
    emergency_red_flags: List[str] = field(default_factory=list)
    safety_questions_asked: bool = False
    additional_questions_asked: bool = False
    triage_result: Optional[Dict[str, Any]] = None
    recommended_facility: Optional[Dict[str, Any]] = None
    appointment_type: Optional[str] = "offline"  # "phone" or "offline"
    selected_slot: Optional[Dict[str, Any]] = None
    appointment_id: Optional[int] = None
    booking_intent: Optional[bool] = None
    last_prompt: str = ""
    last_intent: ConversationIntent = ConversationIntent.UNKNOWN
    dialogue_history: List[Dict[str, str]] = field(default_factory=list)
    call_phase: str = "GREETING"  # GREETING, SYMPTOMS, DURATION, NAME, AGE, LOCALITY, SAFETY_QUESTIONS, TRIAGE_PRESENTED, BOOKING_ASK, BOOKING_TYPE, BOOKING_CONFIRM, ENDED, EMERGENCY

    def __post_init__(self):
        if self.caller_phone and not self.phone_number:
            self.phone_number = self.caller_phone
        elif self.phone_number and not self.caller_phone:
            self.caller_phone = self.phone_number

    def add_turn(self, speaker: str, text: str) -> None:
        self.dialogue_history.append({"speaker": speaker, "text": text})

    def get_summary_text(self) -> str:
        return "; ".join([f"{t['speaker']}: {t['text']}" for t in self.dialogue_history])


# ──────────────────────────────────────────────────────────────────────────────
# Provider-Neutral Agent Interface
# ──────────────────────────────────────────────────────────────────────────────

class ConversationAgentProvider(ABC):
    """Abstract interface for LLM/NLP conversational agents."""

    @abstractmethod
    def interpret(
        self,
        transcript: str,
        memory: ConversationMemory,
    ) -> ConversationAction:
        """Parse natural speech and return a structured action."""
        pass

    @abstractmethod
    def generate_response(
        self,
        action: ConversationAction,
        memory: ConversationMemory,
        tool_output: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate a short, natural bilingual response suitable for voice audio."""
        pass


# ──────────────────────────────────────────────────────────────────────────────
# Comprehensive Bilingual Lexicons (English, Hindi, Hinglish, Colloquial)
# ──────────────────────────────────────────────────────────────────────────────

SYMPTOM_LEXICON: Dict[str, List[str]] = {
    "fever": [
        "fever", "fevar", "fevr", "temperature", "high temp", "pyrexia", "shivering",
        "bukhar", "b बुखार", "tap", "taap", "garmi lag rahi", "badan garm", "feverish"
    ],
    "cough": [
        "cough", "coughing", "kasi", "kansi", "khansi", "sukhi khansi", "balgam",
        "khasi", "cold and cough", "dhaska", "cough hai"
    ],
    "pain": [
        "pain", "hurting", "hurts", "ache", "aching", "sore", "dard", "peeda",
        "dukh raha", "dard ho raha", "chubhan", "headache", "sar dard", "badan dard"
    ],
    "stomach problem": [
        "stomach", "tummy", "abdomen", "abdominal", "belly", "loose motions", "diarrhea",
        "vomiting", "nausea", "acidity", "gas", "pet dard", "pet kharab", "dast",
        "ulti", "pait dard", "stomach ache", "cramps"
    ],
    "injury": [
        "injury", "injured", "injure", "wound", "wounded", "bleeding", "cut",
        "fell down", "fall", "fallen", "accident", "fracture", "broken", "bruise",
        "chot", "ghayal", "khoon", "gir gaya", "gir gayi", "gir gya", "haddi toot",
        "haath toot", "pair toot", "leg hurt", "hurt my hand", "hurt my leg",
        "mera haath lag gaya", "haath lag gaya", "lag gaya", "haath cut gaya", "pair me chot lagi"
    ],
    "breathing difficulty": [
        "shortness of breath", "difficulty breathing", "trouble breathing", "cannot breathe",
        "can't breathe", "breathless", "saans lene mein takleef", "saans phool", "saans nahi",
        "dam ghut raha", "gasping"
    ],
    "chest pain": [
        "chest pain", "pain in chest", "heavy chest", "chhati mein dard", "seene mein dard",
        "chati dard", "heart pain", "pressure in chest"
    ],
}

RED_FLAGS_LEXICON = [
    "severe chest pain", "chhati mein dard", "seene mein bahut dard",
    "difficulty breathing", "cannot breathe", "can't breathe", "saans lene mein dikkat",
    "unconscious", "behosh", "heavy bleeding", "bahut khoon", "stroke", "paralysis",
    "high fever with stiff neck", "blood in vomit", "khoon ki ulti"
]

DURATION_PATTERNS = [
    (r"(\d+)\s*(day|days|din)", lambda m: f"{m.group(1)} days"),
    (r"(\d+)\s*(week|weeks|hafte|hafta)", lambda m: f"{m.group(1)} weeks"),
    (r"(\d+)\s*(hour|hours|ghante|ghanta)", lambda m: f"{m.group(1)} hours"),
    (r"since\s+yesterday|kal\s+se", lambda m: "since yesterday"),
    (r"today|aaj\s+se", lambda m: "today"),
    (r"ek\s+din|one\s+day", lambda m: "1 day"),
    (r"do\s+din|two\s+days", lambda m: "2 days"),
    (r"teen\s+din|three\s+days", lambda m: "3 days"),
    (r"char\s+din|four\s+days", lambda m: "4 days"),
    (r"panch\s+din|five\s+days", lambda m: "5 days"),
]

SEVERITY_WORDS_HIGH = [
    "severe", "extreme", "very high", "unbearable", "bahut jyada", "bahut tez",
    "bahut zyada", "badly", "critical", "intense", "asahiya"
]
SEVERITY_WORDS_MODERATE = ["moderate", "thoda", "thoda bahut", "medium", "theek theek"]
SEVERITY_WORDS_MILD = ["mild", "halka", "thoda sa", "slight"]

AFFIRMATIVE_WORDS = {
    "yes", "yeah", "yep", "sure", "ok", "okay", "correct", "right", "haan",
    "haanji", "ha", "bilkul", "sahi", "theek", "yes please", "zaroor", "kripya"
}

NEGATIVE_WORDS = {
    "no", "nope", "nah", "not", "nahi", "nahin", "na", "no thanks", "nothing",
    "nahi chahiye", "kuch nahi", "no nothing else", "not needed", "baad mein"
}

REPEAT_WORDS = [
    "repeat", "say again", "didn't understand", "pardon", "what", "phir se",
    "dobara", "samajh nahi", "samajh nahi aaya", "ek baar aur"
]

LOCALITY_SYNONYMS = [
    "malshiras", "akluj", "pandharpur", "solapur", "natepute", "kurduwadi",
    "sangola", "barshi", "karmala", "mangalore", "village", "town"
]


# ──────────────────────────────────────────────────────────────────────────────
# Default Built-In Fast Bilingual NLP Engine (Provider-Neutral)
# ──────────────────────────────────────────────────────────────────────────────

class FastBilingualConversationAgentProvider(ConversationAgentProvider):
    """
    Ultra-low latency, robust in-process semantic engine that parses
    English, Hindi, and Hinglish speech into structured actions without
    requiring external cloud network dependencies or API keys.
    """

    def interpret(self, transcript: str, memory: ConversationMemory) -> ConversationAction:
        clean = (transcript or "").strip()
        t_lower = clean.lower()

        action = ConversationAction(
            intent=ConversationIntent.UNKNOWN,
            raw_text=clean,
        )

        # 1. Repeat Request
        if any(r in t_lower for r in REPEAT_WORDS):
            action.intent = ConversationIntent.REQUEST_REPEAT
            return action

        # 2. Emergency Check (Highest Acuity First)
        for rf in RED_FLAGS_LEXICON:
            if rf in t_lower and not ("no " in t_lower or "nahi " in t_lower):
                action.intent = ConversationIntent.EMERGENCY
                action.emergency = True
                action.red_flags.append(rf)
                action.symptoms.append(rf)
                return action

        # 3. Repeat/Help Request
        if "help" in t_lower or "madad" in t_lower:
            action.intent = ConversationIntent.REQUEST_HELP
            return action

        # 4. Affirmative / Negative standalone responses
        tokens = [w.strip(".,!?:;\"'") for w in t_lower.split()]
        is_yes = any(w in tokens for w in ("yes", "yeah", "yep", "sure", "haan", "haanji", "bilkul")) or "yes please" in t_lower
        is_no = any(w in tokens for w in ("no", "nope", "nah", "nahi", "nahin")) or "no thanks" in t_lower or "nothing else" in t_lower or "kuch nahi" in t_lower

        # 5. Facility info request without booking
        if any(f in t_lower for f in ("where should i go", "kahan jaun", "hospital location", "facility batao", "just tell me where", "tell me where")):
            action.intent = ConversationIntent.FACILITY_INFORMATION
            return action

        # 6. Booking Intent & Appointment Type changes
        booking_keywords = (
            "book", "appointment", "doctor", "talk to a doctor", "doctor se baat",
            "phone pe", "hospital jaana", "visit", "phone consultation", "offline visit"
        )
        if any(w in t_lower for w in booking_keywords):
            if any(c in t_lower for c in ("cancel", "nahi chahiye", "don't want", "rehne do")):
                action.intent = ConversationIntent.CANCEL_BOOKING
                action.confirmation = False
                return action

            # Change of appointment type or specific booking request
            if any(p in t_lower for p in ("phone", "call", "audio", "teleconsultation")):
                action.appointment_type = "phone"
            elif any(o in t_lower for o in ("offline", "in person", "visit", "clinic", "hospital", "aspatal")):
                action.appointment_type = "offline"

            if memory.call_phase in ("BOOKING_TYPE", "BOOKING_ASK", "BOOKING_CONFIRM"):
                if action.appointment_type:
                    action.intent = ConversationIntent.CHANGE_APPOINTMENT_TYPE
                else:
                    action.intent = ConversationIntent.BOOK_APPOINTMENT
            else:
                action.intent = ConversationIntent.BOOK_APPOINTMENT
            action.booking_intent = True
            return action

        # 7. Locality Detection
        for loc in LOCALITY_SYNONYMS:
            if loc in t_lower:
                action.locality = loc.title()
                break
        if not action.locality:
            loc_m = re.search(
                r"(?:live in|living in|gaon|village|mera gaon|hamara gaon|rehta hu|rehta hoon|from|se hoon|se hu)\s+([a-zA-Z0-9\s]+)|"
                r"(?:main|hum)\s+([a-zA-Z0-9\s]+)\s+(?:se|mein|me)",
                clean,
                re.IGNORECASE,
            )
            if loc_m:
                cand = (loc_m.group(1) or loc_m.group(2) or "").strip()
                if cand.lower() not in ("hai", "a", "an", "the", "doctor", "hospital", "me", "mein", "se") and len(cand) > 2:
                    action.locality = cand.title()
        if not action.locality:
            # Check if caller answered with a locality while we were asking for one
            if memory.call_phase in ("LOCALITY", "GREETING", "TRIAGE_PRESENTED") and not is_yes and not is_no:
                # If short input and not symptoms
                has_symptom = any(syn in t_lower for syns in SYMPTOM_LEXICON.values() for syn in syns)
                if not has_symptom and len(clean.split()) <= 4 and len(clean) >= 3:
                    action.locality = clean.title()

        # 8. Duration Extraction
        for pattern, extractor in DURATION_PATTERNS:
            match = re.search(pattern, t_lower, re.IGNORECASE)
            if match:
                action.duration = extractor(match)
                break

        # 9. Severity Extraction
        if any(w in t_lower for w in SEVERITY_WORDS_HIGH):
            action.severity = "severe"
        elif any(w in t_lower for w in SEVERITY_WORDS_MODERATE):
            action.severity = "moderate"
        elif any(w in t_lower for w in SEVERITY_WORDS_MILD):
            action.severity = "mild"

        # 10. Symptom Extraction
        for canonical, syns in SYMPTOM_LEXICON.items():
            for syn in syns:
                if syn in t_lower:
                    if canonical not in action.symptoms:
                        action.symptoms.append(canonical)
                    break

        # 11. Demographic & Intake Extraction
        action.patient_name = extract_name_from_text(
            clean,
            context={"waiting_for": "name" if memory.call_phase == "NAME" else None, "call_phase": memory.call_phase}
        )
        action.age = extract_age_from_text(
            clean,
            context={"waiting_for": "age" if memory.call_phase == "AGE" else None, "call_phase": memory.call_phase}
        )
        action.gender = extract_gender_from_text(clean)
        action.additional_notes = extract_additional_notes_from_text(clean)

        # 12. Contextual Intent Determination
        if action.emergency:
            action.intent = ConversationIntent.EMERGENCY
        elif action.symptoms:
            action.intent = ConversationIntent.REPORT_SYMPTOMS
        elif action.patient_name and not action.symptoms and (memory.call_phase == "NAME" or action.intent == ConversationIntent.UNKNOWN):
            action.intent = ConversationIntent.PROVIDE_NAME
        elif action.age is not None and not action.symptoms and (memory.call_phase == "AGE" or action.intent == ConversationIntent.UNKNOWN):
            action.intent = ConversationIntent.PROVIDE_AGE
        elif action.duration and not action.symptoms:
            action.intent = ConversationIntent.PROVIDE_DURATION
        elif action.severity and not action.symptoms:
            action.intent = ConversationIntent.PROVIDE_SEVERITY
        elif action.locality and not action.symptoms:
            action.intent = ConversationIntent.PROVIDE_LOCALITY
        elif is_yes:
            action.intent = ConversationIntent.ANSWER_YES
            action.confirmation = True
        elif is_no:
            action.intent = ConversationIntent.ANSWER_NO
            action.confirmation = False
        elif any(b in t_lower for b in ("bye", "goodbye", "alvida", "dhanyawad", "thank you", "thanks")):
            action.intent = ConversationIntent.FINISH

        return action

    def generate_response(
        self,
        action: ConversationAction,
        memory: ConversationMemory,
        tool_output: Optional[Dict[str, Any]] = None,
    ) -> str:
        is_hi = (memory.language == "hi-IN" or memory.language == "hi")

        # 0. Repeat Request
        if action.intent == ConversationIntent.REQUEST_REPEAT:
            if memory.last_prompt:
                return memory.last_prompt
            if is_hi:
                return "Kripya apna sthan ya lakshan phir se batayein."
            return "Could you please describe your symptoms or town again?"

        # 0.1 Help Request
        if action.intent == ConversationIntent.REQUEST_HELP:
            if is_hi:
                return "Main aapke lakshano ki jankari lekar doctor consultation book karne mein madad kar sakta hoon. Kripya apne lakshan batayein."
            return "I can assess your symptoms and help arrange medical care. Please describe what you are experiencing."

        # 1. Emergency Flow (Highest acuity clinical safety without demographic delays)
        if action.intent == ConversationIntent.EMERGENCY or action.emergency or memory.call_phase == "EMERGENCY" or (memory.triage_result and memory.triage_result.get("emergency")):
            fac = memory.recommended_facility or {}
            fac_name = fac.get("name") or ("pass ke hospital" if is_hi else "the nearest hospital")
            if is_hi:
                return f"Yeh ek aapatkaleen sthiti lag rahi hai. Kripya turant 108 par call karein ya bina kisi deri ke {fac_name} ke emergency vibhag jayein."
            return f"This sounds like a medical emergency. Please call 108 immediately or proceed to the nearest emergency department at {fac_name} without delay."

        # 2. Dynamic Acknowledgement based on what was just learned
        ack = ""
        if is_hi:
            if action.symptoms:
                syms_str = " aur ".join(memory.symptoms)
                if memory.duration:
                    ack = f"Theek hai, {syms_str}, {memory.duration} se."
                else:
                    ack = f"Theek hai, maine note kar liya hai — {syms_str}."
            elif action.patient_name and action.patient_name == memory.patient_name:
                ack = f"Shukriya {memory.patient_name}."
            elif action.duration and action.duration == memory.duration:
                ack = f"Dhanyawad, {memory.duration}."
            elif action.locality and action.locality == memory.locality:
                ack = "Dhanyawad."
        else:
            if action.symptoms:
                syms_str = " and ".join(memory.symptoms)
                if memory.duration:
                    ack = f"I understand you have {syms_str} for {memory.duration}."
                else:
                    ack = f"Okay, I understand you have {syms_str}."
            elif action.patient_name and action.patient_name == memory.patient_name:
                ack = f"Thanks {memory.patient_name}."
            elif action.duration and action.duration == memory.duration:
                ack = f"Understood, for {memory.duration}."
            elif action.locality and action.locality == memory.locality:
                ack = "Thank you."

        # 3. Dynamic Question/Prompt based on conversation state
        prompt = ""
        if memory.call_phase == "DURATION":
            syms_str = " aur ".join(memory.symptoms) if is_hi else " and ".join(memory.symptoms)
            if is_hi:
                prompt = f"Aapko {syms_str} kitne din se ho raha hai?"
            else:
                prompt = "How long have you been experiencing them?"

        elif memory.call_phase == "NAME":
            if is_hi:
                prompt = "Kripya apna naam batayein?"
            else:
                prompt = "May I know your name?"

        elif memory.call_phase == "AGE":
            if is_hi:
                prompt = "Aapki umar kitni hai?"
            else:
                prompt = "How old are you?"

        elif memory.call_phase == "LOCALITY":
            if is_hi:
                prompt = "Aap kaun se gaon ya shahar se bol rahe hain?"
            else:
                prompt = "Which village or town are you calling from?"

        elif memory.call_phase == "SAFETY_QUESTIONS":
            if is_hi:
                prompt = "Kya aapko saans lene mein takleef ya seene mein tej dard hai?"
            else:
                prompt = "Do you have any difficulty breathing or severe chest pain?"

        elif memory.call_phase == "TRIAGE_PRESENTED":
            triage_res = memory.triage_result or {}
            care_raw = str(triage_res.get("recommended_care") or "primary healthcare facility")
            care_desc = "a primary healthcare facility"
            if "hospital" in care_raw.lower() or "secondary" in care_raw.lower():
                care_desc = "a hospital or community health centre"
            elif "home" in care_raw.lower():
                care_desc = "home care with primary health monitoring"

            fac = memory.recommended_facility or {}
            fac_name = fac.get("name") or ("the local clinic" if not is_hi else "kendra")
            loc_str = f" in {memory.locality}" if memory.locality else ""
            loc_hi = f" {memory.locality} mein" if memory.locality else ""

            if is_hi:
                prompt = f"Aapki jankari ke anusar, aapko primary healthcare facility par dikhana chahiye. Maine{loc_hi} {fac_name} paya hai. Kya aap appointment book karke facility jana chahte hain ya phone par doctor se baat karna chahte hain?"
            else:
                prompt = f"Based on what you've told me, you should be assessed at {care_desc}. I found a suitable facility for you{loc_str}: {fac_name}. Would you like to book an appointment to visit the facility or speak to a doctor by phone?"

        elif memory.call_phase == "BOOKING_TYPE":
            if is_hi:
                prompt = "Kya aap phone consultation chahte hain ya clinic jaana chahte hain?"
            else:
                prompt = "Would you prefer a phone consultation or an in-person clinic visit?"

        elif memory.call_phase == "BOOKING_CONFIRM":
            slot = memory.selected_slot or {}
            slot_time = slot.get("slot_time", "an upcoming slot")
            fac_name = (memory.recommended_facility or {}).get("name", "the clinic")
            type_desc = "phone consultation" if memory.appointment_type == "phone" else "visit"
            if is_hi:
                prompt = f"Maine {fac_name} mein kal {slot_time} {type_desc} slot paya hai. Kya ise confirm karke book kar dein?"
            else:
                prompt = f"I found an available {type_desc} slot for tomorrow at {slot_time}. Would you like me to confirm and book it?"

        elif memory.call_phase == "ENDED":
            if memory.appointment_id:
                type_label = "phone consultation" if memory.appointment_type == "phone" else "appointment"
                if is_hi:
                    return f"Aapka {type_label} book ho gaya hai. Aapka booking number {memory.appointment_id} hai. Kripya samay par uplabdh rahein. Namaste."
                return f"Your {type_label} has been booked. Your booking number is {memory.appointment_id}. Please be available on time. Take care and goodbye."
            else:
                if is_hi:
                    return "Theek hai. Kripya nirdeshit chikitsa kendra jayein. Apna khayal rakhein. Namaste."
                return "Understood. Please visit the healthcare facility as advised. Take care and goodbye."

        elif memory.call_phase in ("GREETING", "SYMPTOMS"):
            if is_hi:
                prompt = "Kripya apne lakshan vistar se batayein."
            else:
                prompt = "Please describe what symptoms or health issue you have."

        # Combine acknowledgement and prompt naturally
        if ack and prompt:
            return f"{ack} {prompt}"
        elif prompt:
            return prompt
        elif ack:
            return ack
        else:
            if is_hi:
                return "Kripya apne lakshan ya sthan batayein."
            return "Please describe your symptoms or village."


# ──────────────────────────────────────────────────────────────────────────────
# Primary Local Learned Model Provider (No External LLM API)
# ──────────────────────────────────────────────────────────────────────────────

class LocalModelConversationAgentProvider(ConversationAgentProvider):
    """
    Primary bilingual conversational understanding agent powered by our locally trained
    multi-task intent classifier and slot extractor.
    Operates 100% offline with zero cloud API latency or costs.
    """

    def __init__(self, fallback_provider: Optional[ConversationAgentProvider] = None):
        try:
            from backend.app.ai.conversation.model_service import LocalConversationModel
        except ImportError:
            from app.ai.conversation.model_service import LocalConversationModel
        self.model = LocalConversationModel.get_instance()
        self.fallback = fallback_provider or FastBilingualConversationAgentProvider()

    def interpret(
        self,
        transcript: str,
        memory: ConversationMemory,
    ) -> ConversationAction:
        clean = (transcript or "").strip()
        if not clean:
            return ConversationAction(
                intent=ConversationIntent.UNKNOWN,
                raw_text=transcript,
                confidence=0.0,
            )

        # 1. Run local model prediction
        res = self.model.predict(
            clean,
            context={
                "waiting_for": "name" if memory.call_phase == "NAME" else ("age" if memory.call_phase == "AGE" else None),
                "call_phase": memory.call_phase,
            }
        )
        intent_str = res.get("intent", "UNKNOWN")
        confidence = float(res.get("confidence", 0.0))

        # Check for language switch requests
        if re.search(r"\b(?:english(?:\s+mein)?|in\s+english|talk\s+in\s+english)\b", clean, re.IGNORECASE):
            memory.language = "en-IN"
        elif re.search(r"\b(?:hindi(?:\s+mein)?|in\s+hindi|hindi\s+bolo)\b", clean, re.IGNORECASE):
            memory.language = "hi-IN"
        elif res.get("language") == "hi" and memory.language == "en-IN" and not memory.dialogue_history:
            # First turn Hindi detection
            memory.language = "hi-IN"

        # Map string intent to Enum safely
        try:
            enum_intent = ConversationIntent(intent_str)
        except ValueError:
            enum_intent = ConversationIntent.UNKNOWN

        # 2. Extract slots
        symptoms = res.get("symptoms", [])
        duration = res.get("duration")
        severity = res.get("severity")
        locality = res.get("locality")
        appt_type = res.get("appointment_type")
        conf_bool = res.get("confirmation")
        emergency = bool(res.get("emergency", False))
        patient_name = res.get("patient_name")
        age = res.get("age")
        gender = res.get("gender")
        additional_notes = res.get("additional_notes")

        action = ConversationAction(
            intent=enum_intent,
            symptoms=symptoms,
            duration=duration,
            severity=severity,
            locality=locality,
            appointment_type=appt_type,
            confirmation=conf_bool,
            emergency=emergency,
            confidence=confidence,
            language=res.get("language"),
            raw_text=transcript,
            patient_name=patient_name,
            age=age,
            gender=gender,
            additional_notes=additional_notes,
        )

        # 3. Contextual fallback or enhancement
        fallback_action = self.fallback.interpret(transcript, memory)
        if not action.symptoms and fallback_action.symptoms:
            action.symptoms = list(fallback_action.symptoms)
        if not action.patient_name and fallback_action.patient_name:
            action.patient_name = fallback_action.patient_name
        if action.age is None and fallback_action.age is not None:
            action.age = fallback_action.age
        if not action.gender and fallback_action.gender:
            action.gender = fallback_action.gender
        if not action.locality and fallback_action.locality:
            action.locality = fallback_action.locality
        if not action.duration and fallback_action.duration:
            action.duration = fallback_action.duration
        if not action.additional_notes and fallback_action.additional_notes:
            action.additional_notes = fallback_action.additional_notes
        if fallback_action.confirmation is not None and action.confirmation is None:
            action.confirmation = fallback_action.confirmation
        if fallback_action.emergency:
            action.emergency = True
            action.intent = ConversationIntent.EMERGENCY

        if enum_intent == ConversationIntent.UNKNOWN or confidence < 0.40:
            if fallback_action.intent != ConversationIntent.UNKNOWN:
                action.intent = fallback_action.intent
                action.confidence = max(confidence, 0.85)

        return action

    def generate_response(
        self,
        action: ConversationAction,
        memory: ConversationMemory,
        tool_output: Optional[Dict[str, Any]] = None,
    ) -> str:
        if action.intent == ConversationIntent.REQUEST_REPEAT and memory.last_prompt:
            return memory.last_prompt

        # Check unknown input
        is_hi = (memory.language == "hi-IN" or memory.language == "hi")
        if action.intent == ConversationIntent.UNKNOWN and (action.confidence < 0.40 and not action.symptoms and not action.locality and not action.emergency and not action.patient_name and action.age is None):
            if is_hi:
                return "Maaf kijiye, main theek se samajh nahi paya. Kripya apne lakshan ya sthan phir se batayein."
            return "I apologize, I didn't quite catch that. Could you please describe your symptoms or town again?"

        # 1. Compute authoritative deterministic fallback response
        deterministic_response = self.fallback.generate_response(action, memory, tool_output)

        # 2. Check emergency override (clinical decisions & emergencies remain 100% deterministic)
        if action.emergency or action.intent == ConversationIntent.EMERGENCY or bool(getattr(memory, "emergency_red_flags", [])):
            return deterministic_response

        # 3. Phase-Based Generative Control Gating
        # Only conversational intake phases are allowed; clinical, triage, and booking phases are strictly deterministic
        active_phase = getattr(memory, "call_phase", "UNKNOWN")
        if active_phase not in ALLOWED_GENERATIVE_PHASES or active_phase in DISALLOWED_GENERATIVE_PHASES:
            return deterministic_response

        # 4. Retrieve settings for generative execution & shadow mode
        try:
            from backend.app.core.config import settings
            gen_enabled = getattr(settings, "LOCAL_GENERATIVE_RESPONSES_ENABLED", False)
            shadow_mode = getattr(settings, "LOCAL_GENERATIVE_SHADOW_MODE", True)
        except Exception:
            gen_enabled = False
            shadow_mode = False

        if not gen_enabled and not shadow_mode:
            return deterministic_response

        # 4. Attempt Local Generative LM inference via clean adapter
        try:
            from backend.app.ai.generative.generator_service import LocalGenerativeResponseService
            service = LocalGenerativeResponseService.get_instance()
            if service.is_ready:
                gen_text, is_valid, reason, latency_ms = service.generate(action, memory)

                if shadow_mode:
                    logger.info(
                        "[LOCAL_GEN_LM_SHADOW] phase=%s valid=%s reason=%s latency=%.1fms | gen='%s' | det='%s'",
                        memory.call_phase,
                        is_valid,
                        reason,
                        latency_ms,
                        gen_text or "",
                        deterministic_response,
                    )

                if gen_enabled and is_valid and gen_text:
                    logger.info(
                        "[LOCAL_GEN_LM_ACTIVE] Using verified generative wording (latency=%.1fms)",
                        latency_ms,
                    )
                    return gen_text
                elif gen_enabled and not is_valid:
                    logger.warning(
                        "[LOCAL_GEN_LM_REJECT] Fallback triggered (reason=%s, latency=%.1fms)",
                        reason,
                        latency_ms,
                    )
        except Exception as exc:
            logger.error("[LOCAL_GEN_LM_ERROR] Generation adapter exception: %s", exc)

        return deterministic_response


# ──────────────────────────────────────────────────────────────────────────────
# Master Conversation Agent Orchestrator & Backend Tools
# ──────────────────────────────────────────────────────────────────────────────

class ConversationAgent:
    """
    Coordinates multi-turn conversation memory, intent extraction via provider,
    and safe invocation of backend clinical and facility services.
    """

    def __init__(self, provider: Optional[ConversationAgentProvider] = None):
        self.provider = provider or LocalModelConversationAgentProvider()


    # ── Backend Tools ──

    def collect_and_update_symptoms(
        self,
        memory: ConversationMemory,
        action: ConversationAction,
    ) -> None:
        """Update symptoms, duration, demographics, and red flags without overwriting past turns."""
        for s in action.symptoms:
            if s not in memory.symptoms:
                memory.symptoms.append(s)

        if action.raw_text and action.raw_text not in memory.symptom_descriptions:
            memory.symptom_descriptions.append(action.raw_text)

        if action.duration:
            memory.duration = action.duration

        if action.severity:
            memory.severity = action.severity

        for rf in action.red_flags:
            if rf not in memory.red_flags:
                memory.red_flags.append(rf)
            if rf not in memory.emergency_red_flags:
                memory.emergency_red_flags.append(rf)

        if action.locality:
            memory.locality = action.locality
            memory.locality_confirmed = True

        if action.patient_name and not memory.patient_name:
            memory.patient_name = action.patient_name

        if action.age is not None and memory.age is None:
            memory.age = action.age

        if action.gender and not memory.gender:
            memory.gender = action.gender

        if action.additional_notes:
            if memory.additional_notes:
                if action.additional_notes not in memory.additional_notes:
                    memory.additional_notes += f"; {action.additional_notes}"
            else:
                memory.additional_notes = action.additional_notes

        if action.appointment_type:
            memory.appointment_type = action.appointment_type

        if action.booking_intent is not None:
            memory.booking_intent = action.booking_intent

        if action.symptoms or action.red_flags:
            try:
                t_res = self.run_medical_triage(memory)
                if t_res and t_res.get("emergency"):
                    action.emergency = True
            except Exception:
                pass

    def run_medical_triage(self, memory: ConversationMemory) -> Dict[str, Any]:
        """
        Execute the existing run_triage() engine on collected symptoms and descriptions.
        Does NOT invent clinical decisions.
        """
        all_symptoms = list(set(memory.symptoms))
        desc = " ".join(memory.symptom_descriptions) or (", ".join(all_symptoms) if all_symptoms else "Voice consultation")
        try:
            import backend.app.api.v1.routes.ivr as ivr_mod
            _triage_fn = getattr(ivr_mod, "run_triage", run_triage)
        except Exception:
            _triage_fn = run_triage

        res = _triage_fn(symptoms=all_symptoms or ["fever"], description=desc)
        triage_dict = {
            "urgency": res.urgency,
            "emergency": res.emergency,
            "recommended_care": res.recommended_care,
            "reason": res.reason,
            "triage_level": res.urgency.upper(),
        }
        memory.triage_result = triage_dict
        return triage_dict

    def find_facilities(self, memory: ConversationMemory, db: Optional[Any] = None) -> Dict[str, Any]:
        """Discover database facilities matching locality and care level."""
        from backend.app.services.exotel_voice_service import find_recommended_facility

        is_em = bool((memory.triage_result or {}).get("emergency")) or bool(memory.red_flags)
        care_lvl = (memory.triage_result or {}).get("recommended_care")

        fac = find_recommended_facility(
            location_query=memory.locality,
            care_level=care_lvl,
            emergency=is_em,
            db=db,
        )
        memory.recommended_facility = fac
        return fac

    def get_or_create_slot(
        self,
        memory: ConversationMemory,
        db: Optional[Any] = None,
    ) -> Dict[str, Any]:
        """Query real database appointment slots for recommended facility."""
        from backend.app.api.v1.routes.ivr import _get_or_create_slot_for_facility
        fac_id = (memory.recommended_facility or {}).get("id") or 1
        slot = _get_or_create_slot_for_facility(fac_id, db=db)
        memory.selected_slot = slot
        return slot

    def create_appointment(
        self,
        memory: ConversationMemory,
        db: Optional[Any] = None,
    ) -> Optional[int]:
        """Book real appointment using existing AppointmentService."""
        from backend.app.api.v1.routes.ivr import _book_appointment_for_session
        from backend.app.services.exotel_voice_service import ExotelVoiceSession

        sess = ExotelVoiceSession()
        sess.patient_id = memory.patient_id
        sess.phone_number = memory.caller_phone or memory.phone_number or ""
        sess.location = memory.locality
        sess.recommended_facility = memory.recommended_facility
        sess.selected_slot = memory.selected_slot
        sess.appointment_type = (memory.appointment_type or "offline").lower()

        appt_id = _book_appointment_for_session(sess, db=db)
        if appt_id:
            memory.appointment_id = appt_id
            if sess.patient_id and not memory.patient_id:
                memory.patient_id = sess.patient_id
        return appt_id

    # ── Multi-Turn Orchestration ──

    def handle_turn(
        self,
        transcript: str,
        memory: ConversationMemory,
        db: Optional[Any] = None,
    ) -> Tuple[str, ConversationAction]:
        """
        Process a single spoken transcript turn through understanding, tool execution,
        and dynamic response generation.
        """
        memory.add_turn("caller", transcript)

        # 1. Interpret
        action = self.provider.interpret(transcript, memory)
        self.collect_and_update_symptoms(memory, action)
        memory.last_intent = action.intent

        # 2. Emergency Override (Clinical safety order: highest acuity bypasses demographic intake)
        if action.intent == ConversationIntent.EMERGENCY or action.emergency or bool(memory.emergency_red_flags):
            memory.call_phase = "EMERGENCY"
            self.run_medical_triage(memory)
            self.find_facilities(memory, db=db)
            speech = self.provider.generate_response(action, memory)
            memory.last_prompt = speech
            memory.add_turn("bot", speech)
            return speech, action

        # 3. State Machine & Tool Execution based on Turn

        # Case A: Repeat request
        if action.intent == ConversationIntent.REQUEST_REPEAT and memory.last_prompt:
            speech = memory.last_prompt
            memory.add_turn("bot", speech)
            return speech, action

        # Case B: Caller explicitly finishing
        if action.intent == ConversationIntent.FINISH:
            memory.call_phase = "ENDED"

        # Case C: Booking flow progression
        elif memory.call_phase == "TRIAGE_PRESENTED":
            if action.appointment_type:
                memory.appointment_type = action.appointment_type
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif any(w in transcript.lower() for w in ("phone", "call", "audio", "teleconsultation")):
                memory.appointment_type = "phone"
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif any(w in transcript.lower() for w in ("visit", "offline", "clinic", "hospital", "aspatal")):
                memory.appointment_type = "offline"
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif action.intent in (ConversationIntent.ANSWER_YES, ConversationIntent.BOOK_APPOINTMENT) or action.confirmation is True or action.booking_intent is True:
                memory.call_phase = "BOOKING_TYPE"
            elif action.intent in (ConversationIntent.ANSWER_NO, ConversationIntent.CANCEL_BOOKING) or action.confirmation is False:
                memory.call_phase = "ENDED"

        elif memory.call_phase == "BOOKING_TYPE":
            if action.appointment_type:
                memory.appointment_type = action.appointment_type
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif any(w in transcript.lower() for w in ("phone", "call", "audio")):
                memory.appointment_type = "phone"
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif any(w in transcript.lower() for w in ("visit", "offline", "clinic", "hospital", "aspatal")):
                memory.appointment_type = "offline"
                self.get_or_create_slot(memory, db=db)
                memory.call_phase = "BOOKING_CONFIRM"
            elif action.intent == ConversationIntent.ANSWER_NO or action.confirmation is False:
                memory.call_phase = "ENDED"

        elif memory.call_phase == "BOOKING_CONFIRM":
            if action.intent in (ConversationIntent.ANSWER_YES, ConversationIntent.CONFIRM_BOOKING) or action.confirmation is True:
                appt_id = self.create_appointment(memory, db=db)
                memory.call_phase = "ENDED"
            elif action.intent in (ConversationIntent.ANSWER_NO, ConversationIntent.CANCEL_BOOKING) or action.confirmation is False:
                memory.call_phase = "ENDED"

        elif memory.call_phase == "SAFETY_QUESTIONS":
            # Check for affirmative with critical symptom
            if (action.intent == ConversationIntent.ANSWER_YES or action.confirmation is True) and any(rf in transcript.lower() for rf in ("chest pain", "breath", "saans", "seene", "dard")):
                memory.call_phase = "EMERGENCY"
                self.run_medical_triage(memory)
                self.find_facilities(memory, db=db)
            else:
                self.run_medical_triage(memory)
                self.find_facilities(memory, db=db)
                memory.call_phase = "TRIAGE_PRESENTED"

        elif action.intent in (ConversationIntent.ANSWER_NO, ConversationIntent.CANCEL_BOOKING) and not memory.locality and memory.symptoms:
            # Caller indicated no other symptoms -> proceed to locality for facility determination
            memory.call_phase = "LOCALITY"

        elif memory.locality and memory.symptoms and not memory.booking_intent:
            # Locality and symptoms available -> execute triage & assign facility
            self.run_medical_triage(memory)
            self.find_facilities(memory, db=db)
            memory.call_phase = "TRIAGE_PRESENTED"

        else:
            # Standard intake sequence:
            # SYMPTOMS -> DURATION -> LOCALITY -> NAME -> AGE -> SAFETY_QUESTIONS -> TRIAGE
            if not memory.symptoms:
                memory.call_phase = "SYMPTOMS"
            elif not memory.duration:
                memory.call_phase = "DURATION"
            elif not memory.locality:
                memory.call_phase = "LOCALITY"
            elif not memory.patient_name:
                memory.call_phase = "NAME"
            elif memory.age is None:
                memory.call_phase = "AGE"
            elif not memory.safety_questions_asked:
                memory.call_phase = "SAFETY_QUESTIONS"
                memory.safety_questions_asked = True
            else:
                self.run_medical_triage(memory)
                self.find_facilities(memory, db=db)
                memory.call_phase = "TRIAGE_PRESENTED"

        # 4. Generate Spoken Response
        speech = self.provider.generate_response(action, memory)
        memory.last_prompt = speech
        memory.add_turn("bot", speech)

        return speech, action

    def handle_dtmf(
        self,
        digit: str,
        memory: ConversationMemory,
        db: Optional[Any] = None,
    ) -> Tuple[str, ConversationAction]:
        """
        Convert keypad DTMF into the exact same structured action pipeline.
        DTMF is fallback input, not a separate conversation system.
        """
        dtmf_map = {
            "1": "I have fever",
            "2": "I have cough",
            "3": "I have pain",
            "4": "I have stomach problem",
            "5": "I have an injury",
            "0": "This is an emergency, severe chest pain and difficulty breathing",
        }

        synth_text = dtmf_map.get(digit, "")
        if not synth_text:
            # Check for menu confirmations
            if digit == "9" or digit == "#":
                synth_text = "Yes confirm"
            elif digit == "*":
                synth_text = "No cancel"
            else:
                synth_text = f"Pressed digit {digit}"

        return self.handle_turn(synth_text, memory, db=db)
