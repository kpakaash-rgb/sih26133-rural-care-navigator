"""
tests/conftest.py
=================
Pytest fixtures for the Rural Care Navigator backend tests.

Fixtures:
  client      — TestClient with in-memory SQLite (isolated per test session)
  db_session  — SQLAlchemy session scoped to each test (auto-rollback)
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from backend.app.database.base import Base
from backend.app.database.connection import get_db
from backend.app.main import app

# ──────────────────────────────────────────────────────────────────────────────
# In-memory SQLite test database (isolated from development DB)
# ──────────────────────────────────────────────────────────────────────────────

from sqlalchemy.pool import StaticPool

TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

# Enable WAL mode for the in-memory test DB as well
@event.listens_for(test_engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.close()

TestSessionLocal = sessionmaker(
    bind=test_engine,
    autocommit=False,
    autoflush=False,
)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all tables in the in-memory test database once per test session."""
    Base.metadata.create_all(bind=test_engine)
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture()
def db_session():
    """
    Provide an isolated SQLAlchemy session for each test.
    All changes are rolled back after the test completes.
    """
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestSessionLocal(bind=connection)

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session, monkeypatch):
    """
    Provide a FastAPI TestClient with the test database session injected.

    The real get_db dependency is overridden to use the test session,
    ensuring all API requests in tests use the isolated in-memory database.
    """
    from backend.app.database import connection as db_conn
    from backend.app.database import seed_data as db_seed

    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # Rollback is handled by db_session fixture

    def override_check_db_connection():
        return True

    def override_create_all_tables():
        Base.metadata.create_all(bind=test_engine)

    def override_seed_demo_data(db):
        pass

    monkeypatch.setattr(db_conn, "check_db_connection", override_check_db_connection)
    monkeypatch.setattr(db_conn, "create_all_tables", override_create_all_tables)
    monkeypatch.setattr(db_seed, "seed_demo_data", override_seed_demo_data)

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client

    app.dependency_overrides.clear()



