"""
Automated tests for conversational voice intake agent.
Validates understanding, multi-turn state management, dynamic response generation,
clinical safety ordering, idempotent patient registration, and persistence.
Covers all 16 requirements from Part 19.
"""

import pytest
from unittest.mock import patch, AsyncMock
import base64
from starlette.testclient import TestClient

from backend.app.services.conversation_agent import (
    ConversationAgent,
    ConversationIntent,
    ConversationMemory,
    ConversationAction,
)
from backend.app.ai.conversation.model_service import (
    extract_name_from_text,
    extract_age_from_text,
    extract_gender_from_text,
    LocalConversationModel,
)
from backend.app.models.patient import Patient
from backend.app.models.voice_encounter import VoiceEncounter
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.voice_encounter_repository import VoiceEncounterRepository
from backend.app.services.sarvam_tts_service import TTSAudioResult


def _create_synthetic_wav(duration_ms: int = 50, sample_rate: int = 8000) -> bytes:
    import io, wave
    num_frames = int(sample_rate * (duration_ms / 1000.0))
    raw_pcm = b"\x00\x00" * num_frames
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(raw_pcm)
    return buf.getvalue()


# ──────────────────────────────────────────────────────────────────────────────
# Test 1: Name Extraction (English)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_name_en():
    name = extract_name_from_text("My name is Ramesh Patel")
    assert name == "Ramesh Patel"

    agent = ConversationAgent()
    mem = ConversationMemory(call_phase="NAME")
    action = agent.provider.interpret("My name is Ramesh Patel", mem)
    assert action.intent == ConversationIntent.PROVIDE_NAME
    assert action.patient_name == "Ramesh Patel"


# ──────────────────────────────────────────────────────────────────────────────
# Test 2: Name Extraction (Hindi)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_name_hi():
    name = extract_name_from_text("Mera naam Sunita Devi hai")
    assert name == "Sunita Devi"

    agent = ConversationAgent()
    mem = ConversationMemory(language="hi-IN", call_phase="NAME")
    action = agent.provider.interpret("Mera naam Sunita Devi hai", mem)
    assert action.intent == ConversationIntent.PROVIDE_NAME
    assert action.patient_name == "Sunita Devi"


# ──────────────────────────────────────────────────────────────────────────────
# Test 3: Age Extraction (Digit number)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_age_number():
    age = extract_age_from_text("I am 45 years old")
    assert age == 45

    agent = ConversationAgent()
    mem = ConversationMemory(call_phase="AGE")
    action = agent.provider.interpret("I am 45 years old", mem)
    assert action.intent == ConversationIntent.PROVIDE_AGE
    assert action.age == 45


# ──────────────────────────────────────────────────────────────────────────────
# Test 4: Age Extraction (Spoken English word)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_age_spoken_en():
    age = extract_age_from_text("I am thirty five years old")
    assert age == 35


# ──────────────────────────────────────────────────────────────────────────────
# Test 5: Age Extraction (Spoken Hindi word)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_age_spoken_hi():
    age = extract_age_from_text("Umar paitis saal hai")
    assert age == 35


# ──────────────────────────────────────────────────────────────────────────────
# Test 6: Age Rejection (Invalid bounds)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_rejects_invalid_age():
    assert extract_age_from_text("I am 200 years old") is None
    assert extract_age_from_text("I am 0 years old") is None
    assert extract_age_from_text("I am -5 years old") is None


# ──────────────────────────────────────────────────────────────────────────────
# Test 7: Gender Extraction
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_extracts_gender():
    assert extract_gender_from_text("female patient") == "female"
    assert extract_gender_from_text("she is 30 years old") == "female"
    assert extract_gender_from_text("male, 45 years") == "male"
    assert extract_gender_from_text("mahila mariz") == "female"
    assert extract_gender_from_text("purush mariz") == "male"


# ──────────────────────────────────────────────────────────────────────────────
# Test 8: Emergency Immediately Bypasses Demographics
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_emergency_bypasses_demographics(db_session):
    agent = ConversationAgent()
    mem = ConversationMemory()
    speech, action = agent.handle_turn("I have severe chest pain and cannot breathe", mem, db=db_session)
    assert action.emergency is True
    assert mem.call_phase == "EMERGENCY"
    # Ensure it did NOT ask for name or age
    assert "name" not in speech.lower()
    assert "how old" not in speech.lower()
    assert "108" in speech or "emergency" in speech.lower()


# ──────────────────────────────────────────────────────────────────────────────
# Test 9: Dynamic Response Acknowledges Symptoms & Duration
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_dynamic_response_acknowledges_symptoms():
    agent = ConversationAgent()
    mem = ConversationMemory(language="en-IN")
    speech, action = agent.handle_turn("I have high fever for 3 days", mem)
    assert "fever" in mem.symptoms
    assert mem.duration == "3 days"
    # Acknowledges collected details dynamically rather than generic greeting
    assert "fever" in speech.lower()
    assert "3 days" in speech.lower() or "days" in speech.lower()


# ──────────────────────────────────────────────────────────────────────────────
# Test 10: Skip Already Collected Fields
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_skips_already_collected_fields(db_session):
    agent = ConversationAgent()
    mem = ConversationMemory(language="en-IN")
    # Turn 1: Caller volunteers name and fever
    speech1, act1 = agent.handle_turn("My name is Rajesh and I have fever", mem, db=db_session)
    assert mem.patient_name == "Rajesh"
    assert "fever" in mem.symptoms

    # Turn 2: Caller gives duration
    speech2, act2 = agent.handle_turn("For 2 days", mem, db=db_session)
    assert mem.duration == "2 days"
    # Because name was already provided in Turn 1, bot MUST NOT ask for name again!
    assert "may i know your name" not in speech2.lower()
    assert "what is your name" not in speech2.lower()


# ──────────────────────────────────────────────────────────────────────────────
# Test 11: Existing Patient Lookup Pre-populates Memory & Skips Questions
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_existing_patient_prepopulates(db_session):
    p_repo = PatientRepository(db_session)
    phone = "9822334455"
    existing_pat = p_repo.get_or_create_patient(
        mobile=phone,
        full_name="Kavita Rao",
        age=38,
        gender="female",
        village="Malshiras",
    )
    db_session.commit()

    # Create memory simulating phone resolution at WebSocket connect
    mem = ConversationMemory(
        caller_phone=phone,
        patient_id=existing_pat.id,
        patient_name=existing_pat.full_name,
        age=existing_pat.age,
        gender=existing_pat.gender,
        locality=existing_pat.village,
    )

    agent = ConversationAgent()
    speech, act = agent.handle_turn("I have dry cough for 3 days", mem, db=db_session)

    # Name, age, locality were already known -> bot directly proceeds to triage & facility!
    assert "kavita" not in speech.lower() or "what is your name" not in speech.lower()
    assert "how old" not in speech.lower()
    assert mem.locality == "Malshiras"
    assert mem.triage_result is not None


# ──────────────────────────────────────────────────────────────────────────────
# Test 12: Persistence of Extended Intake Fields
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_persists_to_voice_encounters(db_session):
    v_repo = VoiceEncounterRepository(db_session)
    enc = v_repo.create_encounter(
        phone_number="+919876500001",
        patient_name="Sanjay Verma",
        age=52,
        gender="male",
        language="en-IN",
        symptoms="chest tightness, shortness of breath",
        symptom_duration="1 day",
        severity="severe",
        additional_notes="History: diabetic; Medications: Metformin",
        triage_urgency="emergency",
        triage_reason="Acute cardiopulmonary symptoms require immediate evaluation.",
        emergency=True,
        locality="Akluj",
        recommended_care_level="Emergency Department",
        appointment_type="OFFLINE",
        transcript_summary="Caller reported severe chest tightness.",
    )
    db_session.commit()

    fetched = v_repo.get_by_id(enc.id)
    assert fetched is not None
    assert fetched.patient_name == "Sanjay Verma"
    assert fetched.age == 52
    assert fetched.gender == "male"
    assert fetched.severity == "severe"
    assert "diabetic" in fetched.additional_notes
    assert fetched.recommended_care_level == "Emergency Department"
    assert fetched.appointment_type == "OFFLINE"


# ──────────────────────────────────────────────────────────────────────────────
# Test 13: Idempotent Patient Creation (No Duplicates)
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_idempotent_patient_creation(db_session):
    p_repo = PatientRepository(db_session)
    phone = "9112233445"

    # Call 1
    pat1 = p_repo.get_or_create_patient(
        mobile=phone,
        full_name="Anita Sharma",
        age=29,
        gender="female",
        village="Velapur",
    )
    db_session.commit()
    id1 = pat1.id

    # Call 2 from same phone
    pat2 = p_repo.get_or_create_patient(
        mobile=phone,
        full_name="Anita Sharma",
        age=29,
        village="Velapur",
    )
    db_session.commit()
    id2 = pat2.id

    assert id1 == id2

    # Query total records matching phone
    from sqlalchemy import select
    res = list(db_session.scalars(select(Patient).where(Patient.mobile == phone)).all())
    assert len(res) == 1


# ──────────────────────────────────────────────────────────────────────────────
# Test 14: Doctor Clinical Summary Includes All Extended Fields
# ──────────────────────────────────────────────────────────────────────────────
def test_doctor_clinical_summary_includes_all_fields(client: TestClient, db_session):
    # Setup patient and voice encounter
    p_repo = PatientRepository(db_session)
    pat = p_repo.get_or_create_patient(
        mobile="9988776655",
        full_name="Geeta Patel",
        age=44,
        gender="female",
        village="Pandharpur",
    )
    db_session.commit()

    v_repo = VoiceEncounterRepository(db_session)
    v_repo.create_encounter(
        patient_id=pat.id,
        phone_number="9988776655",
        patient_name="Geeta Patel",
        age=44,
        gender="female",
        language="hi-IN",
        symptoms="fever, chills",
        symptom_duration="4 days",
        severity="moderate",
        additional_notes="Allergies: Penicillin",
        triage_urgency="needs_attention",
        triage_reason="Fever lasting 4 days requires clinical assessment.",
        locality="Pandharpur",
        recommended_care_level="Primary Health Centre",
        appointment_type="TELECONSULTATION",
        transcript_summary="Caller requested consultation for prolonged fever.",
    )
    db_session.commit()

    # Login as doctor to access endpoint
    from backend.app.core.security import create_access_token
    token = create_access_token(subject="DOC-10101", role="DOCTOR")

    resp = client.get(
        f"/api/v1/doctor/patients/{pat.id}/clinical-summary",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp.status_code == 200
    res = resp.json()
    assert "data" in res
    data = res["data"]
    assert "voice_encounter" in data
    ve = data["voice_encounter"]
    assert ve["patient_name"] == "Geeta Patel"
    assert ve["age"] == 44
    assert ve["gender"] == "female"
    assert ve["severity"] == "moderate"
    assert "Penicillin" in ve["additional_notes"]
    assert ve["recommended_care_level"] == "Primary Health Centre"
    assert ve["appointment_type"] == "TELECONSULTATION"


# ──────────────────────────────────────────────────────────────────────────────
# Test 15: Bilingual Hindi Intake Flow
# ──────────────────────────────────────────────────────────────────────────────
def test_intake_bilingual_hindi_flow(db_session):
    agent = ConversationAgent()
    mem = ConversationMemory(language="hi-IN", caller_phone="9876500002")

    # Turn 1: Symptoms in Hindi
    speech1, act1 = agent.handle_turn("Mujhe bukhar aur gale mein dard hai", mem, db=db_session)
    assert "fever" in mem.symptoms
    assert "kitne din" in speech1.lower() or "samay" in speech1.lower()

    # Turn 2: Duration in Hindi
    speech2, act2 = agent.handle_turn("Do din se", mem, db=db_session)
    assert mem.duration == "2 days"

    # Turn 3: Locality in Hindi
    speech3, act3 = agent.handle_turn("Main Malshiras se bol raha hoon", mem, db=db_session)
    assert mem.locality == "Malshiras"
    assert mem.call_phase == "TRIAGE_PRESENTED"
    assert mem.triage_result is not None
    assert "malshiras" in speech3.lower() or "swasthya" in speech3.lower() or "hospital" in speech3.lower() or "suvidha" in speech3.lower()


# ──────────────────────────────────────────────────────────────────────────────
# Test 16: DTMF Fallback Functionality Preserved
# ──────────────────────────────────────────────────────────────────────────────
def test_dtmf_fallback_still_works(client: TestClient):
    dummy_wav = _create_synthetic_wav(duration_ms=50)
    mock_tts = TTSAudioResult(audio_base64=base64.b64encode(dummy_wav).decode("ascii"), audio_bytes=dummy_wav)

    with patch("backend.app.services.sarvam_tts_service.SarvamTTSService.synthesize", new=AsyncMock(return_value=mock_tts)):
        with client.websocket_connect("/api/v1/ivr/exotel") as ws:
            ws.send_json({"event": "start", "stream_sid": "MZ_DTMF_TEST", "start": {"stream_sid": "MZ_DTMF_TEST"}})
            # Drain greeting
            _ = ws.receive_json()

            # Press 1 for English
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_TEST", "dtmf": {"digit": "1"}})
            # Should receive symptom prompt audio
            resp = ws.receive_json()
            assert resp["event"] in ("media", "mark")

            # Press 1 for Fever
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_TEST", "dtmf": {"digit": "1"}})
            # Press 9 to submit
            ws.send_json({"event": "dtmf", "stream_sid": "MZ_DTMF_TEST", "dtmf": {"digit": "9"}})

            # Disconnect cleanly
            ws.send_json({"event": "stop"})
