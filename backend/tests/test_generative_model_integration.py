"""
backend/tests/test_generative_model_integration.py
==================================================
Unit and safety tests for the Local Generative Conversational Model:
- Adapter integration into ConversationAgent
- Validator rules (symptom hallucinations, facility mismatch, time slot claims)
- Devanagari corruption rejection
- Repetitive text & empty response rejection
- Emergency bypass (strictly deterministic)
- Deterministic fallback guarantees
- Feature flag & shadow mode compliance
"""

import pytest
from unittest.mock import patch, MagicMock

from backend.app.ai.generative.validator import GenerativeResponseValidator
from backend.app.ai.generative.generator_service import LocalGenerativeResponseService
from backend.app.services.conversation_agent import (
    ConversationAction,
    ConversationMemory,
    ConversationIntent,
    ConversationAgent,
    LocalModelConversationAgentProvider,
)


@pytest.fixture
def validator():
    return GenerativeResponseValidator()


@pytest.fixture
def base_memory():
    return ConversationMemory(
        language="en-IN",
        call_phase="DURATION",
        symptoms=["fever"],
        locality="Malshiras",
        patient_name="Ramesh",
        age=35,
        triage_result={"urgency": "low", "emergency": False, "recommended_care": "Primary Health Centre"},
        recommended_facility={"id": 1, "name": "Malshiras Primary Health Centre"},
        selected_slot={"slot_time": "10:00 AM"},
    )


@pytest.fixture
def base_action():
    return ConversationAction(
        intent=ConversationIntent.REPORT_SYMPTOMS,
        symptoms=["fever"],
        confidence=0.95,
        language="en",
    )


# ==============================================================================
# 1. Valid English & Hindi Responses
# ==============================================================================

def test_valid_english_generated_response(validator, base_memory, base_action):
    gen_text = "I understand you have had fever. How many days have you been experiencing this?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is True
    assert reason is None


def test_valid_hindi_generated_response(validator, base_memory, base_action):
    base_memory.language = "hi-IN"
    base_memory.call_phase = "DURATION"
    gen_text = "समझ गया, आपको bukhar है। यह तकलीफ आपको कितने दिन से हो रही है?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is True
    assert reason is None


# ==============================================================================
# 2. Symptom Hallucination Rejection (e.g. ear pain -> dizziness)
# ==============================================================================

def test_wrong_symptom_rejected(validator, base_memory, base_action):
    # Memory only has "ear pain"
    base_memory.symptoms = ["ear pain"]
    base_action.symptoms = ["ear pain"]
    # Model generates hallucinated dizziness
    gen_text = "I note that you are experiencing dizziness."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated" in reason or "dizziness" in reason


def test_wrong_symptom_rejected_hindi(validator, base_memory, base_action):
    base_memory.symptoms = ["kaan dard"]
    base_action.symptoms = ["kaan dard"]
    gen_text = "समझ गया, आपको pet dard aur kamzori हो रहा है।"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated" in reason


# ==============================================================================
# 3. Facility Hallucination Rejection
# ==============================================================================

def test_wrong_facility_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "TRIAGE_PRESENTED"
    base_memory.recommended_facility = {"name": "Kurduvadi Rural Hospital"}
    base_memory.locality = "Kurduvadi"
    # Model hallucinates Solapur Civil Hospital
    gen_text = "Based on triage recommendations, you should visit Solapur Civil Hospital."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "facility" in reason


# ==============================================================================
# 4. Appointment Time Slot Hallucination Rejection
# ==============================================================================

def test_wrong_appointment_time_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "BOOKING_CONFIRM"
    base_memory.selected_slot = {"slot_time": "10:00 AM"}
    # Model hallucinates 03:30 PM
    gen_text = "I found an available slot for tomorrow at 03:30 PM. Would you like to confirm?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated_slot_time" in reason


def test_premature_slot_time_in_intake_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "LOCALITY"
    base_memory.selected_slot = None
    gen_text = "We have an open consultation at 10:00 AM tomorrow."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "premature_slot_time_claim" in reason or "phase_drift" in reason


# ==============================================================================
# 5. Corrupted Hindi / Devanagari Token Rejection
# ==============================================================================

def test_corrupted_mixed_script_token_rejected(validator, base_memory, base_action):
    # Cross-script token merge without space (e.g. "ThankरBased", "डॉक्टरis")
    gen_text = "ThankरBased clinic visit available."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "corrupted_mixed_script_token" in reason


def test_corrupted_leading_matra_rejected(validator, base_memory, base_action):
    # Standalone matra at word start
    gen_text = "Theek hai \u093eaapka appointment book kar rahe hain."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "corrupted_devanagari_leading_matra" in reason


def test_corrupted_fragment_rejected(validator, base_memory, base_action):
    # Garbled fragment "आपके."
    gen_text = "आपके. Kya aap yahan appointment lena chahte hain?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert any(k in reason for k in ("truncated_devanagari_fragment", "malformed_grammatical_fragment", "phase_drift_booking_leakage_in_DURATION"))


# ==============================================================================
# 6. Empty & Repetitive Text Rejection
# ==============================================================================

def test_empty_or_short_response_rejected(validator, base_memory, base_action):
    assert validator.validate("", base_memory, base_action)[0] is False
    assert validator.validate("Hello", base_memory, base_action)[0] is False


def test_repetitive_response_rejected(validator, base_memory, base_action):
    gen_text = "fever fever fever fever please describe your symptoms"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "repetitive" in reason


# ==============================================================================
# 7. Emergency Bypass Rule
# ==============================================================================

def test_emergency_response_bypasses_generative(validator, base_memory):
    em_action = ConversationAction(
        intent=ConversationIntent.EMERGENCY,
        emergency=True,
        raw_text="severe chest pain and difficulty breathing",
    )
    gen_text = "Please go to the nearest emergency clinic right now."
    is_valid, reason = validator.validate(gen_text, base_memory, em_action)
    assert is_valid is False
    assert "emergency_must_use_deterministic_handler" in reason


def test_unauthorized_emergency_dispatch_claim_rejected(validator, base_memory, base_action):
    # Non-emergency action trying to generate dispatch claims
    gen_text = "This is critical, please call 108 immediately for an ambulance."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "unauthorized_emergency_dispatch_claim" in reason


# ==============================================================================
# 8. Deterministic Fallback & Feature Flag Guarantees
# ==============================================================================

def test_agent_uses_deterministic_fallback_when_disabled(base_memory, base_action):
    provider = LocalModelConversationAgentProvider()
    
    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", False), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False):
        
        response = provider.generate_response(base_action, base_memory)
        # Verify fallback response was used
        assert "How long have you been experiencing them?" in response or "fever" in response


def test_agent_uses_deterministic_fallback_when_validation_fails(base_memory, base_action):
    provider = LocalModelConversationAgentProvider()
    
    # Mock generator returning an invalid hallucinated response
    mock_service = MagicMock()
    mock_service.is_ready = True
    mock_service.generate.return_value = ("I note that you are experiencing dizziness.", False, "hallucinated_symptom_dizziness", 45.0)

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        response = provider.generate_response(base_action, base_memory)
        # Should fallback deterministically, NOT use dizziness!
        assert "dizziness" not in response
        assert "How long have you been experiencing" in response or "fever" in response


def test_agent_uses_generated_response_when_enabled_and_valid(base_memory, base_action):
    provider = LocalModelConversationAgentProvider()
    valid_text = "I understand you have fever. How many days have you had these symptoms?"
    
    mock_service = MagicMock()
    mock_service.is_ready = True
    mock_service.generate.return_value = (valid_text, True, None, 50.0)

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        response = provider.generate_response(base_action, base_memory)
        assert response == valid_text


def test_shadow_mode_logs_and_returns_deterministic(base_memory, base_action, caplog):
    provider = LocalModelConversationAgentProvider()
    valid_text = "I understand you have fever. How many days have you had these symptoms?"
    
    mock_service = MagicMock()
    mock_service.is_ready = True
    mock_service.generate.return_value = (valid_text, True, None, 50.0)

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", False), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", True), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service), \
         caplog.at_level("INFO"):
        
        response = provider.generate_response(base_action, base_memory)
        # Shadow mode MUST return the deterministic response to the caller
        assert response != valid_text
        assert "How long have you been experiencing" in response or "fever" in response
        # But shadow log should record the candidate
        assert any("[LOCAL_GEN_LM_SHADOW]" in record.message for record in caplog.records)


# ==============================================================================
# 9. Phase-Based Generative Control Gating Tests
# ==============================================================================

@pytest.mark.parametrize("allowed_phase", [
    "GREETING", "SYMPTOMS", "DURATION", "LOCALITY", "NAME", "AGE",
    "SAFETY_QUESTIONS", "REQUEST_REPEAT", "UNKNOWN", "FOLLOW_UP"
])
def test_allowed_phases_call_local_generator(base_memory, base_action, allowed_phase):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = allowed_phase
    valid_text = f"Sample safe response for {allowed_phase}."

    mock_service = MagicMock()
    mock_service.is_ready = True
    mock_service.generate.return_value = (valid_text, True, None, 40.0)

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        provider.generate_response(base_action, base_memory)
        # Verify local generator was invoked
        mock_service.generate.assert_called_once_with(base_action, base_memory)


@pytest.mark.parametrize("disallowed_phase", [
    "TRIAGE_PRESENTED", "BOOKING_TYPE", "BOOKING_CONFIRM",
    "CHANGE_APPOINTMENT_TYPE", "CANCEL_BOOKING", "EMERGENCY", "ENDED"
])
def test_disallowed_phases_never_call_local_generator(base_memory, base_action, disallowed_phase):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = disallowed_phase

    mock_service = MagicMock()
    mock_service.is_ready = True

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        provider.generate_response(base_action, base_memory)
        # Verify local generator was NEVER called!
        mock_service.generate.assert_not_called()


def test_emergency_phase_never_calls_local_generator(base_memory):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = "EMERGENCY"
    em_action = ConversationAction(intent=ConversationIntent.EMERGENCY, emergency=True)

    mock_service = MagicMock()
    mock_service.is_ready = True

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        resp = provider.generate_response(em_action, base_memory)
        mock_service.generate.assert_not_called()
        assert "emergency" in resp.lower() or "108" in resp.lower()


def test_facility_recommendation_never_calls_local_generator(base_memory, base_action):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = "TRIAGE_PRESENTED"
    base_memory.recommended_facility = {"name": "Malshiras Primary Health Centre"}

    mock_service = MagicMock()
    mock_service.is_ready = True

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        resp = provider.generate_response(base_action, base_memory)
        mock_service.generate.assert_not_called()
        assert "Malshiras Primary Health Centre" in resp


def test_appointment_confirmation_never_calls_local_generator(base_memory, base_action):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = "BOOKING_CONFIRM"
    base_memory.selected_slot = {"slot_time": "10:00 AM"}

    mock_service = MagicMock()
    mock_service.is_ready = True

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        resp = provider.generate_response(base_action, base_memory)
        mock_service.generate.assert_not_called()
        assert "10:00 AM" in resp


def test_booking_cancellation_never_calls_local_generator(base_memory):
    provider = LocalModelConversationAgentProvider()
    base_memory.call_phase = "CANCEL_BOOKING"
    cancel_action = ConversationAction(intent=ConversationIntent.CANCEL_BOOKING)

    mock_service = MagicMock()
    mock_service.is_ready = True

    with patch("backend.app.core.config.settings.LOCAL_GENERATIVE_RESPONSES_ENABLED", True), \
         patch("backend.app.core.config.settings.LOCAL_GENERATIVE_SHADOW_MODE", False), \
         patch("backend.app.ai.generative.generator_service.LocalGenerativeResponseService.get_instance", return_value=mock_service):
        
        resp = provider.generate_response(cancel_action, base_memory)
        mock_service.generate.assert_not_called()


# ==============================================================================
# 10. Strengthened Entity Validation Tests (Name, Age, Locality, Duration)
# ==============================================================================

def test_wrong_name_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "NAME"
    base_memory.patient_name = "Ramesh"
    # Model generates Suresh instead of Ramesh
    gen_text = "Shukriya Suresh, maine aapka naam note kar liya hai."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated_patient_name" in reason


def test_wrong_age_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "AGE"
    base_memory.age = 35
    # Model claims caller is 68 years old
    gen_text = "Understood, you are 68 years old. Which village are you calling from?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated_patient_age" in reason


def test_wrong_locality_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "LOCALITY"
    base_memory.locality = "Malshiras"
    # Model asserts caller is calling from Pandharpur
    gen_text = "Based on your symptoms, calling from Pandharpur. Let us find a clinic."
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated_locality" in reason


def test_wrong_duration_rejected(validator, base_memory, base_action):
    base_memory.call_phase = "DURATION"
    base_memory.duration = "2 days"
    # Model asserts duration is 5 days
    gen_text = "Understood, you have had fever for 5 days. Which village are you calling from?"
    is_valid, reason = validator.validate(gen_text, base_memory, base_action)
    assert is_valid is False
    assert "hallucinated_duration" in reason

