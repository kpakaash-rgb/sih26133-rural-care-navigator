import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function CareGuidance({
onNavigate,
triageResult,
reportedSymptoms = [],
}) {
const [activeTab, setActiveTab] = useState('services')

// Use the real backend result instead of hardcoded values.
const urgency = triageResult?.urgency || 'routine'
const recommendedCare =
triageResult?.recommended_care || 'Routine healthcare service'
const reason =
triageResult?.reason ||
'No emergency warning sign was identified. Consider routine healthcare if your symptoms persist or become worse.'
const emergency = Boolean(triageResult?.emergency)

const symptoms =
reportedSymptoms.length > 0 ? reportedSymptoms : ['No symptoms selected']

const getUrgencyTitle = () => {
switch (urgency) {
case 'emergency':
return 'EMERGENCY'
case 'needs_attention':
return 'NEEDS ATTENTION'
case 'routine':
default:
return 'ROUTINE'
}
}

const getUrgencyMessage = () => {
switch (urgency) {
case 'emergency':
return 'Please seek emergency medical help immediately.'
case 'needs_attention':
return 'Please visit a healthcare professional soon.'
case 'routine':
default:
return 'Routine healthcare is appropriate unless your symptoms worsen.'
}
}

const handleEmergencyCall = () => {
window.location.href = 'tel:108'
}

const handleFindCare = () => {
if (onNavigate) {
onNavigate(SCREENS.HEALTHCARE)
}
}

const handleEditFeeling = () => {
if (onNavigate) {
onNavigate(SCREENS.SYMPTOMS)
}
}

const handleNavClick = (tabId) => {
setActiveTab(tabId)

```
if (tabId === 'home' || tabId === SCREENS.HOME) {
  if (onNavigate) {
    onNavigate(SCREENS.HOME)
  }
}
```

}

return ( <div className="care-guidance-screen-wrapper">
{/* Brand Header with SOS */}
<Header
title="Rural Care Navigator"
showLogo
rightAction={ <SOSButton
         label="SOS"
         icon="▲"
         onClick={handleEmergencyCall}
       />
}
/>

```
  {/* Main Vertically Scrollable Content */}
  <main className="care-guidance-scrollable-content">

    {/* Urgency Section */}
    <section className="urgency-question-section">
      <h2 className="urgency-question-heading">
        How soon should you get care?
      </h2>

      <div
        className={`needs-attention-card urgency-${urgency}`}
      >
        <div className="attention-badge-title">
          {getUrgencyTitle()}
        </div>

        <p className="attention-card-desc">
          {getUrgencyMessage()}
        </p>
      </div>
    </section>

    {/* Guidance Header */}
    <section className="care-guidance-intro">
      <h1 className="guidance-main-title">
        Your Care Guidance
      </h1>

      <p className="guidance-subtitle">
        Based on the symptoms you reported today.
      </p>
    </section>

    {/* Reported Symptoms */}
    <section className="reported-symptoms-card">
      <div className="reported-symptoms-header">
        <svg
          className="reported-list-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="8" y1="8" x2="16" y2="8" />
          <line x1="8" y1="12" x2="16" y2="12" />
          <line x1="8" y1="16" x2="12" y2="16" />
        </svg>

        <h2 className="reported-symptoms-title">
          Reported Symptoms
        </h2>
      </div>

      <div className="reported-symptoms-chips">
        {symptoms.map((symptom) => (
          <span
            key={symptom}
            className="guidance-symptom-chip"
          >
            {symptom}
          </span>
        ))}
      </div>
    </section>

    {/* Why this guidance? */}
    <section className="guidance-detail-section">
      <h2 className="guidance-detail-heading">
        Why this guidance?
      </h2>

      <p className="guidance-detail-text">
        {reason}
      </p>
    </section>

    {/* Where should you go? */}
    <section className="guidance-detail-section">
      <h2 className="guidance-detail-heading">
        Where should you go?
      </h2>

      <p className="guidance-detail-text">
        {recommendedCare}
      </p>
    </section>

    {/* Emergency Warning */}
    {emergency && (
      <section className="care-guidance-emergency-section">
        <div className="emergency-section-header">
          <span
            className="emergency-siren-glyph"
            aria-hidden="true"
          >
            🚨
          </span>

          <h2 className="emergency-section-title">
            Emergency
          </h2>
        </div>

        <button
          type="button"
          className="care-guidance-emergency-btn"
          onClick={handleEmergencyCall}
          aria-label="Call Emergency Help"
        >
          <svg
            className="emergency-diamond-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 22 12 12 22 2 12 12 2" />
            <path
              d="M12 8v4"
              strokeWidth="2.5"
            />
            <circle
              cx="12"
              cy="16"
              r="1.2"
              fill="currentColor"
            />
          </svg>

          <span>Call Emergency Help</span>
        </button>
      </section>
    )}

    {/* AI Disclaimer */}
    <div className="guidance-ai-disclaimer">
      <span
        className="disclaimer-info-icon"
        aria-hidden="true"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="#64748b"
        >
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
        </svg>
      </span>

      <p className="disclaimer-italic-text">
        AI guidance does not replace a doctor's advice.
      </p>
    </div>

    {/* Action Buttons */}
    <div className="care-guidance-actions">

      {/* Find Care */}
      <button
        type="button"
        className="guidance-find-care-btn"
        onClick={handleFindCare}
      >
        <svg
          className="action-btn-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line
            x1="21"
            y1="21"
            x2="16.65"
            y2="16.65"
          />
        </svg>

        <span>Find the Right Place for Care</span>
      </button>

      {/* Edit Symptoms */}
      <button
        type="button"
        className="guidance-edit-feeling-btn"
        onClick={handleEditFeeling}
      >
        <svg
          className="action-btn-icon"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>

        <span>Edit My Feeling</span>
      </button>
    </div>

    {/* General Emergency Section */}
    {!emergency && (
      <section className="care-guidance-emergency-section">
        <div className="emergency-section-header">
          <span
            className="emergency-siren-glyph"
            aria-hidden="true"
          >
            🚨
          </span>

          <h2 className="emergency-section-title">
            Emergency
          </h2>
        </div>

        <button
          type="button"
          className="care-guidance-emergency-btn"
          onClick={handleEmergencyCall}
          aria-label="Call Emergency Help"
        >
          <svg
            className="emergency-diamond-icon"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polygon points="12 2 22 12 12 22 2 12 12 2" />
            <path d="M12 8v4" strokeWidth="2.5" />
            <circle
              cx="12"
              cy="16"
              r="1.2"
              fill="currentColor"
            />
          </svg>

          <span>Call Emergency Help</span>
        </button>
      </section>
    )}
  </main>

  {/* Fixed Bottom Navigation */}
  <BottomNav
    activeScreen={activeTab}
    onNavigate={handleNavClick}
  />
</div>

)
}