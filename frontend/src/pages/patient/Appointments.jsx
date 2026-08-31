import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Appointments({ onNavigate, bookingData }) {
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

  const handleViewDetails = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTH_JOURNEY)
    }
  }

  const upcomingAppointment = {
    facility: bookingData?.facility || 'PHC Malshiras',
    service: bookingData?.service || 'General Medicine',
    status: 'Confirmed',
    date: bookingData?.date
      ? bookingData.date.replace('Tuesday', 'Tue').replace('Wednesday', 'Wed').replace('Thursday', 'Thu')
      : 'Tue, Oct 24',
    time: bookingData?.time || '10:30 AM',
    type: bookingData?.type || 'In-person',
  }

  const pastAppointments = [
    {
      id: 'past-1',
      facility: 'PHC Example',
      service: 'General Medicine',
      status: 'Completed',
    },
  ]

  return (
    <div className="appointments-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="appointments-scrollable-content">
        {/* Page Title */}
        <section className="appointments-title-section">
          <h1 className="appointments-main-title">My Appointments</h1>
        </section>

        {/* Section 1: UPCOMING */}
        <section className="appointments-group-section">
          <h2 className="appointments-section-label">UPCOMING</h2>

          {/* Upcoming Appointment Card */}
          <article className="upcoming-appointment-card">
            {/* Header: Title, Service, and Status Badge */}
            <div className="appointment-card-top-row">
              <div className="appointment-identity">
                <h3 className="appointment-facility-name">{upcomingAppointment.facility}</h3>
                <p className="appointment-service-name">{upcomingAppointment.service}</p>
              </div>
              <div className="appointment-confirmed-badge">
                <span className="confirmed-badge-check" aria-hidden="true">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="16 10 11 15 8 12" />
                  </svg>
                </span>
                <span>{upcomingAppointment.status}</span>
              </div>
            </div>

            {/* Meta Row: Date & Time */}
            <div className="appointment-meta-inline-row">
              <div className="meta-chip-item">
                <span className="meta-chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </span>
                <span>{upcomingAppointment.date}</span>
              </div>

              <div className="meta-chip-item">
                <span className="meta-chip-icon" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </span>
                <span>{upcomingAppointment.time}</span>
              </div>
            </div>

            {/* Meta Row: Type / Location */}
            <div className="appointment-type-row">
              <span className="type-pin-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              </span>
              <span className="type-text-label">{upcomingAppointment.type}</span>
            </div>

            {/* Card Action Button */}
            <div className="appointment-card-action">
              <button
                type="button"
                className="appointment-view-details-btn"
                onClick={handleViewDetails}
              >
                View Details
              </button>
            </div>
          </article>
        </section>

        {/* Section 2: PAST APPOINTMENTS */}
        <section className="appointments-group-section">
          <h2 className="appointments-section-label">PAST APPOINTMENTS</h2>

          {pastAppointments.map((past) => (
            <article key={past.id} className="past-appointment-card">
              <div className="appointment-card-top-row">
                <div className="appointment-identity">
                  <h3 className="past-facility-name">{past.facility}</h3>
                  <p className="past-service-name">{past.service}</p>
                </div>
                <span className="past-completed-badge">{past.status}</span>
              </div>
            </article>
          ))}
        </section>
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
