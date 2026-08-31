import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function SchemeDetails({ onNavigate, schemeData }) {
  const [activeTab, setActiveTab] = useState('services')
  const [eligibilityNotice, setEligibilityNotice] = useState(false)

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    } else if (tabId === 'journey') {
      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENTS)
      }
    } else if (tabId === 'profile') {
      if (onNavigate) {
        onNavigate(SCREENS.ABHA)
      }
    }
  }

  const handleBack = () => {
    if (onNavigate) {
      onNavigate(SCREENS.SCHEMES)
    }
  }

  const handleCheckEligibility = () => {
    setEligibilityNotice(true)
    setTimeout(() => {
      setEligibilityNotice(false)
    }, 4000)
  }

  const handleFindHelp = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTHCARE)
    }
  }

  const schemeTitle = schemeData?.title || 'Ayushman Bharat PM-JAY'
  const schemeBadge = schemeData?.category || 'Government Scheme'

  const infoCards = [
    {
      id: 'what-it-is',
      title: 'What it is',
      text: 'A government health coverage programme for eligible beneficiaries.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      ),
    },
    {
      id: 'who-eligible',
      title: 'Who may be eligible',
      text: 'Eligibility depends on the applicable government criteria.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      id: 'what-provides',
      title: 'What it may provide',
      text: 'Hospitalisation-related health coverage for eligible beneficiaries.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
          <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
          <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      id: 'how-get-help',
      title: 'How to get help',
      text: 'Visit an authorised healthcare/facilitation point.',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
          <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="scheme-details-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Container */}
      <main className="scheme-details-scrollable-content">
        {/* Back Link Row */}
        <div className="scheme-details-back-row">
          <button type="button" className="scheme-back-btn" onClick={handleBack}>
            <span className="back-arrow-icon" aria-hidden="true">←</span>
            <span>Back</span>
          </button>
        </div>

        {/* Title and Badge Section */}
        <section className="scheme-details-header-section">
          <h1 className="scheme-details-main-title">{schemeTitle}</h1>
          <div className="scheme-details-pill-badge">
            <span className="badge-shield-icon" aria-hidden="true">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </span>
            <span>{schemeBadge}</span>
          </div>
        </section>

        {/* Information Cards Stack */}
        <section className="scheme-details-cards-stack">
          {infoCards.map((card) => (
            <article key={card.id} className="scheme-info-card">
              <div className="info-card-header-row">
                <span className="info-card-icon" aria-hidden="true">
                  {card.icon}
                </span>
                <h2 className="info-card-title">{card.title}</h2>
              </div>
              <p className="info-card-description">{card.text}</p>
            </article>
          ))}
        </section>

        {/* Dynamic Prototype Eligibility Feedback Notification */}
        {eligibilityNotice && (
          <div className="eligibility-notice-box" role="status">
            <span>ℹ️ Verification portal demo: Visit your nearest CSC or PHC to verify ration card / Aadhaar eligibility.</span>
          </div>
        )}

        {/* Action Buttons Section */}
        <section className="scheme-details-actions-group">
          <button
            type="button"
            className="scheme-check-eligibility-btn"
            onClick={handleCheckEligibility}
          >
            Check Eligibility
          </button>

          <button
            type="button"
            className="scheme-find-help-btn"
            onClick={handleFindHelp}
          >
            <span className="btn-glyph-pin" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </span>
            <span>Find Help Nearby</span>
          </button>
        </section>
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
