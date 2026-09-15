"""
ai/triage/triage.py
===================
Transparent, duration-aware rule-based triage and clinical decision support for MYTHRI.

NOTE:
These are MYTHRI AI-assisted clinical decision-support rules designed for the SIH demo.
They provide care-navigation guidance only and are NOT medical diagnosis criteria or
medically validated clinical guidelines. This system does not diagnose diseases or
prescribe medications.

Priority Hierarchy:
1. Emergency warning signs / Red flags (always overrides duration and routine rules)
2. Symptom severity / escalation cues in patient description
3. Symptom + Duration-based clinical assessment rules
4. Safe routine healthcare guidance
"""

from __future__ import annotations

from .normalization import SymptomCategory, normalize_symptoms
from .safety import check_safety
from .schemas import TriageResult

# ==============================================================================
# Centralized Configurable Duration Thresholds (Days)
# ==============================================================================
DURATION_MIN_DAYS: int = 1
DURATION_MAX_DAYS: int = 30

DURATION_THRESHOLD_FEVER: int = 2
DURATION_THRESHOLD_HEADACHE: int = 2
DURATION_THRESHOLD_STOMACH: int = 2
DURATION_THRESHOLD_KNEE_PAIN: int = 3
DURATION_THRESHOLD_BACK_PAIN: int = 3
DURATION_THRESHOLD_COUGH: int = 3
DURATION_THRESHOLD_OTHER_PAIN: int = 3

# Severity/escalation phrases in description
ATTENTION_DESCRIPTIVE_TERMS = {
    "getting worse",
    "severe pain",
    "persistent pain",
    "high fever",
    "feeling very weak",
    "worsening",
    "intense pain",
    "unable to walk",
    "cannot walk",
    "not getting better",
}


def run_triage(
    symptoms: list[str],
    description: str = "",
    duration_days: int = 1,
) -> TriageResult:
    """
    Run transparent, duration-aware, rule-based triage decision support.

    Parameters:
    - symptoms: list of selected or reported symptoms (e.g. ['Fever', 'Cough'] or ['Knee Pain'])
    - description: free-text patient description (e.g. "my head is aching for 3 days")
    - duration_days: number of days symptoms have been present (clamped between 1 and 30)

    Returns:
    - TriageResult with urgency ('emergency' | 'needs_attention' | 'routine'),
      recommended care facility type, reason, emergency flag, normalized symptoms list,
      and duration_days.
    """
    # Clamp duration to valid 1-30 range
    effective_duration = max(DURATION_MIN_DAYS, min(DURATION_MAX_DAYS, int(duration_days or 1)))

    # --------------------------------------------------------------------------
    # STEP 1: Emergency & Safety Red Flags Check (TOP PRIORITY)
    # Emergency rules ALWAYS override duration rules and ordinary symptoms.
    # --------------------------------------------------------------------------
    safety_result = check_safety(symptoms, description)
    if safety_result.emergency:
        # Also extract normalized symptoms for complete metadata
        extracted_symptoms = normalize_symptoms(symptoms, description)
        return TriageResult(
            urgency="emergency",
            recommended_care="Emergency medical help",
            reason=safety_result.reason,
            emergency=True,
            symptoms=extracted_symptoms,
            duration_days=effective_duration,
        )

    # --------------------------------------------------------------------------
    # STEP 2: Centralized Symptom Normalization & Multi-Symptom Extraction
    # --------------------------------------------------------------------------
    normalized_symptoms = normalize_symptoms(symptoms, description)
    symptom_set = set(normalized_symptoms)

    normalized_description = (description or "").strip().lower()

    # --------------------------------------------------------------------------
    # STEP 3: Description-Based Severity Escalation
    # --------------------------------------------------------------------------
    if any(term in normalized_description for term in ATTENTION_DESCRIPTIVE_TERMS):
        return TriageResult(
            urgency="needs_attention",
            recommended_care="Primary Health Centre (PHC)",
            reason=(
                "Your description suggests symptom worsening or significant discomfort; "
                "clinical assessment by a healthcare professional is recommended."
            ),
            emergency=False,
            symptoms=normalized_symptoms,
            duration_days=effective_duration,
        )

    # --------------------------------------------------------------------------
    # STEP 4: Duration-Aware Decision Support Rules
    # Evaluate normalized symptoms against duration thresholds
    # --------------------------------------------------------------------------
    needs_attention_triggers: list[tuple[str, str]] = []
    routine_reasons: list[str] = []

    # Check FEVER
    if SymptomCategory.FEVER.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_FEVER:
            needs_attention_triggers.append((
                "FEVER",
                f"Persistent fever reported for {effective_duration} days; clinical review is recommended.",
            ))
        else:
            needs_attention_triggers.append((
                "FEVER",
                "Fever reported; healthcare evaluation is advised to monitor symptoms.",
            ))

    # Check HEADACHE
    if SymptomCategory.HEADACHE.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_HEADACHE:
            needs_attention_triggers.append((
                "HEADACHE",
                f"Headache persisting for {effective_duration} days; clinical assessment is recommended.",
            ))
        else:
            routine_reasons.append(
                f"Recent headache reported ({effective_duration} day). Rest and hydration advised; consult healthcare if it persists."
            )

    # Check STOMACH_PROBLEM
    if SymptomCategory.STOMACH_PROBLEM.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_STOMACH:
            needs_attention_triggers.append((
                "STOMACH_PROBLEM",
                f"Stomach discomfort persisting for {effective_duration} days; clinical assessment is recommended.",
            ))
        else:
            needs_attention_triggers.append((
                "STOMACH_PROBLEM",
                "Stomach discomfort reported; healthcare evaluation is advised to evaluate symptoms.",
            ))

    # Check KNEE_PAIN
    if SymptomCategory.KNEE_PAIN.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_KNEE_PAIN:
            needs_attention_triggers.append((
                "KNEE_PAIN",
                f"Knee pain reported for {effective_duration} days; clinical assessment is recommended.",
            ))
        else:
            routine_reasons.append(
                f"Recent knee discomfort ({effective_duration} day(s)). Rest and observation advised; seek clinical evaluation if pain persists."
            )

    # Check BACK_PAIN
    if SymptomCategory.BACK_PAIN.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_BACK_PAIN:
            needs_attention_triggers.append((
                "BACK_PAIN",
                f"Back pain reported for {effective_duration} days; clinical assessment is recommended.",
            ))
        else:
            routine_reasons.append(
                f"Recent back discomfort ({effective_duration} day(s)). Rest advised; consult healthcare provider if symptoms persist."
            )

    # Check COUGH
    if SymptomCategory.COUGH.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_COUGH:
            needs_attention_triggers.append((
                "COUGH",
                f"Cough persisting for {effective_duration} days; clinical assessment is recommended.",
            ))
        else:
            routine_reasons.append(
                f"Recent cough ({effective_duration} day(s)) without red flags. Monitor symptoms and seek care if worsening."
            )

    # Check INJURY
    if SymptomCategory.INJURY.value in symptom_set:
        needs_attention_triggers.append((
            "INJURY",
            f"Injury or wound reported ({effective_duration} day(s) duration); clinical assessment and wound care are recommended.",
        ))

    # Check OTHER_PAIN
    if SymptomCategory.OTHER_PAIN.value in symptom_set:
        if effective_duration >= DURATION_THRESHOLD_OTHER_PAIN:
            needs_attention_triggers.append((
                "OTHER_PAIN",
                f"Pain persisting for {effective_duration} days; clinical assessment is advised.",
            ))
        else:
            needs_attention_triggers.append((
                "OTHER_PAIN",
                "Pain reported; healthcare evaluation is recommended if discomfort persists.",
            ))

    # If any symptom triggered needs_attention:
    if needs_attention_triggers:
        # Construct clear decision-support reasoning
        if len(needs_attention_triggers) == 1:
            primary_reason = needs_attention_triggers[0][1]
        else:
            symptom_names = [t[0].replace("_", " ").title() for t in needs_attention_triggers]
            primary_reason = (
                f"Multiple symptoms reported ({', '.join(symptom_names)}) for {effective_duration} day(s); "
                "clinical review at a Primary Health Centre (PHC) is recommended."
            )

        return TriageResult(
            urgency="needs_attention",
            recommended_care="Primary Health Centre (PHC)",
            reason=primary_reason,
            emergency=False,
            symptoms=normalized_symptoms,
            duration_days=effective_duration,
        )

    # If symptoms exist but all evaluated to routine
    if routine_reasons:
        return TriageResult(
            urgency="routine",
            recommended_care="Routine healthcare service",
            reason=" ".join(routine_reasons),
            emergency=False,
            symptoms=normalized_symptoms,
            duration_days=effective_duration,
        )

    # --------------------------------------------------------------------------
    # STEP 5: General Other & Default Fallback
    # --------------------------------------------------------------------------
    if SymptomCategory.GENERAL_OTHER.value in symptom_set:
        return TriageResult(
            urgency="routine",
            recommended_care="Routine healthcare service",
            reason=(
                f"General symptoms reported ({effective_duration} day(s)). "
                "No emergency warning sign was identified; consider routine healthcare if symptoms persist."
            ),
            emergency=False,
            symptoms=normalized_symptoms,
            duration_days=effective_duration,
        )

    return TriageResult(
        urgency="routine",
        recommended_care="Routine healthcare service",
        reason=(
            "No emergency warning sign was identified. "
            "Consider routine healthcare if your symptoms persist or become worse."
        ),
        emergency=False,
        symptoms=normalized_symptoms,
        duration_days=effective_duration,
    )