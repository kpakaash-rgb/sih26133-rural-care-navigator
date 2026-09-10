import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { bookAppointment } from '../../services/api'
import { useTranslation } from '../../i18n'

export default function Booking({ onNavigate, bookingData }) {
  const { t } = useTranslation()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [isConflict, setIsConflict] = useState(false)

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleBack = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const handleChangeTime = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const handleConfirmAppointment = async () => {
    const token = localStorage.getItem('access_token')
    if (!token) {
      setErrorMessage('Please log in with your mobile number before booking an appointment.')
      return
    }

    if (!bookingData?.facilityId || !bookingData?.serviceId || !bookingData?.slotId) {
      setErrorMessage('Missing booking details. Please select an available slot.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')
    setIsConflict(false)

    try {
      const appointment = await bookAppointment({
        facility_id: bookingData.facilityId,
        service_id: bookingData.serviceId,
        availability_slot_id: bookingData.slotId,
      })

      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENT_CONFIRMED, {
          ...bookingData,
          createdAppointment: appointment,
          appointmentId: appointment.id,
          status: appointment.status,
        })
      }
    } catch (err) {
      if (
        err.status === 409 ||
        err.message?.toLowerCase().includes('already') ||
        err.message?.toLowerCase().includes('conflict') ||
        err.message?.toLowerCase().includes('cannot be booked')
      ) {
        setErrorMessage('That slot is no longer available. Please choose another slot.')
        setIsConflict(true)
      } else {
        setErrorMessage(
          err.message || 'Unable to book appointment. Please check connection and try again.'
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Derive real appointment details from selected availability slot and booking context
  const appointmentDetails = {
    facility: bookingData?.facility || 'Healthcare Facility',
    service: bookingData?.service || 'General Medicine',
    date: bookingData?.date || (bookingData?.selectedSlot?.date ? bookingData.selectedSlot.date : ''),
    time: bookingData?.time || (bookingData?.selectedSlot?.start_time ? bookingData.selectedSlot.start_time : ''),
    type: bookingData?.type || 'In-person',
    typeKey: bookingData?.typeKey || 'in_person',
  }

  // Format date display cleanly without duplicating date strings or trailing commas
  const formatDateDisplay = (dateValue) => {
    if (!dateValue) return { day: '', dateText: '—' }
    if (dateValue.includes(',')) {
      const parts = dateValue.split(',').map((s) => s.trim())
      return { day: parts[0], dateText: parts.slice(1).join(', ') }
    }
    try {
      const d = new Date(dateValue + 'T00:00:00')
      if (!isNaN(d.getTime())) {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        return {
          day: days[d.getDay()],
          dateText: `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
        }
      }
    } catch {
      // fallback
    }
    return { day: '', dateText: dateValue }
  }

  const { day: dateDay, dateText } = formatDateDisplay(appointmentDetails.date)

  return (
    <div className="booking-screen-wrapper">
      {/* Top Header with Back Arrow and SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        showBack
        onBack={handleBack}
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="booking-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="booking-intro-section">
          <h1 className="booking-main-title">{t('booking.title')}</h1>
          <p className="booking-subtitle">
            {t('booking.subtitle')}
          </p>
        </section>

        {/* Error / Conflict Alert Banner */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: isConflict ? '#fffbeb' : '#fee2e2',
              border: `1px solid ${isConflict ? '#fde68a' : '#f87171'}`,
              borderRadius: '6px',
              padding: '12px 14px',
              margin: '0 16px 16px',
              color: isConflict ? '#92400e' : '#991b1b',
              fontSize: '13px',
              lineHeight: 1.4,
            }}
          >
            <p style={{ fontWeight: 600, margin: '0 0 6px' }}>
              {isConflict ? 'Slot Unavailable' : t('common.error')}
            </p>
            <p style={{ margin: 0 }}>{errorMessage}</p>
            {isConflict && (
              <button
                type="button"
                onClick={handleChangeTime}
                style={{
                  marginTop: '8px',
                  backgroundColor: '#92400e',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Choose Another Slot →
              </button>
            )}
          </div>
        )}

        {/* Form Guide Label */}
        <div className="booking-check-label-row">
          <span className="booking-check-label">{t('booking.subtitle')}</span>
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
              <span className="summary-field-label">{t('booking.facility')}</span>
              <h2 className="summary-place-name">{appointmentDetails.facility}</h2>
            </div>
          </div>

          <div className="summary-card-divider" />

          {/* Card Section 2: Doctor / Service */}
          <div className="summary-service-section">
            <span className="summary-field-label">{t('booking.service')}</span>
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
              <span className="summary-field-label">{t('booking.date')}</span>
              <div className="summary-date-value">
                {dateDay && <span>{dateDay}, </span>}
                <span>{dateText}</span>
              </div>
            </div>

            {/* Time Column */}
            <div className="summary-time-col">
              <span className="summary-field-label">{t('booking.time')}</span>
              <span className="summary-time-value">{appointmentDetails.time || '—'}</span>
            </div>
          </div>

          <div className="summary-card-divider" />

          {/* Card Section 4: Appointment Type */}
          <div className="summary-type-section">
            <span className="summary-field-label">{t('common.status')}</span>
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
            disabled={isSubmitting || isConflict}
            onClick={handleConfirmAppointment}
            style={{
              opacity: isSubmitting || isConflict ? 0.6 : 1,
              cursor: isSubmitting ? 'wait' : isConflict ? 'not-allowed' : 'pointer',
            }}
          >
            <span className="btn-glyph-circle-check" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="16 10 11 15 8 12" />
              </svg>
            </span>
            <span>{isSubmitting ? t('booking.bookingInProgress') : t('booking.confirmBooking')}</span>
          </button>

          {/* Secondary Action: Change Time */}
          <button
            type="button"
            className="booking-change-time-btn"
            disabled={isSubmitting}
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
            <span>{t('availability.selectDate')}</span>
          </button>
        </section>
      </main>
    </div>
  )
}

