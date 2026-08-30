import { useState } from 'react'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import SOSButton from './components/SOSButton'
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
  Referral,
  TrackReferral,
  HealthJourney,
  FollowUp,
  Schemes,
  SchemeDetails,
  MobileClinic,
  Abha,
} from './pages/patient'
import { SCREENS, SCREEN_TITLES } from './utils/constants'
import './App.css'

const SCREEN_COMPONENTS = {
  [SCREENS.WELCOME]: Welcome,
  [SCREENS.LOGIN]: Login,
  [SCREENS.REGISTRATION]: Registration,
  [SCREENS.HOME]: Home,
  [SCREENS.SYMPTOMS]: Symptoms,
  [SCREENS.CARE_GUIDANCE]: CareGuidance,
  [SCREENS.HEALTHCARE]: Healthcare,
  [SCREENS.FACILITY_DETAILS]: FacilityDetails,
  [SCREENS.AVAILABILITY]: Availability,
  [SCREENS.BOOKING]: Booking,
  [SCREENS.APPOINTMENT_CONFIRMED]: AppointmentConfirmed,
  [SCREENS.APPOINTMENTS]: Appointments,
  [SCREENS.REFERRAL]: Referral,
  [SCREENS.TRACK_REFERRAL]: TrackReferral,
  [SCREENS.HEALTH_JOURNEY]: HealthJourney,
  [SCREENS.FOLLOW_UP]: FollowUp,
  [SCREENS.SCHEMES]: Schemes,
  [SCREENS.SCHEME_DETAILS]: SchemeDetails,
  [SCREENS.MOBILE_CLINIC]: MobileClinic,
  [SCREENS.ABHA]: Abha,
}

// Screens that show bottom nav bar
const BOTTOM_NAV_SCREENS = [
  SCREENS.HOME,
  SCREENS.CARE_GUIDANCE,
  SCREENS.APPOINTMENTS,
  SCREENS.SCHEMES,
  SCREENS.ABHA,
  SCREENS.HEALTHCARE,
]

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.HOME)
  const [history, setHistory] = useState([SCREENS.HOME])

  const navigateTo = (screenId) => {
    setHistory((prev) => [...prev, screenId])
    setCurrentScreen(screenId)
  }

  const goBack = () => {
    if (history.length > 1) {
      const nextHistory = [...history]
      nextHistory.pop()
      const prevScreen = nextHistory[nextHistory.length - 1]
      setHistory(nextHistory)
      setCurrentScreen(prevScreen)
    } else {
      setCurrentScreen(SCREENS.HOME)
    }
  }

  const ActiveComponent = SCREEN_COMPONENTS[currentScreen] || Home
  const showBack = currentScreen !== SCREENS.HOME && currentScreen !== SCREENS.WELCOME
  const showBottomNav = BOTTOM_NAV_SCREENS.includes(currentScreen)

  return (
    <div className="app-container">
      {/* Dev Quick Screen Switcher */}
      <aside className="dev-screen-bar" aria-label="Development Screen Navigator">
        <span>Preview Screen:</span>
        <select
          className="dev-select"
          value={currentScreen}
          onChange={(e) => navigateTo(e.target.value)}
          aria-label="Select screen to preview"
        >
          {Object.entries(SCREEN_TITLES).map(([id, title]) => (
            <option key={id} value={id}>
              {title} ({id})
            </option>
          ))}
        </select>
      </aside>

      {/* Reusable Header */}
      <Header
        title={SCREEN_TITLES[currentScreen] || 'Rural Care Navigator'}
        showBack={showBack}
        onBack={goBack}
        rightAction={
          currentScreen !== SCREENS.WELCOME && (
            <SOSButton compact label="108" />
          )
        }
      />

      {/* Screen View */}
      <main className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <ActiveComponent onNavigate={navigateTo} />
      </main>

      {/* Reusable Bottom Navigation */}
      {showBottomNav && (
        <BottomNav activeScreen={currentScreen} onNavigate={navigateTo} />
      )}
    </div>
  )
}

export default App
