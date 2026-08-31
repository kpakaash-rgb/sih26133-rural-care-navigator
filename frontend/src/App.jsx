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
} from './pages/patient'
import { SCREENS } from './utils/constants'
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME)
  const [bookingData, setBookingData] = useState({
    facility: 'PHC Malshiras',
    service: 'General Medicine',
    date: 'Tuesday, Oct 24',
    dateKey: 'today',
    time: '10:30 AM',
    type: 'In-person',
    typeKey: 'in_person',
  })

  const handleNavigate = (screenId, data) => {
    if (data) {
      setBookingData((prev) => ({ ...prev, ...data }))
    }
    setCurrentScreen(screenId)
  }

  const handleUpdateBooking = (data) => {
    setBookingData((prev) => ({ ...prev, ...data }))
  }

  return (
    <div className="app-container">
      {/* Active Screen Rendering */}
      {currentScreen === SCREENS.WELCOME && <Welcome onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.LOGIN && <Login onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.REGISTRATION && <Registration onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.HOME && <Home onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.SYMPTOMS && <Symptoms onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.CARE_GUIDANCE && <CareGuidance onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.HEALTHCARE && <Healthcare onNavigate={handleNavigate} />}
      {currentScreen === SCREENS.FACILITY_DETAILS && (
        <FacilityDetails onNavigate={handleNavigate} />
      )}
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
    </div>
  )
}

export default App
