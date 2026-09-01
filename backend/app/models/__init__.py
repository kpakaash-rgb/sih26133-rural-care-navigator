"""
models/__init__.py
==================
Rural Care Navigator — ORM Models package.

All ORM model classes are imported here so that SQLAlchemy's metadata is aware
of them before create_all() is called at startup.
"""

from backend.app.models.appointment import Appointment
from backend.app.models.availability import AvailabilitySlot
from backend.app.models.facility import Facility, FacilityService
from backend.app.models.follow_up import FollowUp
from backend.app.models.health_journey import HealthJourneyEvent
from backend.app.models.mobile_clinic import MobileClinic
from backend.app.models.otp import OTPRecord
from backend.app.models.patient import Patient
from backend.app.models.referral import Referral
from backend.app.models.scheme import GovernmentScheme

__all__ = [
    "Appointment",
    "AvailabilitySlot",
    "Facility",
    "FacilityService",
    "FollowUp",
    "GovernmentScheme",
    "HealthJourneyEvent",
    "MobileClinic",
    "OTPRecord",
    "Patient",
    "Referral",
]





