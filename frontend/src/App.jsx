import { useState } from 'react'
import { Welcome, Login, Registration, Home } from './pages/patient'
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
    </div>
  )
}

export default App
