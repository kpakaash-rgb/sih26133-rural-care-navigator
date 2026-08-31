import { useState } from 'react'
import { Welcome, Login, Registration, Home, Symptoms, CareGuidance, Healthcare } from './pages/patient'
import { SCREENS } from './utils/constants'
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME)

  const handleNavigate = (screenId) => {
    setCurrentScreen(screenId)
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
    </div>
  )
}

export default App

