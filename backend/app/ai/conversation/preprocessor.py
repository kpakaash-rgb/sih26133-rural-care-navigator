"""
app/ai/conversation/preprocessor.py
==================================
Shared text normalization, slot classes, and utilities for training and inference.
"""

from __future__ import annotations

import re
from typing import Any, Dict, List

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import MultiLabelBinarizer

ALL_SYMPTOM_LABELS = [
    "fever",
    "cough",
    "pain",
    "stomach problem",
    "headache",
    "stomach ache",
    "injury",
    "vomiting",
    "diarrhea",
    "sore throat",
    "chills",
    "body ache",
    "joint pain",
    "swelling",
    "dizziness",
    "weakness",
    "chest pain",
    "breathing difficulty",
    "unconscious",
    "heavy bleeding",
    "head injury",
    "eye irritation",
    "cold",
    "ear pain",
    "back pain",
]


def normalize_text(text: str) -> str:
    """Multilingual text cleaner preserving Devanagari and Latin letters."""
    if not text:
        return ""
    text = text.lower().strip()
    text = re.sub(r"[^\w\s\u0900-\u097F]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


class LocalSlotExtractor:
    """Learned + pattern multi-task slot extractor for symptoms, duration, locality, severity."""

    def __init__(self):
        self.mlb = MultiLabelBinarizer(classes=ALL_SYMPTOM_LABELS)
        self.mlb.fit([])
        self.symptom_vectorizer = TfidfVectorizer(
            analyzer="char_wb",
            ngram_range=(2, 5),
            sublinear_tf=True,
            preprocessor=normalize_text,
        )
        self.symptom_classifiers: Dict[str, LogisticRegression] = {}

    def fit(self, texts: List[str], symptom_lists: List[List[str]]):
        X = self.symptom_vectorizer.fit_transform(texts)
        Y = self.mlb.transform(symptom_lists)

        for idx, sym in enumerate(ALL_SYMPTOM_LABELS):
            y_col = Y[:, idx]
            if np.sum(y_col) >= 2:
                clf = LogisticRegression(C=3.0, max_iter=500, class_weight="balanced", random_state=42)
                clf.fit(X, y_col)
                self.symptom_classifiers[sym] = clf

    def extract_slots(self, text: str) -> Dict[str, Any]:
        cleaned = normalize_text(text)
        slots: Dict[str, Any] = {
            "symptoms": [],
            "duration": None,
            "severity": None,
            "locality": None,
            "appointment_type": None,
            "confirmation": None,
            "emergency": False,
        }

        # 1. Symptoms via learned model + fuzzy check
        if self.symptom_classifiers:
            X_text = self.symptom_vectorizer.transform([text])
            detected_syms = []
            for sym, clf in self.symptom_classifiers.items():
                prob = clf.predict_proba(X_text)[0][1]
                if prob >= 0.50:
                    detected_syms.append(sym)
            # Canonicalize stomach ache / stomach problem if present
            if "stomach ache" in detected_syms and "stomach problem" not in detected_syms:
                detected_syms.append("stomach problem")
            slots["symptoms"] = detected_syms

        # Fallback keywords if learned model narrowly misses a compound symptom
        if not slots["symptoms"]:
            kw_map = {
                "fever": ["fever", "bukhar", "bukhaar", "taap", "temperature"],
                "cough": ["cough", "khansi", "khasi", "coughing"],
                "pain": ["pain", "dard", "peeda", "dukh"],
                "stomach problem": ["stomach problem", "pet dard", "pet me", "tummy", "stomach", "pet kharab"],
                "headache": ["headache", "sir dard", "sar dard", "head pain"],
                "injury": ["injury", "chot", "gir gaya", "cut", "wound", "fracture", "accident"],
                "chest pain": ["chest pain", "seene me dard", "chhati me dard"],
                "breathing difficulty": ["breath", "saans", "suffocation", "dam"],
                "vomiting": ["vomit", "ulti"],
                "diarrhea": ["diarrhea", "dast", "loose motion"],
            }
            for sym, triggers in kw_map.items():
                if any(t in cleaned for t in triggers):
                    if sym not in slots["symptoms"]:
                        slots["symptoms"].append(sym)

        # 2. Extract Duration
        dur_matches = re.search(
            r"(\b\d+\s*(?:day|days|din|hafte|week|weeks|month|months|ghante|hours)\b|"
            r"\b(?:teen|do|char|paanch|ek|three|two|four|five|one)\s*(?:days|din|hafte|weeks|week|months)?\b|"
            r"\b(?:kal|yesterday|aaj|today|morning|subah|shaam|evening)\b)",
            text,
            re.IGNORECASE,
        )
        if dur_matches:
            raw_dur = dur_matches.group(1).lower()
            if "teen" in raw_dur or "three" in raw_dur or "3" in raw_dur:
                slots["duration"] = "3 days"
            elif "do" in raw_dur or "two" in raw_dur or "2" in raw_dur:
                slots["duration"] = "2 days"
            elif "char" in raw_dur or "four" in raw_dur or "4" in raw_dur:
                slots["duration"] = "4 days"
            elif "paanch" in raw_dur or "five" in raw_dur or "5" in raw_dur:
                slots["duration"] = "5 days"
            elif "ek" in raw_dur or "one" in raw_dur or "1" in raw_dur:
                slots["duration"] = "1 week" if ("haft" in raw_dur or "week" in raw_dur) else "1 day"
            elif "kal" in raw_dur or "yesterday" in raw_dur:
                slots["duration"] = "yesterday"
            elif "subah" in raw_dur or "morning" in raw_dur:
                slots["duration"] = "morning"
            elif "aaj" in raw_dur or "today" in raw_dur:
                slots["duration"] = "today"
            else:
                slots["duration"] = raw_dur

        # 3. Extract Locality
        locality_patterns = [
            "pandharpur", "malshiras", "akluj", "solapur", "sangola",
            "karmala", "kurduvadi", "mohol", "barshi", "mangalvedha", "madha"
        ]
        for loc in locality_patterns:
            if re.search(rf"\b{loc}\b", cleaned, re.IGNORECASE):
                slots["locality"] = loc.capitalize()
                break

        if not slots["locality"]:
            # Match "live in X", "Mera gaon X", "Main X se hoon", "X mein rehta hoon", "from X"
            loc_m = re.search(
                r"(?:live in|living in|gaon|village|mera gaon|hamara gaon|rehta hu|rehta hoon|from|se hoon|se hu)\s+([a-zA-Z0-9\s]+)|"
                r"(?:main|hum)\s+([a-zA-Z0-9\s]+)\s+(?:se|mein|me)",
                text,
                re.IGNORECASE,
            )
            if loc_m:
                cand = (loc_m.group(1) or loc_m.group(2) or "").strip()
                excluded_stopwords = {
                    "hai", "me", "mein", "se", "hu", "hoon", "tha", "the", "a", "an", "the",
                    "cough", "fever", "bukhar", "khansi", "dard", "pain", "dikkat", "problem",
                    "teen", "char", "do", "ek", "din", "day", "days", "hafte", "week",
                    "doctor", "phone", "baat", "karna", "aana", "chahiye", "hospital", "aspatal"
                }
                if cand.lower() not in excluded_stopwords and len(cand) > 2:
                    slots["locality"] = cand.strip()
                    slots["locality"] = cand.capitalize()

        # 4. Extract Severity
        if any(w in cleaned for w in ["severe", "tez", "bohot", "unbearable", "bahut", "heavy", "intense"]):
            slots["severity"] = "severe"
        elif any(w in cleaned for w in ["mild", "halka", "slight", "thoda"]):
            slots["severity"] = "mild"
        elif "moderate" in cleaned or "normal" in cleaned:
            slots["severity"] = "moderate"

        # 5. Extract Appointment Type
        if any(w in cleaned for w in ["phone", "call", "tele", "remote"]):
            slots["appointment_type"] = "phone"
        elif any(w in cleaned for w in ["hospital", "clinic", "visit", "in-person", "in person", "offline"]):
            slots["appointment_type"] = "offline"

        # 6. Extract Confirmation
        if any(w in cleaned for w in ["yes", "yeah", "haan", "sure", "theek", "confirm", "right", "correct"]):
            slots["confirmation"] = True
        elif any(w in cleaned for w in ["no", "nope", "nahi", "cancel", "negative"]):
            slots["confirmation"] = False

        # 7. Check Emergency Keywords
        if any(w in cleaned for w in ["chest pain", "seene", "chhati", "saans", "breathe", "unconscious", "behosh", "emergency", "ambulance"]):
            slots["emergency"] = True

        return slots
