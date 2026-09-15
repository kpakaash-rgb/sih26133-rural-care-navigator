import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { useTranslation } from '../../i18n'

export default function CareGuidance({
  onNavigate,
  triageResult,
  reportedSymptoms = [],
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')

  // Extract real dynamic values from the backend triage result
  const urgency = triageResult?.urgency || 'routine'
  const recommendedCare =
    triageResult?.recommended_care || 'Primary Health Centre (PHC)'
  const reason =
    triageResult?.reason ||
    'No emergency warning sign was identified. Consider routine healthcare if your symptoms persist or become worse.'
  const emergency = Boolean(triageResult?.emergency)
  const durationDays =
    triageResult?.duration_days || triageResult?.durationDays || 1

  const durationUnit =
    durationDays === 1 ? t('symptoms.day') : t('symptoms.days')
  const durationLabel = `${durationDays} ${durationUnit}`

  // Normalize symptom tokens for localization lookup
  const formatSymptom = (sym) => {
    if (!sym) return ''
    if (sym === 'FEVER') return 'Fever'
    if (sym === 'COUGH') return 'Cough'
    if (sym === 'HEADACHE') return 'Headache'
    if (sym === 'STOMACH_PROBLEM') return 'Stomach Problem'
    if (sym === 'KNEE_PAIN') return 'Knee Pain'
    if (sym === 'BACK_PAIN') return 'Back Pain'
    if (sym === 'OTHER_PAIN') return 'Other Pain'
    if (sym === 'INJURY') return 'Injury'
    if (sym === 'GENERAL_OTHER') return 'General / Other'
    return sym
  }

  const rawSymptomsList =
    reportedSymptoms && reportedSymptoms.length > 0
      ? reportedSymptoms
      : triageResult?.symptoms && triageResult.symptoms.length > 0
      ? triageResult.symptoms
      : triageResult?.problemDescription
      ? [triageResult.problemDescription]
      : []

  const formattedSymptoms = rawSymptomsList.map(formatSymptom).filter(Boolean)

  const getUrgencyTitle = () => {
    switch (urgency) {
      case 'emergency':
        return t('triage.emergency')
      case 'needs_attention':
        return t('triage.needsAttention')
      case 'routine':
      default:
        return t('triage.routine')
    }
  }

  const getUrgencyMessage = () => {
    switch (urgency) {
      case 'emergency':
        return t('triage.emergencyDesc')
      case 'needs_attention':
        return t('triage.needsAttentionDesc')
      case 'routine':
      default:
        return t('triage.routineDesc')
    }
  }

  const handleEmergencyCall = () => {
    window.location.href = 'tel:108'
  }

  const handleFindCare = () => {
    if (onNavigate) {
      onNavigate(SCREENS.HEALTHCARE, {
        triageData: triageResult,
        urgency,
        recommendedCare,
      })
    }
  }

  const handleEditFeeling = () => {
    if (onNavigate) {
      onNavigate(SCREENS.SYMPTOMS)
    }
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

  return (
    <div className="care-guidance-screen-wrapper">
      {/* Brand Header with SOS and Back */}
      <Header
        title={t('common.appName')}
        showLogo
        showBack
        onBack={() => onNavigate && onNavigate(SCREENS.SYMPTOMS)}
        rightAction={
          <SOSButton
            label="SOS"
            icon="▲"
            onClick={handleEmergencyCall}
          />
        }
      />

      {/* Main Vertically Scrollable Content */}
      <main className="care-guidance-scrollable-content">
        {/* Triage Level Assessment Card */}
        <section className="urgency-question-section">
          <h2 className="urgency-question-heading">
            {t('careGuidance.triageLevel')}
          </h2>

          <div
            className={`needs-attention-card urgency-${urgency}`}
          >
            <div className="attention-badge-title">
              {getUrgencyTitle()}
            </div>

            <p className="attention-card-desc">
              {getUrgencyMessage()}
            </p>
          </div>
        </section>

        {/* Guidance Header */}
        <section className="care-guidance-intro">
          <h1 className="guidance-main-title">
            {t('careGuidance.title')}
          </h1>

          <p className="guidance-subtitle">
            {t('careGuidance.safetyDisclaimer')}
          </p>
        </section>

        {/* Reported Symptoms with Duration */}
        <section className="reported-symptoms-card">
          <div className="reported-symptoms-header">
            <svg
              className="reported-list-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#64748b"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="8" y1="8" x2="16" y2="8" />
              <line x1="8" y1="12" x2="16" y2="12" />
              <line x1="8" y1="16" x2="12" y2="16" />
            </svg>

            <h2 className="reported-symptoms-title">
              {t('symptoms.selectSymptoms')}
            </h2>
          </div>

          <div className="reported-symptoms-chips">
            {formattedSymptoms.length > 0 ? (
              formattedSymptoms.map((symptom) => {
                const localizedSymptom =
                  t(`symptoms.symptomItems.${symptom}`) || symptom

                return (
                  <span
                    key={symptom}
                    className="guidance-symptom-chip"
                  >
                    {localizedSymptom} · {durationLabel}
                  </span>
                )
              })
            ) : (
              <span className="guidance-symptom-chip">
                {t('symptoms.selectSymptoms')} · {durationLabel}
              </span>
            )}
          </div>
        </section>

        {/* Specific Dynamic Clinical Reason */}
        <section className="guidance-detail-section">
          <h2 className="guidance-detail-heading">
            {t('careGuidance.reason')}
          </h2>

          <p className="guidance-detail-text">
            {reason}
          </p>
        </section>

        {/* Recommended Action / Facility Level */}
        <section className="guidance-detail-section">
          <h2 className="guidance-detail-heading">
            {t('careGuidance.recommendedAction')}
          </h2>

          <p className="guidance-detail-text">
            {recommendedCare}
          </p>
        </section>

        {/* Prominent Emergency Warning for Emergency Results */}
        {emergency && (
          <section className="care-guidance-emergency-section">
            <div className="emergency-section-header">
              <span
                className="emergency-siren-glyph"
                aria-hidden="true"
              >
                🚨
              </span>

              <h2 className="emergency-section-title">
                {t('careGuidance.emergencyWarning')}
              </h2>
            </div>

            <button
              type="button"
              className="care-guidance-emergency-btn"
              onClick={handleEmergencyCall}
              aria-label={t('common.call108')}
            >
              <svg
                className="emergency-diamond-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 22 12 12 22 2 12 12 2" />
                <path
                  d="M12 8v4"
                  strokeWidth="2.5"
                />
                <circle
                  cx="12"
                  cy="16"
                  r="1.2"
                  fill="currentColor"
                />
              </svg>

              <span>{t('common.call108')}</span>
            </button>
          </section>
        )}

        {/* AI Informational Disclaimer */}
        <div className="guidance-ai-disclaimer">
          <span
            className="disclaimer-info-icon"
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#64748b"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </span>

          <p className="disclaimer-italic-text">
            {t('common.disclaimer')}
          </p>
        </div>

        {/* Action Buttons: Find Suitable Facilities & Edit Symptoms */}
        <div className="care-guidance-actions">
          {/* Find Care */}
          <button
            type="button"
            className="guidance-find-care-btn"
            onClick={handleFindCare}
          >
            <svg
              className="action-btn-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <line
                x1="21"
                y1="21"
                x2="16.65"
                y2="16.65"
              />
            </svg>

            <span>{t('careGuidance.viewFacilities')}</span>
          </button>

          {/* Edit Symptoms ("How are you feeling?") */}
          <button
            type="button"
            className="guidance-edit-feeling-btn"
            onClick={handleEditFeeling}
          >
            <svg
              className="action-btn-icon"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>

            <span>{t('symptoms.title')}</span>
          </button>
        </div>

        {/* General Emergency 108 Callout (when not already an emergency result) */}
        {!emergency && (
          <section className="care-guidance-emergency-section">
            <div className="emergency-section-header">
              <span
                className="emergency-siren-glyph"
                aria-hidden="true"
              >
                🚨
              </span>

              <h2 className="emergency-section-title">
                {t('common.emergencySos')}
              </h2>
            </div>

            <button
              type="button"
              className="care-guidance-emergency-btn"
              onClick={handleEmergencyCall}
              aria-label={t('common.call108')}
            >
              <svg
                className="emergency-diamond-icon"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polygon points="12 2 22 12 12 22 2 12 12 2" />
                <path d="M12 8v4" strokeWidth="2.5" />
                <circle
                  cx="12"
                  cy="16"
                  r="1.2"
                  fill="currentColor"
                />
              </svg>

              <span>{t('common.call108')}</span>
            </button>
          </section>
        )}
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeScreen={activeTab}
        onNavigate={handleNavClick}
      />
    </div>
  )
}