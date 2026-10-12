"""
backend/tests/test_doctor_directory.py
======================================
Automated test suite for Phase 4 Doctor Directory endpoints:
- GET /api/v1/doctors (discovery, filters, free-text search)
- GET /api/v1/doctors/{doctor_id} (profile details & 404 handling)
- GET /api/v1/facilities/{facility_id}/doctors (facility-linked medical officers)
"""

from fastapi.testclient import TestClient


def test_list_all_doctors(client: TestClient):
    response = client.get("/api/v1/doctors")
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    doctors = payload["data"]
    assert isinstance(doctors, list)
    assert len(doctors) >= 8
    # Verify core fields
    first = doctors[0]
    assert "doctor_id" in first
    assert "name" in first
    assert "specialization" in first
    assert "facility_name" in first
    assert "languages" in first
    assert "opd_timings" in first
    assert "opd_room" in first


def test_filter_doctors_by_specialization(client: TestClient):
    response = client.get("/api/v1/doctors?specialization=Pediatrics")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) >= 1
    for doc in doctors:
        assert "pediatrics" in doc["specialization"].lower()


def test_filter_doctors_by_facility_id(client: TestClient):
    response = client.get("/api/v1/doctors?facility_id=1")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) >= 1
    for doc in doctors:
        assert doc["facility_id"] == 1
        assert "Thirukazhukundram" in doc["facility_name"]


def test_search_doctors_by_name(client: TestClient):
    response = client.get("/api/v1/doctors?search=Karthik")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) == 1
    assert "Karthik" in doctors[0]["name"]
    assert doctors[0]["doctor_id"] == "DOC-10101"


def test_search_doctors_by_room_or_language(client: TestClient):
    # Tamil language speaker search
    response = client.get("/api/v1/doctors?search=ta")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert any("ta" in doc["languages"] for doc in doctors)


def test_get_doctor_details_by_numeric_id(client: TestClient):
    response = client.get("/api/v1/doctors/1")
    assert response.status_code == 200
    doc = response.json()["data"]
    assert doc["id"] == 1
    assert doc["doctor_id"] == "DOC-10101"
    assert "Dr. R. Karthik" in doc["name"]


def test_get_doctor_details_by_code(client: TestClient):
    response = client.get("/api/v1/doctors/DOC-10102")
    assert response.status_code == 200
    doc = response.json()["data"]
    assert doc["doctor_id"] == "DOC-10102"
    assert "Ananya Sundaram" in doc["name"]
    assert doc["specialization"] == "Pediatrics"


def test_get_doctor_details_not_found(client: TestClient):
    response = client.get("/api/v1/doctors/DOC-99999")
    assert response.status_code == 404
    assert response.json()["success"] is False


def test_get_facility_doctors_endpoint(client: TestClient):
    response = client.get("/api/v1/facilities/1/doctors")
    assert response.status_code == 200
    doctors = response.json()["data"]
    assert len(doctors) >= 1
    assert all(doc["facility_id"] == 1 for doc in doctors)
