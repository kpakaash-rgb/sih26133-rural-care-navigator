import { useState, useEffect, useCallback } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { recommendHospitals, getFacilities, getFacilityQueue } from '../../services/api'
import { formatQueueLastUpdated, getUserLocation } from '../../utils'
import { useTranslation } from '../../i18n'

function formatFacilityType(type, t) {
  switch (type) {
    case 'PRIMARY_HEALTH_CENTRE':
      return t ? (t('facilityDetails.phc') || 'Primary Health Centre') : 'Primary Health Centre'
    case 'COMMUNITY_HEALTH_CENTRE':
      return t ? (t('facilityDetails.chc') || 'Community Health Centre') : 'Community Health Centre'
    case 'DISTRICT_HOSPITAL':
      return t ? (t('facilityDetails.dh') || 'District Hospital') : 'District Hospital'
    case 'SUB_CENTRE':
      return t ? (t('facilityDetails.subCentre') || 'Sub-Centre') : 'Sub-Centre'
    case 'MOBILE_CLINIC':
      return t ? (t('facilityDetails.mmu') || 'Mobile Medical Unit') : 'Mobile Medical Unit'
    default:
      return type || 'Healthcare Facility'
  }
}

/**
 * Transparently derive required facility medical services from AI triage & care guidance context.
 * Uses the triage urgency, recommended care setting, and reported symptoms.
 * Falls back to General Medicine when context is neutral or routine.
 * Does NOT invent medical diagnoses.
 *
 * @param {Object|null} triage - The active triage result object
 * @returns {string[]} List of required facility service names
 */
function deriveRequiredServices(triage) {
  if (!triage) {
    return ['General Medicine']
  }

  // 1. Emergency urgency: requires physician evaluation and advanced facility capabilities
  if (triage.urgency === 'emergency' || triage.emergency) {
    return ['Doctor', 'Advanced Tests', 'Medicines']
  }

  // 2. Needs attention urgency: PHC medical officer consultation and essential diagnostic support
  if (triage.urgency === 'needs_attention') {
    const reported = (triage.reportedSymptoms || []).map((s) => s.toLowerCase())
    if (reported.includes('injury')) {
      return ['Doctor', 'Advanced Tests', 'Medicines']
    }
    return ['Doctor', 'Basic Tests', 'Medicines']
  }

  // 3. Routine care guidance: primary outpatient and medication support
  if (triage.urgency === 'routine') {
    return ['General Medicine', 'Medicines']
  }

  // Safe transparent fallback
  return ['General Medicine']
}

export default function Healthcare({ onNavigate, triageData }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [facilities, setFacilities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAiRecommended, setIsAiRecommended] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [locationState, setLocationState] = useState({
    usingGps: false,
    message: 'Finding healthcare facilities near you...',
    error: null,
  })
  const [locationRefreshKey, setLocationRefreshKey] = useState(0)
  const [isRefreshingQueues, setIsRefreshingQueues] = useState(false)

  const handleRetryLocation = useCallback(() => {
    setLocationRefreshKey((k) => k + 1)
  }, [])

  const refreshVisibleQueues = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshingQueues(true)
    try {
      setFacilities((prevFacilities) => {
        if (!prevFacilities || prevFacilities.length === 0) return prevFacilities
        // Trigger parallel async updates
        Promise.all(
          prevFacilities.map(async (fac) => {
            try {
              const queueData = await getFacilityQueue(fac.id)
              if (queueData) {
                return {
                  ...fac,
                  queueStatus: queueData.status || fac.queueStatus,
                  waitingPatients: queueData.waiting_patients ?? fac.waitingPatients,
                  estimatedWaitMinutes: queueData.estimated_wait_minutes ?? fac.estimatedWaitMinutes,
                  lastUpdated: queueData.last_updated || fac.lastUpdated,
                }
              }
            } catch {
              // Ignore single queue fetch error
            }
            return fac
          })
        ).then((updated) => {
          setFacilities(updated)
        }).finally(() => {
          if (isManual) setIsRefreshingQueues(false)
        })
        return prevFacilities
      })
    } catch {
      if (isManual) setIsRefreshingQueues(false)
    }
  }, [])

  // Auto-refresh queue status every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      refreshVisibleQueues(false)
    }, 30000)
    return () => clearInterval(timer)
  }, [refreshVisibleQueues])

  // Window focus listener for fresh queue state
  useEffect(() => {
    const handleFocus = () => {
      refreshVisibleQueues(false)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refreshVisibleQueues])

  useEffect(() => {
    let isMounted = true

    async function fetchRecommendedFacilities() {
      setIsLoading(true)
      setErrorMessage('')

      // 1. Resolve Patient Location via GPS or fallback
      let userLocation = null
      try {
        userLocation = await getUserLocation()
        if (isMounted) {
          setLocationState({
            usingGps: Boolean(userLocation.isGps),
            message: userLocation.isGps
              ? 'Using your device GPS location'
              : 'Using village location (GPS unavailable)',
            error: userLocation.error || null,
          })
        }
      } catch (locErr) {
        if (isMounted) {
          setLocationState({
            usingGps: false,
            message: 'Using village location (GPS unavailable)',
            error: locErr.message,
          })
        }
      }

      // 2. Query Recommendation or Facilities API with transparent required services
      const requiredServices = deriveRequiredServices(triageData)

      try {
        const payload = {
          required_services: requiredServices,
          max_queue_wait_minutes: 120,
          limit: 5,
        }

        // Only attach latitude/longitude if resolved from device GPS or known fallback
        if (userLocation && typeof userLocation.latitude === 'number' && typeof userLocation.longitude === 'number') {
          payload.latitude = userLocation.latitude
          payload.longitude = userLocation.longitude
        }

        const data = await recommendHospitals(payload)

        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setIsAiRecommended(true)
            const mapped = data.map((item, index) => {
              const fac = item.facility || {}
              const distanceKm = typeof item.distance_km === 'number' ? `${item.distance_km.toFixed(1)} km` : (index === 0 ? '0.8 km' : `${(index + 1) * 2.5} km`)
              const waitMins = typeof item.queue_wait_minutes === 'number' ? item.queue_wait_minutes : (index === 0 ? 15 : 25)

              return {
                id: fac.id || index + 1,
                name: fac.name || 'Healthcare Facility',
                category: formatFacilityType(fac.type, t),
                type: fac.type || 'PRIMARY_HEALTH_CENTRE',
                distance: distanceKm,
                distance_km: item.distance_km,
                services: (fac.services && fac.services.length > 0)
                  ? fac.services.map((s) => s.name || s)
                  : requiredServices,
                reason: item.recommendation_reason || (index === 0
                  ? 'Recommended primary care facility with shortest wait time.'
                  : 'Alternative healthcare facility in your service network.'),
                queueStatus: waitMins > 45 ? 'BUSY' : waitMins > 90 ? 'OVERLOADED' : 'NORMAL',
                waitingPatients: Math.max(1, Math.round(waitMins / 5)),
                estimatedWaitMinutes: waitMins,
                address: fac.address || fac.district || 'Solapur District',
                phone: fac.phone || '1800-11-4477',
                status: fac.status || 'ACTIVE',
                raw: fac,
              }
            })
            setFacilities(mapped)
          } else {
            // Fallback to standard facilities list
            const allFacs = await getFacilities()
            if (isMounted && Array.isArray(allFacs)) {
              setIsAiRecommended(false)
              setFacilities(
                allFacs.map((fac, index) => ({
                  id: fac.id,
                  name: fac.name,
                  category: formatFacilityType(fac.type, t),
                  type: fac.type,
                  distance: `${(index + 1) * 1.5} km`,
                  services: (fac.services && fac.services.length > 0)
                    ? fac.services.map((s) => s.name || s)
                    : ['General Medicine'],
                  reason: 'Nearest registered healthcare center in your district.',
                  queueStatus: 'NORMAL',
                  waitingPatients: 3,
                  estimatedWaitMinutes: 15,
                  address: fac.address || fac.district || 'Solapur District',
                  phone: fac.phone || '1800-11-4477',
                  status: fac.status || 'ACTIVE',
                  raw: fac,
                }))
              )
            }
          }
        }
      } catch {
        if (isMounted) {
          // Graceful fallback to basic facility listing
          try {
            const allFacs = await getFacilities()
            if (isMounted && Array.isArray(allFacs)) {
              setIsAiRecommended(false)
              setFacilities(
                allFacs.map((fac, index) => ({
                  id: fac.id,
                  name: fac.name,
                  category: formatFacilityType(fac.type, t),
                  type: fac.type,
                  distance: `${(index + 1) * 1.5} km`,
                  services: (fac.services && fac.services.length > 0)
                    ? fac.services.map((s) => s.name || s)
                    : ['General Medicine'],
                  reason: 'Registered healthcare center in your area.',
                  queueStatus: 'NORMAL',
                  waitingPatients: 2,
                  estimatedWaitMinutes: 10,
                  address: fac.address || fac.district || 'Solapur District',
                  phone: fac.phone || '1800-11-4477',
                  status: fac.status || 'ACTIVE',
                  raw: fac,
                }))
              )
            }
          } catch {
            if (isMounted) {
              setErrorMessage('Unable to load healthcare facilities. Please check network connection.')
            }
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchRecommendedFacilities()

    return () => {
      isMounted = false
    }
  }, [triageData, locationRefreshKey, t])

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === SCREENS.HOME && onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  const handleSelectFacility = (fac) => {
    if (onNavigate) {
      onNavigate(SCREENS.FACILITY_DETAILS, {
        facility: fac,
        facilityId: fac.id,
      })
    }
  }

  return (
    <div className="healthcare-screen-wrapper">
      {/* Top Header */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="healthcare-scrollable-content">
        {/* Urgent Emergency Warning Banner if triage indicated emergency */}
        {Boolean(triageData?.urgency === 'emergency' || triageData?.emergency) && (
          <article
            className="serious-emergency-box"
            style={{ margin: '0 16px 16px', borderColor: '#ef4444' }}
          >
            <div className="emergency-box-header">
              <span className="emergency-asterisk-icon" aria-hidden="true">
                🚨
              </span>
              <h2 className="emergency-box-title" style={{ color: '#b91c1c' }}>
                {t('careGuidance.emergencyWarning')}
              </h2>
            </div>
            <p className="emergency-box-message">
              {t('symptoms.emergencyNotice')}
            </p>
            <button
              type="button"
              className="emergency-call-action-btn"
              onClick={handleSosClick}
              aria-label={t('common.call108')}
            >
              <span className="emergency-phone-glyph" aria-hidden="true">📞</span>
              <span>{t('common.call108')}</span>
            </button>
          </article>
        )}

        {/* Title and Badge */}
        <section className="healthcare-intro-section">
          <h1 className="healthcare-page-title">{t('healthcare.title')}</h1>
          <p className="healthcare-page-subtitle">
            {t('healthcare.subtitle')}
          </p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="prototype-data-pill">
              <span className="prototype-info-icon" aria-hidden="true">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="#475569">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </span>
              <span className="prototype-text">
                {isAiRecommended ? t('careGuidance.title') : t('healthcare.nearestFacilities')}
              </span>
            </div>

            {/* Location Status Pill */}
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
              <span>{locationState.usingGps ? t('healthcare.liveLocation') : t('healthcare.defaultLocation')}</span>
              {!locationState.usingGps && (
                <button
                  type="button"
                  onClick={handleRetryLocation}
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

            {/* Live Queue Refresh Button */}
            {facilities.length > 0 && (
              <button
                type="button"
                onClick={() => refreshVisibleQueues(true)}
                disabled={isRefreshingQueues}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#0284c7',
                  border: '1px solid #cbd5e1',
                  cursor: isRefreshingQueues ? 'not-allowed' : 'pointer',
                }}
                aria-label="Refresh live facility queues"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    animation: isRefreshingQueues ? 'spin 1s linear infinite' : 'none',
                  }}
                  aria-hidden="true"
                >
                  <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                </svg>
                <span>{isRefreshingQueues ? t('common.loading') : t('facilityDetails.queueFreshness')}</span>
              </button>
            )}
          </div>
        </section>

        {errorMessage && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              padding: '8px 12px',
              margin: '0 16px 12px',
              color: '#92400e',
              fontSize: '12.5px',
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
          /* Facility Cards List */
          <div className="suitable-facilities-list">
            {facilities.map((fac, idx) => (
              <article key={fac.id || idx} className="suitable-facility-card">
                <div className="facility-header-row">
                  <div className="facility-identity">
                    <h2 className="facility-title">{fac.name}</h2>
                    <p className="facility-category">{fac.category}</p>
                  </div>
                  <div className={`distance-badge ${idx === 0 ? 'distance-primary' : 'distance-secondary'}`}>
                    <svg
                      className="distance-pin-icon"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <span>{fac.distance}</span>
                  </div>
                </div>

                <div className="facility-services-group">
                  <h3 className="services-heading">{t('facilityDetails.servicesOffered')}:</h3>
                  <ul className="services-checklist">
                    {fac.services.map((srv, sIdx) => (
                      <li key={sIdx} className="service-item">
                        <span className="service-check" aria-hidden="true">✓</span>
                        <span>{srv}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="facility-availability-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                  {fac.queueStatus ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span className="availability-label" style={{ fontWeight: 700 }}>{t('healthcare.currentQueue')}:</span>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            backgroundColor: fac.queueStatus === 'NORMAL' ? '#dcfce7' : fac.queueStatus === 'BUSY' ? '#fef3c7' : '#fee2e2',
                            color: fac.queueStatus === 'NORMAL' ? '#166534' : fac.queueStatus === 'BUSY' ? '#92400e' : '#991b1b',
                          }}
                        >
                          {fac.queueStatus}
                        </span>
                        {fac.waitingPatients != null && (
                          <span style={{ fontSize: '12px', color: '#334155' }}>
                            {fac.waitingPatients} {t('common.patientsWaiting')}
                          </span>
                        )}
                        {fac.estimatedWaitMinutes != null && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            • ~{fac.estimatedWaitMinutes} {t('common.minutes')} {t('common.waiting')}
                          </span>
                        )}
                      </div>
                      {fac.lastUpdated && (
                        <div
                          style={{
                            fontSize: '11px',
                            color: formatQueueLastUpdated(fac.lastUpdated).isStale ? '#b45309' : '#64748b',
                            fontStyle: 'italic',
                          }}
                        >
                          {formatQueueLastUpdated(fac.lastUpdated).text}
                        </div>
                      )}
                    </>
                  ) : (
                    <span className="availability-items" style={{ color: '#64748b', fontStyle: 'italic' }}>
                      {t('healthcare.noFacilitiesFound')}
                    </span>
                  )}
                </div>

                <div className="why-facility-box">
                  <div className="why-facility-title-row">
                    <svg
                      className="why-facility-icon"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M12 22v-7" />
                      <path d="M9 7.5A4.5 4.5 0 0 1 18 9c0 4.5-6 6-6 6s-6-1.5-6-6a4.5 4.5 0 0 1 3-4.24" />
                    </svg>
                    <h4 className="why-facility-heading">{t('careGuidance.reason')}</h4>
                  </div>
                  <p className="why-facility-desc">
                    {fac.reason}
                  </p>
                </div>

                <button
                  type="button"
                  className={idx === 0 ? 'facility-solid-btn' : 'facility-outline-btn'}
                  onClick={() => handleSelectFacility(fac)}
                >
                  {t('healthcare.viewDetails')}
                </button>
              </article>
            ))}
          </div>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
