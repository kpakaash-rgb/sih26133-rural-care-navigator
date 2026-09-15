import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getAppointments } from '../../services/api'
import { useTranslation } from '../../i18n'

export default function Home({ onNavigate, patient }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('home')
  const [appointmentsCount, setAppointmentsCount] = useState(0)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      getAppointments()
        .then((data) => {
          if (Array.isArray(data)) {
            setAppointmentsCount(data.length)
          }
        })
        .catch(() => {
          // Graceful fallback to default state
        })
    }
  }, [])

  const displayName = patient?.full_name || (() => {
    try {
      const stored = localStorage.getItem('patient')
      return stored ? JSON.parse(stored)?.full_name : null
    } catch {
      return null
    }
  })() || 'Patient'

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

  const handleFindCare = () => {
    if (onNavigate) {
      onNavigate(SCREENS.SYMPTOMS)
    }
  }

  return (
    <div className="home-screen-wrapper">
      {/* Top Brand Header */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Scrollable Content Container */}
      <main className="home-scrollable-content">
        {/* Patient Greeting */}
        <section className="home-greeting-section">
          <h1 className="home-greeting-name">{t('home.hello', { name: displayName })}</h1>
          <p className="home-greeting-question">{t('home.greetingQuestion')}</p>
        </section>

        {/* 1. Mobile Clinic Card */}
        <article
          className="home-card mobile-clinic-card"
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate(SCREENS.MOBILE_CLINIC)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (onNavigate) onNavigate(SCREENS.MOBILE_CLINIC)
            }
          }}
        >
          <div className="info-circle-icon" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0A58CA">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>
          <div className="mobile-clinic-text">
            <h2 className="mobile-clinic-title">{t('home.mobileClinicTitle')}</h2>
            <p className="mobile-clinic-desc">
              {t('home.mobileClinicDesc')}
            </p>
          </div>
        </article>

        {/* 2. Emergency / SOS Card */}
        <article
          className="home-card emergency-banner-card"
          onClick={handleSosClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleSosClick()
            }
          }}
        >
          <div className="emergency-card-title-row">
            <span className="emergency-asterisk" aria-hidden="true">✱</span>
            <h2 className="emergency-card-title">{t('home.emergencyTitle')}</h2>
          </div>
          <span className="emergency-card-sub">{t('common.call108')}</span>
        </article>

        {/* 3. Find Healthcare (Primary Action) */}
        <article
          className="home-card care-finder-card"
          onClick={handleFindCare}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleFindCare()
            }
          }}
        >
          <div className="care-finder-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="15" rx="3" />
              <path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
              <line x1="8" y1="12" x2="12" y2="12" />
              <line x1="10" y1="10" x2="10" y2="14" />
              <line x1="14" y1="11" x2="16" y2="11" />
              <line x1="14" y1="14" x2="16" y2="14" />
            </svg>
          </div>
          <div className="care-finder-text">
            <h2 className="care-finder-title">{t('home.findCare')}</h2>
            <p className="care-finder-sub">{t('home.findCareDesc')}</p>
          </div>
        </article>

        {/* 4-7. Secondary Patient Features (Responsive Grid) */}
        <div className="home-secondary-grid">
          {/* My Appointments Card */}
          <article
            className="home-card action-tile-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(SCREENS.APPOINTMENTS)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onNavigate) onNavigate(SCREENS.APPOINTMENTS)
              }
            }}
          >
            <div className="tile-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
                <rect x="7" y="14" width="2" height="2" fill="currentColor" />
                <rect x="11" y="14" width="2" height="2" fill="currentColor" />
                <rect x="15" y="14" width="2" height="2" fill="currentColor" />
              </svg>
            </div>
            <span className="tile-title">{t('home.myAppointments')}</span>
            {appointmentsCount > 0 && (
              <span className="appointments-badge" aria-label={`${appointmentsCount} appointments`}>
                {appointmentsCount}
              </span>
            )}
          </article>

          {/* Health Timeline Card */}
          <article
            className="home-card action-tile-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(SCREENS.HEALTH_JOURNEY)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onNavigate) onNavigate(SCREENS.HEALTH_JOURNEY)
              }
            }}
          >
            <div className="tile-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <span className="tile-title">{t('home.healthJourneyTitle')}</span>
          </article>

          {/* Track Referrals Card */}
          <article
            className="home-card action-tile-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(SCREENS.REFERRAL)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onNavigate) onNavigate(SCREENS.REFERRAL)
              }
            }}
          >
            <div className="tile-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            </div>
            <span className="tile-title">{t('home.trackReferralTitle')}</span>
          </article>

          {/* Govt. Schemes Card */}
          <article
            className="home-card action-tile-card"
            role="button"
            tabIndex={0}
            onClick={() => onNavigate && onNavigate(SCREENS.SCHEMES)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                if (onNavigate) onNavigate(SCREENS.SCHEMES)
              }
            }}
          >
            <div className="tile-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <span className="tile-title">{t('home.schemesTitle')}</span>
          </article>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
