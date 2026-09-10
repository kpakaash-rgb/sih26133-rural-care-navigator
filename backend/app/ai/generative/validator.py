"""
app/ai/generative/validator.py
==============================
Clinical, lexical, and structural response validator for locally generated conversational text.
Ensures that generated utterances are coherent, do not hallucinate diagnoses,
do not contradict clinical triage, do not invent facilities, symptoms, names, ages, localities,
or appointment times, and correspond strictly to allowed conversational phases.
Features a two-tier verification architecture:
1. Safety Validation: Immediate failure on any clinical or grounding violation.
2. Quality Validation: Deterministic heuristics checking grammar, stutters, code-mixing, and completeness.
If either tier fails, signals fallback to the deterministic response generator.
"""

from __future__ import annotations

import re
from typing import Any, List, Optional, Set, Tuple


# Explicit forbidden diagnostic claims (intake agent must never diagnose)
FORBIDDEN_DIAGNOSES = [
    "you have malaria", "you have covid", "you have tuberculosis", "you have cancer",
    "you have pneumonia", "you have typhoid", "you have dengue", "you have diabetes",
    "aapko malaria hai", "aapko covid hai", "aapko tb hai", "aapko pneumonia hai",
    "aapko dengue hai", "aapko typhoid hai", "you have appendicitis", "you have stroke",
    "aapko infection hai", "you have an infection", "diagnosed with",
]

# Emergency claims that must only come from deterministic red-flag logic
FORBIDDEN_EMERGENCY_CLAIMS = [
    "call 108", "call an ambulance", "108 par call", "emergency room immediately",
    "aapatkaleen sthiti hai", "turant 108", "108 ambulance", "call 102",
]

# Known symptom lexicon items to detect hallucinated symptoms
KNOWN_SYMPTOM_GROUPS: List[Tuple[str, List[str]]] = [
    ("fever", ["fever", "bukhar", "taap", "temperature", "chills"]),
    ("cough", ["cough", "khansi", "cold", "zukham", "chest congestion"]),
    ("headache", ["headache", "sar dard", "sir dard"]),
    ("stomach pain", ["stomach pain", "pet dard", "abdominal", "loose motions", "diarrhea", "dast", "vomiting", "ulti"]),
    ("body pain", ["body pain", "badan dard", "joint pain", "jodo ka dard", "weakness", "kamzori"]),
    ("injury", ["injury", "chot", "wound", "fracture", "broken", "bleeding", "haath toot", "pair toot"]),
    ("back pain", ["back pain", "kamar dard", "peeth dard"]),
    ("dizziness", ["dizziness", "chakkar"]),
    ("ear pain", ["ear pain", "kaan dard"]),
    ("eye problem", ["eye irritation", "aankh lal", "aankhon mein jalan", "redness in eye"]),
    ("skin problem", ["skin allergy", "khujli", "rash", "itching"]),
    ("breathing difficulty", ["breathlessness", "saans lene mein takleef", "difficulty breathing"]),
]

# Known common names from dataset vocabulary
DATASET_NAMES = [
    "ramesh", "suresh", "ganesh", "mahesh", "rahul", "santosh", "vijay", "anil",
    "sunita", "asha", "geeta", "kavita", "pooja", "rekha", "lata", "anita",
    "sanjay", "deepak", "arun", "manoj", "pradeep"
]

# Known common localities from dataset vocabulary
DATASET_LOCALITIES = [
    "pandharpur", "malshiras", "sangola", "baramati", "shirpur", "karmala", "mohol", "akluj", "kurduvadi", "tembhurni"
]

# Known facility keywords
KNOWN_FACILITY_NAMES = [
    "malshiras primary health centre", "malshiras phc",
    "pandharpur community health centre", "pandharpur chc",
    "sangola health sub-centre", "sangola sub-centre", "sangola phc",
    "solapur civil hospital", "solapur district hospital",
    "akluj rural hospital", "kurduvadi rural hospital",
    "tembhurni phc", "baramati hospital", "shirpur phc",
]


class GenerativeResponseValidator:
    """
    Validates model-generated text against active state and clinical safety boundaries.
    Evaluates both Safety and Lexical/Grammatical Quality.
    """

    @staticmethod
    def clean_text(text: str) -> str:
        """Strip control tokens and normalize whitespace."""
        if not text:
            return ""
        # Remove any residual special tokens like <|response|>, <|end|>, etc.
        cleaned = re.sub(r"<\|[a-zA-Z0-9_-]+\|>", "", text)
        return re.sub(r"\s+", " ", cleaned).strip()

    def evaluate_quality(
        self,
        cleaned: str,
        memory: Any,
        action: Any,
    ) -> Tuple[float, Optional[str]]:
        """
        Evaluate conversational and grammatical quality.
        Returns:
            (quality_score, quality_reason) where quality_score is float between 0.0 and 1.0.
            Scores < 0.70 represent unacceptable phrasing and trigger deterministic fallback.
        """
        if not cleaned:
            return 0.0, "empty_text"

        words = cleaned.split()
        lower_text = cleaned.lower()
        score = 1.0
        reasons: List[str] = []

        # 1. Stutter / Repeated 2-word or 3-word n-grams (e.g. "you have you have", "since when you have you have")
        if len(words) >= 4:
            lower_words = [w.strip(".,?!।") for w in words]
            for n in (2, 3):
                for i in range(len(lower_words) - (2 * n - 1)):
                    ngram_a = " ".join(lower_words[i:i + n])
                    ngram_b = " ".join(lower_words[i + n:i + 2 * n])
                    if ngram_a == ngram_b and len(ngram_a) > 3:
                        score -= 0.40
                        reasons.append(f"repeated_phrase_stutter_{ngram_a}")

        # 2. Immediate consecutive word repetition (e.g. "you you", "have have")
        if len(words) >= 2:
            lower_words = [w.strip(".,?!।") for w in words]
            for i in range(len(lower_words) - 1):
                if lower_words[i] == lower_words[i + 1] and len(lower_words[i]) > 1:
                    score -= 0.35
                    reasons.append(f"repeated_word_{lower_words[i]}")

        # 3. Malformed English auxiliary or dangling question constructions
        # Examples: "have you prefer", "since when you have you prefer", "are you should", "let us find the doctor is recommended"
        malformed_patterns = [
            (r"\bhave\s+you\s+prefer\b", "malformed_auxiliary_have_you_prefer"),
            (r"\bwhich\s+village\s+or\s+area\b", "awkward_missing_town_inquiry"),
            (r"\bare\s+you\s+should\b", "malformed_auxiliary_are_you_should"),
            (r"\bdoctor\s+is\s+recommended\b", "dangling_phrase_doctor_is_recommended"),
            (r"\blet\s+us\s+find\s+the\s+doctor\b", "unnatural_filler_let_us_find_doctor"),
            (r"\bteleconsultation\s+or\s+an\s+appointment\b", "redundant_booking_phrase"),
            (r"\bappointment\s+for\s+you\s+like\s+to\s+book\b", "malformed_booking_clause"),
            (r"\byou\s+should\s+visit\s+a\s+clinical\s+evaluation\b", "malformed_visit_clinical_evaluation"),
            (r"\byou\s+should\s+visit\s*,\s*town\b", "malformed_visit_locality_grammar"),
            (r"\byou\s+should\s+visit\b", "malformed_visit_clause"),
            (r"\bhad\s+this\s+slot\b", "irrelevant_slot_phrase"),
            (r"\bhas\s+the\s+doctor\b", "malformed_doctor_clause"),
            (r"\bbothering\s+you\s+have\b", "malformed_dangling_verb"),
        ]
        for pat, err_id in malformed_patterns:
            if re.search(pat, lower_text):
                score -= 0.35
                reasons.append(err_id)

        # 4. Incomplete questions or dangling trailing prepositions/conjunctions/auxiliary verbs
        # Examples ending with: "prefer?", "about?", "since?", "or?", "to?", "have?"
        if re.search(r"\b(?:prefer|about|since|for|or|to|and|with|of|have|had|do|did|are|is|be)\s*[?.]\s*$", lower_text):
            score -= 0.40
            reasons.append("incomplete_dangling_question_ending")

        # 5. Irrelevant transactional vocabulary in early intake phases
        # E.g. mentioning "appointment", "booking", "slot", "clinic visit" in GREETING, SYMPTOMS, DURATION, LOCALITY, NAME, AGE
        phase = getattr(memory, "call_phase", "SYMPTOMS") if memory else "SYMPTOMS"
        intake_phases = {"GREETING", "SYMPTOMS", "DURATION", "LOCALITY", "NAME", "AGE"}
        if phase in intake_phases:
            if any(term in lower_text for term in ["appointment", "booking", "slot", "teleconsultation"]):
                score -= 0.40
                reasons.append(f"premature_transactional_vocabulary_in_{phase}")

        # 6. Excessive / jarring code-switching when caller language is Hindi
        mem_lang = str(getattr(memory, "language", "en")).lower()
        if "hi" in mem_lang:
            # If the response contains substantial English sentences like "do you have had this appointment"
            if re.search(r"\b(?:do\s+you\s+have\s+had|which\s+village|for\s+about\s+a\s+week)\b", lower_text):
                score -= 0.45
                reasons.append("jarring_cross_language_code_switching")

        # 7. Obvious Devanagari grammar fragments or truncated tokens
        if re.search(r"(?:क्षणों\s+के\s+लिए|दिशों\s+के|पानाना|अन्लॉला|हो\s+रहा\s+है।\s+कृपया\s+है)", lower_text):
            score -= 0.50
            reasons.append("malformed_devanagari_grammar_fragment")

        final_score = max(0.0, min(1.0, score))
        quality_reason = "; ".join(reasons) if reasons else None
        return final_score, quality_reason

    def validate(
        self,
        generated_text: str,
        memory: Any,
        action: Any,
    ) -> Tuple[bool, Optional[str]]:
        """
        Two-tier validation:
        1. Strict Safety & Entity Grounding (Immediate hard reject on failure)
        2. Lexical & Grammatical Quality (Reject if quality_score < 0.70)
        Returns:
            (True, None) if safe and acceptable.
            (False, reason_str) if either safety or quality fails.
        """
        cleaned = self.clean_text(generated_text)

        # ── TIER 1: SAFETY & GROUNDING (Strict Hard Constraints) ──

        # 1. Non-empty and minimal viable length check
        if not cleaned or len(cleaned) < 8:
            return False, "SAFETY: empty_or_too_short"

        # 2. Maximum length constraint (telephone spoken suitability: ~1-3 sentences, <= 65 words)
        words = cleaned.split()
        if len(words) > 65:
            return False, "SAFETY: excessive_length"

        lower_text = cleaned.lower()

        # 3. Degenerative repetition check (e.g. "fever fever fever fever" or repeated phrase blocks)
        if len(words) >= 4:
            for i in range(len(words) - 3):
                if words[i].lower() == words[i + 1].lower() == words[i + 2].lower() == words[i + 3].lower():
                    return False, "SAFETY: repetitive_degeneration_words"

        sentences = [s.strip() for s in re.split(r"[.!?।]", cleaned) if len(s.strip().split()) >= 3]
        if len(sentences) >= 2:
            seen_sentences = set()
            for s in sentences:
                s_norm = re.sub(r"[^\w\s]", "", s.lower())
                if s_norm in seen_sentences:
                    return False, "SAFETY: repetitive_degeneration_sentences"
                seen_sentences.add(s_norm)

        # 4. Devanagari & Token Corruption Check
        if re.search(r"(?:^|\s)[\u093e-\u094f\u0901-\u0903]", cleaned):
            return False, "SAFETY: corrupted_devanagari_leading_matra"

        if re.search(r"[a-zA-Z][\u0900-\u097F]|[\u0900-\u097F][a-zA-Z]", cleaned):
            return False, "SAFETY: corrupted_mixed_script_token"

        if re.search(r"^\s*[\u0900-\u097F]{1,3}\s*[.?!]", cleaned):
            return False, "SAFETY: truncated_devanagari_fragment"

        # 5. Emergency Bypass Rule: Emergency responses must never be generated by neural LM
        if action and (getattr(action, "emergency", False) or getattr(action, "intent", None) == "EMERGENCY"):
            return False, "SAFETY: emergency_must_use_deterministic_handler"

        for em_claim in FORBIDDEN_EMERGENCY_CLAIMS:
            if em_claim in lower_text:
                return False, "SAFETY: unauthorized_emergency_dispatch_claim"

        # 6. Hallucinated Medical Diagnosis Check
        for diag in FORBIDDEN_DIAGNOSES:
            if diag in lower_text:
                return False, f"SAFETY: hallucinated_diagnosis_{diag}"

        # 7. Hallucinated Symptom Injection Check
        reported_symptoms_list = getattr(memory, "symptoms", []) or []
        reported_sym_blob = (" ".join(reported_symptoms_list) + " " + " ".join(getattr(memory, "symptom_descriptions", []))).lower()

        for canonical_sym, variants in KNOWN_SYMPTOM_GROUPS:
            generated_has_sym = any(v in lower_text for v in variants)
            if generated_has_sym:
                reported_has_sym = any(v in reported_sym_blob for v in variants)
                if not reported_has_sym:
                    if any(claim in lower_text for claim in [
                        f"you have {canonical_sym}", f"experiencing {canonical_sym}",
                        f"you have had {canonical_sym}", f"{canonical_sym} for",
                        f"aapko {canonical_sym}", f"note that you are experiencing"
                    ]):
                        return False, f"SAFETY: hallucinated_symptom_{canonical_sym}"
                    if reported_symptoms_list and not reported_has_sym:
                        for v in variants:
                            if re.search(r"\b" + re.escape(v) + r"\b", lower_text):
                                if not any(w in lower_text for w in ["what symptoms", "describe what", "apne lakshan"]):
                                    return False, f"SAFETY: hallucinated_unrelated_symptom_{v}"

        # 8. Hallucinated Name Check
        actual_name = (getattr(memory, "patient_name", None) or "").strip().lower()
        for candidate_name in DATASET_NAMES:
            if re.search(r"\b" + re.escape(candidate_name) + r"\b", lower_text):
                if actual_name and candidate_name not in actual_name and actual_name not in candidate_name:
                    return False, f"SAFETY: hallucinated_patient_name_{candidate_name}_expected_{actual_name}"
                elif not actual_name:
                    if any(prefix in lower_text for prefix in [f"hello {candidate_name}", f"namaste {candidate_name}", f"shukriya {candidate_name}", f"thanks {candidate_name}", f"mr {candidate_name}", f"mrs {candidate_name}"]):
                        return False, f"SAFETY: premature_patient_name_claim_{candidate_name}"

        # 9. Hallucinated Age Check
        actual_age = getattr(memory, "age", None)
        age_matches = re.findall(r"\b(\d{1,2})\s*(?:years|years old|saal|sal|umar)\b", lower_text)
        for claimed_age_str in age_matches:
            claimed_age = int(claimed_age_str)
            if actual_age is not None and claimed_age != actual_age:
                return False, f"SAFETY: hallucinated_patient_age_{claimed_age}_expected_{actual_age}"
            elif actual_age is None:
                return False, f"SAFETY: premature_patient_age_claim_{claimed_age}"

        # 10. Hallucinated Locality Check
        actual_locality = (getattr(memory, "locality", None) or "").strip().lower()
        for candidate_loc in DATASET_LOCALITIES:
            if re.search(r"\b" + re.escape(candidate_loc) + r"\b", lower_text):
                if actual_locality and candidate_loc not in actual_locality and actual_locality not in candidate_loc:
                    return False, f"SAFETY: hallucinated_locality_{candidate_loc}_expected_{actual_locality}"
                elif not actual_locality:
                    if any(claim in lower_text for claim in [f"from {candidate_loc}", f"calling from {candidate_loc}", f"in {candidate_loc}", f"found {candidate_loc}", f"{candidate_loc} se"]):
                        return False, f"SAFETY: premature_locality_claim_{candidate_loc}"

        # 11. Hallucinated Duration Check
        actual_duration = (getattr(memory, "duration", None) or "").strip().lower()
        dur_matches = re.findall(r"\b(?:for\s+(\d+)\s+days|(\d+)\s+din\s+se)\b", lower_text)
        for match in dur_matches:
            claimed_days = match[0] or match[1]
            if actual_duration:
                if claimed_days not in actual_duration:
                    return False, f"SAFETY: hallucinated_duration_{claimed_days}_days_expected_{actual_duration}"
            elif getattr(memory, "call_phase", "") == "DURATION":
                if "for " in lower_text or " din se" in lower_text:
                    return False, f"SAFETY: premature_duration_assertion_{claimed_days}_days"

        # 12. Hallucinated Facility Check
        rec_facility = getattr(memory, "recommended_facility", None) or {}
        rec_fac_name = (rec_facility.get("name") or "").lower() if isinstance(rec_facility, dict) else ""
        rec_locality = (getattr(memory, "locality", None) or "").lower()

        for known_fac in KNOWN_FACILITY_NAMES:
            if known_fac in lower_text:
                if rec_fac_name and known_fac not in rec_fac_name and rec_fac_name not in known_fac:
                    return False, f"SAFETY: hallucinated_facility_mismatch_{known_fac}"
                if rec_locality and rec_locality not in known_fac and known_fac not in rec_locality:
                    if rec_fac_name and known_fac not in rec_fac_name:
                        return False, f"SAFETY: hallucinated_facility_outside_locality_{known_fac}"

        # 13. Hallucinated Appointment Slot Time Check
        slot_match = re.search(r"\b(\d{1,2}:\d{2}\s*(?:am|pm)?)\b", lower_text)
        if slot_match:
            claimed_time = slot_match.group(1).upper()
            selected_slot = getattr(memory, "selected_slot", None) or {}
            actual_time = str(selected_slot.get("slot_time", "")).upper() if isinstance(selected_slot, dict) else ""
            if actual_time:
                claimed_clean = re.sub(r"\s+", "", claimed_time)
                actual_clean = re.sub(r"\s+", "", actual_time)
                if claimed_clean not in actual_clean and actual_clean not in claimed_clean:
                    return False, f"SAFETY: hallucinated_slot_time_{claimed_time}_expected_{actual_time}"
            elif getattr(memory, "call_phase", "") != "BOOKING_CONFIRM":
                return False, f"SAFETY: premature_slot_time_claim_{claimed_time}"

        # 14. Phase Alignment Check
        phase = getattr(memory, "call_phase", "SYMPTOMS") if memory else "SYMPTOMS"

        intake_phases = {"GREETING", "SYMPTOMS", "DURATION", "LOCALITY", "NAME", "AGE", "SAFETY_QUESTIONS"}
        if phase in intake_phases:
            booking_leakage_terms = [
                "book an appointment", "appointment lena chahte", "appointment confirm",
                "teleconsultation or an in-person", "phone consultation or an in-person",
                "booking number", "slot paya hai", "available slot",
            ]
            if any(term in lower_text for term in booking_leakage_terms):
                return False, f"SAFETY: phase_drift_booking_leakage_in_{phase}"

        # Specific inquiry checks
        if phase == "DURATION" and ("?" in cleaned or "कितने" in cleaned or "कब" in cleaned):
            duration_keywords = [
                "long", "days", "hours", "weeks", "since", "kitne", "din", "kab", "samay", "hafte",
                "कितने", "दिन", "कब", "समय", "हफ्ते", "घंटे"
            ]
            if not any(kw in lower_text for kw in duration_keywords):
                return False, "SAFETY: duration_question_missing_temporal_keywords"

        elif phase == "LOCALITY" and ("?" in cleaned or "कहाँ" in cleaned or "कहा" in cleaned):
            locality_keywords = [
                "village", "town", "area", "calling", "where", "gaon", "shahar", "kasba", "kahan", "sthan",
                "गांव", "शहर", "कस्बे", "कहाँ", "स्थान", "इलाके"
            ]
            if not any(kw in lower_text for kw in locality_keywords):
                return False, "SAFETY: locality_question_missing_location_keywords"

        elif phase == "NAME" and ("?" in cleaned or "नाम" in cleaned):
            name_keywords = [
                "name", "who", "speaking", "naam", "shubh naam", "kaun",
                "नाम", "शुभ नाम", "कौन"
            ]
            if not any(kw in lower_text for kw in name_keywords):
                return False, "SAFETY: name_question_missing_identity_keywords"

        elif phase == "AGE" and ("?" in cleaned or "उम्र" in cleaned or "आयु" in cleaned):
            age_keywords = [
                "age", "old", "years", "umar", "saal", "aayu", "varsh",
                "उम्र", "साल", "आयु", "वर्ष"
            ]
            if not any(kw in lower_text for kw in age_keywords):
                return False, "SAFETY: age_question_missing_age_keywords"

        elif phase == "FOLLOW_UP":
            if any(claim in lower_text for claim in ["test report positive", "cancer free", "normal blood test", "report negative"]):
                return False, "SAFETY: hallucinated_clinical_lab_result"

        # 15. Triage Consistency Check
        triage_res = getattr(memory, "triage_result", None) if memory else None
        if triage_res and isinstance(triage_res, dict):
            recommended_care = str(triage_res.get("recommended_care", "")).lower()
            if "home" in recommended_care:
                if "surgery" in lower_text or "icu" in lower_text or "emergency ward" in lower_text:
                    return False, "SAFETY: contradicts_home_care_triage"

        # ── TIER 2: QUALITY & GRAMMATICAL ACCEPTABILITY (Score >= 0.70) ──
        quality_score, quality_reason = self.evaluate_quality(cleaned, memory, action)
        if quality_score < 0.70:
            return False, f"QUALITY: {quality_reason} (score={quality_score:.2f})"

        # Passed both Tier 1 Safety and Tier 2 Quality validation!
        return True, None
