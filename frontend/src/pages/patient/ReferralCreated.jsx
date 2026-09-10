import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getPatientReferrals } from '../../services/api'
import { useTranslation } from '../../i18n'

export default function ReferralCreated({ onNavigate, referral: propReferral }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [referral, setReferral] = useState(propReferral || null)
  const [isLoading, setIsLoading] = useState(!propReferral)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    getPatientReferrals()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            // If propReferral matches an existing referral, preserve it, else pick the latest
            const match = propReferral ? data.find((r) => r.id === propReferral.id) : null
            setReferral(match || data[0])
          } else {
            setReferral(null)
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
    } else if (tabId === 'journey') {
      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENTS)
      }
    }
  }

  const handleViewReferral = () => {
    if (onNavigate && SCREENS.TRACK_REFERRAL) {
      onNavigate(SCREENS.TRACK_REFERRAL, { referral })
    }
  }

  const handleGetDirections = () => {
    const destination = referral?.to_facility?.name || 'District Hospital'
    window.open(`https://maps.google.com/?q=${encodeURIComponent(destination)}`, '_blank')
  }

  const referredFrom = referral?.from_facility?.name || (referral?.from_facility_id ? `Facility #${referral.from_facility_id}` : 'Primary Health Centre')
  const referredTo = referral?.to_facility?.name || (referral?.to_facility_id ? `Facility #${referral.to_facility_id}` : 'District Hospital')
  const referralReason = referral?.reason || 'Specialist consultation'
  const referralStatus = referral?.status ? referral.status.replace(/_/g, ' ') : 'Referral sent'
  const referralPriority = referral?.priority || 'ROUTINE'

  return (
    <div className="referral-created-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="referral-created-scrollable-content">
        {/* Confirmation Hero Section */}
        <section className="referral-hero-section">
          <div className="referral-badge-box" aria-hidden="true">
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
          <h1 className="referral-main-title">{t('referral.title')}</h1>
          <p className="referral-subtitle">
            {referral
              ? t('home.trackReferralDesc')
              : t('referral.notes')}
          </p>
        </section>

        {/* Loading / Error States */}
        {isLoading && (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b' }}>
            <p>{t('common.loading')}</p>
          </div>
        )}

        {errorMessage && !isLoading && (
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

        {!isLoading && !errorMessage && !referral && (
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
              className="referral-primary-btn"
              onClick={() => onNavigate && onNavigate(SCREENS.HEALTHCARE)}
            >
              {t('home.findCare')}
            </button>
          </div>
        )}

        {/* Referral Information Card */}
        {referral && !isLoading && (
          <article className="referral-info-card">
            {/* Facility Route Section */}
            <div className="referral-route-container">
              {/* Referred From */}
              <div className="referral-route-node">
                <span className="route-node-label">{t('referral.fromFacility')}</span>
                <div className="route-facility-row">
                  <span className="route-hospital-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 21h18" />
                      <path d="M5 21V7l8-4v18" />
                      <path d="M19 21V11l-6-4" />
                      <line x1="9" y1="9" x2="9" y2="9.01" />
                      <line x1="9" y1="13" x2="9" y2="13.01" />
                      <line x1="9" y1="17" x2="9" y2="17.01" />
                    </svg>
                  </span>
                  <span className="route-facility-name">{referredFrom}</span>
                </div>
              </div>

              {/* Vertical Connector Line */}
              <div className="referral-connector-track" aria-hidden="true">
                <span className="connector-dot" />
                <span className="connector-dot" />
                <span className="connector-dot" />
              </div>

              {/* Referred To */}
              <div className="referral-route-node">
                <span className="route-node-label">{t('referral.toFacility')}</span>
                <div className="route-facility-row">
                  <span className="route-plus-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" fill="#004b87" />
                      <path d="M12 7.5v9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                      <path d="M7.5 12h9" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
                    </svg>
                  </span>
                  <span className="route-facility-name-target">{referredTo}</span>
                </div>
              </div>
            </div>

            <div className="referral-card-divider" />

            {/* Reason & Status Grid */}
            <div className="referral-meta-grid">
              <div className="referral-meta-col">
                <span className="referral-meta-label">{t('careGuidance.reason')}</span>
                <span className="referral-meta-value">{referralReason}</span>
              </div>
              <div className="referral-meta-col">
                <span className="referral-meta-label">{t('common.status')}</span>
                <div className="referral-status-pill">
                  <span className="status-arrow-icon" aria-hidden="true">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </span>
                  <span style={{ textTransform: 'capitalize' }}>{referralStatus}</span>
                </div>
              </div>
            </div>

            {/* Instruction Box at bottom of card */}
            <div className="referral-instruction-box">
              <div className="instruction-header-row">
                <span className="instruction-info-icon" aria-hidden="true">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="#0284c7">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                  </svg>
                </span>
                <span className="instruction-title">{t('referral.priority')}: {referralPriority}</span>
              </div>
              <p className="instruction-body-text">
                {t('referral.notes')}: Please present this referral upon arrival at {referredTo}.
              </p>
              <div className="instruction-check-row">
                <span className="instruction-check-glyph" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <polyline points="9 11 12 14 22 4" />
                  </svg>
                </span>
                <span className="instruction-check-label">{t('referral.refNumber')} #{referral.id}</span>
              </div>
            </div>
          </article>
        )}

        {/* Action Buttons */}
        {referral && !isLoading && (
          <section className="referral-actions-group">
            {/* Primary Action: View Referral */}
            <button
              type="button"
              className="referral-primary-btn"
              onClick={handleViewReferral}
            >
              <span className="btn-glyph-eye" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </span>
              <span>{t('referral.trackTitle')}</span>
            </button>

            {/* Secondary Action: Get Directions */}
            <button
              type="button"
              className="referral-directions-btn"
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
              <span>{t('facilityDetails.directions')}</span>
            </button>
          </section>
        )}
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

