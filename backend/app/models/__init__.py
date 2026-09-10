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
from backend.app.models.hospital_queue import HospitalQueue
from backend.app.models.facility_equipment import FacilityEquipment
from backend.app.models.doctor import Doctor
from backend.app.models.worker import Worker
from backend.app.models.screening import Screening
from backend.app.models.consultation import Consultation
from backend.app.models.voice_encounter import VoiceEncounter

__all__ = [
    "Appointment",
    "AvailabilitySlot",
    "Consultation",
    "Doctor",
    "Facility",
    "FacilityService",
    "FacilityEquipment",
    "FollowUp",
    "GovernmentScheme",
    "HealthJourneyEvent",
    "MobileClinic",
    "OTPRecord",
    "Patient",
    "Referral",
    "HospitalQueue",
    "Worker",
    "Screening",
    "VoiceEncounter",
]




