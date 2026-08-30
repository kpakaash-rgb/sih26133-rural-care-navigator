import { useState } from 'react'
import { Welcome } from './pages/patient'
import { SCREENS } from './utils/constants'
import './App.css'

function App() {
  const [currentScreen, setCurrentScreen] = useState(SCREENS.WELCOME)

  const handleNavigate = (screenId) => {
    setCurrentScreen(screenId)
  }

  return (
    <div className="app-container">
      <main className="app-content" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {currentScreen === SCREENS.WELCOME ? (
          <Welcome onNavigate={handleNavigate} />
        ) : (
          <Welcome onNavigate={handleNavigate} />
        )}
      </main>
    </div>
  )
}

export default App
