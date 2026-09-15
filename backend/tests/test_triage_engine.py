"""
tests/test_triage_engine.py
===========================
Comprehensive unit and integration tests for:
1. Centralized symptom normalization and free-text extraction
2. Multi-symptom extraction
3. Duration-aware decision support rules
4. Emergency red flag priority over duration rules
5. Unknown free-text safe fallback (GENERAL_OTHER)
6. Duration boundary handling (0, 1, 30, >30)
7. FastAPI POST /api/v1/triage endpoint integration
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ai.triage.normalization import (
    SymptomCategory,
    extract_symptoms_from_text,
    normalize_symptoms,
)
from ai.triage.triage import run_triage


# ==============================================================================
# 1. Symptom Normalization & Free-Text Extraction Tests
# ==============================================================================

def test_normalization_single_symptoms():
    assert normalize_symptoms(symptoms=["fever"]) == ["FEVER"]
    assert normalize_symptoms(description="fever for two days") == ["FEVER"]
    assert normalize_symptoms(description="head is aching") == ["HEADACHE"]
    assert normalize_symptoms(description="stomach ache") == ["STOMACH_PROBLEM"]
    assert normalize_symptoms(description="my knee hurts") == ["KNEE_PAIN"]
    assert normalize_symptoms(description="pain in my knee") == ["KNEE_PAIN"]
    assert normalize_symptoms(description="back is hurting") == ["BACK_PAIN"]
    assert normalize_symptoms(description="coughing") == ["COUGH"]
    assert normalize_symptoms(description="injured my leg") == ["INJURY"]


def test_normalization_multiple_symptoms():
    assert set(normalize_symptoms(description="fever and cough")) == {"FEVER", "COUGH"}
    assert set(normalize_symptoms(symptoms=["Fever", "Cough"])) == {"FEVER", "COUGH"}
    assert set(normalize_symptoms(description="headache and fever")) == {"HEADACHE", "FEVER"}
    assert set(normalize_symptoms(description="stomach pain and fever")) == {"STOMACH_PROBLEM", "FEVER"}
    assert set(normalize_symptoms(description="knee pain and fever")) == {"KNEE_PAIN", "FEVER"}


def test_normalization_unknown_free_text():
    result = normalize_symptoms(description="something feels unusual")
    assert result == ["GENERAL_OTHER"]


def test_normalization_empty_input():
    result = normalize_symptoms(symptoms=[], description="")
    assert result == []


# ==============================================================================
# 2. Duration-Aware Triage Rules Tests
# ==============================================================================

def test_triage_fever_duration_rules():
    # Fever 1 day -> needs attention
    res_1 = run_triage(symptoms=["Fever"], duration_days=1)
    assert res_1.urgency == "needs_attention"
    assert res_1.emergency is False

    # Fever 2 days -> needs attention with persistent fever reason
    res_2 = run_triage(symptoms=["Fever"], duration_days=2)
    assert res_2.urgency == "needs_attention"
    assert "2 days" in res_2.reason
    assert res_2.emergency is False

    # Fever 3 days -> needs attention with persistent fever reason
    res_3 = run_triage(symptoms=["Fever"], duration_days=3)
    assert res_3.urgency == "needs_attention"
    assert "3 days" in res_3.reason
    assert res_3.emergency is False


def test_triage_headache_duration_rules():
    # Headache 1 day -> routine
    res_1 = run_triage(symptoms=["Headache"], duration_days=1)
    assert res_1.urgency == "routine"
    assert res_1.emergency is False

    # Headache 2 days -> needs attention
    res_2 = run_triage(symptoms=["Headache"], duration_days=2)
    assert res_2.urgency == "needs_attention"
    assert "2 days" in res_2.reason


def test_triage_stomach_problem_duration_rules():
    # Stomach 1 day -> needs attention
    res_1 = run_triage(symptoms=["Stomach Problem"], duration_days=1)
    assert res_1.urgency == "needs_attention"

    # Stomach 2 days -> needs attention
    res_2 = run_triage(symptoms=["Stomach Problem"], duration_days=2)
    assert res_2.urgency == "needs_attention"
    assert "2 days" in res_2.reason


def test_triage_knee_pain_duration_rules():
    # Knee pain 1-2 days -> routine
    res_1 = run_triage(symptoms=["Knee Pain"], duration_days=1)
    assert res_1.urgency == "routine"

    res_2 = run_triage(symptoms=["Knee Pain"], duration_days=2)
    assert res_2.urgency == "routine"

    # Knee pain 3 days -> needs attention
    res_3 = run_triage(symptoms=["Knee Pain"], duration_days=3)
    assert res_3.urgency == "needs_attention"
    assert "3 days" in res_3.reason


def test_triage_back_pain_duration_rules():
    # Back pain 1-2 days -> routine
    res_1 = run_triage(symptoms=["Back Pain"], duration_days=1)
    assert res_1.urgency == "routine"

    # Back pain 3 days -> needs attention
    res_3 = run_triage(symptoms=["Back Pain"], duration_days=3)
    assert res_3.urgency == "needs_attention"
    assert "3 days" in res_3.reason


def test_triage_cough_duration_rules():
    # Cough 1-2 days -> routine
    res_1 = run_triage(symptoms=["Cough"], duration_days=1)
    assert res_1.urgency == "routine"

    # Cough 3 days -> needs attention
    res_3 = run_triage(symptoms=["Cough"], duration_days=3)
    assert res_3.urgency == "needs_attention"
    assert "3 days" in res_3.reason


def test_triage_injury_rules():
    # Injury -> needs attention
    res = run_triage(symptoms=["Injury"], duration_days=1)
    assert res.urgency == "needs_attention"
    assert res.emergency is False


# ==============================================================================
# 3. Emergency Priority Over Duration Rules Tests
# ==============================================================================

def test_emergency_overrides_fever_duration():
    # Emergency + fever + 5 days -> emergency
    res = run_triage(
        symptoms=["Fever"],
        description="I have difficulty breathing and chest pain",
        duration_days=5,
    )
    assert res.urgency == "emergency"
    assert res.emergency is True


def test_emergency_overrides_knee_pain_duration():
    # Emergency + knee pain + 7 days -> emergency
    res = run_triage(
        symptoms=["Knee Pain"],
        description="patient passed out and is unconscious",
        duration_days=7,
    )
    assert res.urgency == "emergency"
    assert res.emergency is True


def test_emergency_overrides_headache_duration():
    # Emergency + headache + 3 days -> emergency
    res = run_triage(
        symptoms=["Headache"],
        description="slurred speech and face drooping",
        duration_days=3,
    )
    assert res.urgency == "emergency"
    assert res.emergency is True


# ==============================================================================
# 4. Unknown Free-Text & General Fallback Tests
# ==============================================================================

def test_unknown_free_text_safe_triage():
    res = run_triage(symptoms=[], description="something feels unusual", duration_days=2)
    assert res.urgency == "routine"
    assert res.emergency is False
    assert "GENERAL_OTHER" in res.symptoms
    assert res.recommended_care == "Routine healthcare service"


# ==============================================================================
# 5. Duration Boundary Clamping Tests
# ==============================================================================

def test_duration_clamping():
    # 0 is clamped to minimum 1
    res_0 = run_triage(symptoms=["Headache"], duration_days=0)
    assert res_0.duration_days == 1

    # 1 is accepted
    res_1 = run_triage(symptoms=["Headache"], duration_days=1)
    assert res_1.duration_days == 1

    # 30 is accepted
    res_30 = run_triage(symptoms=["Headache"], duration_days=30)
    assert res_30.duration_days == 30

    # >30 is clamped to maximum 30
    res_50 = run_triage(symptoms=["Headache"], duration_days=50)
    assert res_50.duration_days == 30


# ==============================================================================
# 6. FastAPI POST /api/v1/triage Integration Tests
# ==============================================================================

def test_api_triage_duration_fever(client: TestClient):
    response = client.post(
        "/api/v1/triage",
        json={"symptoms": ["Fever"], "description": "", "duration_days": 2},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "needs_attention"
    assert data["duration_days"] == 2
    assert "FEVER" in data["symptoms"]
    assert "2 days" in data["reason"]


def test_api_triage_duration_knee_pain(client: TestClient):
    # 1 day -> routine
    res_1 = client.post(
        "/api/v1/triage",
        json={"symptoms": ["Knee Pain"], "description": "", "duration_days": 1},
    )
    assert res_1.status_code == 200
    assert res_1.json()["urgency"] == "routine"

    # 3 days -> needs_attention
    res_3 = client.post(
        "/api/v1/triage",
        json={"symptoms": ["Knee Pain"], "description": "", "duration_days": 3},
    )
    assert res_3.status_code == 200
    assert res_3.json()["urgency"] == "needs_attention"


def test_api_triage_free_text_multi_symptom(client: TestClient):
    response = client.post(
        "/api/v1/triage",
        json={"symptoms": [], "description": "fever and cough for 3 days", "duration_days": 3},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "needs_attention"
    assert set(data["symptoms"]) == {"FEVER", "COUGH"}


def test_api_triage_emergency_priority(client: TestClient):
    response = client.post(
        "/api/v1/triage",
        json={"symptoms": ["Fever"], "description": "severe chest pain and cannot breathe", "duration_days": 5},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["urgency"] == "emergency"
    assert data["emergency"] is True
