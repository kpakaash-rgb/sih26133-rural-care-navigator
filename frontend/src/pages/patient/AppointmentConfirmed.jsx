import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import ConnectivityBanner from '../../components/ConnectivityBanner'
import { SCREENS } from '../../utils/constants'
import { sendCareSummarySMS } from '../../services/api'
import { useTranslation } from '../../i18n'
import { getLocalizedFacilityName } from '../../utils/hospitalLocalization'

function formatTime(timeStr) {
  if (!timeStr) return ''
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hour = parseInt(parts[0], 10)
  const minute = parts[1]
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${ampm}`
}

function formatFacilityType(type, t) {
  switch (type) {
    case 'PRIMARY_HEALTH_CENTRE':
      return t ? t('facilityDetails.phc') : 'Primary Health Centre'
    case 'COMMUNITY_HEALTH_CENTRE':
      return t ? t('facilityDetails.chc') : 'Community Health Centre'
    case 'DISTRICT_HOSPITAL':
      return t ? t('facilityDetails.dh') : 'District Hospital'
    case 'SUB_CENTRE':
      return t ? t('facilityDetails.subCentre') : 'Sub-Centre'
    case 'MOBILE_CLINIC':
      return t ? t('facilityDetails.mmu') : 'Mobile Medical Unit'
    default:
      return type || (t ? t('booking.facility') : 'Healthcare Facility')
  }
}

export default function AppointmentConfirmed({ onNavigate, bookingData }) {
  const { t, language } = useTranslation()
  const [isSendingSms, setIsSendingSms] = useState(false)
  const [smsStatus, setSmsStatus] = useState(null)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isTtsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleViewAppointment = () => {
    if (onNavigate) {
      onNavigate(SCREENS.APPOINTMENTS)
    }
  }

  const handleGetDirections = () => {
    const query = encodeURIComponent(
      (appointmentDetails.facility || 'PHC Thirukazhukundram') + ', Tamil Nadu'
    )
    window.open(`https://maps.google.com/?q=${query}`, '_blank')
  }

  const handleBackToHome = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  const isOfflineSaved = Boolean(bookingData?.status === 'saved_offline' || bookingData?.isOfflineSaved)
  const appt = bookingData?.createdAppointment
  const rawDate = appt?.appointment_date || bookingData?.dateRaw || bookingData?.date || 'Scheduled Date'

  const appointmentDetails = {
    id: appt?.id || bookingData?.appointmentId || bookingData?.offlineQueueId,
    facility: appt?.facility_name || appt?.facility?.name || bookingData?.facility || 'Healthcare Facility',
    facilityId: appt?.facility_id || bookingData?.facilityId,
    facilityType: appt?.facility?.type ? formatFacilityType(appt.facility.type, t) : 'Primary Health Centre',
    service: appt?.service_name || appt?.service?.name || bookingData?.service || 'General Medicine',
    doctorName: bookingData?.doctorName || 'Dr. R. Karthik',
    doctorSpecialization: bookingData?.doctorSpecialization || bookingData?.service || 'General Medicine',
    doctorRoom: bookingData?.doctorRoom || 'OPD-1',
    type: bookingData?.type || 'In-person',
    date: rawDate,
    time: appt?.start_time
      ? `${formatTime(appt.start_time)} - ${formatTime(appt.end_time)}`
      : bookingData?.time || 'Scheduled Slot',
    status: isOfflineSaved ? 'SAVED_OFFLINE' : (appt?.status || 'SCHEDULED'),
  }

  const handleToggleSpeech = () => {
    if (!isTtsSupported) return
    if (isSpeaking) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      return
    }

    window.speechSynthesis.cancel()
    const confirmationText = `${t('appointmentConfirmed.title')}. ${appointmentDetails.facility}. ${appointmentDetails.doctorName}. ${appointmentDetails.date}, ${appointmentDetails.time}. ${t('appointmentConfirmed.instructions')}`
    const utterance = new SpeechSynthesisUtterance(confirmationText)
    const langCode =
      language === 'ta'
        ? 'ta-IN'
        : language === 'hi'
        ? 'hi-IN'
        : language === 'mr'
        ? 'mr-IN'
        : 'en-IN'
    utterance.lang = langCode
    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => setIsSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }

  const handleSendSms = async () => {
    if (isSendingSms) return
    setIsSendingSms(true)
    try {
      const response = await sendCareSummarySMS({
        appointment_id: appointmentDetails.id,
        facility_id: appointmentDetails.facilityId,
      })
      setSmsStatus({
        success: response?.success !== false,
        message: response?.message || t('appointmentConfirmed.smsSuccess'),
        preview: response?.sms_preview,
        demoMode: response?.demo_mode,
      })
    } catch (err) {
      setSmsStatus({
        success: false,
        message: err.message || t('common.smsFailedNotice'),
      })
    } finally {
      setIsSendingSms(false)
    }
  }

  return (
    <div className="confirmed-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Connectivity Banner */}
      <ConnectivityBanner />

      {/* Main Vertically Scrollable Content */}
      <main className="confirmed-scrollable-content">
        {/* Confirmation Hero Section */}
        {isOfflineSaved ? (
          <section className="confirmed-hero-section">
            <div
              className="confirmed-badge-box"
              style={{ backgroundColor: '#d97706', boxShadow: '0 4px 14px rgba(217, 119, 6, 0.3)' }}
              aria-hidden="true"
            >
              <span style={{ fontSize: '26px' }}>💾</span>
            </div>
            <h1 className="confirmed-main-title">
              {t('offlineQueue.savedOfflineTitle') || 'Saved Offline on Device'}
            </h1>
            <p className="confirmed-subtitle">
              {t('offlineQueue.savedOfflineDesc') ||
                'Your consultation request has been stored safely on your phone. It will be sent automatically when you reconnect to the internet.'}
            </p>

            {/* Offline warning notice */}
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: '10px',
                padding: '10px 14px',
                marginTop: '12px',
                color: '#92400e',
                fontSize: '0.82rem',
                fontWeight: 600,
                lineHeight: 1.45,
                textAlign: 'left',
              }}
            >
              ⚠️ {t('offlineQueue.notConfirmedNotice') ||
                'Saved on this device only. This consultation is NOT yet confirmed by the healthcare facility.'}
            </div>
          </section>
        ) : (
          <section className="confirmed-hero-section">
            <div className="confirmed-badge-box" aria-hidden="true">
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
            <h1 className="confirmed-main-title">{t('appointmentConfirmed.title')}</h1>
            <p className="confirmed-subtitle">{t('appointmentConfirmed.successMsg')}</p>
          </section>
        )}

        {/* Appointment Summary Card */}
        <article className="confirmed-summary-card">
          {/* Top: Facility Identity and Appointment ID */}
          <div className="confirmed-facility-header">
            <div className="confirmed-facility-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="confirmed-clinic-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                    <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                    <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </span>
                <h2 className="confirmed-facility-name">{getLocalizedFacilityName(appointmentDetails.facility, t)}</h2>
              </div>
              {appointmentDetails.id && (
                <span
                  style={{
                    backgroundColor: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '4px',
                  }}
                >
                  APT #{appointmentDetails.id}
                </span>
              )}
            </div>
            <p className="confirmed-facility-type">{appointmentDetails.facilityType}</p>
          </div>

          <div className="confirmed-card-divider" />

          {/* Row 1: Service & Type Grid */}
          <div className="confirmed-grid-row">
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">{t('booking.service').toUpperCase()}</span>
              <span className="confirmed-grid-value">{appointmentDetails.service}</span>
            </div>
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">{t('common.status').toUpperCase()}</span>
              <span className="confirmed-grid-value" style={{ color: '#16a34a', fontWeight: 600 }}>
                {appointmentDetails.status}
              </span>
            </div>
          </div>

          <div className="confirmed-card-divider" />

          {/* Row 2: Date & Time Grid */}
          <div className="confirmed-grid-row">
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">{t('booking.date').toUpperCase()}</span>
              <span className="confirmed-grid-value-bold">{appointmentDetails.date}</span>
            </div>
            <div className="confirmed-grid-col">
              <span className="confirmed-grid-label">{t('booking.time').toUpperCase()}</span>
              <span className="confirmed-grid-value-bold">{appointmentDetails.time}</span>
            </div>
          </div>

          {/* Notice Pill at Bottom of Card */}
          <div className="confirmed-notice-pill">
            <span className="notice-pill-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#0284c7">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </span>
            <span className="notice-pill-text">{t('appointmentConfirmed.instructions')}</span>
          </div>
        </article>

        {/* SMS Status & Demo Preview Section */}
        {smsStatus && (
          <section
            style={{
              margin: '0 16px 16px',
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: smsStatus.success ? '#f0fdf4' : '#fffbeb',
              border: smsStatus.success ? '1px solid #bbf7d0' : '1px solid #fde68a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span aria-hidden="true">{smsStatus.success ? '📱' : '⚠️'}</span>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: smsStatus.success ? '#166534' : '#92400e',
                }}
              >
                {smsStatus.message}
              </span>
            </div>

            {smsStatus.preview && smsStatus.demoMode && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: '#ffffff',
                  border: '1px dashed #cbd5e1',
                  borderRadius: '6px',
                }}
              >
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {t('common.demoSmsNotice')}
                </div>
                <pre
                  style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'monospace',
                    fontSize: '11.5px',
                    color: '#334155',
                    lineHeight: '1.4',
                  }}
                >
                  {smsStatus.preview}
                </pre>
              </div>
            )}
          </section>
        )}

        {/* Action Buttons Section */}
        <section className="confirmed-actions-group">
          {/* Accessibility TTS: Read Confirmation Aloud */}
          {isTtsSupported && (
            <button
              type="button"
              className={`confirmed-read-aloud-btn ${isSpeaking ? 'speaking' : ''}`}
              onClick={handleToggleSpeech}
              aria-label={isSpeaking ? (t('appointmentConfirmed.stopReading') || 'Stop Reading') : (t('appointmentConfirmed.readAloud') || 'Read Confirmation Aloud')}
            >
              <span aria-hidden="true">{isSpeaking ? '🔊' : '🗣️'}</span>
              <span>
                {isSpeaking
                  ? t('appointmentConfirmed.stopReading') || 'Stop Reading'
                  : t('appointmentConfirmed.readAloud') || 'Read Confirmation Aloud'}
              </span>
            </button>
          )}

          {/* SMS Action: Send details via SMS */}
          <button
            type="button"
            className="confirmed-primary-btn"
            onClick={handleSendSms}
            disabled={isSendingSms}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              backgroundColor: '#0284c7',
              opacity: isSendingSms ? 0.75 : 1,
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>{isSendingSms ? t('common.loading') : t('appointmentConfirmed.sendSms')}</span>
          </button>

          {/* Secondary Action: View My Appointment */}
          <button
            type="button"
            className="confirmed-directions-btn"
            onClick={handleViewAppointment}
          >
            {t('appointmentConfirmed.viewAppointments')}
          </button>

          {/* Secondary Action: Get Directions */}
          <button
            type="button"
            className="confirmed-directions-btn"
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

          {/* Text Action: Back to Home */}
          <button
            type="button"
            className="confirmed-home-link-btn"
            onClick={handleBackToHome}
          >
            {t('appointmentConfirmed.backToHome')}
          </button>
        </section>
      </main>
    </div>
  )
}

