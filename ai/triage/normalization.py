"""
ai/triage/normalization.py
==========================
Centralized symptom normalization and free-text understanding service for MYTHRI.

Canonical symptom categories:
- FEVER
- COUGH
- HEADACHE
- STOMACH_PROBLEM
- KNEE_PAIN
- BACK_PAIN
- OTHER_PAIN
- INJURY
- GENERAL_OTHER

This module handles:
1. Normalization of structured symptom buttons / selections.
2. Natural language symptom extraction from free-text descriptions.
3. Multi-symptom extraction without diagnosis or clinical overclaiming.
"""

from __future__ import annotations

import re
from enum import Enum
from typing import Sequence


class SymptomCategory(str, Enum):
    FEVER = "FEVER"
    COUGH = "COUGH"
    HEADACHE = "HEADACHE"
    STOMACH_PROBLEM = "STOMACH_PROBLEM"
    KNEE_PAIN = "KNEE_PAIN"
    BACK_PAIN = "BACK_PAIN"
    OTHER_PAIN = "OTHER_PAIN"
    INJURY = "INJURY"
    GENERAL_OTHER = "GENERAL_OTHER"


# Direct button/label mapping
_EXACT_MAP: dict[str, SymptomCategory] = {
    "fever": SymptomCategory.FEVER,
    "bukhar": SymptomCategory.FEVER,
    "बुखार": SymptomCategory.FEVER,
    "taap": SymptomCategory.FEVER,
    "ताप": SymptomCategory.FEVER,
    "காய்ச்சல்": SymptomCategory.FEVER,
    "kaichal": SymptomCategory.FEVER,
    "juram": SymptomCategory.FEVER,
    "cough": SymptomCategory.COUGH,
    "coughing": SymptomCategory.COUGH,
    "khasi": SymptomCategory.COUGH,
    "खांसी": SymptomCategory.COUGH,
    "खाँसी": SymptomCategory.COUGH,
    "khokla": SymptomCategory.COUGH,
    "खोकला": SymptomCategory.COUGH,
    "இருமல்": SymptomCategory.COUGH,
    "irumal": SymptomCategory.COUGH,
    "headache": SymptomCategory.HEADACHE,
    "head pain": SymptomCategory.HEADACHE,
    "head ache": SymptomCategory.HEADACHE,
    "sar dard": SymptomCategory.HEADACHE,
    "sir dard": SymptomCategory.HEADACHE,
    "सिरदर्द": SymptomCategory.HEADACHE,
    "सिर दर्द": SymptomCategory.HEADACHE,
    "सरदर्द": SymptomCategory.HEADACHE,
    "सर दर्द": SymptomCategory.HEADACHE,
    "dokedukhi": SymptomCategory.HEADACHE,
    "डोकेदुखी": SymptomCategory.HEADACHE,
    "தலைவலி": SymptomCategory.HEADACHE,
    "thalaivali": SymptomCategory.HEADACHE,
    "thalai vali": SymptomCategory.HEADACHE,
    "pain": SymptomCategory.OTHER_PAIN,
    "knee pain": SymptomCategory.KNEE_PAIN,
    "घुटने में दर्द": SymptomCategory.KNEE_PAIN,
    "गुडघेदुखी": SymptomCategory.KNEE_PAIN,
    "முழங்கால் வலி": SymptomCategory.KNEE_PAIN,
    "முட்டி வலி": SymptomCategory.KNEE_PAIN,
    "mulangaal vali": SymptomCategory.KNEE_PAIN,
    "mutti vali": SymptomCategory.KNEE_PAIN,
    "back pain": SymptomCategory.BACK_PAIN,
    "कमर दर्द": SymptomCategory.BACK_PAIN,
    "पाठदुखी": SymptomCategory.BACK_PAIN,
    "முதுகு வலி": SymptomCategory.BACK_PAIN,
    "muthugu vali": SymptomCategory.BACK_PAIN,
    "other pain": SymptomCategory.OTHER_PAIN,
    "दर्द": SymptomCategory.OTHER_PAIN,
    "अंगदुखी": SymptomCategory.OTHER_PAIN,
    "உடல் வலி": SymptomCategory.OTHER_PAIN,
    "udal vali": SymptomCategory.OTHER_PAIN,
    "stomach problem": SymptomCategory.STOMACH_PROBLEM,
    "stomach ache": SymptomCategory.STOMACH_PROBLEM,
    "stomach pain": SymptomCategory.STOMACH_PROBLEM,
    "abdominal pain": SymptomCategory.STOMACH_PROBLEM,
    "pet dard": SymptomCategory.STOMACH_PROBLEM,
    "पेट दर्द": SymptomCategory.STOMACH_PROBLEM,
    "पोटदुखी": SymptomCategory.STOMACH_PROBLEM,
    "வயிற்று வலி": SymptomCategory.STOMACH_PROBLEM,
    "வயிறு வலி": SymptomCategory.STOMACH_PROBLEM,
    "vayiru vali": SymptomCategory.STOMACH_PROBLEM,
    "vaitru vali": SymptomCategory.STOMACH_PROBLEM,
    "injury": SymptomCategory.INJURY,
    "injured": SymptomCategory.INJURY,
    "wound": SymptomCategory.INJURY,
    "चोट": SymptomCategory.INJURY,
    "जख्म": SymptomCategory.INJURY,
    "दुखापत": SymptomCategory.INJURY,
    "காயம்": SymptomCategory.INJURY,
    "kaayam": SymptomCategory.INJURY,
    "adi": SymptomCategory.INJURY,
    "general": SymptomCategory.GENERAL_OTHER,
    "general other": SymptomCategory.GENERAL_OTHER,
}

# Regex patterns for natural language understanding in descriptions
_PATTERNS: list[tuple[SymptomCategory, list[re.Pattern]]] = [
    (
        SymptomCategory.FEVER,
        [
            re.compile(
                r"(\b(fever|high\s+temp(erature)?|temp(erature)?|bukhar|taap|feverish|running\s+a\s+fever|kaichal|juram)\b|"
                r"बुखार|ताप|காய்ச்சல[்ு]?|சுரம்)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.HEADACHE,
        [
            re.compile(
                r"(\b(headache|head\s*ache|head\s+pain|head\s+is\s+aching|head\s+hurts|aching\s+head|sar\s+dard|sir\s+dard|dokedukhi|thalaivali|thalai\s+vali)\b|"
                r"सिरदर्द|सिर\s*दर्द|सरदर्द|सर\s*दर्द|सिर\s*दुख|सर\s*दुख|डोकेदुखी|डोके\s*दुख|தலைவலி)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.KNEE_PAIN,
        [
            re.compile(
                r"(\b(knee\s+pain|knee\s+hurts|pain\s+in\s+(my\s+)?knee|knee\s+is\s+hurting|painful\s+knee|knees\s+hurt|knee\s+ache|ghutne(\s+me)?\s+dard|goodghee(dukhi)?|mulangaal\s+vali|mutti\s+vali)\b|"
                r"घुटने\s*(में)?\s*दर्द|गुडघेदुखी|முழங்கால்\s*வலி|முட்டி\s*வலி)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.BACK_PAIN,
        [
            re.compile(
                r"(\b(back\s+pain|back\s+hurts|pain\s+in\s+(my\s+)?back|back\s+is\s+hurting|painful\s+back|lower\s+back\s+pain|kamar\s+dard|pathidukhi|muthugu\s+vali)\b|"
                r"कमर\s*दर्द|पीठ\s*दर्द|पाठदुखी|முதுகு\s*வலி)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.STOMACH_PROBLEM,
        [
            re.compile(
                r"(\b(stomach\s+pain|stomach\s+ache|stomach\s+problem|abdominal\s+pain|belly\s+pain|stomach\s+hurts|pet\s+dard|potat\s+dukhne|upset\s+stomach|tummy\s+ache|gastric\s+pain|vayiru\s+vali|vaitru\s+vali)\b|"
                r"पेट\s*दर्द|पोटदुखी|पोटात\s*दुखणे|வயிற்று\s*வலி|வயிறு\s*வலி)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.COUGH,
        [
            re.compile(
                r"(\b(cough|coughing|khasi|khaasi|khokla|irumal)\b|"
                r"खांसी|खाँसी|खोकला|இருமல[்ு]?)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.INJURY,
        [
            re.compile(
                r"(\b(injury|injured|accident|wound|chot|dukhapat|cut|bruise|bleeding\s+wound|fell\s+down|kaayam|adi)\b|"
                r"चोट|जख्म|घाव|दुखापत|காயம்|காயமும்|அடிபட்டது)",
                re.IGNORECASE,
            ),
        ],
    ),
    (
        SymptomCategory.OTHER_PAIN,
        [
            re.compile(
                r"(\b(pain|hurting|aching|body\s+pain|body\s+ache|muscle\s+pain|joint\s+pain|shoulder\s+pain|leg\s+pain|udal\s+vali|vali)\b|"
                r"दर्द|अंगदुखी|உடல்\s*வலி|வலி)",
                re.IGNORECASE,
            ),
        ],
    ),
]


SPECIFIC_PAIN_CLEAN_REGEX = re.compile(
    r"\b(headache|head\s*ache|head\s+pain|head\s+is\s+aching|head\s+hurts|aching\s+head|sar\s+dard|sir\s+dard|dokedukhi|"
    r"stomach\s+pain|stomach\s+ache|stomach\s+problem|abdominal\s+pain|belly\s+pain|stomach\s+hurts|pet\s+dard|potat\s+dukhne|upset\s+stomach|tummy\s+ache|"
    r"knee\s+pain|knee\s+hurts|pain\s+in\s+(my\s+)?knee|knee\s+is\s+hurting|painful\s+knee|knees\s+hurt|knee\s+ache|ghutne(\s+me)?\s+dard|goodghee(dukhi)?|"
    r"back\s+pain|back\s+hurts|pain\s+in\s+(my\s+)?back|back\s+is\s+hurting|painful\s+back|lower\s+back\s+pain|kamar\s+dard|pathidukhi)\b|"
    r"(सिरदर्द|सिर\s*दर्द|सरदर्द|सर\s*दर्द|डोकेदुखी|पेट\s*दर्द|पोटदुखी|कमर\s*दर्द|पाठदुखी|घुटने\s*(में)?\s*दर्द|गुडघेदुखी|"
    r"தலைவலி|வயிற்று\s*வலி|வயிறு\s*வலி|முழங்கால்\s*வலி|முட்டி\s*வலி|முதுகு\s*வலி)",
    re.IGNORECASE,
)


def extract_symptoms_from_text(text: str) -> list[SymptomCategory]:
    """
    Extract canonical symptom categories from free text.
    Handles multiple symptoms deterministically.
    """
    if not text or not text.strip():
        return []

    normalized_text = text.strip()
    extracted: list[SymptomCategory] = []

    has_specific_pain = False

    # Check categories in defined order
    for category, patterns in _PATTERNS:
        if category == SymptomCategory.OTHER_PAIN:
            # If a specific pain was found, only trigger OTHER_PAIN if additional distinct pain words exist
            search_target = SPECIFIC_PAIN_CLEAN_REGEX.sub("", normalized_text) if has_specific_pain else normalized_text
            if search_target.strip() and any(pat.search(search_target) for pat in patterns):
                if category not in extracted:
                    extracted.append(category)
            continue

        for pat in patterns:
            if pat.search(normalized_text):
                if category not in extracted:
                    extracted.append(category)
                if category in (
                    SymptomCategory.HEADACHE,
                    SymptomCategory.STOMACH_PROBLEM,
                    SymptomCategory.KNEE_PAIN,
                    SymptomCategory.BACK_PAIN,
                ):
                    has_specific_pain = True
                break

    return extracted


def normalize_symptoms(
    symptoms: Sequence[str] | None = None,
    description: str = "",
) -> list[str]:
    """
    Normalize structured symptom selections and extract symptoms from free-text description.

    Returns a list of canonical category strings (e.g. ["FEVER", "COUGH"]).
    If no known category can be identified:
    - If free-text was provided, returns ["GENERAL_OTHER"].
    - If neither symptoms nor text was provided, returns [].
    """
    categories: list[SymptomCategory] = []

    # 1. Process explicit symptom list
    if symptoms:
        for sym in symptoms:
            if not sym or not sym.strip():
                continue
            clean = sym.strip().lower()
            # Direct exact match
            if clean in _EXACT_MAP:
                cat = _EXACT_MAP[clean]
                if cat not in categories:
                    categories.append(cat)
            else:
                # Check enum value match directly (e.g. "FEVER", "KNEE_PAIN")
                enum_match = None
                for member in SymptomCategory:
                    if member.value.lower() == clean or member.value.replace("_", " ").lower() == clean:
                        enum_match = member
                        break
                if enum_match:
                    if enum_match not in categories:
                        categories.append(enum_match)
                else:
                    # Fallback text extraction on the symptom token
                    text_cats = extract_symptoms_from_text(clean)
                    for tc in text_cats:
                        if tc not in categories:
                            categories.append(tc)

    # 2. Process description free-text
    if description and description.strip():
        text_cats = extract_symptoms_from_text(description)
        for tc in text_cats:
            if tc not in categories:
                categories.append(tc)

    # 3. Handle fallback if nothing matched
    if not categories:
        if description and description.strip():
            return [SymptomCategory.GENERAL_OTHER.value]
        return []

    return [c.value for c in categories]
