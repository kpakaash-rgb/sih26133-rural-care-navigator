from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class SafetyResult:
    emergency: bool
    reason: str


# These are intentionally broad, high-level warning signs.
# They are used only for safety escalation, not diagnosis.
EMERGENCY_TERMS = {
    "difficulty breathing",
    "trouble breathing",
    "cannot breathe",
    "can't breathe",
    "severe chest pain",
    "chest pain",
    "unconscious",
    "passed out",
    "loss of consciousness",
    "severe bleeding",
    "heavy bleeding",
    "vomiting blood",
    "blood in vomit",
    "seizure",
    "convulsion",
    "stroke",
    "face drooping",
    "slurred speech",
    "severe allergic reaction",
}


def check_safety(symptoms: list[str], description: str) -> SafetyResult:
    """
    Perform a conservative emergency-warning check.

    This function does not diagnose a medical condition.
    It only looks for explicit emergency warning terms.
    """

    combined_text = " ".join(symptoms + [description]).lower()

    for term in EMERGENCY_TERMS:
        if term in combined_text:
            return SafetyResult(
                emergency=True,
                reason=(
                    "Your description includes a possible emergency warning sign. "
                    "Please seek emergency medical help immediately."
                ),
            )

    return SafetyResult(
        emergency=False,
        reason="No explicit emergency warning sign was identified.",
    )