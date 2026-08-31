import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function AppointmentConfirmed({ onNavigate, bookingData }) {
  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleViewAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.APPOINTMENTS)
    }
  }

  const handleGetDirections = () => {
    window.open('https://maps.google.com/?q=PHC+Malshiras', '_blank')
  }

  const handleBackToHome = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  // Appointment details with fallbacks matching Stitch reference
  const appointmentDetails = {
    facility: bookingData?.facility || 'PHC Malshiras',
    facilityType: 'Primary Health Centre',
    service: bookingData?.service || 'General Medicine',
    type: bookingData?.type || 'In-person',
    date: bookingData?.date
      ? bookingData.date.replace('Tuesday', 'Tue').replace('Wednesday', 'Wed').replace('Thursday', 'Thu')
      : 'Tue, Oct 24',
    time: bookingData?.time || '10:30 AM',
  }

  return (
    <div className="confirmed-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="confirmed-scrollable-content">
        {/* Confirmation Hero Section */}
        <section className="confirmed-hero-section">
          <div className="confirmed-badge-box" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="confirmed-main-title">Appointment Confirmed</h1>
          <p className="confirmed-subtitle">Your visit has been booked.</p>
        </section>

        {/* Appointment Summary Card */}
        <article className="confirmed-summary-card">
          {/* Top: Facility Identity */}
          <div className="confirmed-facility-header">
            <div className="confirmed-facility-title-row">
              <span className="confirmed-clinic-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                  <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                  <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </span>
              <h2 className="confirmed-facility-name">{appointmentDetails.facility}</h2>
            </div>
            <p className="confirmed-facility-type">{appointmentDetails.facilityType}</p>
          </div>

          <div className="confirmed-card-divider" />

          {/* Row 1: Service & Type Grid */}
          <div className="confirmed-grid-row">
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">SERVICE</span>
              <span className="confirmed-grid-value">{appointmentDetails.service}</span>
            </div>
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">TYPE</span>
              <span className="confirmed-grid-value">{appointmentDetails.type}</span>
            </div>
          </div>

          <div className="confirmed-card-divider" />

          {/* Row 2: Date & Time Grid */}
          <div className="confirmed-grid-row">
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">DATE</span>
              <span className="confirmed-grid-value-bold">{appointmentDetails.date}</span>
            </div>
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">TIME</span>
              <span className="confirmed-grid-value-bold">{appointmentDetails.time}</span>
            </div>
          </div>

          {/* Notice Pill at Bottom of Card */}
          <div className="confirmed-notice-pill">
            <span className="notice-pill-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </span>
            <span className="notice-pill-text">Please arrive a little early.</span>
          </div>
        </article>

        {/* Action Buttons Section */}
        <section className="confirmed-actions-group">
          {/* Primary Action: View My Appointment */}
          <button
            type="button"
            className="confirmed-primary-btn"
            onClick={handleViewAppointment}
          >
            View My Appointment
          </button>

          {/* Secondary Action: Get Directions */}
          <button
            type="button"
            className="confirmed-directions-btn"
            onClick={handleGetDirections}
          >
            <span className="btn-glyph-directions" aria-hidden="true">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </span>
            <span>Get Directions</span>
          </button>

          {/* Text Action: Back to Home */}
          <button
            type="button"
            className="confirmed-home-link-btn"
            onClick={handleBackToHome}
          >
            Back to Home
          </button>
        </section>
      </main>
    </div>
  )
}
