import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Home({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('home')

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'services' && onNavigate) {
      onNavigate(SCREENS.HEALTHCARE)
    } else if (tabId === 'journey' && onNavigate) {
      onNavigate(SCREENS.APPOINTMENTS)
    } else if (tabId === SCREENS.HOME && onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  const handleFindCare = () => {
    if (onNavigate) {
      onNavigate(SCREENS.SYMPTOMS)
    }
  }

  return (
    <div className="home-screen-wrapper">
      {/* Top Brand Header */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Scrollable Content Container */}
      <main className="home-scrollable-content">
        {/* Patient Greeting */}
        <section className="home-greeting-section">
          <h1 className="home-greeting-name">Good morning, John</h1>
          <p className="home-greeting-question">What do you need help with today?</p>
        </section>

        {/* 1. Mobile Clinic Card */}
        <article className="home-card mobile-clinic-card">
          <div className="info-circle-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0284c7">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <div className="mobile-clinic-text">
            <h2 className="mobile-clinic-title">Mobile Clinic</h2>
            <p className="mobile-clinic-desc">
              The mobile clinic will visit your area on Thursday, 14th.
            </p>
          </div>
        </article>

        {/* 2. Emergency / SOS Card */}
        <article className="home-card emergency-banner-card" onClick={handleSosClick} role="button" tabIndex={0}>
          <div className="emergency-card-title-row">
            <span className="emergency-asterisk" aria-hidden="true">✱</span>
            <h2 className="emergency-card-title">Emergency / SOS</h2>
          </div>
          <p className="emergency-card-sub">Call Emergency Help</p>
        </article>

        {/* 3. Find the Right Place for Care Card */}
        <article className="home-card care-finder-card" onClick={handleFindCare} role="button" tabIndex={0}>
          <div className="care-finder-icon" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="15" rx="3" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              <line x1="8" y1="12" x2="12" y2="12" />
              <line x1="10" y1="10" x2="10" y2="14" />
              <line x1="14" y1="11" x2="16" y2="11" />
              <line x1="14" y1="14" x2="16" y2="14" />
            </svg>
          </div>
          <h2 className="care-finder-title">Find the Right Place for Care</h2>
          <p className="care-finder-sub">Find a Doctor or a PHC</p>
        </article>

        {/* 4. My Appointments Card */}
        <article
          className="home-card action-tile-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate(SCREENS.APPOINTMENTS)}
        >
          <span className="notification-dot" aria-label="1 unread notification" />
          <div className="tile-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <rect x="7" y="14" width="2" height="2" fill="#004b87" />
              <rect x="11" y="14" width="2" height="2" fill="#004b87" />
              <rect x="15" y="14" width="2" height="2" fill="#004b87" />
            </svg>
          </div>
          <h2 className="tile-title">My Appointments</h2>
        </article>

        {/* 5. My Health Journey Card */}
        <article
          className="home-card action-tile-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate(SCREENS.HEALTH_JOURNEY)}
        >
          <div className="tile-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h2 className="tile-title">My Health Journey</h2>
        </article>

        {/* 6. My Referrals Card */}
        <article
          className="home-card action-tile-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate(SCREENS.REFERRAL)}
        >
          <div className="tile-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          </div>
          <h2 className="tile-title">My Referrals</h2>
        </article>

        {/* 7. Govt. Schemes Card */}
        <article className="home-card action-tile-card" role="button" tabIndex={0}>
          <div className="tile-icon" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="9" y1="15" x2="15" y2="15" />
            </svg>
          </div>
          <h2 className="tile-title">Govt. Schemes</h2>
        </article>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

