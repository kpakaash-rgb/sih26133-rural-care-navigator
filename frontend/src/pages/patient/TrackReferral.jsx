import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function TrackReferral({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('journey')

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
    }
  }

  const handleViewFacility = () => {
    if (onNavigate) {
      onNavigate(SCREENS.FACILITY_DETAILS)
    }
  }

  const handleBookAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const referralSteps = [
    {
      id: 'step-1',
      title: 'Referral Created',
      description: 'Doctor initiated the transfer.',
      status: 'completed',
    },
    {
      id: 'step-2',
      title: 'Referral Sent',
      description: 'Details forwarded to destination.',
      status: 'completed',
    },
    {
      id: 'step-3',
      title: 'Facility Received',
      description: 'District Hospital accepted request.',
      status: 'completed',
    },
    {
      id: 'step-4',
      title: 'Appointment / Visit',
      description: 'Pending your arrival.',
      status: 'pending',
    },
  ]

  return (
    <div className="track-referral-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="track-referral-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="track-referral-header-section">
          <h1 className="track-referral-main-title">Track Your Referral</h1>
          <p className="track-referral-subtitle">Waiting for your visit</p>
        </section>

        {/* Referral Information Summary Card */}
        <article className="track-referral-card">
          {/* From & To Route */}
          <div className="track-route-section">
            {/* From Node */}
            <div className="track-route-node">
              <span className="track-node-pin-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className="track-node-info">
                <span className="track-node-label">From</span>
                <h2 className="track-facility-title">PHC Malshiras</h2>
              </div>
            </div>

            {/* Vertical Connector Line */}
            <div className="track-connector-line" aria-hidden="true" />

            {/* To Node */}
            <div className="track-route-node">
              <span className="track-node-plus-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                  <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <div className="track-node-info">
                <span className="track-node-label">To</span>
                <h2 className="track-facility-title">District Hospital</h2>
              </div>
            </div>
          </div>

          <div className="track-card-divider" />

          {/* Type Badge Section */}
          <div className="track-type-section">
            <span className="track-type-label">Type</span>
            <div className="track-type-pill">
              <span className="track-type-stethoscope-icon" aria-hidden="true">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
                  <path d="M9 12.5v3.5a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-1.5" />
                  <circle cx="16" cy="14.5" r="1.5" fill="#ffffff" />
                </svg>
              </span>
              <span className="track-type-text">Specialist consultation</span>
            </div>
          </div>
        </article>

        {/* Referral Status Timeline Section */}
        <section className="track-timeline-section">
          <h2 className="track-timeline-heading">Timeline</h2>

          <div className="track-timeline-container">
            {referralSteps.map((step, index) => {
              const isLast = index === referralSteps.length - 1
              const isCompleted = step.status === 'completed'

              return (
                <div key={step.id} className="track-timeline-node">
                  {/* Indicator Column */}
                  <div className="track-indicator-col">
                    {isCompleted ? (
                      <div className="track-step-circle completed" aria-hidden="true">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    ) : (
                      <div className="track-step-circle pending" aria-hidden="true">
                        <div className="pending-inner-dot" />
                      </div>
                    )}
                    {!isLast && (
                      <div
                        className={`track-step-vertical-line ${isCompleted && referralSteps[index + 1]?.status === 'completed' ? 'completed-line' : 'pending-line'}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  {/* Step Content */}
                  <div className="track-step-content">
                    <h3 className="track-step-title">{step.title}</h3>
                    <p className="track-step-desc">{step.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Action Buttons Section */}
        <section className="track-actions-group">
          {/* Secondary Action: View Facility */}
          <button
            type="button"
            className="track-view-facility-btn"
            onClick={handleViewFacility}
          >
            <span className="btn-glyph-facility" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
            </span>
            <span>View Facility</span>
          </button>

          {/* Primary Action: Book Appointment */}
          <button
            type="button"
            className="track-book-btn"
            onClick={handleBookAppointment}
          >
            <span className="btn-glyph-calendar" aria-hidden="true">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <polyline points="9 16 11 18 15 14" />
              </svg>
            </span>
            <span>Book Appointment</span>
          </button>
        </section>
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
