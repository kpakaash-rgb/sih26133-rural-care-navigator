"""
app/ai/conversation/model_service.py
====================================
Runtime inference service for the locally trained Rural Care Navigator
Bilingual Conversational Model.

Features:
- Fast in-process inference (< 5 ms latency).
- Calibrated confidence scoring with unknown-intent rejection.
- Structured intent and multi-slot extraction.
- Zero external API dependencies (100% offline & local).
"""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np

logger = logging.getLogger("rural_care.local_conversation_model")

MODEL_DIR = Path(__file__).resolve().parent / "model"
PIPELINE_PATH = MODEL_DIR / "intent_pipeline.joblib"
SLOTS_PATH = MODEL_DIR / "slot_extractors.joblib"
META_PATH = MODEL_DIR / "metadata.json"

DEFAULT_CONFIDENCE_THRESHOLD = 0.40

# ──────────────────────────────────────────────────────────────────────────────
# Spoken numbers and demographic helper functions
# ──────────────────────────────────────────────────────────────────────────────

SPOKEN_NUMBER_MAP: Dict[str, int] = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9,
    "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16,
    "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "twenty one": 21, "twenty-one": 21,
    "twenty two": 22, "twenty-two": 22, "twenty three": 23, "twenty-three": 23, "twenty four": 24, "twenty-four": 24,
    "twenty five": 25, "twenty-five": 25, "twenty six": 26, "twenty-six": 26, "twenty seven": 27, "twenty-seven": 27,
    "twenty eight": 28, "twenty-eight": 28, "twenty nine": 29, "twenty-nine": 29, "thirty": 30, "thirty five": 35,
    "forty": 40, "forty five": 45, "fifty": 50, "fifty five": 55, "sixty": 60, "sixty five": 65, "seventy": 70,
    "eighty": 80, "ninety": 90,
    # Hindi/Hinglish numbers
    "ek": 1, "do": 2, "teen": 3, "char": 4, "chaar": 4, "paanch": 5, "panch": 5, "chhah": 6, "chhe": 6,
    "saat": 7, "aath": 8, "nau": 9, "das": 10, "gyarah": 11, "barah": 12, "terah": 13, "chaudah": 14,
    "pandrah": 15, "solah": 16, "satrah": 17, "atharah": 18, "unnees": 19, "bees": 20, "ikkees": 21,
    "baees": 22, "teees": 23, "teis": 23, "chaubees": 24, "chobees": 24, "pachchees": 25, "pachees": 25,
    "chhabees": 26, "sattaees": 27, "atthaees": 28, "untees": 29, "tees": 30, "iktees": 31, "battees": 32,
    "taintees": 33, "chauntees": 34, "paintees": 35, "paitis": 35, "paitees": 35, "paintis": 35, "पैंतीस": 35, "chhattees": 36, "saintees": 37, "adtees": 38,
    "untalees": 39, "chalees": 40, "chalis": 40, "pachaas": 50, "pachas": 50, "saath": 60, "sattar": 70,
    "assi": 80, "nabbe": 90,
}

NON_NAME_WORDS = {
    "fever", "cough", "pain", "dard", "bukhar", "khansi", "chot", "headache", "chest", "breath",
    "doctor", "hospital", "clinic", "yes", "no", "haan", "nahi", "nahin", "hello", "hi", "namaste",
    "appointment", "booking", "today", "yesterday", "urgent", "help", "madad", "phone", "visit"
}

def extract_name_from_text(text: str, context: Optional[Dict[str, Any]] = None) -> Optional[str]:
    """Extract person's name naturally from English, Hindi, and Hinglish utterances."""
    if not text:
        return None
    cleaned = text.strip()

    # 1. "My name is X" / "I am X" / "This is X" / "name is X"
    m = re.search(
        r"\b(?:my name is|i am|this is|i'm|name is|call me)\s+([A-Za-z\s]+?)(?:\s+(?:and|i|have|having|from|with|age|saal|is|living|at)|[.,!?;]|$)",
        cleaned,
        re.IGNORECASE,
    )
    if m:
        cand = m.group(1).strip()
        words = [w for w in cand.split() if w.lower() not in ("a", "an", "the", "mr", "mrs", "shri", "smt")]
        if words and not any(w.lower() in NON_NAME_WORDS for w in words) and len(words) <= 3:
            return " ".join(words).title()

    # 2. "Mera naam X hai" / "main X hoon" / "mera name X"
    m_hi = re.search(
        r"\b(?:mera naam|main|hum|mera name)\s+([A-Za-z\s]+?)(?:\s+(?:hai|hoon|hu|bol|se|ki|ka)|[.,!?;]|$)",
        cleaned,
        re.IGNORECASE,
    )
    if m_hi:
        cand = m_hi.group(1).strip()
        words = [w for w in cand.split() if w.lower() not in ("a", "an", "the", "ek")]
        if words and not any(w.lower() in NON_NAME_WORDS for w in words) and len(words) <= 3:
            return " ".join(words).title()

    # 3. "X speaking" / "X bol raha hoon"
    m_spk = re.search(r"\b([A-Za-z\s]+?)\s+(?:speaking|bol raha hoon|bol rahi hoon)\b", cleaned, re.IGNORECASE)
    if m_spk:
        cand = m_spk.group(1).strip()
        words = cand.split()
        if words and not any(w.lower() in NON_NAME_WORDS for w in words) and len(words) <= 3:
            return " ".join(words).title()

    # 4. Contextual fallback: if conversation is currently waiting for name and input is a short 1-2 word string
    if context and (context.get("waiting_for") == "name" or context.get("call_phase") == "NAME"):
        words = cleaned.split()
        if 1 <= len(words) <= 3 and not any(w.lower() in NON_NAME_WORDS for w in words):
            if not any(w.isdigit() for w in words):
                return cleaned.strip(".,!?;").title()

    return None

def extract_age_from_text(text: str, context: Optional[Dict[str, Any]] = None) -> Optional[int]:
    """Extract age naturally from numerical or spoken word forms (validating 1-120)."""
    if not text:
        return None
    cleaned = text.strip().lower()

    # Reject negative numbers explicitly
    if re.search(r"-\s*\d+", cleaned):
        return None

    # 1. Direct patterns like "I am 23", "age is 23", "my age is 23", "meri age 23"
    m = re.search(r"\b(?:i am|age is|my age is|meri age|meri umar)\s*[:=]?\s*(\d{1,3})\b", cleaned)
    if m:
        val = int(m.group(1))
        if 1 <= val <= 120:
            return val
        return None

    # 2. "23 years old", "23 saal", "23 saal ka", "23 yr"
    m_yr = re.search(r"\b(\d{1,3})\s*(?:years old|year old|years|year|yrs|yr|saal|varsh)\b", cleaned)
    if m_yr:
        val = int(m_yr.group(1))
        if 1 <= val <= 120:
            return val
        return None

    # 3. "main 23 saal ka hoon"
    m_main = re.search(r"\b(?:main|hum)\s+(\d{1,3})\s*(?:saal|ki umar)?\b", cleaned)
    if m_main:
        val = int(m_main.group(1))
        if 1 <= val <= 120:
            return val
        return None

    # 4. Spoken number checks (e.g. "twenty three", "chhabees")
    for word_seq, num_val in sorted(SPOKEN_NUMBER_MAP.items(), key=lambda x: len(x[0]), reverse=True):
        if re.search(rf"\b{word_seq}\b", cleaned):
            if any(k in cleaned for k in ("age", "old", "saal", "umar", "years", "i am", "main")) or (
                context and (context.get("waiting_for") == "age" or context.get("call_phase") == "AGE")
            ):
                if 1 <= num_val <= 120:
                    return num_val

    # 5. Contextual fallback: if waiting for age and string is just a number
    if context and (context.get("waiting_for") == "age" or context.get("call_phase") == "AGE"):
        m_iso = re.search(r"\b(\d{1,3})\b", cleaned)
        if m_iso:
            val = int(m_iso.group(1))
            if 1 <= val <= 120:
                return val
            return None

    return None

def extract_gender_from_text(text: str) -> Optional[str]:
    """Extract gender naturally in English and Hindi."""
    if not text:
        return None
    cleaned = text.strip().lower()

    if re.search(r"\b(?:female|mahila|stree|aurat|woman|women|girl|ladki|she|her|mother|sister|wife|dadi|nani|beti)\b", cleaned):
        return "female"
    if re.search(r"\b(?:male|purush|aadmi|man|men|boy|ladka|he|him|his|father|brother|husband|dada|nana|beta)\b", cleaned):
        return "male"
    if any(w in cleaned for w in ("other", "tisra ling", "transgender")):
        return "other"
    if any(w in cleaned for w in ("prefer not to say", "nahi batana")):
        return "prefer not to say"
    return None

def extract_additional_notes_from_text(text: str) -> Optional[str]:
    """Extract medical history, medications, or allergies mentioned in speech."""
    if not text:
        return None
    notes = []
    cleaned = text.lower()

    # Medications
    med_match = re.search(r"\b(?:taking|taking medicines?|dawai|tablet|goli|medicine)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:for|since|se)|[.,!?;]|$)", cleaned)
    if med_match:
        notes.append(f"Medication: {med_match.group(1).strip()}")

    # Allergies
    if "allergy" in cleaned or "reaction" in cleaned:
        all_m = re.search(r"\b(?:allergy to|allergic to|se allergy)\s+([a-zA-Z0-9\s]+?)(?:[.,!?;]|$)", cleaned)
        if all_m:
            notes.append(f"Allergy: {all_m.group(1).strip()}")
        else:
            notes.append("Has allergies reported")

    # Chronic conditions
    for cond in ("diabetes", "sugar", "hypertension", "bp", "asthma", "thyroid", "heart condition"):
        if cond in cleaned:
            notes.append(f"Condition: {cond}")

    return "; ".join(notes) if notes else None


class LocalConversationModel:
    """
    In-memory runtime model for conversation understanding and slot extraction.
    """

    _instance: Optional["LocalConversationModel"] = None

    def __init__(self):
        self.pipeline = None
        self.slot_extractor = None
        self.metadata = {}
        self.confidence_threshold = DEFAULT_CONFIDENCE_THRESHOLD
        self._loaded = False
        self.load()

    @classmethod
    def get_instance(cls) -> "LocalConversationModel":
        if cls._instance is None:
            cls._instance = LocalConversationModel()
        return cls._instance

    def load(self) -> bool:
        """Load trained pipeline and slot extractor artifacts."""
        if self._loaded:
            return True

        if not PIPELINE_PATH.exists() or not SLOTS_PATH.exists():
            logger.warning(
                "[LOCAL_MODEL] Model artifacts not found at %s. Model not loaded.",
                MODEL_DIR,
            )
            return False

        try:
            self.pipeline = joblib.load(PIPELINE_PATH)
            self.slot_extractor = joblib.load(SLOTS_PATH)

            if META_PATH.exists():
                with open(META_PATH, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
                    self.confidence_threshold = self.metadata.get(
                        "confidence_threshold", DEFAULT_CONFIDENCE_THRESHOLD
                    )

            self._loaded = True
            logger.info(
                "[LOCAL_MODEL] Successfully loaded local NLU model (classes=%d, threshold=%.2f)",
                len(self.pipeline.classes_),
                self.confidence_threshold,
            )
            return True
        except Exception as exc:
            logger.exception("[LOCAL_MODEL] Failed to load local model: %s", exc)
            return False

    @property
    def is_ready(self) -> bool:
        return self._loaded and self.pipeline is not None and self.slot_extractor is not None

    def detect_language(self, text: str) -> str:
        """Detect language (hi for Hindi/Hinglish, en for English)."""
        if not text:
            return "en"
        # Check Devanagari unicode range
        if re.search(r"[\u0900-\u097F]", text):
            return "hi"
        # Check common Hinglish markers
        hinglish_words = {
            "hai", "hain", "mujhe", "mera", "meri", "mere", "se", "me", "mein",
            "ho", "raha", "rahi", "chal", "ka", "ki", "ke", "ko", "dono", "bhi",
            "aur", "karo", "karni", "kar", "do", "kripya", "theek", "haan", "nahi",
            "chahiye", "jaana", "jana", "dard", "bukhar", "khansi", "chot", "pet",
            "sir", "pair", "gale", "badan", "ulti", "chakkar"
        }
        words = set(re.findall(r"\b[a-zA-Z]+\b", text.lower()))
        if words.intersection(hinglish_words):
            return "hi"
        return "en"

    def predict(self, text: str, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Extract structured action and intent from caller transcript.

        Returns:
            {
                "intent": "REPORT_SYMPTOMS",
                "language": "hi",
                "symptoms": ["fever", "cough"],
                "duration": "3 days",
                "severity": None,
                "locality": None,
                "appointment_type": None,
                "confirmation": None,
                "emergency": False,
                "confidence": 0.94
            }
        """
        cleaned = text.strip() if text else ""
        lang = self.detect_language(cleaned)

        if not self.is_ready:
            # Fallback if model not yet trained or loaded
            return {
                "intent": "UNKNOWN",
                "language": lang,
                "symptoms": [],
                "duration": None,
                "severity": None,
                "locality": None,
                "appointment_type": None,
                "confirmation": None,
                "emergency": False,
                "confidence": 0.0,
            }

        # 1. Intent Classification with calibrated probabilities
        try:
            probs = self.pipeline.predict_proba([cleaned])[0]
            max_idx = int(np.argmax(probs))
            predicted_intent = str(self.pipeline.classes_[max_idx])
            confidence = float(probs[max_idx])
        except Exception as exc:
            logger.debug("[LOCAL_MODEL] Inference error: %s", exc)
            predicted_intent = "UNKNOWN"
            confidence = 0.0

        # Low confidence guard: do not hallucinate or guess
        if confidence < self.confidence_threshold:
            predicted_intent = "UNKNOWN"

        # 2. Slot Extraction
        slots = self.slot_extractor.extract_slots(cleaned)

        # Contextual corrections & specific colloquial phrase mapping
        # 1. 'Hospital kidhar milega' / 'hospital batao' facility queries
        if re.search(r"\b(?:hospital|aspatal|clinic|kendra)\b.*\b(?:kidhar|kahan|kaha|batao|milega|dhundo)\b", cleaned, re.IGNORECASE):
            predicted_intent = "FACILITY_INFORMATION"
            confidence = max(confidence, 0.85)

        # 2. 'Pet mein pain ho raha hai' -> REPORT_SYMPTOMS (not EMERGENCY unless severe red flag)
        if "pet" in cleaned.lower() and "pain" in cleaned.lower() and not any(rf in cleaned.lower() for rf in ("chest pain", "seene", "chhati", "saans", "unconscious")):
            if predicted_intent == "EMERGENCY":
                predicted_intent = "REPORT_SYMPTOMS"

        # 3. Safe Slot-Based Recovery:
        # If local model predicted UNKNOWN (e.g. low confidence or isolated word like 'khasi', 'fevr', 'pair me chot'),
        # but slot extraction positively identified symptoms, recover to REPORT_SYMPTOMS safely.
        if predicted_intent == "UNKNOWN" and slots["symptoms"]:
            predicted_intent = "REPORT_SYMPTOMS"
            confidence = max(confidence, 0.70)
        elif predicted_intent == "REPORT_SYMPTOMS" and not slots["symptoms"] and slots["duration"]:
            predicted_intent = "PROVIDE_DURATION"
        elif predicted_intent == "REPORT_SYMPTOMS" and not slots["symptoms"] and slots["locality"]:
            predicted_intent = "PROVIDE_LOCALITY"

        # 4. Extract rich demographic & intake slots
        patient_name = extract_name_from_text(cleaned, context=context)
        age = extract_age_from_text(cleaned, context=context)
        gender = extract_gender_from_text(cleaned)
        additional_notes = extract_additional_notes_from_text(cleaned)

        # Adjust intent if user is providing demographic details
        if predicted_intent == "UNKNOWN":
            if patient_name and not slots["symptoms"]:
                predicted_intent = "PROVIDE_NAME"
                confidence = max(confidence, 0.85)
            elif age is not None and not slots["symptoms"]:
                predicted_intent = "PROVIDE_AGE"
                confidence = max(confidence, 0.85)

        # Emergency override: if slots detect critical symptoms, ensure emergency is flagged
        is_emergency = slots["emergency"] or (predicted_intent == "EMERGENCY")
        if is_emergency:
            predicted_intent = "EMERGENCY"

        return {
            "intent": predicted_intent,
            "language": lang,
            "symptoms": slots["symptoms"],
            "duration": slots["duration"],
            "severity": slots["severity"],
            "locality": slots["locality"],
            "appointment_type": slots["appointment_type"],
            "confirmation": slots["confirmation"],
            "emergency": is_emergency,
            "confidence": round(confidence, 4),
            "patient_name": patient_name,
            "age": age,
            "gender": gender,
            "additional_notes": additional_notes,
        }
