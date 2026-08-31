import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

const COMMON_SYMPTOMS_LIST = [
  'Fever',
  'Cough',
  'Headache',
  'Pain',
  'Stomach Problem',
  'Injury',
]

export default function Symptoms({ onNavigate }) {
  const [problemDescription, setProblemDescription] = useState(
    'I have had a sharp pain in my stomach since this morning...'
  )
  const [selectedSymptoms, setSelectedSymptoms] = useState(['Pain', 'Stomach Problem'])

  const handleToggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) =>
      prev.includes(symptom)
        ? prev.filter((item) => item !== symptom)
        : [...prev, symptom]
    )
  }

  const handleContinue = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTHCARE)
    }
  }

  const handleEmergencyCall = () => {
    window.location.href = 'tel:108'
  }

  return (
    <div className="symptoms-screen-wrapper">
      {/* Brand Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleEmergencyCall} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="symptoms-scrollable-content">
        {/* Screen Title & Subtitle */}
        <section className="symptoms-header-section">
          <h1 className="symptoms-main-title">How are you feeling?</h1>
          <p className="symptoms-subtitle">Tell us what is wrong.</p>
        </section>

        {/* Problem Description Text Area */}
        <section className="symptoms-form-group">
          <label htmlFor="problemInput" className="symptoms-section-label">
            Describe your problem
          </label>
          <textarea
            id="problemInput"
            className="symptoms-problem-textarea"
            rows={4}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="Describe your symptoms in detail..."
          />
        </section>

        {/* Common Symptoms Selection */}
        <section className="symptoms-form-group">
          <h2 className="symptoms-section-label">Common Symptoms</h2>
          <div className="symptoms-chips-container">
            {COMMON_SYMPTOMS_LIST.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom)
              return (
                <button
                  key={symptom}
                  type="button"
                  className={`symptom-chip-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleToggleSymptom(symptom)}
                  aria-pressed={isSelected}
                >
                  <span className="chip-btn-text">{symptom}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Serious Emergency Warning Box */}
        <article className="serious-emergency-box">
          <div className="emergency-box-header">
            <span className="emergency-asterisk-icon" aria-hidden="true">
              ✱
            </span>
            <h2 className="emergency-box-title">ARE YOU HAVING A SERIOUS EMERGENCY?</h2>
          </div>
          <p className="emergency-box-message">
            If you are experiencing a life-threatening emergency, get emergency medical help immediately.
          </p>
          <button
            type="button"
            className="emergency-call-action-btn"
            onClick={handleEmergencyCall}
            aria-label="Call Emergency Help 108"
          >
            <span className="emergency-phone-glyph" aria-hidden="true">📞</span>
            <span>Call Emergency Help</span>
          </button>
        </article>

        {/* AI Guidance Disclaimer Box */}
        <div className="ai-guidance-disclaimer">
          <div className="disclaimer-icon-wrapper" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#475569">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <p className="disclaimer-text">
            AI guidance is for triage support only and does <strong>NOT</strong> replace a doctor.
          </p>
        </div>
      </main>

      {/* Accessible Bottom Sticky Action Container */}
      <footer className="symptoms-bottom-bar">
        <button
          type="button"
          className="symptoms-continue-btn"
          onClick={handleContinue}
        >
          <span>Continue</span>
          <span className="continue-arrow-glyph" aria-hidden="true">→</span>
        </button>
      </footer>
    </div>
  )
}
