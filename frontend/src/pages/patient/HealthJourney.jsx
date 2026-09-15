import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getHealthJourney } from '../../services/api'
import { useTranslation } from '../../i18n'

function formatEventDate(dateStr) {
  if (!dateStr) return 'Recent'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function getEventBadge(eventType, t) {
  switch (eventType) {
    case 'CARE_COMPLETED':
      return t ? t('appointmentConfirmed.status') : 'Completed'
    case 'APPOINTMENT':
      return t ? t('nav.appointments') : 'Appointment'
    case 'REFERRAL':
      return t ? t('referral.title') : 'Referral'
    case 'FOLLOW_UP':
      return t ? t('followUp.title') : 'Follow-up'
    case 'REGISTRATION':
      return t ? t('auth.register') : 'Registration'
    default:
      return null
  }
}

export default function HealthJourney({ onNavigate }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('journey')
  const [events, setEvents] = useState([])
  const [selectedFilter, setSelectedFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [isSessionExpired, setIsSessionExpired] = useState(false)

  useEffect(() => {
    let isMounted = true

    const typeParam = selectedFilter && selectedFilter !== 'ALL' ? selectedFilter : undefined
    getHealthJourney(typeParam)
      .then((data) => {
        if (isMounted) {
          setEvents(Array.isArray(data) ? data : [])
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          if (
            err.status === 401 ||
            err.message?.toLowerCase().includes('expired') ||
            err.message?.toLowerCase().includes('unauthorized') ||
            err.message?.toLowerCase().includes('token')
          ) {
            setIsSessionExpired(true)
            setErrorMessage('Your session has expired. Please sign in again to continue.')
          } else {
            setErrorMessage(err.message || 'Unable to load health journey timeline.')
          }
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedFilter])



  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (!onNavigate) return
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      onNavigate(SCREENS.HOME)
    } else if (tabId === 'services' || tabId === SCREENS.HEALTHCARE) {
      onNavigate(SCREENS.HEALTHCARE)
    } else if (tabId === 'journey' || tabId === SCREENS.HEALTH_JOURNEY) {
      onNavigate(SCREENS.HEALTH_JOURNEY)
    } else if (tabId === 'profile' || tabId === SCREENS.ABHA) {
      onNavigate(SCREENS.ABHA)
    } else {
      onNavigate(tabId)
    }
  }

  const handleSignInAgain = () => {
    if (onNavigate) {
      onNavigate(SCREENS.LOGIN, { returnScreen: SCREENS.HEALTH_JOURNEY })
    }
  }

  // Derive next step recommendation based on latest journey events
  const latestReferral = events.find((e) => e.event_type === 'REFERRAL')
  const latestFollowUp = events.find((e) => e.event_type === 'FOLLOW_UP')
  const latestAppointment = events.find((e) => e.event_type === 'APPOINTMENT')

  let nextStepTitle = 'General Care & Consultation'
  let nextStepDesc = 'Keep track of your health checkups and consult doctors regularly at nearby facilities.'
  let nextStepActionLabel = t('home.findCare')
  let nextStepAction = () => onNavigate && onNavigate(SCREENS.HEALTHCARE)

  if (latestReferral) {
    nextStepTitle = 'Specialist Consultation'
    nextStepDesc = latestReferral.description || 'Your doctor referred you to a specialist. Please schedule this visit to continue care.'
    nextStepActionLabel = t('referral.title')
    nextStepAction = () => onNavigate && onNavigate(SCREENS.TRACK_REFERRAL, { referral: latestReferral })
  } else if (latestFollowUp) {
    nextStepTitle = 'Health Follow-up'
    nextStepDesc = latestFollowUp.description || 'Routine follow-up scheduled to check your health recovery.'
    nextStepActionLabel = t('followUp.title')
    nextStepAction = () => onNavigate && onNavigate(SCREENS.FOLLOW_UP)
  } else if (latestAppointment) {
    nextStepTitle = 'Upcoming Visit'
    nextStepDesc = `${latestAppointment.facility_name || 'Healthcare Facility'} — ${latestAppointment.service_name || 'General Medicine'}`
    nextStepActionLabel = t('nav.appointments')
    nextStepAction = () => onNavigate && onNavigate(SCREENS.APPOINTMENTS)
  }

  const filterOptions = [
    { key: 'ALL', label: t('common.viewAll') },
    { key: 'APPOINTMENT', label: t('nav.appointments') },
    { key: 'REFERRAL', label: t('referral.title') },
    { key: 'FOLLOW_UP', label: t('followUp.title') },
  ]

  return (
    <div className="journey-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="journey-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="journey-header-section">
          <h1 className="journey-main-title">{t('healthJourney.title')}</h1>
          <p className="journey-subtitle">
            {t('healthJourney.subtitle')}
          </p>
        </section>

        {/* Next Step Prominent Action Card */}
        <section className="journey-next-step-card">
          <div className="next-step-header-row">
            <div className="next-step-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="next-step-title-group">
              <span className="next-step-label">{t('careGuidance.recommendedAction')}:</span>
              <h2 className="next-step-heading">{nextStepTitle}</h2>
            </div>
          </div>

          <p className="next-step-description">
            {nextStepDesc}
          </p>

          <button
            type="button"
            className="next-step-action-btn"
            onClick={nextStepAction}
          >
            {nextStepActionLabel}
          </button>
        </section>

        {/* Event Type Filter Pills with smooth touch horizontal scroll and hidden scrollbar */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            padding: '2px 0 6px',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch',
            maxWidth: '100%',
          }}
        >
          {filterOptions.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSelectedFilter(opt.key)}
              style={{
                padding: '6px 14px',
                borderRadius: '9999px',
                border: selectedFilter === opt.key ? '1.5px solid #004b87' : '1px solid #cbd5e1',
                backgroundColor: selectedFilter === opt.key ? '#004b87' : '#ffffff',
                color: selectedFilter === opt.key ? '#ffffff' : '#475569',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                flexShrink: 0,
                minHeight: '34px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Error State */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px 14px',
              color: '#991b1b',
              fontSize: '13.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>{errorMessage}</span>
            {isSessionExpired && (
              <button
                type="button"
                onClick={handleSignInAgain}
                style={{
                  alignSelf: 'flex-start',
                  backgroundColor: '#004b87',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '6px 14px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Sign In Again →
              </button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
            <p>{t('common.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && events.length === 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
              color: '#475569',
            }}
          >
            <p style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a', marginBottom: '6px' }}>
              {t('common.noData')}
            </p>
            <p style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px' }}>
              {t('healthJourney.subtitle')}
            </p>
            <button
              type="button"
              className="next-step-action-btn"
              onClick={() => onNavigate && onNavigate(SCREENS.SYMPTOMS)}
            >
              {t('symptoms.checkCareOptions')}
            </button>
          </div>
        )}

        {/* Timeline Section */}
        {!isLoading && events.length > 0 && (
          <section className="journey-timeline-section">
            <h2 className="journey-timeline-heading">{t('healthJourney.timeline')}</h2>

            <div className="journey-timeline-container">
              {events.map((item, index) => {
                const isLast = index === events.length - 1
                const badge = getEventBadge(item.event_type, t)
                const formattedDate = formatEventDate(item.event_date || item.created_at)

                return (
                  <div key={item.id} className="timeline-node-wrapper">
                    {/* Timeline Indicator Column */}
                    <div className="timeline-indicator-col">
                      <div className="timeline-check-circle" aria-hidden="true">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                      {!isLast && <div className="timeline-vertical-line" aria-hidden="true" />}
                    </div>

                    {/* Timeline Event Card */}
                    <article className="timeline-event-card">
                      <div className="timeline-event-header-row">
                        <span className="timeline-event-date">{formattedDate}</span>
                        {badge && (
                          <span className="timeline-event-badge">{badge}</span>
                        )}
                      </div>
                      <h3 className="timeline-event-title">{item.title}</h3>
                      {item.description && (
                        <p className="timeline-event-desc">{item.description}</p>
                      )}
                    </article>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

