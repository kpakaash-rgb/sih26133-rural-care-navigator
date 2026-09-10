"""
scripts/run_shadow_eval.py
==========================
Comprehensive end-to-end shadow evaluation of the Local Generative Conversational Model
across 7 clinical conversation flows with strict validation recording.
"""

import json
import time
from typing import Any, Dict, List, Optional
from unittest.mock import MagicMock, patch

from backend.app.ai.generative.generator_service import LocalGenerativeResponseService
from backend.app.ai.generative.validator import GenerativeResponseValidator
from backend.app.services.conversation_agent import (
    ConversationAction,
    ConversationAgent,
    ConversationIntent,
    ConversationMemory,
    LocalModelConversationAgentProvider,
)


def run_flow_turn(
    agent: ConversationAgent,
    memory: ConversationMemory,
    user_speech: str,
    flow_name: str,
    scenario_desc: str,
    expected_deterministic_check: Optional[str] = None,
    custom_slot: Optional[Dict[str, Any]] = None,
    custom_facility: Optional[Dict[str, Any]] = None,
    mock_db: Any = None,
) -> Dict[str, Any]:
    """Execute a single turn and record detailed shadow generation and validation metrics."""
    # 1. Capture initial phase
    prior_phase = memory.call_phase

    # 2. Mock external database facilities/slots if provided
    if custom_facility:
        agent.find_facilities = MagicMock(return_value=custom_facility)
        memory.recommended_facility = custom_facility
    if custom_slot:
        agent.get_or_create_slot = MagicMock(return_value=custom_slot)
        memory.selected_slot = custom_slot

    # 3. Process turn through conversation agent
    # Force settings so shadow mode is active, but generative responses are NOT enabled live
    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", False), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", True):
        returned_speech, action = agent.handle_turn(user_speech, memory, db=mock_db)

    # 4. Generate candidate response from local model
    service = LocalGenerativeResponseService.get_instance()
    validator = GenerativeResponseValidator()
    
    t0 = time.perf_counter()
    gen_text, is_valid, reason, gen_latency = service.generate(action, memory)
    total_latency = (time.perf_counter() - t0) * 1000

    # 5. Classify safety and failure modes
    is_emergency = action.emergency or action.intent == ConversationIntent.EMERGENCY or bool(memory.emergency_red_flags)
    has_wrong_symptom = False
    has_wrong_facility = False
    has_wrong_slot = False
    has_phase_drift = False
    has_hindi_corruption = False

    if reason:
        if "hallucinated_symptom" in reason or "hallucinated_unrelated_symptom" in reason:
            has_wrong_symptom = True
        if "facility" in reason:
            has_wrong_facility = True
        if "slot_time" in reason:
            has_wrong_slot = True
        if "phase_drift" in reason:
            has_phase_drift = True
        if "corrupted" in reason or "matra" in reason or "fragment" in reason:
            has_hindi_corruption = True

    # Deterministic decision representation
    triage_info = memory.triage_result or {}
    decision_summary = (
        f"urgency={triage_info.get('urgency', 'NONE')}; "
        f"care={triage_info.get('recommended_care', 'NONE')}; "
        f"fac={((memory.recommended_facility or {}).get('name', 'NONE'))}; "
        f"phase={memory.call_phase}"
    )

    record = {
        "flow": flow_name,
        "scenario": scenario_desc,
        "user_input": user_speech,
        "prior_phase": prior_phase,
        "phase": memory.call_phase,
        "action_intent": action.intent.value,
        "symptoms": list(memory.symptoms),
        "deterministic_decision": decision_summary,
        "deterministic_response": returned_speech,
        "generated_response": gen_text,
        "accepted": is_valid,
        "rejected": not is_valid,
        "rejection_reason": reason,
        "fallback_response": returned_speech,
        "latency_ms": round(gen_latency if gen_latency > 0 else total_latency, 1),
        "is_emergency": is_emergency,
        "emergency_bypassed": is_emergency and (reason == "emergency_bypass_deterministic" or not gen_text),
        "has_wrong_symptom": has_wrong_symptom,
        "has_wrong_facility": has_wrong_facility,
        "has_wrong_slot": has_wrong_slot,
        "has_phase_drift": has_phase_drift,
        "has_hindi_corruption": has_hindi_corruption,
    }
    return record


def run_all_shadow_evaluations() -> List[Dict[str, Any]]:
    records = []

    # ==========================================================================
    # FLOW 1 — English normal case (Complete multi-turn end-to-end)
    # ==========================================================================
    agent1 = ConversationAgent()
    mem1 = ConversationMemory(language="en-IN", caller_phone="9876543210")
    custom_fac1 = {"id": 101, "name": "Malshiras Primary Health Centre", "locality": "Malshiras"}
    custom_slot1 = {"id": 501, "slot_time": "10:00 AM"}

    f1_turns = [
        ("I have high fever and severe cough", "FLOW 1: Turn 1 (Symptoms)"),
        ("I have had it for 3 days", "FLOW 1: Turn 2 (Duration)"),
        ("I am calling from Malshiras", "FLOW 1: Turn 3 (Locality)"),
        ("My name is Ramesh Patil", "FLOW 1: Turn 4 (Name)"),
        ("I am 35 years old", "FLOW 1: Turn 5 (Age)"),
        ("No difficulty breathing, no chest pain", "FLOW 1: Turn 6 (Safety questions)"),
        ("Yes, I want to book an appointment", "FLOW 1: Turn 7 (Triage / Booking ask)"),
        ("I prefer a clinic visit", "FLOW 1: Turn 8 (Booking type)"),
        ("Yes, please confirm and book it", "FLOW 1: Turn 9 (Booking confirm)"),
        ("Thank you, that is all", "FLOW 1: Turn 10 (End)"),
    ]
    for inp, desc in f1_turns:
        rec = run_flow_turn(agent1, mem1, inp, "FLOW 1 (English Normal)", desc, custom_facility=custom_fac1, custom_slot=custom_slot1)
        records.append(rec)

    # ==========================================================================
    # FLOW 2 — Hindi/Hinglish normal case (Complete multi-turn end-to-end)
    # ==========================================================================
    agent2 = ConversationAgent()
    mem2 = ConversationMemory(language="hi-IN", caller_phone="9876543211")
    custom_fac2 = {"id": 102, "name": "Pandharpur Community Health Centre", "locality": "Pandharpur"}
    custom_slot2 = {"id": 502, "slot_time": "11:30 AM"}

    f2_turns = [
        ("Mujhe tez bukhar aur khansi hai", "FLOW 2: Turn 1 (Hindi Symptoms)"),
        ("Do din se ho raha hai", "FLOW 2: Turn 2 (Hindi Duration)"),
        ("Pandharpur gaon se bol raha hoon", "FLOW 2: Turn 3 (Hindi Locality)"),
        ("Mera naam Suresh Jadhav hai", "FLOW 2: Turn 4 (Hindi Name)"),
        ("Meri umar 42 saal hai", "FLOW 2: Turn 5 (Hindi Age)"),
        ("Nahi, seene mein dard nahi hai", "FLOW 2: Turn 6 (Hindi Safety questions)"),
        ("Haanji, appointment book karna hai", "FLOW 2: Turn 7 (Hindi Booking ask)"),
        ("Doctor se clinic mein milna hai", "FLOW 2: Turn 8 (Hindi Booking type)"),
        ("Haan confirm kar dijiye", "FLOW 2: Turn 9 (Hindi Booking confirm)"),
    ]
    for inp, desc in f2_turns:
        rec = run_flow_turn(agent2, mem2, inp, "FLOW 2 (Hindi Normal)", desc, custom_facility=custom_fac2, custom_slot=custom_slot2)
        records.append(rec)

    # ==========================================================================
    # FLOW 3 — Emergency
    # Severe chest pain + difficulty breathing (must completely bypass generative LM)
    # ==========================================================================
    agent3 = ConversationAgent()
    mem3 = ConversationMemory(language="en-IN", caller_phone="9876543212")
    f3_turns = [
        ("I have severe chest pain and severe difficulty breathing", "FLOW 3: Emergency presentation"),
        ("Seene mein bahut tez dard hai aur behosh ho raha hai", "FLOW 3: Hindi Emergency presentation"),
    ]
    for inp, desc in f3_turns:
        rec = run_flow_turn(agent3, mem3, inp, "FLOW 3 (Emergency)", desc)
        records.append(rec)

    # ==========================================================================
    # FLOW 4 — Injury
    # Caller reports an injury (verify recognition & no hallucinated symptoms)
    # ==========================================================================
    agent4 = ConversationAgent()
    mem4 = ConversationMemory(language="en-IN", caller_phone="9876543213")
    f4_turns = [
        ("I fell from a motorcycle and hurt my leg badly with bleeding", "FLOW 4: Turn 1 (Injury presentation)"),
        ("Since 2 hours", "FLOW 4: Turn 2 (Injury duration)"),
        ("Akluj village", "FLOW 4: Turn 3 (Injury locality)"),
    ]
    for inp, desc in f4_turns:
        rec = run_flow_turn(agent4, mem4, inp, "FLOW 4 (Injury)", desc)
        records.append(rec)

    # ==========================================================================
    # FLOW 5 — Facility Selection
    # Unseen locality/facility combination (Sangola Health Sub-Centre)
    # ==========================================================================
    agent5 = ConversationAgent()
    mem5 = ConversationMemory(language="en-IN", caller_phone="9876543214")
    custom_fac5 = {"id": 105, "name": "Sangola Health Sub-Centre", "locality": "Sangola"}
    f5_turns = [
        ("I have mild body pain", "FLOW 5: Turn 1 (Body pain)"),
        ("For about a week", "FLOW 5: Turn 2 (Duration)"),
        ("I live in Sangola", "FLOW 5: Turn 3 (Sangola locality)"),
        ("My name is Anita", "FLOW 5: Turn 4 (Name)"),
        ("28 years", "FLOW 5: Turn 5 (Age)"),
        ("No chest pain or breathing issues", "FLOW 5: Turn 6 (Safety questions)"),
    ]
    for inp, desc in f5_turns:
        rec = run_flow_turn(agent5, mem5, inp, "FLOW 5 (Facility Selection)", desc, custom_facility=custom_fac5)
        records.append(rec)

    # ==========================================================================
    # FLOW 6 — Appointment (Actual slot time matching)
    # Real available slot 02:00 PM (verify generated response mentions ONLY actual slot)
    # ==========================================================================
    agent6 = ConversationAgent()
    mem6 = ConversationMemory(
        language="en-IN",
        caller_phone="9876543215",
        call_phase="BOOKING_TYPE",
        symptoms=["stomach pain"],
        locality="Malshiras",
        patient_name="Sunita",
        recommended_facility={"id": 101, "name": "Malshiras Primary Health Centre"},
    )
    custom_slot6 = {"id": 601, "slot_time": "02:00 PM"}
    f6_turns = [
        ("I prefer a phone consultation", "FLOW 6: Turn 1 (Select phone type)"),
        ("Yes, confirm the appointment", "FLOW 6: Turn 2 (Confirm booking)"),
    ]
    for inp, desc in f6_turns:
        rec = run_flow_turn(agent6, mem6, inp, "FLOW 6 (Appointment Slots)", desc, custom_slot=custom_slot6)
        records.append(rec)

    # ==========================================================================
    # FLOW 7 — Negative & Edge Cases
    # ear pain, fracture, stomach pain, cough+fever, unknown symptom, noise, repeat, change type, cancel
    # ==========================================================================
    agent7 = ConversationAgent()
    neg_cases = [
        ("I have severe ear pain since morning", "FLOW 7: Ear pain"),
        ("I have a bone fracture in my right hand", "FLOW 7: Fracture"),
        ("I have severe stomach pain with loose motions and vomiting", "FLOW 7: Stomach pain"),
        ("I have continuous cough and high fever with chills", "FLOW 7: Cough + Fever"),
        ("I have a strange tingling sensation in my fingertips", "FLOW 7: Unknown symptom"),
        ("Um... uhhh... hello? Can you hear me?", "FLOW 7: Noisy/unclear speech"),
        ("Could you please repeat that again?", "FLOW 7: Repeat request"),
        ("Actually, change my appointment to a phone consultation instead", "FLOW 7: Change appointment type"),
        ("I want to cancel this booking please", "FLOW 7: Caller cancels booking"),
    ]
    for inp, desc in neg_cases:
        mem_neg = ConversationMemory(
            language="en-IN",
            caller_phone="9876543216",
            call_phase="SYMPTOMS" if "symptom" in desc.lower() or "pain" in desc.lower() or "fracture" in desc.lower() or "cough" in desc.lower() else (
                "BOOKING_CONFIRM" if "change" in desc.lower() or "cancel" in desc.lower() else "DURATION"
            ),
            last_prompt="How long have you been experiencing fever?",
            recommended_facility={"id": 101, "name": "Malshiras Primary Health Centre"},
            selected_slot={"id": 701, "slot_time": "10:00 AM"},
        )
        rec = run_flow_turn(agent7, mem_neg, inp, "FLOW 7 (Negative Cases)", desc)
        records.append(rec)

    return records


if __name__ == "__main__":
    results = run_all_shadow_evaluations()
    with open("backend/shadow_eval_results.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    print(f"Shadow evaluation completed. Total evaluated turns: {len(results)}")
