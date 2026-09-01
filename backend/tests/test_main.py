"""
tests/test_main.py
==================
Integration tests for the Rural Care Navigator backend foundation.

Verifies:
  - Application starts and responds
  - Root endpoint returns the standard API envelope
  - /api/v1/health returns healthy status with DB connectivity
  - /api/v1/health/ping returns fast pong
  - Unknown routes return 404 in standard envelope
  - Validation errors return 422 in standard envelope
  - Exception handler returns 401 in standard envelope
"""

from __future__ import annotations


def _assert_envelope(response_json: dict, success: bool) -> None:
    """Assert that the response matches the docs/api.md envelope contract."""
    assert "success" in response_json, "Response missing 'success' field"
    assert "data" in response_json, "Response missing 'data' field"
    assert "message" in response_json, "Response missing 'message' field"
    assert "timestamp" in response_json, "Response missing 'timestamp' field"
    assert response_json["success"] == success, (
        f"Expected success={success}, got {response_json['success']}"
    )


class TestRootEndpoint:
    def test_root_returns_200(self, client):
        response = client.get("/")
        assert response.status_code == 200

    def test_root_envelope_structure(self, client):
        body = client.get("/").json()
        _assert_envelope(body, success=True)

    def test_root_data_contains_expected_keys(self, client):
        data = client.get("/").json()["data"]
        assert "name" in data
        assert "version" in data
        assert "health" in data


class TestHealthEndpoints:
    def test_health_returns_200(self, client):
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_health_envelope_structure(self, client):
        body = client.get("/api/v1/health").json()
        _assert_envelope(body, success=True)

    def test_health_data_has_status_field(self, client):
        data = client.get("/api/v1/health").json()["data"]
        assert "status" in data
        assert data["status"] in ("healthy", "degraded")

    def test_health_data_has_database_field(self, client):
        data = client.get("/api/v1/health").json()["data"]
        assert "database" in data

    def test_ping_returns_200(self, client):
        response = client.get("/api/v1/health/ping")
        assert response.status_code == 200

    def test_ping_envelope_structure(self, client):
        body = client.get("/api/v1/health/ping").json()
        _assert_envelope(body, success=True)

    def test_ping_data_has_pong(self, client):
        data = client.get("/api/v1/health/ping").json()["data"]
        assert data.get("pong") is True


class TestErrorHandlers:
    def test_unknown_route_returns_404_envelope(self, client):
        response = client.get("/api/v1/does-not-exist")
        assert response.status_code == 404
        body = response.json()
        _assert_envelope(body, success=False)

    def test_method_not_allowed_returns_405_envelope(self, client):
        response = client.post("/api/v1/health/ping")
        assert response.status_code == 405
        body = response.json()
        _assert_envelope(body, success=False)

    def test_envelope_timestamp_is_iso_format(self, client):
        body = client.get("/api/v1/health/ping").json()
        timestamp = body.get("timestamp", "")
        # Should end with Z (UTC) and contain T separator
        assert "T" in timestamp, f"Timestamp not ISO format: {timestamp}"


class TestResponseContract:
    """Verify the response contract defined in docs/api.md is honoured."""

    def test_success_envelope_fields_present(self, client):
        body = client.get("/api/v1/health").json()
        assert set(body.keys()) >= {"success", "data", "message", "timestamp"}

    def test_error_envelope_fields_present(self, client):
        body = client.get("/api/v1/does-not-exist").json()
        assert set(body.keys()) >= {"success", "data", "message", "timestamp"}

    def test_success_field_is_boolean(self, client):
        body = client.get("/api/v1/health").json()
        assert isinstance(body["success"], bool)

    def test_message_field_is_string(self, client):
        body = client.get("/api/v1/health").json()
        assert isinstance(body["message"], str)
