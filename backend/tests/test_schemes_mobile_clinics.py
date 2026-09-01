"""
tests/test_schemes_mobile_clinics.py
====================================
Comprehensive test suite for Government Healthcare Schemes and Mobile Medical Units.

Test Cases:
  SCHEMES:
    1. List schemes
    2. Get scheme by ID
    3. Scheme not found (404)
    4. Search schemes
    5. Filter schemes by state
    6. Relevant schemes endpoint
    7. Relevant schemes requires authentication (401)

  MOBILE CLINICS:
    8. List mobile clinics
    9. Get mobile clinic by ID
    10. Mobile clinic not found (404)
    11. Filter by district
    12. Distance calculation with coordinates
    13. No distance when coordinates unavailable

  DATABASE & SECURITY:
    14. Scheme persistence
    15. Mobile clinic persistence
    16. Public endpoints do not expose patient data
"""

from __future__ import annotations

import pytest

from backend.app.core.security import create_access_token
from backend.app.models.mobile_clinic import MobileClinic
from backend.app.models.patient import Patient
from backend.app.models.scheme import GovernmentScheme


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


@pytest.fixture()
def step8_test_setup(db_session):
    """Fixture providing schemes, mobile clinics, and patient."""
    # Patient in Solapur (Maharashtra)
    p = Patient(
        mobile="9876543210",
        full_name="Ramesh Kumar",
        district="Solapur",
        consent=True,
    )
    db_session.add(p)
    db_session.flush()

    # Schemes
    s1 = GovernmentScheme(
        name="PM-JAY National Health Protection (Demo)",
        short_description="Secondary & tertiary care coverage",
        description="Cashless hospitalisation coverage",
        eligibility="SECC-listed rural families",
        benefits="Up to Rs 5,00,000 per family per year",
        state="National",
        active=True,
    )
    s2 = GovernmentScheme(
        name="MJPJAY Maharashtra State Health Scheme (Demo)",
        short_description="Critical illness hospitalization",
        description="State health scheme for yellow/orange ration cardholders",
        eligibility="Yellow and orange ration card holders",
        benefits="Up to Rs 1,50,000 per family per year",
        state="Maharashtra",
        active=True,
    )
    s3 = GovernmentScheme(
        name="Rajasthan Chiranjeevi Yojana (Demo)",
        short_description="Rajasthan state universal health insurance",
        description="Universal health scheme in Rajasthan",
        state="Rajasthan",
        active=True,
    )
    db_session.add_all([s1, s2, s3])
    db_session.flush()

    # Mobile Clinics
    mc1 = MobileClinic(
        name="Solapur MMU 1",
        organization="District Health Society",
        district="Solapur",
        address="Malshiras Route Depot",
        latitude=17.8540,
        longitude=74.9080,
        service_area="Malshiras, Velapur",
        services="General checkup, blood tests",
        status="ACTIVE",
    )
    mc2 = MobileClinic(
        name="Pune Rural MMU",
        organization="Pune Health Department",
        district="Pune",
        address="Baramati Route",
        latitude=18.1500,
        longitude=74.5700,
        service_area="Baramati, Daund",
        services="Maternal and child checkups",
        status="ACTIVE",
    )
    db_session.add_all([mc1, mc2])
    db_session.commit()

    token = create_access_token(subject=str(p.id), role="PATIENT", extra_claims={"mobile": p.mobile})

    return {
        "p": p,
        "token": token,
        "s1": s1,
        "s2": s2,
        "s3": s3,
        "mc1": mc1,
        "mc2": mc2,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1-7. SCHEMES TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestSchemes:
    def test_list_schemes(self, client, step8_test_setup):
        res = client.get("/api/v1/schemes")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 3

    def test_get_scheme_by_id(self, client, step8_test_setup):
        s_id = step8_test_setup["s1"].id
        res = client.get(f"/api/v1/schemes/{s_id}")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["name"] == "PM-JAY National Health Protection (Demo)"
        assert body["data"]["state"] == "National"

    def test_scheme_not_found_returns_404(self, client):
        res = client.get("/api/v1/schemes/99999")
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)

    def test_search_schemes(self, client, step8_test_setup):
        res = client.get("/api/v1/schemes?search=PM-JAY")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1
        assert "PM-JAY" in body["data"][0]["name"]

    def test_filter_schemes_by_state(self, client, step8_test_setup):
        res = client.get("/api/v1/schemes?state=Rajasthan")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        states = {s["state"] for s in body["data"]}
        # Should include Rajasthan state or National schemes
        assert "Rajasthan" in states or "National" in states

    def test_relevant_schemes_endpoint(self, client, step8_test_setup):
        ctx = step8_test_setup
        res = client.get(
            "/api/v1/schemes/relevant",
            headers={"Authorization": f"Bearer {ctx['token']}"},
        )
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 1
        for s in body["data"]:
            assert s["relevance"] == "Potentially relevant"

    def test_relevant_schemes_requires_authentication(self, client, step8_test_setup):
        res = client.get("/api/v1/schemes/relevant")
        assert res.status_code == 401
        _assert_envelope(res.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 8-13. MOBILE CLINICS TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestMobileClinics:
    def test_list_mobile_clinics(self, client, step8_test_setup):
        res = client.get("/api/v1/mobile-clinics")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 2

    def test_get_mobile_clinic_by_id(self, client, step8_test_setup):
        mc_id = step8_test_setup["mc1"].id
        res = client.get(f"/api/v1/mobile-clinics/{mc_id}")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        assert body["data"]["name"] == "Solapur MMU 1"
        assert body["data"]["district"] == "Solapur"

    def test_mobile_clinic_not_found_returns_404(self, client):
        res = client.get("/api/v1/mobile-clinics/99999")
        assert res.status_code == 404
        _assert_envelope(res.json(), success=False)

    def test_filter_mobile_clinics_by_district(self, client, step8_test_setup):
        res = client.get("/api/v1/mobile-clinics?district=Solapur")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        for c in body["data"]:
            assert c["district"].lower() == "solapur"

    def test_distance_calculation_with_coordinates(self, client, step8_test_setup):
        # Patient near Malshiras: (17.8500, 74.9000)
        res = client.get("/api/v1/mobile-clinics?lat=17.8500&lon=74.9000")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        first = body["data"][0]
        assert "distance_km" in first
        assert first["distance_km"] is not None
        assert isinstance(first["distance_km"], (int, float))
        assert first["name"] == "Solapur MMU 1"
        assert first["distance_km"] < 5.0

    def test_no_distance_when_coordinates_unavailable(self, client, step8_test_setup):
        res = client.get("/api/v1/mobile-clinics")
        assert res.status_code == 200
        body = res.json()
        _assert_envelope(body, success=True)
        for c in body["data"]:
            assert c["distance_km"] is None


# ──────────────────────────────────────────────────────────────────────────────
# 14-16. DATABASE & SECURITY TESTS
# ──────────────────────────────────────────────────────────────────────────────

class TestDatabaseAndSecurity:
    def test_scheme_persists_in_database(self, db_session):
        scheme = GovernmentScheme(
            name="Free Dialysis Scheme (Demo)",
            short_description="Subsidized dialysis care",
            state="National",
            active=True,
        )
        db_session.add(scheme)
        db_session.commit()
        db_session.refresh(scheme)
        assert scheme.id is not None
        assert scheme.name == "Free Dialysis Scheme (Demo)"

    def test_mobile_clinic_persists_in_database(self, db_session):
        clinic = MobileClinic(
            name="Karmala Mobile Van",
            district="Solapur",
            status="ACTIVE",
        )
        db_session.add(clinic)
        db_session.commit()
        db_session.refresh(clinic)
        assert clinic.id is not None
        assert clinic.name == "Karmala Mobile Van"

    def test_public_endpoints_do_not_expose_patient_data(self, client, step8_test_setup):
        # 1. /schemes
        schemes_res = client.get("/api/v1/schemes").json()
        for item in schemes_res["data"]:
            assert "patient_id" not in item
            assert "mobile" not in item

        # 2. /mobile-clinics
        clinics_res = client.get("/api/v1/mobile-clinics").json()
        for item in clinics_res["data"]:
            assert "patient_id" not in item
            assert "mobile" not in item
