"""
repositories/__init__.py
========================
Rural Care Navigator — Repository package.
"""

from backend.app.repositories.appointment_repository import AppointmentRepository
from backend.app.repositories.availability_repository import AvailabilityRepository
from backend.app.repositories.base import BaseRepository
from backend.app.repositories.facility_repository import FacilityRepository
from backend.app.repositories.follow_up_repository import FollowUpRepository
from backend.app.repositories.health_journey_repository import HealthJourneyRepository
from backend.app.repositories.mobile_clinic_repository import MobileClinicRepository
from backend.app.repositories.otp_repository import OTPRepository
from backend.app.repositories.patient_repository import PatientRepository
from backend.app.repositories.referral_repository import ReferralRepository
from backend.app.repositories.scheme_repository import SchemeRepository
from backend.app.repositories.consultation_repository import ConsultationRepository
from backend.app.repositories.doctor_repository import DoctorRepository
from backend.app.repositories.worker_repository import WorkerRepository
from backend.app.repositories.screening_repository import ScreeningRepository
from backend.app.repositories.voice_encounter_repository import VoiceEncounterRepository

__all__ = [
    "AppointmentRepository",
    "AvailabilityRepository",
    "BaseRepository",
    "ConsultationRepository",
    "DoctorRepository",
    "FacilityRepository",
    "FollowUpRepository",
    "HealthJourneyRepository",
    "MobileClinicRepository",
    "OTPRepository",
    "PatientRepository",
    "ReferralRepository",
    "SchemeRepository",
    "ScreeningRepository",
    "WorkerRepository",
    "VoiceEncounterRepository",
]





