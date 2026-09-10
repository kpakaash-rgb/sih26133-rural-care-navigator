import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getPatientFollowUps, completeFollowUp, cancelFollowUp } from '../../services/api'
import { useTranslation } from '../../i18n'

function formatFollowUpDate(dateStr) {
  if (!dateStr) return 'Scheduled Date'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function FollowUp({ onNavigate }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [followUps, setFollowUps] = useState([])
  const [selectedFollowUp, setSelectedFollowUp] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isMutating, setIsMutating] = useState(false)

  const reloadFollowUps = async () => {
    try {
      const data = await getPatientFollowUps()
      if (Array.isArray(data) && data.length > 0) {
        setFollowUps(data)
        setSelectedFollowUp(data[0])
      } else {
        setFollowUps([])
        setSelectedFollowUp(null)
      }
    } catch (err) {
      setErrorMessage(err.message || 'Unable to load follow-up checkups.')
    }
  }

  useEffect(() => {
    let isMounted = true

    getPatientFollowUps()
      .then((data) => {
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setFollowUps(data)
            setSelectedFollowUp(data[0])
          } else {
            setFollowUps([])
            setSelectedFollowUp(null)
          }
          setIsLoading(false)
        }
      })
      .catch((err) => {
        if (isMounted) {
          setErrorMessage(err.message || 'Unable to load follow-up checkups.')
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
    } else if (tabId === 'journey') {
      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENTS)
      }
    }
  }

  const handleViewAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.APPOINTMENTS)
    }
  }

  const handleGetDirections = () => {
    window.open('https://maps.google.com/?q=Primary+Health+Centre', '_blank')
  }

  const handleComplete = async (id) => {
    setIsMutating(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await completeFollowUp(id)
      setSuccessMessage('Follow-up marked as completed.')
      await reloadFollowUps()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete follow-up.')
    } finally {
      setIsMutating(false)
    }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this follow-up checkup?')) {
      return
    }
    setIsMutating(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      await cancelFollowUp(id)
      setSuccessMessage('Follow-up cancelled.')
      await reloadFollowUps()
    } catch (err) {
      setErrorMessage(err.message || 'Failed to cancel follow-up.')
    } finally {
      setIsMutating(false)
    }
  }

  const statusDisplay = (selectedFollowUp?.status === 'SCHEDULED' || selectedFollowUp?.status === 'PENDING')
    ? 'Upcoming'
    : selectedFollowUp?.status === 'COMPLETED'
    ? 'Completed'
    : selectedFollowUp?.status === 'CANCELLED'
    ? 'Cancelled'
    : selectedFollowUp?.status || 'Scheduled'

  const statusBg = selectedFollowUp?.status === 'COMPLETED'
    ? '#059669'
    : selectedFollowUp?.status === 'CANCELLED'
    ? '#dc2626'
    : '#004b87'

  const isPending = selectedFollowUp?.status === 'PENDING' || selectedFollowUp?.status === 'SCHEDULED'


  return (
    <div className="follow-up-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="follow-up-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="follow-up-header-section">
          <h1 className="follow-up-main-title">{t('followUp.title')}</h1>
          <p className="follow-up-subtitle">
            {t('followUp.subtitle')}
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
        {!isLoading && !selectedFollowUp && (
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
              {t('followUp.noFollowUps')}
            </p>
            <p style={{ fontSize: '13px', lineHeight: 1.4, margin: '0 0 16px' }}>
              {t('followUp.subtitle')}
            </p>
            <button
              type="button"
              className="follow-up-primary-btn"
              onClick={() => onNavigate && onNavigate(SCREENS.APPOINTMENTS)}
            >
              {t('home.myAppointments')}
            </button>
          </div>
        )}

        {/* Upcoming Follow-up Appointment Card */}
        {selectedFollowUp && !isLoading && (
          <>
            {followUps.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {followUps.map((fu) => (
                  <button
                    key={fu.id}
                    type="button"
                    onClick={() => setSelectedFollowUp(fu)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      border: fu.id === selectedFollowUp.id ? '2px solid #004b87' : '1px solid #cbd5e1',
                      backgroundColor: fu.id === selectedFollowUp.id ? '#eff6ff' : '#ffffff',
                      color: fu.id === selectedFollowUp.id ? '#004b87' : '#475569',
                      fontWeight: 600,
                      fontSize: '12.5px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Follow-up #{fu.id} ({fu.status})
                  </button>
                ))}
              </div>
            )}

            <article className="follow-up-appointment-card">
              {/* Top Row with Facility & Status Badge */}
              <div className="follow-up-card-top-row">
                <div className="follow-up-facility-info">
                  <div className="follow-up-icon-box" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                      <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                      <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="follow-up-identity">
                    <h2 className="follow-up-facility-name">
                      {selectedFollowUp.appointment_id
                        ? `Appointment #${selectedFollowUp.appointment_id}`
                        : selectedFollowUp.referral_id
                        ? `Referral #${selectedFollowUp.referral_id}`
                        : 'Follow-up Consultation'}
                    </h2>
                    <p className="follow-up-service-name">
                      {selectedFollowUp.notes || 'Clinical review & checkup'}
                    </p>
                  </div>
                </div>

                <div className="follow-up-upcoming-badge" style={{ backgroundColor: statusBg }}>
                  <span className="badge-cal-icon" aria-hidden="true">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                    </svg>
                  </span>
                  <span>{statusDisplay}</span>
                </div>
              </div>

              {/* Date & Time Row */}
              <div className="follow-up-datetime-section">
                <div className="follow-up-datetime-item">
                  <span className="datetime-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </span>
                  <span className="datetime-text">{formatFollowUpDate(selectedFollowUp.follow_up_date)}</span>
                </div>

                {selectedFollowUp.appointment_id && (
                  <div className="follow-up-datetime-item">
                    <span className="datetime-icon" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                    </span>
                    <span className="datetime-text">Linked to Appointment #{selectedFollowUp.appointment_id}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="follow-up-actions-group">
                {isPending && (
                  <button
                    type="button"
                    className="follow-up-primary-btn"
                    onClick={() => handleComplete(selectedFollowUp.id)}
                    disabled={isMutating}
                    style={{ backgroundColor: '#059669' }}
                  >
                    {isMutating ? t('common.loading') : '✓ Mark Checkup as Completed'}
                  </button>
                )}

                <button
                  type="button"
                  className="follow-up-primary-btn"
                  onClick={handleViewAppointment}
                >
                  {t('home.myAppointments')}
                </button>

                <button
                  type="button"
                  className="follow-up-directions-btn"
                  onClick={handleGetDirections}
                >
                  <span className="btn-glyph-directions" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="3 11 22 2 13 21 11 13 3 11" />
                    </svg>
                  </span>
                  <span>{t('facilityDetails.directions')}</span>
                </button>

                {isPending && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedFollowUp.id)}
                    disabled={isMutating}
                    style={{
                      width: '100%',
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fca5a5',
                      borderRadius: '8px',
                      padding: '11px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isMutating ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease',
                      marginTop: '4px',
                    }}
                  >
                    {isMutating ? t('common.loading') : t('common.cancel')}
                  </button>
                )}
              </div>
            </article>
          </>
        )}

        {/* Healthcare Facility Illustration Container */}
        <section className="follow-up-illustration-card">
          <div className="facility-illustration-frame">
            <svg
              className="facility-clinic-svg"
              viewBox="0 0 400 220"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Rural Health Clinic Illustration"
            >
              {/* Sky and distant hills */}
              <rect width="400" height="220" fill="#f0fdf4" rx="8" />
              <path d="M0 130 C100 110 200 125 400 100 L400 220 L0 220 Z" fill="#dcfce7" />
              <path d="M0 150 C120 135 280 145 400 135 L400 220 L0 220 Z" fill="#bbf7d0" />
              
              {/* Trees and greenery */}
              <circle cx="30" cy="140" r="24" fill="#86efac" />
              <circle cx="55" cy="145" r="20" fill="#4ade80" />
              <circle cx="360" cy="140" r="25" fill="#86efac" />
              <circle cx="380" cy="148" r="18" fill="#4ade80" />

              {/* Pathway */}
              <path d="M120 220 L160 170 L240 170 L280 220 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />

              {/* Clinic Building */}
              {/* Roof */}
              <polygon points="120,110 200,70 280,110" fill="#1e40af" />
              {/* Wall */}
              <rect x="135" y="110" width="130" height="60" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Clinic Sign */}
              <rect x="160" y="114" width="80" height="14" rx="3" fill="#004b87" />
              <text x="200" y="124" fill="#ffffff" fontSize="7" fontWeight="bold" textAnchor="middle" fontFamily="sans-serif">
                RURAL HEALTH CLINIC
              </text>
              {/* Windows */}
              <rect x="145" y="134" width="22" height="22" rx="2" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" />
              <line x1="156" y1="134" x2="156" y2="156" stroke="#0284c7" strokeWidth="0.8" />
              <line x1="145" y1="145" x2="167" y2="145" stroke="#0284c7" strokeWidth="0.8" />
              
              <rect x="233" y="134" width="22" height="22" rx="2" fill="#bae6fd" stroke="#0284c7" strokeWidth="1" />
              <line x1="244" y1="134" x2="244" y2="156" stroke="#0284c7" strokeWidth="0.8" />
              <line x1="233" y1="145" x2="255" y2="145" stroke="#0284c7" strokeWidth="0.8" />

              {/* Door */}
              <rect x="185" y="132" width="30" height="38" rx="2" fill="#f8fafc" stroke="#64748b" strokeWidth="1.2" />
              <circle cx="210" cy="152" r="1.5" fill="#334155" />

              {/* Nurse figure */}
              <circle cx="205" cy="165" r="5" fill="#fbcfe8" />
              <path d="M198 170 C198 168 212 168 212 170 L210 195 L200 195 Z" fill="#0284c7" />
              {/* Nurse waving arm */}
              <path d="M210 174 L220 166" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" />

              {/* Patient senior figures */}
              {/* Senior woman */}
              <circle cx="250" cy="168" r="4.5" fill="#fed7aa" />
              <path d="M245 173 C245 171 255 171 255 173 L253 195 L247 195 Z" fill="#f43f5e" />
              {/* Senior man with walking stick */}
              <circle cx="266" cy="166" r="5" fill="#fed7aa" />
              <path d="M260 171 C260 169 272 169 272 171 L270 196 L262 196 Z" fill="#475569" />
              <line x1="274" y1="178" x2="274" y2="198" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />

              {/* Bicycle near clinic */}
              <circle cx="100" cy="180" r="7" stroke="#475569" strokeWidth="1.2" fill="none" />
              <circle cx="118" cy="180" r="7" stroke="#475569" strokeWidth="1.2" fill="none" />
              <line x1="100" y1="180" x2="108" y2="172" stroke="#475569" strokeWidth="1.2" />
              <line x1="108" y1="172" x2="118" y2="180" stroke="#475569" strokeWidth="1.2" />
              <line x1="108" y1="172" x2="106" y2="168" stroke="#475569" strokeWidth="1.2" />
            </svg>
          </div>
        </section>
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

