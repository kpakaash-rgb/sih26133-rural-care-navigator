import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function FacilityDetails({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('services')

  const handleEmergencyCall = () => {
    window.location.href = 'tel:108'
  }

  const handleBack = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTHCARE)
    }
  }

  const handleBookAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const handleCheckTimes = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const handleDirections = () => {
    window.open('https://maps.google.com/?q=PHC+Malshiras', '_blank')
  }

  const handleCallFacility = () => {
    window.location.href = 'tel:0217234567'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    }
  }

  return (
    <div className="facility-details-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleEmergencyCall} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="facility-details-scrollable-content">
        {/* Back Navigation Row */}
        <div className="facility-breadcrumb-row">
          <button
            type="button"
            className="facility-details-back-btn"
            onClick={handleBack}
            aria-label="Go back to facility list"
          >
            <span className="back-arrow-glyph" aria-hidden="true">←</span>
            <span className="back-title-label">Facility Details</span>
          </button>
        </div>

        {/* Facility Identity Header Card */}
        <section className="facility-hero-card">
          <div className="facility-hero-header">
            <h1 className="facility-hero-name">PHC Malshiras</h1>
            <p className="facility-hero-type">Primary Health Centre</p>
          </div>

          <div className="facility-hero-meta-row">
            <span className="facility-open-badge">
              <span className="open-check-glyph" aria-hidden="true">✓</span>
              <span>Open Now</span>
            </span>
            <div className="facility-address-inline">
              <span className="address-pin-glyph" aria-hidden="true">📍</span>
              <span>124 Main Road, Malshiras</span>
            </div>
          </div>
        </section>

        {/* Available Services Section */}
        <section className="facility-services-section">
          <h2 className="facility-section-heading">AVAILABLE SERVICES</h2>

          <div className="compact-services-card">
            {/* Service 1: Doctor */}
            <div className="compact-service-row">
              <div className="service-icon-and-title">
                <span className="service-glyph-box" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#004b87"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
                    <path d="M9 12.5v3.5a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-1.5" />
                    <circle cx="16" cy="14.5" r="1.5" fill="#004b87" />
                  </svg>
                </span>
                <span className="service-name-text">Doctor</span>
              </div>
              <span className="service-status-pill status-available">
                Available
              </span>
            </div>

            {/* Service 2: Tests */}
            <div className="compact-service-row">
              <div className="service-icon-and-title">
                <span className="service-glyph-box" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#004b87"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 18h8" />
                    <path d="M3 22h18" />
                    <path d="M14 22a7 7 0 1 0 0-14h-1" />
                    <path d="M9 14h2" />
                    <path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z" />
                    <path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3" />
                  </svg>
                </span>
                <span className="service-name-text">Tests</span>
              </div>
              <span className="service-status-pill status-limited">
                ▲ Limited
              </span>
            </div>

            {/* Service 3: Medicines */}
            <div className="compact-service-row">
              <div className="service-icon-and-title">
                <span className="service-glyph-box" aria-hidden="true">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#004b87"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="4" width="18" height="16" rx="3" />
                    <path d="M12 9v6" stroke="#004b87" strokeWidth="2" />
                    <path d="M9 12h6" stroke="#004b87" strokeWidth="2" />
                  </svg>
                </span>
                <span className="service-name-text">Medicines</span>
              </div>
              <span className="service-status-pill status-available">
                Available
              </span>
            </div>
          </div>
        </section>

        {/* Action Buttons Section */}
        <section className="facility-actions-group">
          {/* Primary Action: Book Appointment */}
          <button
            type="button"
            className="facility-primary-action-btn"
            onClick={handleBookAppointment}
          >
            <svg
              className="action-btn-glyph"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Book Appointment</span>
          </button>

          {/* Secondary Action: Check Available Times */}
          <button
            type="button"
            className="facility-secondary-action-btn"
            onClick={handleCheckTimes}
          >
            <svg
              className="action-btn-glyph"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <path d="m9 16 2 2 4-4" />
            </svg>
            <span>Check Available Times</span>
          </button>

          {/* Dual Secondary Actions: Get Directions & Call */}
          <div className="facility-dual-actions-row">
            <button
              type="button"
              className="facility-outline-tile-btn"
              onClick={handleDirections}
            >
              <svg
                className="action-btn-glyph"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
              <span>Get Directions</span>
            </button>

            <button
              type="button"
              className="facility-outline-tile-btn"
              onClick={handleCallFacility}
            >
              <svg
                className="action-btn-glyph"
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              <span>Call</span>
            </button>
          </div>
        </section>

        {/* Prototype Data Notice Box */}
        <div className="facility-prototype-notice">
          <span className="notice-info-glyph" aria-hidden="true">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#64748b">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </span>
          <p className="notice-info-text">
            <strong>Prototype Data Notice:</strong> Information may not reflect real-time status.
          </p>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
