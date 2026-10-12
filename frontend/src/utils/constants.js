export const SCREENS = {
  WELCOME: 'welcome',
  LOGIN: 'login',
  REGISTRATION: 'registration',
  ONBOARDING: 'onboarding',
  HOME: 'home',
  SYMPTOMS: 'symptoms',
  CARE_GUIDANCE: 'care_guidance',
  HEALTHCARE: 'healthcare',
  FACILITY_DETAILS: 'facility_details',
  AVAILABILITY: 'availability',
  BOOKING: 'booking',
  APPOINTMENT_CONFIRMED: 'appointment_confirmed',
  APPOINTMENTS: 'appointments',
  REFERRAL: 'referral',
  TRACK_REFERRAL: 'track_referral',
  HEALTH_JOURNEY: 'health_journey',
  FOLLOW_UP: 'follow_up',
  SCHEMES: 'schemes',
  SCHEME_DETAILS: 'scheme_details',
  MOBILE_CLINIC: 'mobile_clinic',
  ABHA: 'abha',
  EMERGENCY_FIRST_AID: 'emergency_first_aid',
  DOCTORS: 'doctors',
}

export const SCREEN_TITLES = {
  [SCREENS.WELCOME]: 'Nalam Connect',
  [SCREENS.LOGIN]: 'Patient Login',
  [SCREENS.REGISTRATION]: 'Patient Registration',
  [SCREENS.ONBOARDING]: 'Complete Your Profile',
  [SCREENS.HOME]: 'Nalam Connect',
  [SCREENS.SYMPTOMS]: 'Check Symptoms',
  [SCREENS.CARE_GUIDANCE]: 'Care Guidance',
  [SCREENS.HEALTHCARE]: 'Nearby Healthcare',
  [SCREENS.FACILITY_DETAILS]: 'Facility Details',
  [SCREENS.AVAILABILITY]: 'Doctor Availability',
  [SCREENS.BOOKING]: 'Book Appointment',
  [SCREENS.APPOINTMENT_CONFIRMED]: 'Booking Confirmed',
  [SCREENS.APPOINTMENTS]: 'My Appointments',
  [SCREENS.REFERRAL]: 'Care Referral',
  [SCREENS.TRACK_REFERRAL]: 'Track Referral Status',
  [SCREENS.HEALTH_JOURNEY]: 'My Health Journey',
  [SCREENS.FOLLOW_UP]: 'Care Follow-up',
  [SCREENS.SCHEMES]: 'Government Schemes',
  [SCREENS.SCHEME_DETAILS]: 'Scheme Details',
  [SCREENS.MOBILE_CLINIC]: 'Mobile Clinic Schedule',
  [SCREENS.ABHA]: 'ABHA Health Card',
  [SCREENS.EMERGENCY_FIRST_AID]: 'Emergency First Aid Guide',
  [SCREENS.DOCTORS]: 'Doctor Directory',
}

export const BOTTOM_NAV_ITEMS = [
  { id: SCREENS.HOME, label: 'Home', icon: '🏠' },
  { id: 'services', label: 'Services', icon: '💼' },
  { id: 'journey', label: 'Journey', icon: '📈' },
  { id: 'profile', label: 'Profile', icon: '👤' },
]

/**
 * Determines whether a patient profile has all essential demographic details.
 * A complete profile requires at minimum a valid full name and district/village location.
 *
 * @param {object|null} patient - Patient profile object
 * @returns {boolean} True if profile is complete, false otherwise
 */
export function isProfileComplete(patient) {
  if (!patient || typeof patient !== 'object') return false
  if (typeof patient.is_profile_complete === 'boolean') {
    return patient.is_profile_complete
  }
  const hasName = typeof patient.full_name === 'string' && patient.full_name.trim().length >= 2
  const hasLocation = Boolean(
    (typeof patient.district === 'string' && patient.district.trim().length > 0) ||
    (typeof patient.village === 'string' && patient.village.trim().length > 0)
  )
  return Boolean(hasName && hasLocation)
}

