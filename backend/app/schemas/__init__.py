"""
schemas/__init__.py
===================
Rural Care Navigator — Pydantic Request/Response schemas.
"""

from backend.app.schemas.appointment import (
    AppointmentCreate,
    AppointmentFacilityInfo,
    AppointmentResponse,
    AppointmentServiceInfo,
)
from backend.app.schemas.auth import (
    AuthenticatedPatient,
    AuthTokenResponse,
    OTPRequest,
    OTPRequestResponse,
    OTPVerifyRequest,
)
from backend.app.schemas.facility import (
    AvailabilitySlotResponse,
    FacilityResponse,
    FacilityServiceResponse,
)
from backend.app.schemas.follow_up import (
    FollowUpCreate,
    FollowUpResponse,
)
from backend.app.schemas.health_journey import (
    HealthJourneyEventResponse,
)
from backend.app.schemas.mobile_clinic import (
    MobileClinicResponse,
)
from backend.app.schemas.referral import (
    ReferralCreate,
    ReferralFacilityInfo,
    ReferralResponse,
)
from backend.app.schemas.scheme import (
    GovernmentSchemeResponse,
    RelevantSchemeResponse,
)
from backend.app.schemas.consultation import (
    ConsultationCreate,
    ConsultationResponse,
)

__all__ = [
    "AppointmentCreate",
    "AppointmentFacilityInfo",
    "AppointmentResponse",
    "AppointmentServiceInfo",
    "AuthenticatedPatient",
    "AuthTokenResponse",
    "AvailabilitySlotResponse",
    "ConsultationCreate",
    "ConsultationResponse",
    "FacilityResponse",
    "FacilityServiceResponse",
    "FollowUpCreate",
    "FollowUpResponse",
    "GovernmentSchemeResponse",
    "HealthJourneyEventResponse",
    "MobileClinicResponse",
    "OTPRequest",
    "OTPRequestResponse",
    "OTPVerifyRequest",
    "ReferralCreate",
    "ReferralFacilityInfo",
    "ReferralResponse",
    "RelevantSchemeResponse",
]





