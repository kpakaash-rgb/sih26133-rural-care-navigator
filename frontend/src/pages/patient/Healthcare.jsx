import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { recommendHospitals, getFacilities, getFacilityQueue } from '../../services/api'
import { formatQueueLastUpdated } from '../../utils'

function formatFacilityType(type) {
  switch (type) {
    case 'PRIMARY_HEALTH_CENTRE':
      return 'Primary Health Centre'
    case 'COMMUNITY_HEALTH_CENTRE':
      return 'Community Health Centre'
    case 'DISTRICT_HOSPITAL':
      return 'District Hospital'
    case 'SUB_CENTRE':
      return 'Sub-Centre'
    case 'MOBILE_CLINIC':
      return 'Mobile Medical Unit'
    default:
      return type || 'Healthcare Facility'
  }
}

// Default demonstration location coordinates (Malshiras, Solapur District)
// Used as a transparent reference location for proximity calculation in prototype mode.
const DEMO_FALLBACK_LOCATION = {
  latitude: 17.8543,
  longitude: 74.9082,
  name: 'Malshiras, Solapur',
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
  const [activeTab, setActiveTab] = useState('services')
  const [facilities, setFacilities] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAiRecommended, setIsAiRecommended] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function fetchHealthcareOptions() {
      setIsLoading(true)
      setErrorMessage('')

      const lat = DEMO_FALLBACK_LOCATION.latitude
      const lon = DEMO_FALLBACK_LOCATION.longitude

      try {
        if (triageData) {
          const requiredServices = deriveRequiredServices(triageData)

          const response = await recommendHospitals({
            required_services: requiredServices,
            latitude: lat,
            longitude: lon,
            max_results: 5,
          })

          const recs = response?.recommendations || []
          if (isMounted && recs.length > 0) {
            // Also fetch fresh queue detail for each facility to ensure last_updated timestamp is present
            const mapped = await Promise.all(
              recs.map(async (rec) => {
                let queueData = null
                try {
                  queueData = await getFacilityQueue(rec.facility_id)
                } catch {
                  // Ignore fallback
                }

                const waitingPatients = queueData?.waiting_patients ?? rec.waiting_patients ?? 0
                const estimatedWait = queueData?.estimated_wait_minutes ?? rec.estimated_wait_minutes ?? 0
                const status = queueData?.status || (rec.queue_status === 'UNKNOWN' ? null : rec.queue_status) || 'NORMAL'
                const lastUpdated = queueData?.last_updated || null

                return {
                  id: rec.facility_id,
                  name: rec.hospital_name,
                  category: formatFacilityType(rec.facility_type),
                  distance: rec.distance_km != null ? `${rec.distance_km} km away` : 'Nearby',
                  services: rec.matched_services.length > 0 ? rec.matched_services : ['General Medicine'],
                  reason: rec.recommendation_reason || 'This place has what you need and is near you.',
                  queueStatus: status,
                  waitingPatients,
                  estimatedWaitMinutes: estimatedWait,
                  lastUpdated,
                  raw: rec,
                }
              })
            )
            if (isMounted) {
              setFacilities(mapped)
              setIsAiRecommended(true)
              setIsLoading(false)
              return
            }
          }
        }

        const facilitiesData = await getFacilities({ lat, lon })
        if (isMounted && Array.isArray(facilitiesData) && facilitiesData.length > 0) {
          const mapped = await Promise.all(
            facilitiesData.map(async (fac) => {
              let queueData = null
              try {
                queueData = await getFacilityQueue(fac.id)
              } catch {
                // Ignore fallback
              }

              return {
                id: fac.id,
                name: fac.name,
                category: formatFacilityType(fac.type),
                distance: fac.distance_km != null ? `${fac.distance_km} km away` : 'Nearby',
                services: fac.services?.map((s) => s.name) || ['General Medicine', 'Doctor', 'Basic Tests'],
                reason: 'Operational healthcare facility near your location.',
                queueStatus: queueData?.status || null,
                waitingPatients: queueData?.waiting_patients ?? null,
                estimatedWaitMinutes: queueData?.estimated_wait_minutes ?? null,
                lastUpdated: queueData?.last_updated || null,
                raw: fac,
              }
            })
          )
          if (isMounted) {
            setFacilities(mapped)
            setIsAiRecommended(false)
          }
        }
      } catch {
        if (isMounted) {
          setErrorMessage('Unable to load live facility recommendations. Showing available options.')
          // Fallback to standard facilities
          setFacilities([
            {
              id: 1,
              name: 'PHC Malshiras',
              category: 'Primary Health Centre',
              distance: '4.2 km away',
              services: ['Doctor', 'Basic tests', 'Medicines'],
              reason: 'This place has what you need and is near you.',
              queueStatus: 'Queue status unavailable',
            },
            {
              id: 2,
              name: 'CHC Akluj',
              category: 'Community Health Centre',
              distance: '12.5 km away',
              services: ['Specialist Doctor', 'Advanced tests'],
              reason: 'This place has more tests but is further away.',
              queueStatus: 'Queue status unavailable',
            },
          ])
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchHealthcareOptions()

    return () => {
      isMounted = false
    }
  }, [triageData])

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
        title="Rural Care Navigator"
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
                CRITICAL EMERGENCY WARNING
              </h2>
            </div>
            <p className="emergency-box-message">
              Your reported symptoms indicate an emergency. Do not wait in standard facility queues. Call for an emergency ambulance or proceed to the nearest emergency care unit immediately.
            </p>
            <button
              type="button"
              className="emergency-call-action-btn"
              onClick={handleSosClick}
              aria-label="Call Emergency Help 108"
            >
              <span className="emergency-phone-glyph" aria-hidden="true">📞</span>
              <span>Call Emergency Help (108)</span>
            </button>
          </article>
        )}

        {/* Title and Badge */}
        <section className="healthcare-intro-section">
          <h1 className="healthcare-page-title">Places that can help you</h1>
          <p className="healthcare-page-subtitle">
            {isAiRecommended
              ? 'AI-ranked recommendations based on your symptoms, needed services, and distance.'
              : 'Healthcare facilities available near your location.'}
          </p>
          <div className="prototype-data-pill">
            <span className="prototype-info-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#475569">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </span>
            <span className="prototype-text">
              {isAiRecommended ? 'AI Care Guidance' : 'Live Facilities'}
            </span>
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
            <p>Finding suitable healthcare facilities...</p>
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
                  <h3 className="services-heading">Services:</h3>
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
                        <span className="availability-label" style={{ fontWeight: 700 }}>Queue:</span>
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
                            {fac.waitingPatients} patients waiting
                          </span>
                        )}
                        {fac.estimatedWaitMinutes != null && (
                          <span style={{ fontSize: '12px', color: '#64748b' }}>
                            • ~{fac.estimatedWaitMinutes} min wait
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
                      Queue information unavailable
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
                    <h4 className="why-facility-heading">Why this facility?</h4>
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
                  View Details
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
