import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getAppointments, cancelAppointment } from '../../services/api'
import { useTranslation } from '../../i18n'

function formatTime(timeStr) {
  if (!timeStr) return ''
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hour = parseInt(parts[0], 10)
  const minute = parts[1]
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${ampm}`
}

export default function Appointments({ onNavigate }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('journey')
  const [appointments, setAppointments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [cancellingId, setCancellingId] = useState(null)

  const fetchAppointments = async () => {
    setIsLoading(true)
    setErrorMessage('')
    try {
      const data = await getAppointments()
      if (Array.isArray(data)) {
        setAppointments(data)
      } else {
        setAppointments([])
      }
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to load appointments. Please check connection.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    getAppointments()
      .then((data) => {
        if (isMounted) {
          setAppointments(Array.isArray(data) ? data : [])
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(
            err.message || 'Unable to load appointments. Please check connection.'
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

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

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return
    }

    setCancellingId(apptId)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await cancelAppointment(apptId)
      setSuccessMessage('Appointment cancelled successfully.')
      // Refresh appointment data from backend
      await fetchAppointments()
    } catch (err) {
      setErrorMessage(
        err.message || 'Unable to cancel appointment. Please try again.'
      )
    } finally {
      setCancellingId(null)
    }
  }

  const upcomingAppointments = appointments.filter(
    (a) => a.status === 'SCHEDULED' || a.status === 'BOOKED'
  )

  const pastAppointments = appointments.filter(
    (a) => a.status === 'COMPLETED' || a.status === 'CANCELLED'
  )

  return (
    <div className="appointments-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="appointments-scrollable-content">
        {/* Page Title */}
        <section className="appointments-title-section">
          <h1 className="appointments-main-title">{t('appointments.title')}</h1>
        </section>

        {/* Feedback Messages */}
        {successMessage && (
          <div
            role="status"
            style={{
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              borderRadius: '6px',
              padding: '10px 14px',
              margin: '0 16px 12px',
              color: '#065f46',
              fontSize: '13px',
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: '6px',
              padding: '10px 14px',
              margin: '0 16px 12px',
              color: '#991b1b',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          <>
            {/* Section 1: UPCOMING */}
            <section className="appointments-group-section">
              <h2 className="appointments-section-label">{t('appointments.upcoming').toUpperCase()}</h2>

              {upcomingAppointments.length === 0 ? (
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '8px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    margin: '0 16px',
                  }}
                >
                  <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 12px' }}>
                    {t('appointments.noAppointments')}
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate && onNavigate(SCREENS.HEALTHCARE)}
                    style={{
                      backgroundColor: '#004b87',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {t('healthcare.title')}
                  </button>
                </div>
              ) : (
                upcomingAppointments.map((appt) => {
                  const facilityName =
                    appt.facility_name || appt.facility?.name || 'Healthcare Facility'
                  const serviceName =
                    appt.service_name || appt.service?.name || 'General Medicine'
                  const timeDisplay =
                    appt.start_time && appt.end_time
                      ? `${formatTime(appt.start_time)} - ${formatTime(appt.end_time)}`
                      : formatTime(appt.start_time) || '10:00 AM'
                  const dateDisplay = appt.appointment_date || 'Upcoming'
                  const isCancelling = cancellingId === appt.id

                  return (
                    <article key={appt.id} className="upcoming-appointment-card">
                      {/* Header: Title, Service, and Status Badge */}
                      <div className="appointment-card-top-row">
                        <div className="appointment-identity">
                          <h3 className="appointment-facility-name">{facilityName}</h3>
                          <p className="appointment-service-name">{serviceName}</p>
                        </div>
                        <div className="appointment-confirmed-badge">
                          <span className="confirmed-badge-check" aria-hidden="true">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="16 10 11 15 8 12" />
                            </svg>
                          </span>
                          <span>{appt.status}</span>
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
                          <span>{dateDisplay}</span>
                        </div>

                        <div className="meta-chip-item">
                          <span className="meta-chip-icon" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </span>
                          <span>{timeDisplay}</span>
                        </div>
                      </div>

                      {/* Meta Row: Type / Appointment ID */}
                      <div className="appointment-type-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="type-pin-icon" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                              <circle cx="12" cy="10" r="3" />
                            </svg>
                          </span>
                          <span className="type-text-label">In-person</span>
                        </div>
                        <span style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600 }}>
                          APT #{appt.id}
                        </span>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="appointment-card-action" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="appointment-view-details-btn"
                          onClick={handleViewDetails}
                          style={{ flex: 1 }}
                        >
                          {t('healthJourney.title')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(appt.id)}
                          disabled={isCancelling}
                          style={{
                            flex: 1,
                            backgroundColor: '#fff',
                            border: '1px solid #ef4444',
                            color: '#b91c1c',
                            borderRadius: '6px',
                            padding: '9px 12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: isCancelling ? 'wait' : 'pointer',
                            opacity: isCancelling ? 0.6 : 1,
                          }}
                        >
                          {isCancelling ? t('common.loading') : t('appointments.cancelAppointment')}
                        </button>
                      </div>
                    </article>
                  )
                })
              )}
            </section>

            {/* Section 2: PAST / CANCELLED APPOINTMENTS */}
            {pastAppointments.length > 0 && (
              <section className="appointments-group-section">
                <h2 className="appointments-section-label">{t('appointments.past').toUpperCase()}</h2>

                {pastAppointments.map((past) => {
                  const isCancelled = past.status === 'CANCELLED'
                  const facName = past.facility_name || past.facility?.name || 'Healthcare Facility'
                  const srvName = past.service_name || past.service?.name || 'General Medicine'

                  return (
                    <article key={past.id} className="past-appointment-card">
                      <div className="appointment-card-top-row">
                        <div className="appointment-identity">
                          <h3 className="past-facility-name">{facName}</h3>
                          <p className="past-service-name">
                            {srvName} • {past.appointment_date}
                          </p>
                        </div>
                        <span
                          className="past-completed-badge"
                          style={{
                            backgroundColor: isCancelled ? '#fee2e2' : '#f1f5f9',
                            color: isCancelled ? '#b91c1c' : '#475569',
                          }}
                        >
                          {past.status}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </section>
            )}
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

