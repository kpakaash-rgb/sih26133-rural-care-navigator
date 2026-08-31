import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Booking({ onNavigate, bookingData }) {
  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleBack = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const handleConfirmAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.APPOINTMENT_CONFIRMED)
    }
  }

  const handleChangeTime = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  // Fallback defaults matching Stitch reference
  const appointmentDetails = {
    facility: bookingData?.facility || 'PHC Malshiras',
    service: bookingData?.service || 'General Medicine',
    date: bookingData?.date || 'Tuesday, Oct 24',
    time: bookingData?.time || '10:30 AM',
    type: bookingData?.type || 'In-person',
    typeKey: bookingData?.typeKey || 'in_person',
  }

  // Format date display (split into day and date if comma present)
  const dateParts = appointmentDetails.date.includes(',')
    ? appointmentDetails.date.split(',').map((s) => s.trim())
    : [appointmentDetails.date, '']

  return (
    <div className="booking-screen-wrapper">
      {/* Top Header with Back Arrow and SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        showBack
        onBack={handleBack}
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="booking-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="booking-intro-section">
          <h1 className="booking-main-title">Book Your Visit</h1>
          <p className="booking-subtitle">
            Review your appointment details before confirming.
          </p>
        </section>

        {/* Form Guide Label */}
        <div className="booking-check-label-row">
          <span className="booking-check-label">Please check your details.</span>
        </div>

        {/* Appointment Details Summary Card */}
        <article className="booking-summary-card">
          {/* Card Section 1: Facility */}
          <div className="summary-place-section">
            <div className="summary-calendar-icon-box" aria-hidden="true">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#004b87"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <polyline points="9 16 11 18 15 14" />
              </svg>
            </div>

            <div className="summary-place-info">
              <span className="summary-field-label">Place</span>
              <h2 className="summary-place-name">{appointmentDetails.facility}</h2>
            </div>
          </div>

          <div className="summary-card-divider" />

          {/* Card Section 2: Doctor / Service */}
          <div className="summary-service-section">
            <span className="summary-field-label">Doctor / Service</span>
            <div className="summary-service-row">
              <span className="summary-stethoscope-glyph" aria-hidden="true">
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
              <span className="summary-service-name">{appointmentDetails.service}</span>
            </div>
          </div>

          <div className="summary-card-divider" />

          {/* Card Section 3: Date & Time Grid */}
          <div className="summary-datetime-grid">
            {/* Date Column */}
            <div className="summary-date-col">
              <span className="summary-field-label">Date</span>
              <div className="summary-date-value">
                {dateParts[0] && <span>{dateParts[0]},</span>}
                {dateParts[1] ? <span>{dateParts[1]}</span> : <span>{appointmentDetails.date}</span>}
              </div>
            </div>

            {/* Time Column */}
            <div className="summary-time-col">
              <span className="summary-field-label">Time</span>
              <span className="summary-time-value">{appointmentDetails.time}</span>
            </div>
          </div>

          <div className="summary-card-divider" />

          {/* Card Section 4: Appointment Type */}
          <div className="summary-type-section">
            <span className="summary-field-label">Type</span>
            <div className="summary-type-pill">
              <span className="type-pill-icon" aria-hidden="true">
                {appointmentDetails.typeKey === 'teleconsultation' ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="23 7 16 12 23 17 23 7" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                )}
              </span>
              <span className="type-pill-label">{appointmentDetails.type}</span>
            </div>
          </div>
        </article>

        {/* Action Buttons Section */}
        <section className="booking-actions-group">
          {/* Primary Action: Confirm Appointment */}
          <button
            type="button"
            className="booking-confirm-btn"
            onClick={handleConfirmAppointment}
          >
            <span className="btn-glyph-circle-check" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 10 11 15 8 12" />
              </svg>
            </span>
            <span>Confirm Appointment</span>
          </button>

          {/* Secondary Action: Change Time */}
          <button
            type="button"
            className="booking-change-time-btn"
            onClick={handleChangeTime}
          >
            <span className="btn-glyph-calendar-edit" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <path d="M12 14h.01" />
                <path d="M16 14h.01" />
                <path d="M8 18h.01" />
                <path d="M12 18h.01" />
              </svg>
            </span>
            <span>Change Time</span>
          </button>
        </section>
      </main>
    </div>
  )
}
