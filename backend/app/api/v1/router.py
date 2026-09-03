"""
api/v1/router.py
================
API v1 top-level router.

All feature routers for version 1 are registered here.
Adding a new feature module requires only one include_router() call here.

Registered routers:
  /health   — Health & ping endpoints (no auth required)

Future routers (add as phases are implemented):
  /auth         — OTP request, OTP verify, token refresh
  /patients     — Patient CRUD
  /navigation   — AI-powered care navigation
  /appointments — Appointment booking and management
  /referrals    — Referral creation and tracking
  /schemes      — Government scheme discovery
  /journey      — Patient care journey logs
"""

from __future__ import annotations

from fastapi import APIRouter

from backend.app.api.v1.routes.appointments import router as appointments_router
from backend.app.api.v1.routes.auth import router as auth_router
from backend.app.api.v1.routes.facilities import router as facilities_router
from backend.app.api.v1.routes.follow_ups import router as follow_ups_router
from backend.app.api.v1.routes.health import router as health_router
from backend.app.api.v1.routes.health_journey import router as health_journey_router
from backend.app.api.v1.routes.mobile_clinics import router as mobile_clinics_router
from backend.app.api.v1.routes.referrals import router as referrals_router
from backend.app.api.v1.routes.schemes import router as schemes_router
from backend.app.api.v1.routes.triage import router as triage_router
from backend.app.api.v1.routes.hospital_recommendation import (
    router as hospital_recommendation_router,
)
api_v1_router = APIRouter(prefix="/api/v1")

# ──────────────────────────────────────────────────────────────────────────────
# Registered Routers
# ──────────────────────────────────────────────────────────────────────────────
api_v1_router.include_router(health_router)
api_v1_router.include_router(auth_router)
api_v1_router.include_router(facilities_router)
api_v1_router.include_router(appointments_router)
api_v1_router.include_router(referrals_router)
api_v1_router.include_router(health_journey_router)
api_v1_router.include_router(follow_ups_router)
api_v1_router.include_router(schemes_router)
api_v1_router.include_router(mobile_clinics_router)
api_v1_router.include_router(triage_router)
api_v1_router.include_router(hospital_recommendation_router)





