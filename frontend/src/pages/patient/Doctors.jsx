import { useState, useEffect, useMemo } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import ConnectivityBanner from '../../components/ConnectivityBanner'
import { SCREENS } from '../../utils/constants'
import { getDoctors } from '../../services/api'
import { DOCTORS_DATA, filterDoctorsOffline } from '../../data/doctorsData'
import { useTranslation } from '../../i18n'
import { getLocalizedFacilityName, getLocalizedDistrict } from '../../utils/hospitalLocalization'

const SPECIALIZATION_TAGS = [
  { id: 'all', labelKey: 'all', fallback: 'All Specialties' },
  { id: 'General Medicine', labelKey: 'generalMedicine', fallback: 'General Medicine' },
  { id: 'Pediatrics', labelKey: 'pediatrics', fallback: 'Pediatrics' },
  { id: 'Obstetrics & Gynecology', labelKey: 'obgyn', fallback: "Women's Health / OB-GYN" },
  { id: 'Orthopedics', labelKey: 'orthopedics', fallback: 'Orthopedics' },
  { id: 'Dermatology', labelKey: 'dermatology', fallback: 'Dermatology' },
  { id: 'Community Medicine', labelKey: 'communityMedicine', fallback: 'Community Medicine' },
]

export default function Doctors({ onNavigate, initialSpecialization = 'all', facilityId = null }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [doctors, setDoctors] = useState(DOCTORS_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSpecialization, setSelectedSpecialization] = useState(initialSpecialization)
  const [onlyAvailableToday, setOnlyAvailableToday] = useState(false)
  const [expandedDoctorId, setExpandedDoctorId] = useState(null)

  // Fetch doctors from API with fallback to bundled offline dataset
  useEffect(() => {
    let isMounted = true

    async function fetchDoctors() {
      setIsLoading(true)
      try {
        const params = {}
        if (facilityId) params.facility_id = facilityId
        if (selectedSpecialization && selectedSpecialization !== 'all') {
          params.specialization = selectedSpecialization
        }
        if (searchQuery.trim()) params.search = searchQuery.trim()
        if (onlyAvailableToday) params.available_today = true

        const res = await getDoctors(params)
        if (isMounted) {
          if (Array.isArray(res) && res.length > 0) {
            setDoctors(res)
          } else if (res?.data && Array.isArray(res.data)) {
            setDoctors(res.data)
          } else {
            // Apply client-side fallback filtering
            const offlineFiltered = filterDoctorsOffline(DOCTORS_DATA, {
              specialization: selectedSpecialization,
              facilityId,
              search: searchQuery,
              availableToday: onlyAvailableToday,
            })
            setDoctors(offlineFiltered)
          }
        }
      } catch {
        if (isMounted) {
          // Degraded or offline fallback
          const offlineFiltered = filterDoctorsOffline(DOCTORS_DATA, {
            specialization: selectedSpecialization,
            facilityId,
            search: searchQuery,
            availableToday: onlyAvailableToday,
          })
          setDoctors(offlineFiltered)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    fetchDoctors()

    return () => {
      isMounted = false
    }
  }, [facilityId, selectedSpecialization, searchQuery, onlyAvailableToday])

  // Filtered view from state
  const displayedDoctors = useMemo(() => {
    return filterDoctorsOffline(doctors, {
      specialization: selectedSpecialization,
      facilityId,
      search: searchQuery,
      availableToday: onlyAvailableToday,
    })
  }, [doctors, selectedSpecialization, facilityId, searchQuery, onlyAvailableToday])

  const handleBookWithDoctor = (doc) => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY, {
        doctorId: doc.id,
        doctorCode: doc.doctor_id,
        doctorName: doc.name,
        doctorSpecialization: doc.specialization,
        doctorRoom: doc.opd_room,
        facilityId: doc.facility_id,
        facility: doc.facility_name,
        service: doc.specialization,
      })
    }
  }

  const handleToggleDoctorExpand = (id) => {
    setExpandedDoctorId((prev) => (prev === id ? null : id))
  }

  const handleEmergencyCall = () => {
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

  const getLanguageLabel = (code) => {
    switch (code) {
      case 'mr':
        return 'मराठी'
      case 'hi':
        return 'हिंदी'
      case 'ta':
        return 'தமிழ்'
      case 'en':
      default:
        return 'English'
    }
  }

  return (
    <div className="doctors-directory-wrapper">
      {/* Brand Header */}
      <Header
        title={t('doctors.directoryTitle') || 'Doctor Directory'}
        showLogo
        showBack
        onBack={() => onNavigate && onNavigate(SCREENS.HOME)}
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleEmergencyCall} />}
      />

      <ConnectivityBanner />

      <main className="doctors-scrollable-content" id="main-content">
        {/* Screen Title & Description */}
        <section className="doctors-header-section" aria-label="Directory introduction">
          <h1 className="doctors-main-title">
            {t('doctors.title') || 'Find Doctors & Medical Officers'}
          </h1>
          <p className="doctors-subtitle">
            {t('doctors.subtitle') || 'Consult verified physicians across Primary Health Centres and Hospitals'}
          </p>
        </section>

        {/* Accessible Search Input */}
        <section className="doctors-search-section" role="search" aria-label="Search doctors">
          <div className="doctor-search-input-wrapper">
            <span className="doctor-search-icon" aria-hidden="true">🔍</span>
            <input
              id="doctorSearchInput"
              type="search"
              className="doctor-search-input"
              placeholder={t('doctors.searchPlaceholder') || 'Search by doctor name, specialty, room, or language...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label={t('doctors.searchAriaLabel') || 'Search doctors by name, specialty, or hospital'}
            />
            {searchQuery && (
              <button
                type="button"
                className="doctor-search-clear-btn"
                onClick={() => setSearchQuery('')}
                aria-label={t('doctors.clearSearch') || 'Clear search'}
              >
                ✕
              </button>
            )}
          </div>
        </section>

        {/* Specialization Filter Chips */}
        <section className="doctors-filter-chips-section" aria-label="Filter by specialization">
          <div className="doctors-chips-scroll" role="toolbar" aria-label="Clinical specialization filters">
            {SPECIALIZATION_TAGS.map((tag) => {
              const isSelected = selectedSpecialization === tag.id
              const localizedLabel = t(`doctors.specialties.${tag.labelKey}`) || tag.fallback
              return (
                <button
                  key={tag.id}
                  type="button"
                  className={`doctor-filter-chip ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedSpecialization(tag.id)}
                  aria-pressed={isSelected}
                >
                  {localizedLabel}
                </button>
              )
            })}
          </div>

          {/* Quick Toggle: Available Today */}
          <div className="doctors-availability-toggle-row">
            <button
              type="button"
              className={`doctor-avail-toggle-btn doctor-on-duty-toggle ${onlyAvailableToday ? 'active' : ''}`}
              onClick={() => setOnlyAvailableToday(!onlyAvailableToday)}
              aria-pressed={onlyAvailableToday}
            >
              <span className="doctor-avail-dot" aria-hidden="true" />
              <span>{t('doctors.onlyAvailableToday') || 'On Duty Today'}</span>
            </button>

            <span className="doctor-results-counter" aria-live="polite">
              {displayedDoctors.length} {t('doctors.doctorsFound') || 'doctors available'}
            </span>
          </div>
        </section>

        {/* Doctors List */}
        <section className="doctors-cards-section" aria-label="List of healthcare doctors">
          <div className="doctors-demo-notice-bar" style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>ℹ️</span>
            <span>{t('doctors.demoDoctorNotice') || 'Doctor assignments and profiles are realistic demo data for prototype evaluation. Credentials and hospital employment are unverified simulation records.'}</span>
          </div>

          {isLoading && displayedDoctors.length === 0 ? (
            <div className="doctor-directory-loading" aria-live="polite">
              <span className="doctor-loading-spinner" aria-hidden="true">⏳</span>
              <p>{t('doctors.loadingDoctors') || 'Loading medical officers...'}</p>
            </div>
          ) : displayedDoctors.length === 0 ? (
            <div className="doctor-directory-empty" role="status">
              <span className="doctor-empty-icon" aria-hidden="true">🩺</span>
              <h2>{t('doctors.noDoctorsFound') || 'No doctors match your criteria'}</h2>
              <p>{t('doctors.noDoctorsDesc') || 'Try adjusting your search terms or selecting another medical specialty.'}</p>
              <button
                type="button"
                className="doctor-reset-filter-btn"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedSpecialization('all')
                  setOnlyAvailableToday(false)
                }}
              >
                {t('doctors.resetFilters') || 'Show All Doctors'}
              </button>
            </div>
          ) : (
            displayedDoctors.map((doc) => {
              const isExpanded = expandedDoctorId === doc.id
              return (
                <article
                  key={doc.id}
                  className="doctor-card"
                  aria-label={`${doc.name}, ${doc.specialization} at ${doc.facility_name}`}
                >
                  <div className="doctor-card-header">
                    <div className="doctor-avatar-box" aria-hidden="true">
                      <span className="doctor-avatar-initials">
                        {doc.name.replace('Dr. ', '').slice(0, 2).toUpperCase()}
                      </span>
                    </div>

                    <div className="doctor-header-details">
                      <div className="doctor-name-row">
                        <h2 className="doctor-name">{doc.name}</h2>
                        {doc.available_today && (
                          <span className="doctor-duty-badge" title="Doctor is on duty today">
                            <span className="doctor-duty-dot" />
                            {t('doctors.onDuty') || 'On Duty'}
                          </span>
                        )}
                      </div>

                      <p className="doctor-qualification">{doc.qualification}</p>

                      <div className="doctor-badge-row" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span className="doctor-spec-pill">{doc.specialization}</span>
                        {doc.district && (
                          <span className="doctor-district-pill" style={{ background: '#f1f5f9', color: '#334155', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 }}>
                            📍 {getLocalizedDistrict(doc.district, t)}
                          </span>
                        )}
                        {(doc.is_demo || doc.verification_status === 'DEMO_UNVERIFIED') && (
                          <span className="doctor-demo-badge" style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '12px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                            {t('doctors.unverifiedDemo') || 'Demo Data (Unverified)'}
                          </span>
                        )}
                        {doc.experience_years && (
                          <span className="doctor-exp-pill">
                            {doc.experience_years} {t('doctors.yearsExp') || 'yrs exp'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Facility Association */}
                  <div className="doctor-facility-info">
                    <div className="doctor-facility-row">
                      <span className="doctor-facility-icon" aria-hidden="true">🏥</span>
                      <span className="doctor-facility-name">{getLocalizedFacilityName(doc.facility_name, t)}</span>
                    </div>
                    {doc.facility_address && (
                      <p className="doctor-facility-address">{doc.facility_address}</p>
                    )}
                  </div>

                  {/* OPD Timings, Room, & Languages */}
                  <div className="doctor-meta-grid">
                    <div className="doctor-meta-item">
                      <span className="doctor-meta-label">⏰ {t('doctors.opdHours') || 'OPD Hours'}:</span>
                      <span className="doctor-meta-val">{doc.opd_timings}</span>
                    </div>

                    <div className="doctor-meta-item">
                      <span className="doctor-meta-label">🚪 {t('doctors.room') || 'Consultation Room'}:</span>
                      <span className="doctor-meta-val">{doc.opd_room}</span>
                    </div>

                    <div className="doctor-meta-item full-width">
                      <span className="doctor-meta-label">🗣️ {t('doctors.languages') || 'Languages'}:</span>
                      <div className="doctor-languages-list">
                        {(doc.languages || []).map((lang) => (
                          <span key={lang} className="doctor-lang-tag">
                            {getLanguageLabel(lang)}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expandable Bio Section */}
                  {isExpanded && doc.bio && (
                    <div className="doctor-expanded-bio" aria-expanded="true">
                      <h3 className="doctor-bio-title">{t('doctors.aboutDoctor') || 'About Doctor'}:</h3>
                      <p className="doctor-bio-text">{doc.bio}</p>
                    </div>
                  )}

                  {/* Card Action Row */}
                  <div className="doctor-action-row">
                    <button
                      type="button"
                      className="doctor-book-btn"
                      onClick={() => handleBookWithDoctor(doc)}
                      aria-label={`${t('doctors.bookWith') || 'Book consultation with'} ${doc.name}`}
                    >
                      📅 {t('doctors.bookConsultation') || 'Book Appointment'}
                    </button>

                    <button
                      type="button"
                      className="doctor-details-toggle-btn doctor-bio-toggle-btn"
                      onClick={() => handleToggleDoctorExpand(doc.id)}
                      aria-expanded={isExpanded}
                      aria-label={isExpanded ? 'Hide doctor biography' : 'View doctor biography'}
                    >
                      {isExpanded ? t('doctors.hideDetails') || 'Hide Details' : t('doctors.viewDetails') || 'Doctor Info'}
                    </button>
                  </div>
                </article>
              )
            })
          )}
        </section>
      </main>

      {/* Accessible Bottom Navigation */}
      <BottomNav activeTab={activeTab} onTabChange={handleNavClick} />
    </div>
  )
}
