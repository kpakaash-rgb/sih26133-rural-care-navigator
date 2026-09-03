from __future__ import annotations

from .safety import check_safety
from .schemas import TriageResult


def run_triage(
    symptoms: list[str],
    description: str,
) -> TriageResult:
    """
    Run transparent, rule-based triage.

    This function provides care-navigation guidance only.
    It does not diagnose diseases or prescribe treatment.
    """

    # ---------------------------------------------------------
    # STEP 1: Safety check
    # ---------------------------------------------------------

    safety_result = check_safety(symptoms, description)

    if safety_result.emergency:
        return TriageResult(
            urgency="emergency",
            recommended_care="Emergency medical help",
            reason=safety_result.reason,
            emergency=True,
        )

    # ---------------------------------------------------------
    # STEP 2: Normalize input
    # ---------------------------------------------------------

    normalized_symptoms = {
        symptom.strip().lower()
        for symptom in symptoms
        if symptom.strip()
    }

    normalized_description = description.strip().lower()

    # ---------------------------------------------------------
    # STEP 3: Needs-attention rules
    # ---------------------------------------------------------

    needs_attention_symptoms = {
        "fever",
        "stomach problem",
        "injury",
        "pain",
    }

    if normalized_symptoms.intersection(needs_attention_symptoms):
        return TriageResult(
            urgency="needs_attention",
            recommended_care="Primary Health Centre (PHC)",
            reason=(
                "Your reported symptoms should be assessed by a "
                "healthcare professional."
            ),
            emergency=False,
        )

    # ---------------------------------------------------------
    # STEP 4: Description-based escalation
    # ---------------------------------------------------------

    attention_terms = {
        "getting worse",
        "severe pain",
        "persistent pain",
        "high fever",
        "feeling very weak",
        "worsening",
    }

    if any(term in normalized_description for term in attention_terms):
        return TriageResult(
            urgency="needs_attention",
            recommended_care="Primary Health Centre (PHC)",
            reason=(
                "Your description suggests that your symptoms should "
                "be assessed by a healthcare professional."
            ),
            emergency=False,
        )

    # ---------------------------------------------------------
    # STEP 5: Routine guidance
    # ---------------------------------------------------------

    return TriageResult(
        urgency="routine",
        recommended_care="Routine healthcare service",
        reason=(
            "No emergency warning sign was identified. "
            "Consider routine healthcare if your symptoms persist "
            "or become worse."
        ),
        emergency=False,
    )