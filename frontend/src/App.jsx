import { useState } from 'react'

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
} from './pages/patient'

import { SCREENS } from './utils/constants'

import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME)

  const [selectedScheme, setSelectedScheme] = useState(null)

  const [triageData, setTriageData] = useState({
    urgency: null,
    recommended_care: null,
    reason: null,
    emergency: false,
    reportedSymptoms: [],
    problemDescription: '',
  })

  const [bookingData, setBookingData] = useState({
    facility: 'PHC Malshiras',
    service: 'General Medicine',
    date: 'Tuesday, Oct 24',
    dateKey: 'today',
    time: '10:30 AM',
    type: 'In-person',
    typeKey: 'in_person',
  })

  // ---------------------------------------------------------
  // Navigation handler
  // ---------------------------------------------------------

  const handleNavigate = (screenId, data) => {
    if (data) {
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
        <Registration onNavigate={handleNavigate} />
      )}

      {/* =====================================================
          HOME
      ===================================================== */}

      {currentScreen === SCREENS.HOME && (
        <Home onNavigate={handleNavigate} />
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
        <Healthcare onNavigate={handleNavigate} />
      )}

      {currentScreen === SCREENS.FACILITY_DETAILS && (
        <FacilityDetails onNavigate={handleNavigate} />
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
        />
      )}

    </div>
  )
}

export default App