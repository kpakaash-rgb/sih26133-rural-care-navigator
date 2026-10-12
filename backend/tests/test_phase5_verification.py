"""
backend/tests/test_phase5_verification.py
=========================================
Phase 5 Comprehensive Integration & Verification Suite:
1. Backend Integrations (Doctors, Facilities, Schemes, Mobile Clinics, Triage, Availability).
2. Sarvam AI Demo-Mode Behavior (STT audio transcription fallback, language mapping, TTS resilience).
3. Tamil Nadu Seed Data & Normalization (Facilities, Schemes, Mobile Clinics, Patient Murugan P,
   Agglutinated Tamil symptom extraction & rule-based triage).
"""

from __future__ import annotations

import io
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from ai.triage.normalization import SymptomCategory, extract_symptoms_from_text, normalize_symptoms
from ai.triage.triage import run_triage
from backend.app.api.v1.routes.triage import DEMO_TRANSCRIPTS, LANGUAGE_MAPPING
from backend.app.database.seed_data import (
    DEMO_FACILITIES,
    DEMO_MOBILE_CLINICS,
    DEMO_SCHEMES,
    seed_demo_data,
)
from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility
from backend.app.models.mobile_clinic import MobileClinic
from backend.app.models.patient import Patient
from backend.app.models.scheme import GovernmentScheme
from backend.app.services.doctor_directory_service import DEFAULT_DOCTORS_CATALOG, DoctorDirectoryService
from backend.app.services.sarvam_stt_service import SUPPORTED_LANGUAGES, SarvamSTTService
from backend.app.services.sarvam_tts_service import (
    SUPPORTED_TTS_LANGUAGES,
    TTSError,
    build_spoken_response,
)


# ==============================================================================
# 1. Tamil Seed Data Verification
# ==============================================================================

def test_tamil_facilities_catalogs():
    """Verify Tamil Nadu facilities are configured in DEMO_FACILITIES."""
    tn_facilities = [
        f for f in DEMO_FACILITIES if f["district"] in ("Chengalpattu", "Kanchipuram")
    ]
    assert len(tn_facilities) >= 4

    names = {f["name"] for f in tn_facilities}
    assert "PHC Thirukazhukundram" in names
    assert "CHC Maduranthakam" in names
    assert "District Headquarters Hospital Kanchipuram" in names
    assert "Mobile Medical Unit Chengalpattu" in names

    # Verify types and services
    for f in tn_facilities:
        assert f["status"] == "ACTIVE"
        assert len(f["services"]) >= 3
        assert any("General Medicine" in s["name"] for s in f["services"])


def test_tamil_schemes_catalogs():
    """Verify Tamil Nadu government schemes are in DEMO_SCHEMES."""
    tn_schemes = [s for s in DEMO_SCHEMES if s.get("state") == "Tamil Nadu"]
    assert len(tn_schemes) >= 3

    names = {s["name"] for s in tn_schemes}
    assert any("CMCHIS" in name for name in names)
    assert any("MRMBS" in name or "Muthulakshmi" in name for name in names)
    assert any("Makkalai Thedi Maruthuvam" in name for name in names)

    for s in tn_schemes:
        assert s["active"] is True
        assert len(s["eligibility"]) > 0
        assert len(s["benefits"]) > 0
        assert "http" in s["official_link"]


def test_tamil_mobile_clinics_catalogs():
    """Verify Tamil Nadu mobile outreach clinics are in DEMO_MOBILE_CLINICS."""
    tn_clinics = [
        c for c in DEMO_MOBILE_CLINICS if c["district"] in ("Chengalpattu", "Kanchipuram")
    ]
    assert len(tn_clinics) >= 2

    names = {c["name"] for c in tn_clinics}
    assert "Chengalpattu Coastal & Tribal Mobile Health Van (Demo MMU)" in names
    assert "Kanchipuram Weaver & Farm Outreach Clinic (Demo MMU)" in names

    for c in tn_clinics:
        assert c["status"] == "ACTIVE"
        assert len(c["service_area"]) > 0
        assert "+91-44" in c["contact"]


def test_seed_demo_data_idempotent_execution(db_session: Session):
    """Verify seed_demo_data successfully seeds all records idempotently."""
    # First seed
    seed_demo_data(db_session)

    # Verify facilities count (Solapur 4 + Tamil Nadu 4 = 8)
    fac_count = db_session.query(Facility).count()
    assert fac_count >= 8

    # Verify Tamil facility in DB
    tn_phc = db_session.scalars(
        select(Facility).where(Facility.name == "PHC Thirukazhukundram")
    ).first()
    assert tn_phc is not None
    assert tn_phc.district == "Chengalpattu"
    assert len(tn_phc.services) >= 4

    # Verify availability slots generated for Tamil facility
    slots = db_session.scalars(
        select(AvailabilitySlot).where(AvailabilitySlot.facility_id == tn_phc.id)
    ).all()
    assert len(slots) >= 10

    # Verify schemes in DB
    cmchis = db_session.scalars(
        select(GovernmentScheme).where(GovernmentScheme.state == "Tamil Nadu")
    ).all()
    assert len(cmchis) >= 3

    # Verify mobile clinics in DB
    tn_clinic = db_session.scalars(
        select(MobileClinic).where(MobileClinic.district == "Chengalpattu")
    ).first()
    assert tn_clinic is not None
    assert "Coastal & Tribal" in tn_clinic.name

    # Verify demo patients (both Ramesh Kumar and Murugan P)
    patient_solapur = db_session.scalars(
        select(Patient).where(Patient.mobile == "9876543210")
    ).first()
    assert patient_solapur is not None
    assert patient_solapur.full_name == "Ramesh Kumar"

    patient_tn = db_session.scalars(
        select(Patient).where(Patient.mobile == "9876543211")
    ).first()
    assert patient_tn is not None
    assert patient_tn.full_name == "Murugan P"
    assert patient_tn.district == "Chengalpattu"
    assert patient_tn.abha_number == "14-9876-5432-1098"

    # Second seed must be completely idempotent (no duplicates or crashes)
    seed_demo_data(db_session)
    assert db_session.query(Facility).count() == fac_count
    assert db_session.query(Patient).count() == 2


# ==============================================================================
# 2. Tamil Symptom Normalization & Triage Verification
# ==============================================================================

def test_tamil_symptom_normalization_core_terms():
    """Verify Tamil exact and agglutinated forms are correctly extracted."""
    # Fever (nominative and agglutinated forms)
    assert SymptomCategory.FEVER in extract_symptoms_from_text("எனக்கு காய்ச்சல் உள்ளது")
    assert SymptomCategory.FEVER in extract_symptoms_from_text("காய்ச்சலும் இருமலும் உள்ளது")
    assert SymptomCategory.FEVER in extract_symptoms_from_text("சுரம் இருக்கிறது")
    assert SymptomCategory.FEVER in extract_symptoms_from_text("kaichal")

    # Headache
    assert SymptomCategory.HEADACHE in extract_symptoms_from_text("எனக்கு தலைவலி இருக்கிறது")
    assert SymptomCategory.HEADACHE in extract_symptoms_from_text("தலைவலியும் உள்ளது")
    assert SymptomCategory.HEADACHE in extract_symptoms_from_text("thalaivali")

    # Cough
    assert SymptomCategory.COUGH in extract_symptoms_from_text("இருமல் அதிகமாக உள்ளது")
    assert SymptomCategory.COUGH in extract_symptoms_from_text("இருமலும் சளியும்")
    assert SymptomCategory.COUGH in extract_symptoms_from_text("irumal")

    # Stomach problem
    assert SymptomCategory.STOMACH_PROBLEM in extract_symptoms_from_text("வயிற்று வலி")
    assert SymptomCategory.STOMACH_PROBLEM in extract_symptoms_from_text("வயிறு வலி அதிகமாக உள்ளது")
    assert SymptomCategory.STOMACH_PROBLEM in extract_symptoms_from_text("vaitru vali")

    # Injury
    assert SymptomCategory.INJURY in extract_symptoms_from_text("காயம் ஏற்பட்டுள்ளது")
    assert SymptomCategory.INJURY in extract_symptoms_from_text("காயமும் ரத்தமும்")
    assert SymptomCategory.INJURY in extract_symptoms_from_text("அடிபட்டது")


def test_tamil_demo_transcript_extraction_and_triage():
    """Verify Sarvam demo transcript extraction and end-to-end rule-based triage."""
    tamil_demo = DEMO_TRANSCRIPTS["ta-IN"]
    assert "தலைவலியும்" in tamil_demo
    assert "காய்ச்சலும்" in tamil_demo

    extracted = extract_symptoms_from_text(tamil_demo)
    assert SymptomCategory.FEVER in extracted
    assert SymptomCategory.HEADACHE in extracted

    # Run triage with extracted symptoms
    triage_result = run_triage(
        symptoms=[],
        description=tamil_demo,
        duration_days=2,
    )
    assert triage_result.urgency == "needs_attention"
    assert triage_result.recommended_care == "Primary Health Centre (PHC)"
    assert triage_result.emergency is False
    assert "FEVER" in triage_result.symptoms
    assert "HEADACHE" in triage_result.symptoms


# ==============================================================================
# 3. Sarvam Demo-Mode STT Verification
# ==============================================================================

def test_transcribe_endpoint_demo_mode_tamil(client: TestClient):
    """Verify POST /api/v1/triage/transcribe returns Tamil demo transcript when no API key."""
    fake_audio = io.BytesIO(b"RIFF\x24\x00\x00\x00WAVEfmt \x10\x00\x00\x00data\x00\x00\x00\x00")
    response = client.post(
        "/api/v1/triage/transcribe",
        files={"audio": ("sample.wav", fake_audio, "audio/wav")},
        data={"language": "ta-IN"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["demo_mode"] is True
    assert data["provider"] == "sarvam"
    assert data["language"] == "ta-IN"
    assert data["transcript"] == DEMO_TRANSCRIPTS["ta-IN"]


def test_transcribe_endpoint_demo_mode_all_languages(client: TestClient):
    """Verify STT demo mode across Hindi, Marathi, and English with alias normalization."""
    test_cases = [
        ("hi", "hi-IN", DEMO_TRANSCRIPTS["hi-IN"]),
        ("mr", "mr-IN", DEMO_TRANSCRIPTS["mr-IN"]),
        ("en-in", "en-IN", DEMO_TRANSCRIPTS["en-IN"]),
        ("tamil", "ta-IN", DEMO_TRANSCRIPTS["ta-IN"]),
        ("hindi", "hi-IN", DEMO_TRANSCRIPTS["hi-IN"]),
    ]

    for input_lang, expected_lang, expected_text in test_cases:
        fake_audio = io.BytesIO(b"MOCK_AUDIO_DATA_FOR_TESTING")
        response = client.post(
            "/api/v1/triage/transcribe",
            files={"audio": ("voice.webm", fake_audio, "audio/webm")},
            data={"language": input_lang},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["language"] == expected_lang
        assert data["transcript"] == expected_text
        assert data["demo_mode"] is True


def test_transcribe_endpoint_empty_audio_validation(client: TestClient):
    """Verify empty audio payload yields HTTP 400 Bad Request."""
    empty_audio = io.BytesIO(b"")
    response = client.post(
        "/api/v1/triage/transcribe",
        files={"audio": ("empty.wav", empty_audio, "audio/wav")},
        data={"language": "ta-IN"},
    )
    assert response.status_code == 400
    payload = response.json()
    error_msg = payload.get("message") or payload.get("detail", "")
    assert "Recorded audio file is empty" in error_msg


def test_sarvam_stt_service_configuration():
    """Verify SarvamSTTService language support and URL builder."""
    stt = SarvamSTTService(language_code="ta-IN")
    assert stt.language_code == "ta-IN"
    url = stt.build_ws_url()
    assert "language_code=ta-IN" in url

    # Default fallback for unknown language
    stt_unknown = SarvamSTTService(language_code="xx-ZZ")
    assert stt_unknown.language_code == "en-IN"
    assert "ta-IN" in SUPPORTED_LANGUAGES


# ==============================================================================
# 4. Sarvam TTS Resilience & Spoken Guidance Verification
# ==============================================================================

def test_sarvam_tts_language_support():
    """Verify Sarvam TTS supported languages include Tamil, Hindi, Marathi, English."""
    assert "ta-IN" in SUPPORTED_TTS_LANGUAGES
    assert "hi-IN" in SUPPORTED_TTS_LANGUAGES
    assert "mr-IN" in SUPPORTED_TTS_LANGUAGES
    assert "en-IN" in SUPPORTED_TTS_LANGUAGES


def test_sarvam_tts_build_spoken_response():
    """Verify spoken guidance builder formats emergency, attention, and routine cases."""
    # Emergency
    res_em = build_spoken_response(urgency="emergency", emergency=True)
    assert "This may be an emergency" in res_em
    assert "Please seek emergency medical care immediately" in res_em

    # Needs attention with specific facility
    res_att = build_spoken_response(
        urgency="needs_attention",
        emergency=False,
        recommended_care="Primary Health Centre (PHC)",
    )
    assert "Primary Health Centre (PHC)" in res_att
    assert "for assessment by a healthcare professional" in res_att

    # Routine
    res_routine = build_spoken_response(urgency="routine", emergency=False)
    assert "Routine healthcare is recommended" in res_routine


def test_sarvam_tts_error_sanitization():
    """Verify TTSError provides a sanitized, user-safe message."""
    err = TTSError("Voice response is temporarily unavailable.")
    assert "temporarily unavailable" in str(err)


# ==============================================================================
# 5. Doctor Directory & Facility Integrations Verification
# ==============================================================================

def test_doctor_directory_tamil_doctors(client: TestClient):
    """Verify Tamil Nadu doctors exist in public Doctor Directory."""
    response = client.get("/api/v1/doctors")
    assert response.status_code == 200
    doctors = response.json()["data"]

    # Verify presence of Dr. Meenakshi Sundaram, Dr. S. Anbarasan, Dr. Priya Natarajan
    doctor_ids = {d["doctor_id"] for d in doctors}
    assert "DOC-10109" in doctor_ids
    assert "DOC-10110" in doctor_ids
    assert "DOC-10111" in doctor_ids

    # Verify Dr. Meenakshi details
    doc_meenakshi = next(d for d in doctors if d["doctor_id"] == "DOC-10109")
    assert "Dr. Meenakshi Sundaram" in doc_meenakshi["name"]
    assert doc_meenakshi["specialization"] == "Obstetrics & Gynecology"
    assert "ta" in doc_meenakshi["languages"]
    assert "CHC Maduranthakam" in doc_meenakshi["facility_name"]


def test_doctor_directory_search_by_tamil_language(client: TestClient):
    """Verify searching doctors by language code 'ta' returns Tamil speakers."""
    response = client.get("/api/v1/doctors?search=ta")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) >= 4
    tamil_doc_ids = {d["doctor_id"] for d in doctors if "ta" in d.get("languages", [])}
    assert "DOC-10108" in tamil_doc_ids
    assert "DOC-10109" in tamil_doc_ids
    assert "DOC-10110" in tamil_doc_ids
    assert "DOC-10111" in tamil_doc_ids


def test_doctor_directory_search_by_name(client: TestClient):
    """Verify searching doctor by Tamil name keyword."""
    response = client.get("/api/v1/doctors?search=Anbarasan")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) == 1
    assert doctors[0]["doctor_id"] == "DOC-10110"
    assert doctors[0]["specialization"] == "Pediatrics"


def test_facilities_route_with_tamil_seed(client: TestClient, db_session: Session):
    """Verify GET /api/v1/facilities returns Tamil Nadu facilities when filtered by district."""
    seed_demo_data(db_session)
    response = client.get("/api/v1/facilities?district=Chengalpattu")
    assert response.status_code == 200
    facilities = response.json()["data"]
    assert len(facilities) >= 3
    names = {f["name"] for f in facilities}
    assert "PHC Thirukazhukundram" in names
    assert "CHC Maduranthakam" in names
    assert "Mobile Medical Unit Chengalpattu" in names


def test_schemes_route_with_tamil_seed(client: TestClient, db_session: Session):
    """Verify GET /api/v1/schemes returns Tamil Nadu health schemes."""
    seed_demo_data(db_session)
    response = client.get("/api/v1/schemes?state=Tamil Nadu")
    assert response.status_code == 200
    schemes = response.json()["data"]
    assert len(schemes) >= 3
    names = {s["name"] for s in schemes}
    assert any("CMCHIS" in name for name in names)
    assert any("Muthulakshmi" in name or "MRMBS" in name for name in names)
    assert any("Makkalai Thedi Maruthuvam" in name for name in names)


def test_mobile_clinics_route_with_tamil_seed(client: TestClient, db_session: Session):
    """Verify GET /api/v1/mobile-clinics returns Tamil Nadu mobile outreach units."""
    seed_demo_data(db_session)
    response = client.get("/api/v1/mobile-clinics?district=Chengalpattu")
    assert response.status_code == 200
    clinics = response.json()["data"]
    assert len(clinics) >= 1
    assert any("Coastal & Tribal" in c["name"] for c in clinics)


def test_facility_availability_slots_for_tamil_facility(client: TestClient, db_session: Session):
    """Verify availability slots endpoint works for Tamil Nadu seeded facilities."""
    seed_demo_data(db_session)
    tn_phc = db_session.scalars(select(Facility).where(Facility.name == "PHC Thirukazhukundram")).first()
    assert tn_phc is not None
    response = client.get(f"/api/v1/facilities/{tn_phc.id}/availability")
    assert response.status_code == 200
    slots = response.json()["data"]
    assert len(slots) >= 1
