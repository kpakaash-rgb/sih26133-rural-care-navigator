import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function MobileClinic({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('services')

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

  const handleViewDetails = () => {
    if (onNavigate) {
      onNavigate(SCREENS.FACILITY_DETAILS)
    }
  }

  const handleGetDirections = () => {
    window.open('https://maps.google.com/?q=Example+Village+Mobile+Clinic', '_blank')
  }

  const clinicData = {
    title: 'Upcoming Mobile Clinic',
    status: 'Upcoming',
    village: 'Example Village',
    date: 'Thursday, Oct 26',
    time: '10:00 AM - 2:00 PM',
    services: [
      'General consultation',
      'Basic health checks',
      'Medicines',
    ],
  }

  return (
    <div className="mobile-clinic-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="mobile-clinic-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="mobile-clinic-header-section">
          <h1 className="mobile-clinic-main-title">Mobile Clinic</h1>
          <p className="mobile-clinic-subtitle">
            See when a mobile clinic will visit your area.
          </p>
        </section>

        {/* Mobile Clinic Card */}
        <article className="mobile-clinic-card">
          {/* Top Row with Van Icon, Title, and Upcoming Pill */}
          <div className="mobile-clinic-card-top-row">
            <div className="mobile-clinic-title-row">
              <div className="mobile-clinic-icon-box" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2" />
                  <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                  <circle cx="5.5" cy="18.5" r="2.5" />
                  <circle cx="18.5" cy="18.5" r="2.5" />
                </svg>
              </div>
              <h2 className="mobile-clinic-card-title">{clinicData.title}</h2>
            </div>
            <span className="mobile-clinic-status-pill">{clinicData.status}</span>
          </div>

          {/* Village & Date / Time Info */}
          <div className="mobile-clinic-info-list">
            <div className="mobile-clinic-info-item">
              <span className="info-item-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <div className="info-item-text-group">
                <span className="info-item-label">Village</span>
                <strong className="info-item-value">{clinicData.village}</strong>
              </div>
            </div>

            <div className="mobile-clinic-info-item">
              <span className="info-item-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
              <div className="info-item-text-group">
                <span className="info-item-label">Date & Time</span>
                <strong className="info-item-value">{clinicData.date}</strong>
                <span className="info-item-time">{clinicData.time}</span>
              </div>
            </div>
          </div>

          <div className="mobile-clinic-divider" />

          {/* Services Checklist */}
          <div className="mobile-clinic-services-section">
            <h3 className="mobile-clinic-services-heading">Services</h3>
            <ul className="mobile-clinic-services-list">
              {clinicData.services.map((srv, idx) => (
                <li key={idx} className="mobile-clinic-service-item">
                  <span className="service-check-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  <span>{srv}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="mobile-clinic-actions-group">
            <button
              type="button"
              className="mobile-clinic-view-btn"
              onClick={handleViewDetails}
            >
              View Details
            </button>

            <button
              type="button"
              className="mobile-clinic-directions-btn"
              onClick={handleGetDirections}
            >
              <span className="btn-glyph-directions" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="3 11 22 2 13 21 11 13 3 11" />
                </svg>
              </span>
              <span>Get Directions</span>
            </button>
          </div>
        </article>
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
