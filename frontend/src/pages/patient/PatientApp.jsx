import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Welcome,
  Login,
  Onboarding,
  Home,
  Symptoms,
  CareGuidance,
  Healthcare,
  FacilityDetails,
  Availability,
  Booking,
  AppointmentConfirmed,
  Appointments,
  ReferralCreated,
  HealthJourney,
  TrackReferral,
  FollowUp,
  Schemes,
  SchemeDetails,
  MobileClinic,
  Abha,
  EmergencyFirstAid,
  Doctors,
} from './index'


import { SCREENS, isProfileComplete } from '../../utils/constants'
import { getMe, clearPatientSession } from '../../services/api'
import '../../App.css'

export default function PatientApp() {
  const navigate = useNavigate()
  const [currentScreen, setCurrentScreen] = useState(() => {
    const token = localStorage.getItem('access_token')
    if (!token) return SCREENS.WELCOME
    try {
      const cached = localStorage.getItem('patient')
      const p = cached ? JSON.parse(cached) : null
      if (p && !isProfileComplete(p)) {
        return SCREENS.ONBOARDING
      }
    } catch {
      // fallback
    }
    return SCREENS.HOME
  })

  const [patient, setPatient] = useState(() => {
    try {
      const cached = localStorage.getItem('patient')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  const [registrationData, setRegistrationData] = useState(null)
  const [loginData, setLoginData] = useState(null)

  // Verify and refresh patient profile when active session token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      getMe()
        .then((data) => {
          if (data) {
            setPatient(data)
            localStorage.setItem('patient', JSON.stringify(data))
            if (!isProfileComplete(data)) {
              setRegistrationData((prev) => ({
                ...prev,
                mobile: data.mobile,
                patient: data,
                draft: {
                  fullName: data.full_name || '',
                  age: data.age || '',
                  gender: data.gender || '',
                  village: data.village || '',
                  district: data.district || '',
                  preferredLang: data.preferred_language || 'en',
                  emergencyContact: data.emergency_contact || '',
                },
              }))
              setCurrentScreen(SCREENS.ONBOARDING)
            }
          }
        })
        .catch((err) => {
          if (err.status === 401) {
            clearPatientSession()
            setPatient(null)
            setCurrentScreen(SCREENS.WELCOME)
          }
        })
    }
  }, [])

  const initialTriageState = {
    urgency: null,
    recommended_care: null,
    reason: null,
    emergency: false,
    reportedSymptoms: [],
    problemDescription: '',
  }

  const initialBookingState = {
    facility: '',
    service: 'General Medicine',
    date: '',
    dateKey: '',
    time: '',
    type: 'In-person',
    typeKey: 'in_person',
  }

  const handleLogout = () => {
    clearPatientSession()
    setPatient(null)
    setTriageData(initialTriageState)
    setBookingData(initialBookingState)
    setCurrentScreen(SCREENS.WELCOME)
  }

  const [selectedScheme, setSelectedScheme] = useState(null)
  const [selectedFacility, setSelectedFacility] = useState(null)
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [selectedFirstAidTopic, setSelectedFirstAidTopic] = useState(null)
  const [selectedDoctorSpecialization, setSelectedDoctorSpecialization] = useState('all')
  const [selectedDoctorFacilityId, setSelectedDoctorFacilityId] = useState(null)

  const [triageData, setTriageData] = useState(initialTriageState)
  const [bookingData, setBookingData] = useState(initialBookingState)

  // ---------------------------------------------------------
  // Navigation handler
  // ---------------------------------------------------------

  const handleNavigate = (screenId, data) => {
    // Map bottom nav tab keys to actual screen constants
    if (screenId === 'home') screenId = SCREENS.HOME
    else if (screenId === 'services') screenId = SCREENS.HEALTHCARE
    else if (screenId === 'journey') screenId = SCREENS.HEALTH_JOURNEY
    else if (screenId === 'profile') screenId = SCREENS.ABHA

    // Reset triage state only when starting fresh symptoms intake or going to unrelated root screens
    if (screenId === SCREENS.SYMPTOMS) {
      setTriageData(initialTriageState)
    } else if (
      screenId === SCREENS.WELCOME ||
      screenId === SCREENS.LOGIN ||
      screenId === SCREENS.REGISTRATION ||
      screenId === SCREENS.ONBOARDING ||
      screenId === SCREENS.SCHEMES ||
      screenId === SCREENS.MOBILE_CLINIC ||
      screenId === SCREENS.ABHA ||
      screenId === SCREENS.EMERGENCY_FIRST_AID ||
      screenId === SCREENS.DOCTORS
    ) {
      setTriageData(initialTriageState)
    } else if (screenId === SCREENS.HEALTHCARE && !data?.triageData && !triageData.urgency) {
      setTriageData(initialTriageState)
    }

    if (screenId === SCREENS.EMERGENCY_FIRST_AID) {
      setSelectedFirstAidTopic(data?.topicId || null)
    }

    if (screenId === SCREENS.DOCTORS) {
      setSelectedDoctorSpecialization(data?.specialization || 'all')
      setSelectedDoctorFacilityId(data?.facilityId || null)
    }

    if (data) {
      if (data.patient) {
        setPatient(data.patient)
      }
      if (data.facility) {
        setSelectedFacility(data.facility)
      }
      if (data.referral) {
        setSelectedReferral(data.referral)
      }
      if (screenId === SCREENS.LOGIN) {
        setLoginData(data)
      }
      if (screenId === SCREENS.REGISTRATION || screenId === SCREENS.ONBOARDING) {
        setRegistrationData(data)
      }
      // Government scheme details
      if (screenId === SCREENS.SCHEME_DETAILS) {
        setSelectedScheme(data)
      }

      // AI Triage → Care Guidance
      else if (screenId === SCREENS.CARE_GUIDANCE) {
        setTriageData({
          urgency: data.urgency ?? null,
          recommended_care: data.recommended_care ?? null,
          reason: data.reason ?? null,
          emergency: Boolean(data.emergency),
          reportedSymptoms: data.reportedSymptoms ?? [],
          problemDescription: data.problemDescription ?? '',
          duration_days: data.duration_days ?? data.durationDays ?? 1,
        })
      }

      // Care Guidance → Healthcare with active triage payload
      else if (screenId === SCREENS.HEALTHCARE && data.triageData) {
        setTriageData({
          urgency: data.triageData.urgency ?? data.urgency ?? null,
          recommended_care: data.triageData.recommended_care ?? data.recommendedCare ?? null,
          reason: data.triageData.reason ?? null,
          emergency: Boolean(data.triageData.emergency),
          reportedSymptoms: data.triageData.reportedSymptoms ?? [],
          problemDescription: data.triageData.problemDescription ?? '',
          duration_days: data.triageData.duration_days ?? data.triageData.durationDays ?? 1,
        })
      }

      // Appointment / booking data
      else {
        setBookingData((prev) => ({
          ...prev,
          ...data,
        }))
      }
    }

    // Immediate synchronous access to patient to avoid stale state race conditions
    const activePatient = data?.patient || (() => {
      try {
        const stored = localStorage.getItem('patient')
        return stored ? JSON.parse(stored) : null
      } catch {
        return null
      }
    })() || patient

    const token = localStorage.getItem('access_token')

    // Route guard: if authenticated user with complete profile tries to go to onboarding/registration, redirect to home
    if (
      token &&
      activePatient &&
      isProfileComplete(activePatient) &&
      (screenId === SCREENS.ONBOARDING || screenId === SCREENS.REGISTRATION)
    ) {
      screenId = SCREENS.HOME
    }

    // Route guard: if authenticated user has incomplete profile and tries to go to home/protected screens, redirect to onboarding
    if (
      token &&
      activePatient &&
      !isProfileComplete(activePatient) &&
      (screenId === SCREENS.HOME || screenId === SCREENS.APPOINTMENTS || screenId === SCREENS.HEALTH_JOURNEY || screenId === SCREENS.BOOKING)
    ) {
      screenId = SCREENS.ONBOARDING
      if (!data?.registrationData && !registrationData) {
        setRegistrationData({
          mobile: activePatient.mobile,
          patient: activePatient,
          draft: {
            fullName: activePatient.full_name || '',
            age: activePatient.age || '',
            gender: activePatient.gender || '',
            village: activePatient.village || '',
            district: activePatient.district || '',
            preferredLang: activePatient.preferred_language || 'en',
            emergencyContact: activePatient.emergency_contact || '',
          },
        })
      }
    }

    setCurrentScreen(screenId)
  }

  // ---------------------------------------------------------
  // Update appointment information
  // ---------------------------------------------------------

  const handleUpdateBooking = (data) => {
    setBookingData((prev) => ({
      ...prev,
      ...data,
    }))
  }

  // ---------------------------------------------------------
  // Render active screen
  // ---------------------------------------------------------

  return (
    <div className="app-container">
      {/* Role Switcher Bar on Welcome screen */}
      {currentScreen === SCREENS.WELCOME && (
        <div className="patient-welcome-topbar">
          <span className="patient-welcome-topbar-title">Patient Services</span>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="patient-welcome-topbar-back"
          >
            ← Portal Home
          </button>
        </div>
      )}

      {/* =====================================================
          AUTHENTICATION
      ===================================================== */}

      {currentScreen === SCREENS.WELCOME && (
        <Welcome onNavigate={handleNavigate} />
      )}

      {currentScreen === SCREENS.LOGIN && (
        <Login onNavigate={handleNavigate} loginData={loginData} />
      )}

      {currentScreen === SCREENS.ONBOARDING && (
        <Onboarding onNavigate={handleNavigate} registrationData={registrationData} />
      )}

      {currentScreen === SCREENS.REGISTRATION && (
        <Onboarding onNavigate={handleNavigate} registrationData={registrationData} />
      )}

      {/* =====================================================
          HOME
      ===================================================== */}

      {currentScreen === SCREENS.HOME && (
        <Home
          onNavigate={handleNavigate}
          patient={patient}
          onLogout={handleLogout}
        />
      )}

      {/* =====================================================
          AI TRIAGE
      ===================================================== */}

      {currentScreen === SCREENS.SYMPTOMS && (
        <Symptoms onNavigate={handleNavigate} />
      )}

      {currentScreen === SCREENS.CARE_GUIDANCE && (
        <CareGuidance
          onNavigate={handleNavigate}
          triageResult={triageData}
          reportedSymptoms={triageData.reportedSymptoms}
        />
      )}

      {/* =====================================================
          HEALTHCARE
      ===================================================== */}

      {currentScreen === SCREENS.HEALTHCARE && (
        <Healthcare
          onNavigate={handleNavigate}
          triageData={triageData.urgency ? triageData : null}
        />
      )}

      {currentScreen === SCREENS.FACILITY_DETAILS && (
        <FacilityDetails
          onNavigate={handleNavigate}
          facility={selectedFacility}
          facilityId={selectedFacility?.id}
        />
      )}

      {/* =====================================================
          APPOINTMENTS
      ===================================================== */}

      {currentScreen === SCREENS.AVAILABILITY && (
        <Availability
          onNavigate={handleNavigate}
          bookingData={bookingData}
          onUpdateBooking={handleUpdateBooking}
        />
      )}

      {currentScreen === SCREENS.BOOKING && (
        <Booking
          onNavigate={handleNavigate}
          bookingData={bookingData}
        />
      )}

      {currentScreen === SCREENS.APPOINTMENT_CONFIRMED && (
        <AppointmentConfirmed
          onNavigate={handleNavigate}
          bookingData={bookingData}
        />
      )}

      {currentScreen === SCREENS.APPOINTMENTS && (
        <Appointments
          onNavigate={handleNavigate}
          bookingData={bookingData}
        />
      )}

      {/* =====================================================
          REFERRALS
      ===================================================== */}

      {currentScreen === SCREENS.REFERRAL && (
        <ReferralCreated
          onNavigate={handleNavigate}
          referral={selectedReferral}
        />
      )}

      {currentScreen === SCREENS.HEALTH_JOURNEY && (
        <HealthJourney
          onNavigate={handleNavigate}
        />
      )}

      {currentScreen === SCREENS.TRACK_REFERRAL && (
        <TrackReferral
          onNavigate={handleNavigate}
          referral={selectedReferral}
        />
      )}

      {/* =====================================================
          FOLLOW UP
      ===================================================== */}

      {currentScreen === SCREENS.FOLLOW_UP && (
        <FollowUp
          onNavigate={handleNavigate}
        />
      )}

      {/* =====================================================
          GOVERNMENT SCHEMES
      ===================================================== */}

      {currentScreen === SCREENS.SCHEMES && (
        <Schemes
          onNavigate={handleNavigate}
        />
      )}

      {currentScreen === SCREENS.SCHEME_DETAILS && (
        <SchemeDetails
          onNavigate={handleNavigate}
          schemeData={selectedScheme}
        />
      )}

      {/* =====================================================
          MOBILE CLINIC
      ===================================================== */}

      {currentScreen === SCREENS.MOBILE_CLINIC && (
        <MobileClinic
          onNavigate={handleNavigate}
        />
      )}

      {/* =====================================================
          ABHA
      ===================================================== */}

      {currentScreen === SCREENS.ABHA && (
        <Abha
          onNavigate={handleNavigate}
          patient={patient}
          onLogout={handleLogout}
        />
      )}

      {/* =====================================================
          OFFLINE EMERGENCY FIRST AID
      ===================================================== */}

      {currentScreen === SCREENS.EMERGENCY_FIRST_AID && (
        <EmergencyFirstAid
          onNavigate={handleNavigate}
          initialTopicId={selectedFirstAidTopic}
        />
      )}

      {/* =====================================================
          DOCTOR DIRECTORY
      ===================================================== */}

      {currentScreen === SCREENS.DOCTORS && (
        <Doctors
          onNavigate={handleNavigate}
          initialSpecialization={selectedDoctorSpecialization}
          facilityId={selectedDoctorFacilityId}
        />
      )}

    </div>
  )
}
