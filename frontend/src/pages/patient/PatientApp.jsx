import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  Welcome,
  Login,
  Registration,
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
} from './index'

import { SCREENS } from '../../utils/constants'
import { getMe, clearPatientSession } from '../../services/api'
import '../../App.css'

export default function PatientApp() {
  const navigate = useNavigate()
  const [currentScreen, setCurrentScreen] = useState(() => (
    localStorage.getItem('access_token') ? SCREENS.HOME : SCREENS.WELCOME
  ))

  const [patient, setPatient] = useState(() => {
    try {
      const cached = localStorage.getItem('patient')
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  })

  // Verify and refresh patient profile when active session token exists
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      getMe()
        .then((data) => {
          if (data) {
            setPatient(data)
            localStorage.setItem('patient', JSON.stringify(data))
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

  const [triageData, setTriageData] = useState(initialTriageState)
  const [bookingData, setBookingData] = useState(initialBookingState)

  const [registrationData, setRegistrationData] = useState(null)

  // ---------------------------------------------------------
  // Navigation handler
  // ---------------------------------------------------------

  const handleNavigate = (screenId, data) => {
    // Reset stale emergency state when starting a fresh symptom intake or navigating to independent flows
    if (screenId === SCREENS.SYMPTOMS) {
      setTriageData(initialTriageState)
    } else if (
      screenId === SCREENS.HOME ||
      screenId === SCREENS.WELCOME ||
      screenId === SCREENS.LOGIN ||
      screenId === SCREENS.REGISTRATION ||
      screenId === SCREENS.AVAILABILITY ||
      screenId === SCREENS.BOOKING ||
      screenId === SCREENS.APPOINTMENT_CONFIRMED ||
      screenId === SCREENS.APPOINTMENTS ||
      screenId === SCREENS.FOLLOW_UP ||
      screenId === SCREENS.TRACK_REFERRAL ||
      screenId === SCREENS.REFERRAL_CREATED ||
      screenId === SCREENS.HEALTH_JOURNEY ||
      screenId === SCREENS.SCHEMES ||
      screenId === SCREENS.SCHEME_DETAILS ||
      screenId === SCREENS.MOBILE_CLINIC ||
      screenId === SCREENS.ABHA
    ) {
      setTriageData(initialTriageState)
    } else if (screenId === SCREENS.HEALTHCARE && !data?.triageData) {
      // Independent entry to healthcare without triage payload resets emergency state
      setTriageData(initialTriageState)
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
      if (screenId === SCREENS.REGISTRATION) {
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
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#F1F5F9',
          borderBottom: '1px solid #E2E8F0',
          fontSize: '0.8rem',
          color: '#475569',
        }}>
          <span>Portal: <strong>Patient Services</strong></span>
          <button
            type="button"
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#0A58CA',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '2px 6px',
            }}
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
        <Login onNavigate={handleNavigate} />
      )}

      {currentScreen === SCREENS.REGISTRATION && (
        <Registration onNavigate={handleNavigate} registrationData={registrationData} />
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

    </div>
  )
}
