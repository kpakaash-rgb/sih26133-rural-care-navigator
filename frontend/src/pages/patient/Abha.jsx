import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Abha({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('profile')
  const [healthInfoModal, setHealthInfoModal] = useState(false)
  const [manageModal, setManageModal] = useState(false)

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    } else if (tabId === 'services') {
      if (onNavigate) {
        onNavigate(SCREENS.HEALTHCARE)
      }
    } else if (tabId === 'journey') {
      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENTS)
      }
    }
  }

  const handleViewHealthInfo = () => {
    setHealthInfoModal(true)
    setTimeout(() => {
      setHealthInfoModal(false)
    }, 4000)
  }

  const handleManageConnection = () => {
    setManageModal(true)
    setTimeout(() => {
      setManageModal(false)
    }, 4000)
  }

  const abhaData = {
    number: '91-XXXX-XXXX-XXXX',
    status: 'Connected',
  }

  return (
    <div className="abha-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Content Area */}
      <main className="abha-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="abha-header-section">
          <h1 className="abha-main-title">ABHA / Health Account</h1>
          <p className="abha-subtitle">
            Use your ABHA to connect your digital health information when available.
          </p>
        </section>

        {/* ABHA Account Information Card */}
        <article className="abha-info-card">
          {/* Card Top Section: Icon, Number, Connected Pill */}
          <div className="abha-card-top-row">
            <div className="abha-identity-group">
              <div className="abha-avatar-box" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="abha-number-column">
                <span className="abha-number-label">ABHA Number</span>
                <span className="abha-number-value">{abhaData.number}</span>
              </div>
            </div>

            <div className="abha-status-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>{abhaData.status}</span>
            </div>
          </div>

          {/* Action Buttons Group */}
          <div className="abha-actions-group">
            <button
              type="button"
              className="abha-view-info-btn"
              onClick={handleViewHealthInfo}
            >
              <span className="btn-glyph-folder" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <span>View Health Information</span>
            </button>

            <button
              type="button"
              className="abha-manage-btn"
              onClick={handleManageConnection}
            >
              <span className="btn-glyph-gear" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <span>Manage Connection</span>
            </button>
          </div>
        </article>

        {/* Prototype Feedback Notifications */}
        {healthInfoModal && (
          <div className="abha-notice-box" role="status">
            <span>ℹ️ Connected Health Records: 2 clinical notes from PHC Malshiras and 1 immunization certificate synced.</span>
          </div>
        )}
        {manageModal && (
          <div className="abha-notice-box" role="status">
            <span>⚙️ ABHA Consent Manager: Data sharing permission active with Ayushman Bharat Digital Mission (ABDM).</span>
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation with Profile tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
