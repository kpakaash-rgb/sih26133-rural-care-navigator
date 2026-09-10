"""
backend/app/dependencies.py
===========================
Dependency injection providers for FastAPI application routes and test suites.
"""

from typing import Generator
from fastapi import Depends
from sqlalchemy.orm import Session

from backend.app.database.connection import get_db
from backend.app.services.consultation_service import ConsultationService
from backend.app.api.v1.routes.doctor import get_consultation_service

__all__ = ["get_consultation_service"]
