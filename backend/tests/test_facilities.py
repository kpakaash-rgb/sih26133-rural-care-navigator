"""
tests/test_facilities.py
========================
Comprehensive test suite for Healthcare Facilities, Services, and Availability Time Slots.

Test Cases:
  FACILITIES:
    1. List facilities
    2. Get facility by ID
    3. Facility not found (404)
    4. Filter by district
    5. Filter by type

  SERVICES:
    6. Get facility services
    7. Invalid facility service request (404)

  AVAILABILITY:
    8. Get availability
    9. Filter availability by date
    10. Filter availability by service
    11. Invalid facility for availability (404)
    12. Invalid service for availability (404)
    13. Invalid date format for availability (422)

  DATABASE & INTEGRITY:
    14. Confirm facility data persists in PostgreSQL (SQLAlchemy ORM)
    15. Confirm services are linked to facilities
    16. Confirm availability is linked correctly

  DISTANCE:
    17. Distance calculation when user coordinates are provided
"""

from __future__ import annotations

import pytest

from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert standard API envelope contract."""
    assert "success" in response_json, "Response missing 'success'"
    assert "data" in response_json, "Response missing 'data'"
    assert "message" in response_json, "Response missing 'message'"
    assert "timestamp" in response_json, "Response missing 'timestamp'"
    assert response_json["success"] == success, f"Expected success={success}"


@pytest.fixture()
def seeded_facilities(db_session):
    """Fixture to insert well-defined test facilities and services into the test DB."""
    # Facility 1: PHC Malshiras
    phc = Facility(
        name="PHC Malshiras",
        type="PRIMARY_HEALTH_CENTRE",
        address="Main Road, Malshiras Village",
        district="Solapur",
        latitude=17.8543,
        longitude=74.9082,
        status="ACTIVE",
    )
    db_session.add(phc)
    db_session.flush()

    s1 = FacilityService(
        facility_id=phc.id,
        name="General Medicine",
        description="Primary outpatient consultation",
        available=True,
    )
    s2 = FacilityService(
        facility_id=phc.id,
        name="Basic Tests",
        description="Blood pressure, blood sugar",
        available=True,
    )
    db_session.add_all([s1, s2])
    db_session.flush()

    # Slot for PHC
    slot1 = AvailabilitySlot(
        facility_id=phc.id,
        service_id=s1.id,
        date="2026-09-02",
        start_time="10:00",
        end_time="10:30",
        status="AVAILABLE",
    )
    slot2 = AvailabilitySlot(
        facility_id=phc.id,
        service_id=s2.id,
        date="2026-09-02",
        start_time="10:30",
        end_time="11:00",
        status="AVAILABLE",
    )
    slot3 = AvailabilitySlot(
        facility_id=phc.id,
        service_id=s1.id,
        date="2026-09-03",
        start_time="14:00",
        end_time="14:30",
        status="BOOKED",
    )
    db_session.add_all([slot1, slot2, slot3])

    # Facility 2: District Hospital Solapur
    dh = Facility(
        name="District Hospital Solapur",
        type="DISTRICT_HOSPITAL",
        address="Civil Lines, Solapur City",
        district="Solapur",
        latitude=17.6599,
        longitude=75.9064,
        status="ACTIVE",
    )
    db_session.add(dh)
    db_session.flush()

    s3 = FacilityService(
        facility_id=dh.id,
        name="Advanced Tests",
        description="CT Scan, MRI, Ultrasound",
        available=True,
    )
    db_session.add(s3)

    # Facility 3: PHC Baramati (Pune district)
    baramati = Facility(
        name="PHC Baramati",
        type="PRIMARY_HEALTH_CENTRE",
        address="Baramati Rural Road",
        district="Pune",
        latitude=18.1519,
        longitude=74.5772,
        status="ACTIVE",
    )
    db_session.add(baramati)

    db_session.commit()

    return {
        "phc": phc,
        "s1": s1,
        "s2": s2,
        "dh": dh,
        "s3": s3,
        "baramati": baramati,
    }


# ──────────────────────────────────────────────────────────────────────────────
# 1-5. Facilities Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFacilitiesEndpoints:
    def test_list_facilities_returns_all_active(self, client, seeded_facilities):
        response = client.get("/api/v1/facilities")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 3
        names = [f["name"] for f in body["data"]]
        assert "PHC Malshiras" in names
        assert "District Hospital Solapur" in names

    def test_get_facility_by_id(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert body["data"]["id"] == fac_id
        assert body["data"]["name"] == "PHC Malshiras"
        assert body["data"]["type"] == "PRIMARY_HEALTH_CENTRE"
        assert len(body["data"]["services"]) >= 2

    def test_facility_not_found_returns_404(self, client):
        response = client.get("/api/v1/facilities/99999")
        assert response.status_code == 404
        body = response.json()
        _assert_envelope(body, success=False)
        assert "not found" in body["message"].lower()

    def test_filter_facilities_by_district(self, client, seeded_facilities):
        response = client.get("/api/v1/facilities?district=Pune")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        for f in body["data"]:
            assert f["district"].lower() == "pune"

    def test_filter_facilities_by_type(self, client, seeded_facilities):
        response = client.get("/api/v1/facilities?type=DISTRICT_HOSPITAL")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        for f in body["data"]:
            assert f["type"] == "DISTRICT_HOSPITAL"


# ──────────────────────────────────────────────────────────────────────────────
# 6-7. Services Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestFacilityServicesEndpoints:
    def test_get_facility_services(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/services")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) >= 2
        service_names = [s["name"] for s in body["data"]]
        assert "General Medicine" in service_names
        assert "Basic Tests" in service_names

    def test_get_services_for_invalid_facility_returns_404(self, client):
        response = client.get("/api/v1/facilities/99999/services")
        assert response.status_code == 404
        body = response.json()
        _assert_envelope(body, success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 8-13. Availability Tests
# ──────────────────────────────────────────────────────────────────────────────

class TestAvailabilityEndpoints:
    def test_get_availability_slots(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/availability")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) == 3

    def test_filter_availability_by_date(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/availability?date=2026-09-02")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) == 2
        for slot in body["data"]:
            assert slot["date"] == "2026-09-02"

    def test_filter_availability_by_service(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        s1_id = seeded_facilities["s1"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/availability?service_id={s1_id}")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)
        assert len(body["data"]) == 2
        for slot in body["data"]:
            assert slot["service_id"] == s1_id

    def test_availability_invalid_facility_returns_404(self, client):
        response = client.get("/api/v1/facilities/99999/availability")
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)

    def test_availability_invalid_service_returns_404(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/availability?service_id=99999")
        assert response.status_code == 404
        _assert_envelope(response.json(), success=False)

    def test_availability_invalid_date_format_returns_422(self, client, seeded_facilities):
        fac_id = seeded_facilities["phc"].id
        response = client.get(f"/api/v1/facilities/{fac_id}/availability?date=invalid-date")
        assert response.status_code == 422
        _assert_envelope(response.json(), success=False)


# ──────────────────────────────────────────────────────────────────────────────
# 14-16. Database & Relationship Integrity
# ──────────────────────────────────────────────────────────────────────────────

class TestDatabasePersistenceAndRelationships:
    def test_facility_persists_in_database(self, db_session):
        facility = Facility(
            name="Rural Sub-Centre Natepute",
            type="SUB_CENTRE",
            address="Natepute Road",
            district="Solapur",
            latitude=17.9000,
            longitude=75.0000,
            status="ACTIVE",
        )
        db_session.add(facility)
        db_session.commit()
        db_session.refresh(facility)
        assert facility.id is not None

    def test_services_are_linked_to_facility(self, db_session):
        facility = Facility(
            name="CHC Pandharpur Test",
            type="COMMUNITY_HEALTH_CENTRE",
            address="Temple Road",
            district="Solapur",
            status="ACTIVE",
        )
        db_session.add(facility)
        db_session.flush()

        s = FacilityService(
            facility_id=facility.id,
            name="Pediatrics",
            description="Child health clinic",
            available=True,
        )
        db_session.add(s)
        db_session.commit()
        db_session.refresh(facility)

        assert len(facility.services) == 1
        assert facility.services[0].name == "Pediatrics"

    def test_availability_is_linked_to_facility_and_service(self, db_session):
        facility = Facility(
            name="PHC Link Test",
            type="PRIMARY_HEALTH_CENTRE",
            address="Link Road",
            district="Solapur",
            status="ACTIVE",
        )
        db_session.add(facility)
        db_session.flush()

        service = FacilityService(
            facility_id=facility.id,
            name="Immunization",
            available=True,
        )
        db_session.add(service)
        db_session.flush()

        slot = AvailabilitySlot(
            facility_id=facility.id,
            service_id=service.id,
            date="2026-09-05",
            start_time="09:00",
            end_time="09:30",
            status="AVAILABLE",
        )
        db_session.add(slot)
        db_session.commit()
        db_session.refresh(slot)

        assert slot.facility.name == "PHC Link Test"
        assert slot.service.name == "Immunization"


# ──────────────────────────────────────────────────────────────────────────────
# 17. Distance Calculation
# ──────────────────────────────────────────────────────────────────────────────

class TestDistanceCalculation:
    def test_distance_is_calculated_when_coordinates_provided(self, client, seeded_facilities):
        # Patient near Malshiras (17.8500, 74.9000)
        response = client.get("/api/v1/facilities?lat=17.8500&lon=74.9000")
        assert response.status_code == 200
        body = response.json()
        _assert_envelope(body, success=True)

        first_fac = body["data"][0]
        assert "distance_km" in first_fac
        assert first_fac["distance_km"] is not None
        assert isinstance(first_fac["distance_km"], (int, float))
        # Nearest facility should be PHC Malshiras (~1 km away)
        assert first_fac["name"] == "PHC Malshiras"
        assert first_fac["distance_km"] < 5.0

    def test_distance_is_none_when_coordinates_not_provided(self, client, seeded_facilities):
        response = client.get("/api/v1/facilities")
        assert response.status_code == 200
        body = response.json()
        assert body["data"][0]["distance_km"] is None
