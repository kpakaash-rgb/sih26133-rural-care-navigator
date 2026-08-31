import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Availability({ onNavigate, bookingData, onUpdateBooking }) {
  const [activeTab, setActiveTab] = useState('services')

  // Appointment Type State ('in_person' | 'teleconsultation')
  const [appointmentType, setAppointmentType] = useState(
    bookingData?.typeKey || 'in_person'
  )

  // Date Selection State ('today' | 'tomorrow' | 'next_available')
  const [selectedDate, setSelectedDate] = useState(
    bookingData?.dateKey || 'today'
  )

  // Time Slot Selection State ('10:00 AM' | '10:30 AM' | '11:00 AM' | '11:30 AM')
  const [selectedTime, setSelectedTime] = useState(
    bookingData?.time || '10:30 AM'
  )

  const dateOptions = [
    { id: 'today', title: 'Today', date: 'Oct 24', fullDate: 'Tuesday, Oct 24' },
    { id: 'tomorrow', title: 'Tomorrow', date: 'Oct 25', fullDate: 'Wednesday, Oct 25' },
    { id: 'next_available', title: 'Next avail', date: 'Oct 26', fullDate: 'Thursday, Oct 26' },
  ]

  const timeSlots = [
    { time: '10:00 AM', status: 'available', label: 'Available' },
    { time: '10:30 AM', status: 'available', label: 'Available' },
    { time: '11:00 AM', status: 'limited', label: 'Limited' },
    { time: '11:30 AM', status: 'unavailable', label: 'Not Available' },
  ]

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    }
  }

  const handleContinueBooking = () => {
    const selectedDateObj = dateOptions.find((d) => d.id === selectedDate)
    const typeLabel = appointmentType === 'in_person' ? 'In-person' : 'Teleconsultation'

    const updatedData = {
      facility: 'PHC Malshiras',
      service: 'General Medicine',
      date: selectedDateObj ? selectedDateObj.fullDate : 'Tuesday, Oct 24',
      dateKey: selectedDate,
      time: selectedTime,
      type: typeLabel,
      typeKey: appointmentType,
    }

    if (onUpdateBooking) {
      onUpdateBooking(updatedData)
    }

    if (onNavigate) {
      onNavigate(SCREENS.BOOKING, updatedData)
    }
  }

  return (
    <div className="availability-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="availability-scrollable-content">
        {/* Page Title */}
        <section className="availability-title-section">
          <h1 className="availability-main-title">When can you visit?</h1>
        </section>

        {/* Facility and Service Info Card */}
        <section className="availability-facility-card">
          <div className="facility-identity-row">
            <span className="facility-plus-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="facility-name-text">PHC Malshiras</span>
          </div>

          <div className="facility-service-row">
            <span className="service-stethoscope-icon" aria-hidden="true">
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
            <span className="service-name-text">General Medicine</span>
          </div>
        </section>

        {/* 1. Appointment Type Section */}
        <section className="availability-section-group">
          <h2 className="availability-section-label">Appointment Type</h2>
          <div className="appointment-type-toggle-row">
            {/* In-person button */}
            <button
              type="button"
              className={`type-toggle-btn ${appointmentType === 'in_person' ? 'active' : ''}`}
              onClick={() => setAppointmentType('in_person')}
              aria-pressed={appointmentType === 'in_person'}
            >
              <span className="type-btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="type-btn-text">In-person</span>
            </button>

            {/* Teleconsultation button */}
            <button
              type="button"
              className={`type-toggle-btn ${appointmentType === 'teleconsultation' ? 'active' : ''}`}
              onClick={() => setAppointmentType('teleconsultation')}
              aria-pressed={appointmentType === 'teleconsultation'}
            >
              <span className="type-btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </span>
              <span className="type-btn-text">Teleconsultation</span>
            </button>
          </div>
        </section>

        {/* 2. Select Date Section */}
        <section className="availability-section-group">
          <h2 className="availability-section-label">Select Date</h2>
          <div className="date-selection-cards-row">
            {dateOptions.map((opt) => {
              const isSelected = selectedDate === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  className={`date-choice-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedDate(opt.id)}
                  aria-pressed={isSelected}
                >
                  <span className="date-card-title">{opt.title}</span>
                  <span className="date-card-sub">{opt.date}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 3. Available Times Section */}
        <section className="availability-section-group">
          <h2 className="availability-section-label">Available Times</h2>
          <div className="available-times-grid">
            {timeSlots.map((slot) => {
              const isSelected = selectedTime === slot.time
              const isUnavailable = slot.status === 'unavailable'

              return (
                <button
                  key={slot.time}
                  type="button"
                  disabled={isUnavailable}
                  className={`time-slot-card ${isSelected ? 'selected' : ''} ${isUnavailable ? 'unavailable' : ''} ${slot.status === 'limited' && !isSelected ? 'limited' : ''}`}
                  onClick={() => {
                    if (!isUnavailable) {
                      setSelectedTime(slot.time)
                    }
                  }}
                  aria-pressed={isSelected}
                  aria-disabled={isUnavailable}
                >
                  <div className="time-slot-header-row">
                    <span className="time-slot-hour">{slot.time}</span>
                    {isSelected && (
                      <span className="time-slot-checkmark" aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </div>
                  <span className="time-slot-status-label">
                    {isSelected ? 'Selected' : slot.label}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        {/* Primary Action Button */}
        <div className="availability-action-container">
          <button
            type="button"
            className="availability-primary-btn"
            onClick={handleContinueBooking}
          >
            Book Appointment
          </button>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
