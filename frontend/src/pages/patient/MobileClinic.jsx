import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getMobileClinics } from '../../services/api'
import { getUserLocation } from '../../utils'
import { useTranslation } from '../../i18n'

/**
 * Safely parse services field whether returned as an array, comma-separated string, or null.
 * @param {string|string[]|null} services
 * @returns {string[]}
 */
function parseServices(services) {
  if (!services) return []
  if (Array.isArray(services)) {
    return services
      .map((s) => (typeof s === 'string' ? s : s?.name || String(s)))
      .filter(Boolean)
  }
  if (typeof services === 'string') {
    return services
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export default function MobileClinic({ onNavigate }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [clinics, setClinics] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [locationState, setLocationState] = useState({
    usingGps: false,
    message: 'Checking location...',
    error: null,
  })

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
    } else if (tabId === 'profile') {
      if (onNavigate) {
        onNavigate(SCREENS.ABHA)
      }
    }
  }

  const handleViewHealthcare = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTHCARE)
    }
  }

  const handleGetDirections = (clinic) => {
    if (clinic?.latitude && clinic?.longitude) {
      window.open(
        `https://maps.google.com/?q=${clinic.latitude},${clinic.longitude}`,
        '_blank'
      )
    } else {
      const query = encodeURIComponent(
        `${clinic?.name || 'Mobile Medical Unit'} ${clinic?.address || clinic?.service_area || clinic?.district || ''}`.trim()
      )
      window.open(`https://maps.google.com/?q=${query}`, '_blank')
    }
  }

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage('')
    setRetryCount((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true

    async function loadClinics() {
      const rawPatient = localStorage.getItem('patient')
      let districtFilter = null

      if (rawPatient) {
        try {
          const p = JSON.parse(rawPatient)
          if (p?.district) districtFilter = p.district
        } catch {
          // Ignore parse errors
        }
      }

      // Obtain real GPS coordinates if available
      const loc = await getUserLocation()
      const hasGps = Boolean(loc.latitude != null && loc.longitude != null)

      if (isMounted) {
        setLocationState({
          usingGps: hasGps,
          message: hasGps
            ? 'Using your current location'
            : loc.error || 'Showing units for your registered area',
          error: loc.error,
        })
      }

      try {
        let data = []
        const queryParams = {
          ...(districtFilter ? { district: districtFilter } : {}),
          ...(hasGps ? { lat: loc.latitude, lon: loc.longitude } : {}),
        }

        if (districtFilter) {
          try {
            data = await getMobileClinics(queryParams)
          } catch {
            // Fall back to general lookup if district query fails
          }
        }

        // If no district filter or no units found in patient's district, fetch active units with coordinates if present
        if (!Array.isArray(data) || data.length === 0) {
          data = await getMobileClinics(
            hasGps ? { lat: loc.latitude, lon: loc.longitude } : {}
          )
        }

        if (isMounted) {
          setClinics(Array.isArray(data) ? data : [])
          setIsLoading(false)
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err.message || 'Unable to load mobile medical units. Please check your connection.'
          )
          setIsLoading(false)
        }
      }
    }

    loadClinics()

    return () => {
      isMounted = false
    }
  }, [retryCount])

  return (
    <div className="mobile-clinic-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="mobile-clinic-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="mobile-clinic-header-section">
          <h1 className="mobile-clinic-main-title">{t('mobileClinic.title')}</h1>
          <p className="mobile-clinic-subtitle">
            {t('mobileClinic.subtitle')}
          </p>

          {/* Location status badge */}
          <div style={{ marginTop: '8px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: locationState.usingGps ? '#f0fdf4' : '#f8fafc',
                color: locationState.usingGps ? '#15803d' : '#475569',
                border: locationState.usingGps ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
              }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{locationState.usingGps ? t('healthcare.liveLocation') : locationState.message}</span>
              {!locationState.usingGps && (
                <button
                  type="button"
                  onClick={handleRetry}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    margin: '0 0 0 4px',
                    color: '#0284c7',
                    fontWeight: 600,
                    fontSize: '12px',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                  }}
                >
                  {t('healthcare.useLocation')}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* API Error State with Retry */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#991b1b',
              fontSize: '13.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: 0 }}>{t('common.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && clinics.length === 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px' }}>
              {t('mobileClinic.noClinics')}
            </p>
            <button
              type="button"
              onClick={handleViewHealthcare}
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
              {t('home.findCare')}
            </button>
          </div>
        )}

        {/* Real Mobile Clinics List */}
        {!isLoading && !errorMessage && clinics.map((clinic) => {
          const servicesList = parseServices(clinic.services)

          return (
            <article key={clinic.id} className="mobile-clinic-card">
              {/* Top Row with Van Icon, Title, and Status Pill */}
              <div className="mobile-clinic-card-top-row">
                <div className="mobile-clinic-title-row">
                  <div className="mobile-clinic-icon-box" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="3" width="15" height="13" rx="2" />
                      <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
                      <circle cx="5.5" cy="18.5" r="2.5" />
                      <circle cx="18.5" cy="18.5" r="2.5" />
                    </svg>
                  </div>
                  <h2 className="mobile-clinic-card-title">{clinic.name}</h2>
                </div>
                <span className="mobile-clinic-status-pill">{clinic.status || 'Active'}</span>
              </div>

              {/* Village, Route, & Schedule Information */}
              <div className="mobile-clinic-info-list">
                {(clinic.service_area || clinic.address || clinic.district) && (
                  <div className="mobile-clinic-info-item">
                    <span className="info-item-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </span>
                    <div className="info-item-text-group">
                      <span className="info-item-label">{t('mobileClinic.village')}</span>
                      <strong className="info-item-value">
                        {clinic.service_area || clinic.address || clinic.district}
                      </strong>
                    </div>
                  </div>
                )}

                {clinic.schedule && (
                  <div className="mobile-clinic-info-item">
                    <span className="info-item-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                    <div className="info-item-text-group">
                      <span className="info-item-label">{t('mobileClinic.schedule')}</span>
                      <strong className="info-item-value">{clinic.schedule}</strong>
                    </div>
                  </div>
                )}

                {clinic.distance_km != null && (
                  <div className="mobile-clinic-info-item">
                    <span className="info-item-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </span>
                    <div className="info-item-text-group">
                      <span className="info-item-label">{t('healthcare.distance')}</span>
                      <strong className="info-item-value">{clinic.distance_km} {t('common.km')}</strong>
                    </div>
                  </div>
                )}

                {clinic.contact && (
                  <div className="mobile-clinic-info-item">
                    <span className="info-item-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                    </span>
                    <div className="info-item-text-group">
                      <span className="info-item-label">{t('facilityDetails.phone')}</span>
                      <strong className="info-item-value">{clinic.contact}</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* Services Checklist */}
              {servicesList.length > 0 && (
                <>
                  <div className="mobile-clinic-divider" />
                  <div className="mobile-clinic-services-section">
                    <h3 className="mobile-clinic-services-heading">{t('mobileClinic.servicesOffered')}</h3>
                    <ul className="mobile-clinic-services-list">
                      {servicesList.map((srv, idx) => (
                        <li key={idx} className="mobile-clinic-service-item">
                          <span className="service-check-icon" aria-hidden="true">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#004b87" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </span>
                          <span>{srv}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="mobile-clinic-actions-group">
                <button
                  type="button"
                  className="mobile-clinic-view-btn"
                  onClick={handleViewHealthcare}
                >
                  {t('home.findCare')}
                </button>

                <button
                  type="button"
                  className="mobile-clinic-directions-btn"
                  onClick={() => handleGetDirections(clinic)}
                >
                  <span className="btn-glyph-directions" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                  </span>
                  <span>{t('facilityDetails.directions')}</span>
                </button>
              </div>
            </article>
          )
        })}
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
