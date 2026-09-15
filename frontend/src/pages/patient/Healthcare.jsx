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

/**
 * Generate a transparent matching explanation based on actual care needs, facility type, and services.
 */
function generateMatchingReason(fac, triageData, itemReason) {
  if (itemReason && itemReason.trim()) {
    return itemReason
  }

  if (triageData) {
    if (triageData.urgency === 'emergency' || triageData.emergency) {
      return 'Equipped with emergency medical services and physician support.'
    }
    if (triageData.urgency === 'needs_attention') {
      const type = fac.type || fac.raw?.type
      if (type === 'PRIMARY_HEALTH_CENTRE') {
        return 'Primary Health Centre suitable for the recommended care level.'
      }
      if (type === 'COMMUNITY_HEALTH_CENTRE') {
        return 'Community Health Centre with physician consultation and diagnostic facilities.'
      }
      if (type === 'DISTRICT_HOSPITAL') {
        return 'District Hospital with specialized consultation and clinical capabilities.'
      }
      return 'Matches your recommended care level and has the required service available.'
    }
    if (triageData.urgency === 'routine') {
      return 'Local facility suitable for routine consultation and outpatient care.'
    }
  }

  if (fac.services && fac.services.length > 0) {
    return 'Required medical service is available at this facility.'
  }

  return 'Local facility matching your care needs.'
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
              const distanceKm = typeof item.distance_km === 'number' ? `${item.distance_km.toFixed(1)} km` : 'Local Area'
              const waitMins = typeof item.estimated_wait_minutes === 'number' ? item.estimated_wait_minutes : (typeof item.queue_wait_minutes === 'number' ? item.queue_wait_minutes : 0)
              const waitPts = typeof item.waiting_patients === 'number' ? item.waiting_patients : 0

              const serviceNames = (item.matched_services && item.matched_services.length > 0)
                ? item.matched_services
                : (fac.services && fac.services.length > 0 ? fac.services.map((s) => s.name || s) : requiredServices)

              const facilityObj = {
                id: item.facility_id || fac.id || index + 1,
                name: item.hospital_name || fac.name || 'Healthcare Facility',
                category: formatFacilityType(item.facility_type || fac.type, t),
                type: item.facility_type || fac.type || 'PRIMARY_HEALTH_CENTRE',
                distance: distanceKm,
                distance_km: item.distance_km,
                services: serviceNames,
                queueStatus: item.queue_status || (waitMins > 45 ? 'BUSY' : 'NORMAL'),
                waitingPatients: waitPts,
                estimatedWaitMinutes: waitMins,
                lastUpdated: item.queue?.last_updated || fac.queue?.last_updated || item.last_updated || null,
                address: item.address || fac.address || fac.district || 'Healthcare Facility',
                phone: fac.phone || '108 / 104 Emergency Helpline',
                status: fac.status || 'ACTIVE',
                raw: fac,
              }

              facilityObj.reason = generateMatchingReason(facilityObj, triageData, item.recommendation_reason)
              return facilityObj
            })
            setFacilities(mapped)
          } else {
            // Fallback to standard facilities list
            const allFacs = await getFacilities()
            if (isMounted && Array.isArray(allFacs)) {
              setIsAiRecommended(false)
              setFacilities(
                allFacs.map((fac) => {
                  const facilityObj = {
                    id: fac.id,
                    name: fac.name,
                    category: formatFacilityType(fac.type, t),
                    type: fac.type,
                    distance: typeof fac.distance_km === 'number' ? `${fac.distance_km.toFixed(1)} km` : 'Local Area',
                    services: (fac.services && fac.services.length > 0)
                      ? fac.services.map((s) => s.name || s)
                      : ['General Medicine'],
                    queueStatus: fac.queue?.status || 'NORMAL',
                    waitingPatients: fac.queue?.waiting_patients ?? 0,
                    estimatedWaitMinutes: fac.queue?.estimated_wait_minutes ?? 0,
                    lastUpdated: fac.queue?.last_updated || null,
                    address: fac.address || fac.district || 'Healthcare Facility',
                    phone: fac.phone || '108 / 104 Emergency Helpline',
                    status: fac.status || 'ACTIVE',
                    raw: fac,
                  }
                  facilityObj.reason = generateMatchingReason(facilityObj, triageData, null)
                  return facilityObj
                })
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
                allFacs.map((fac) => {
                  const facilityObj = {
                    id: fac.id,
                    name: fac.name,
                    category: formatFacilityType(fac.type, t),
                    type: fac.type,
                    distance: typeof fac.distance_km === 'number' ? `${fac.distance_km.toFixed(1)} km` : 'Local Area',
                    services: (fac.services && fac.services.length > 0)
                      ? fac.services.map((s) => s.name || s)
                      : ['General Medicine'],
                    queueStatus: fac.queue?.status || 'NORMAL',
                    waitingPatients: fac.queue?.waiting_patients ?? 0,
                    estimatedWaitMinutes: fac.queue?.estimated_wait_minutes ?? 0,
                    lastUpdated: fac.queue?.last_updated || null,
                    address: fac.address || fac.district || 'Healthcare Facility',
                    phone: fac.phone || '108 / 104 Emergency Helpline',
                    status: fac.status || 'ACTIVE',
                    raw: fac,
                  }
                  facilityObj.reason = generateMatchingReason(facilityObj, triageData, null)
                  return facilityObj
                })
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
      {/* Top Header with Back and SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        showBack
        onBack={() => onNavigate && onNavigate(triageData?.urgency ? SCREENS.CARE_GUIDANCE : SCREENS.HOME)}
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="healthcare-scrollable-content">
        {/* Urgent Emergency Warning Banner if triage indicated emergency */}
        {Boolean(triageData?.urgency === 'emergency' || triageData?.emergency) && (
          <article
            className="serious-emergency-box"
            style={{ margin: '0 0 14px', borderColor: '#ef4444' }}
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

        {/* Title and Badges */}
        <section className="healthcare-intro-section">
          <h1 className="healthcare-page-title">{t('healthcare.title')}</h1>
          <p className="healthcare-page-subtitle">
            {t('healthcare.subtitle')}
          </p>

          <div className="healthcare-status-row">
            {/* Recommendation status pill */}
            <div className="prototype-data-pill">
              <span className="prototype-info-icon" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#475569">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                </svg>
              </span>
              <span className="prototype-text">
                {isAiRecommended ? t('careGuidance.title') : t('healthcare.nearestFacilities')}
              </span>
            </div>

            {/* Location Status Pill */}
            <div
              className={`location-status-pill ${locationState.usingGps ? 'gps-active' : 'gps-default'}`}
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
              <span>
                {locationState.usingGps
                  ? t('healthcare.liveLocation')
                  : t('healthcare.defaultLocation')}
              </span>
              {!locationState.usingGps && (
                <button
                  type="button"
                  onClick={handleRetryLocation}
                  className="location-retry-link"
                >
                  {t('healthcare.useLocation')}
                </button>
              )}
            </div>

            {/* Queue Data Status Indicator */}
            {facilities.length > 0 && (
              <button
                type="button"
                onClick={() => refreshVisibleQueues(true)}
                disabled={isRefreshingQueues}
                className="queue-freshness-indicator-btn"
                aria-label="Refresh availability data"
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
                <span>
                  {isRefreshingQueues
                    ? t('common.loading')
                    : t('healthcare.availabilityData')}
                </span>
              </button>
            )}
          </div>
        </section>

        {errorMessage && (
          <div className="healthcare-error-banner">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="healthcare-loading-state">
            <p>{t('common.loading')}</p>
          </div>
        ) : (
          /* Facility Cards List */
          <div className="suitable-facilities-list">
            {facilities.map((fac, idx) => (
              <article key={fac.id || idx} className="suitable-facility-card">
                {/* Header: Facility Name and Location / Distance Badge */}
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

                {/* Available Medical Services */}
                <div className="facility-services-group">
                  <h3 className="services-heading">{t('facilityDetails.servicesOffered')}:</h3>
                  <div className="services-checklist">
                    {fac.services.map((srv, sIdx) => (
                      <span key={sIdx} className="service-item">
                        <span className="service-check" aria-hidden="true">✓</span>
                        <span>{srv}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Current Queue Information & Staleness */}
                <div className="facility-queue-group">
                  {fac.queueStatus && fac.queueStatus !== 'UNKNOWN' ? (
                    <>
                      <div className="queue-status-line">
                        <span className="availability-label">{t('healthcare.currentQueue')}:</span>
                        <span className={`queue-badge queue-${fac.queueStatus.toLowerCase()}`}>
                          {fac.queueStatus}
                        </span>
                        {fac.waitingPatients != null && (
                          <span className="queue-detail-text">
                            · {fac.waitingPatients} {t('common.patientsWaiting')}
                          </span>
                        )}
                        {fac.estimatedWaitMinutes != null && (
                          <span className="queue-detail-text">
                            · ~{fac.estimatedWaitMinutes} {t('common.minutes')} {t('common.waiting')}
                          </span>
                        )}
                      </div>
                      {fac.lastUpdated && (
                        <div
                          className={`queue-updated-text ${
                            formatQueueLastUpdated(fac.lastUpdated).isStale ? 'is-stale' : ''
                          }`}
                        >
                          {formatQueueLastUpdated(fac.lastUpdated).text}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="queue-updated-text">
                      {t('healthcare.queueUnavailable')}
                    </div>
                  )}
                </div>

                {/* Why This Facility Box */}
                <div className="why-facility-box">
                  <div className="why-facility-title-row">
                    <svg
                      className="why-facility-icon"
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                    </svg>
                    <h4 className="why-facility-heading">{t('healthcare.whyThisFacility')}</h4>
                  </div>
                  <p className="why-facility-desc">
                    {fac.reason}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  className={idx === 0 ? 'facility-solid-btn' : 'facility-outline-btn'}
                  onClick={() => handleSelectFacility(fac)}
                >
                  {t('healthcare.viewAvailabilityAndBook')}
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
