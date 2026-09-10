import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getPatientReferrals, cancelReferral } from '../../services/api'
import { useTranslation } from '../../i18n'

export default function TrackReferral({ onNavigate, referral: propReferral }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('journey')
  const [referrals, setReferrals] = useState(propReferral ? [propReferral] : [])
  const [selectedReferral, setSelectedReferral] = useState(propReferral || null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)

  const reloadReferrals = async () => {
    try {
      const data = await getPatientReferrals()
      if (Array.isArray(data) && data.length > 0) {
        setReferrals(data)
        const match = propReferral ? data.find((r) => r.id === propReferral.id) : null
        setSelectedReferral(match || data[0])
      } else {
        setReferrals([])
        setSelectedReferral(null)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load referrals. Please check connection.')
    }
  }

  useEffect(() => {
    let isMounted = true

    getPatientReferrals()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setReferrals(data)
            const match = propReferral ? data.find((r) => r.id === propReferral.id) : null
            setSelectedReferral(match || data[0])
          } else {
            setReferrals([])
            setSelectedReferral(null)
          }
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Unable to load referrals. Please check connection.')
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [propReferral])



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
      if (selectedReferral?.to_facility) {
        onNavigate(SCREENS.FACILITY_DETAILS, { facility: selectedReferral.to_facility })
      } else {
        onNavigate(SCREENS.FACILITY_DETAILS)
      }
    }
  }

  const handleBookAppointment = () => {
    if (onNavigate) {
      if (selectedReferral?.to_facility?.name) {
        onNavigate(SCREENS.AVAILABILITY, { facility: selectedReferral.to_facility.name })
      } else {
        onNavigate(SCREENS.AVAILABILITY)
      }
    }
  }

  const handleCancelReferral = async () => {
    if (!selectedReferral) return
    if (!window.confirm('Are you sure you want to cancel this referral request?')) return

    setIsCancelling(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      await cancelReferral(selectedReferral.id)
      setSuccessMessage('Referral request cancelled successfully.')
      await reloadReferrals()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel referral. Please try again.')
    } finally {
      setIsCancelling(false)
    }
  }

  const fromFacilityName = selectedReferral?.from_facility?.name || (selectedReferral?.from_facility_id ? `Facility #${selectedReferral.from_facility_id}` : 'Primary Health Centre')
  const toFacilityName = selectedReferral?.to_facility?.name || (selectedReferral?.to_facility_id ? `Facility #${selectedReferral.to_facility_id}` : 'District Hospital')
  const referralReason = selectedReferral?.reason || 'Specialist consultation'
  const referralStatus = selectedReferral?.status || 'PENDING'
  const isCancelled = referralStatus === 'CANCELLED'

  const referralSteps = [
    {
      id: 'step-1',
      title: 'Referral Created',
      description: selectedReferral?.created_at
        ? `Initiated on ${new Date(selectedReferral.created_at).toLocaleDateString()}`
        : 'Doctor initiated the transfer.',
      status: 'completed',
    },
    {
      id: 'step-2',
      title: 'Referral Sent',
      description: isCancelled ? 'Referral was cancelled.' : 'Details forwarded to destination.',
      status: isCancelled ? 'cancelled' : 'completed',
    },
    {
      id: 'step-3',
      title: 'Facility Received',
      description: isCancelled
        ? 'Transfer discontinued.'
        : referralStatus === 'ACCEPTED' || referralStatus === 'COMPLETED'
        ? `${toFacilityName} accepted request.`
        : 'Awaiting acknowledgment from facility.',
      status: referralStatus === 'ACCEPTED' || referralStatus === 'COMPLETED' ? 'completed' : isCancelled ? 'cancelled' : 'pending',
    },
    {
      id: 'step-4',
      title: 'Appointment / Visit',
      description: referralStatus === 'COMPLETED'
        ? 'Consultation completed.'
        : isCancelled
        ? 'No visit required.'
        : 'Pending your arrival.',
      status: referralStatus === 'COMPLETED' ? 'completed' : 'pending',
    },
  ]

  return (
    <div className="track-referral-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="track-referral-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="track-referral-header-section">
          <h1 className="track-referral-main-title">{t('referral.trackTitle')}</h1>
          <p className="track-referral-subtitle">
            {isCancelled
              ? 'This referral has been cancelled.'
              : t('referral.notes')}
          </p>
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
              color: '#065f46',
              fontSize: '13.5px',
            }}
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#991b1b',
              fontSize: '13.5px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
            <p>{t('common.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !selectedReferral && (
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
              {t('home.trackReferralDesc')}
            </p>
            <button
              type="button"
              className="track-book-btn"
              onClick={() => onNavigate && onNavigate(SCREENS.HEALTHCARE)}
            >
              {t('home.findCare')}
            </button>
          </div>
        )}

        {/* Referral Information Summary Card */}
        {selectedReferral && !isLoading && (
          <>
            {/* Multiple referrals selector if more than 1 */}
            {referrals.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {referrals.map((refItem) => (
                  <button
                    key={refItem.id}
                    type="button"
                    onClick={() => setSelectedReferral(refItem)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: refItem.id === selectedReferral.id ? '2px solid #004b87' : '1px solid #cbd5e1',
                      backgroundColor: refItem.id === selectedReferral.id ? '#eff6ff' : '#ffffff',
                      color: refItem.id === selectedReferral.id ? '#004b87' : '#475569',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Referral #{refItem.id} ({refItem.status})
                  </button>
                ))}
              </div>
            )}

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
                    <span className="track-node-label">{t('referral.fromFacility')}</span>
                    <h2 className="track-facility-title">{fromFacilityName}</h2>
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
                    <span className="track-node-label">{t('referral.toFacility')}</span>
                    <h2 className="track-facility-title">{toFacilityName}</h2>
                  </div>
                </div>
              </div>

              <div className="track-card-divider" />

              {/* Type Badge Section */}
              <div className="track-type-section">
                <span className="track-type-label">{t('referral.priority')}</span>
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
                  <span className="track-type-text">{referralReason} ({selectedReferral.priority})</span>
                </div>
              </div>
            </article>

            {/* Referral Status Timeline Section */}
            <section className="track-timeline-section">
              <h2 className="track-timeline-heading">{t('healthJourney.timeline')}</h2>

              <div className="track-timeline-container">
                {referralSteps.map((step, index) => {
                  const isLast = index === referralSteps.length - 1
                  const isCompleted = step.status === 'completed'
                  const isCancelledStep = step.status === 'cancelled'

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
                        ) : isCancelledStep ? (
                          <div className="track-step-circle" style={{ backgroundColor: '#ef4444', color: '#ffffff' }} aria-hidden="true">
                            <span style={{ fontSize: '10px', fontWeight: 'bold' }}>✕</span>
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
                <span>{t('healthcare.viewDetails')}</span>
              </button>

              {/* Primary Action: Book Appointment */}
              {!isCancelled && (
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
                  <span>{t('booking.confirmBooking')}</span>
                </button>
              )}

              {/* Cancel Referral Action */}
              {(referralStatus === 'PENDING' || referralStatus === 'ACTIVE') && (
                <button
                  type="button"
                  onClick={handleCancelReferral}
                  disabled={isCancelling}
                  style={{
                    width: '100%',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    border: '1px solid #fca5a5',
                    borderRadius: '8px',
                    padding: '11px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isCancelling ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isCancelling ? t('common.loading') : t('common.cancel')}
                </button>
              )}
            </section>
          </>
        )}
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

