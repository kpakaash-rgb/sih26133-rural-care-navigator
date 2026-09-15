import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { triageSymptoms } from '../../services/api'
import { useTranslation } from '../../i18n'

const COMMON_SYMPTOMS_LIST = [
  'Fever',
  'Cough',
  'Headache',
  'Pain',
  'Stomach Problem',
  'Injury',
]

const PAIN_TYPES_LIST = [
  'Knee Pain',
  'Back Pain',
  'Other Pain',
]

export default function Symptoms({ onNavigate }) {
  const { t } = useTranslation()
  const [problemDescription, setProblemDescription] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [selectedPainType, setSelectedPainType] = useState(null)
  const [durationDays, setDurationDays] = useState(1)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const handleToggleSymptom = (symptom) => {
    setSelectedSymptoms((prev) => {
      const isCurrentlySelected = prev.includes(symptom)
      if (isCurrentlySelected) {
        if (symptom === 'Pain') {
          setSelectedPainType(null)
        }
        return prev.filter((item) => item !== symptom)
      } else {
        return [...prev, symptom]
      }
    })
  }

  const handleSelectPainType = (painType) => {
    setSelectedPainType((prev) => (prev === painType ? null : painType))
  }

  const handleContinue = async () => {
    // Prevent empty submission
    if (
      selectedSymptoms.length === 0 &&
      problemDescription.trim().length === 0
    ) {
      setErrorMessage(t('symptoms.selectAtLeastOne'))
      return
    }

    setIsLoading(true)
    setErrorMessage('')

    const payloadSymptoms = [...selectedSymptoms]
    if (
      selectedSymptoms.includes('Pain') &&
      selectedPainType &&
      !payloadSymptoms.includes(selectedPainType)
    ) {
      payloadSymptoms.push(selectedPainType)
    }

    try {
      const result = await triageSymptoms({
        symptoms: payloadSymptoms,
        description: problemDescription.trim(),
        duration_days: durationDays,
      })

      if (onNavigate) {
        onNavigate(SCREENS.CARE_GUIDANCE, {
          urgency: result.urgency,
          recommended_care: result.recommended_care,
          reason: result.reason,
          emergency: result.emergency,
          reportedSymptoms: payloadSymptoms.length > 0 ? payloadSymptoms : (result.symptoms || []),
          problemDescription: problemDescription.trim(),
          duration_days: durationDays,
        })
      }
    } catch (error) {
      setErrorMessage(
        error.message ||
          'Unable to connect to the care guidance service. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmergencyCall = () => {
    window.location.href = 'tel:108'
  }

  return (
    <div className="symptoms-screen-wrapper">
      {/* Brand Header with SOS and Back */}
      <Header
        title={t('common.appName')}
        showLogo
        showBack
        onBack={() => onNavigate && onNavigate(SCREENS.HOME)}
        rightAction={
          <SOSButton
            label="SOS"
            icon="▲"
            onClick={handleEmergencyCall}
          />
        }
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="symptoms-scrollable-content">
        {/* Screen Title & Subtitle */}
        <section className="symptoms-header-section">
          <h1 className="symptoms-main-title">
            {t('symptoms.title')}
          </h1>

          <p className="symptoms-subtitle">
            {t('symptoms.subtitle')}
          </p>
        </section>

        {/* Problem Description Text Area */}
        <section className="symptoms-form-group">
          <label
            htmlFor="problemInput"
            className="symptoms-section-label"
          >
            {t('symptoms.describeProblem')}
          </label>

          <textarea
            id="problemInput"
            className="symptoms-problem-textarea"
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder={t('symptoms.describePlaceholder')}
            disabled={isLoading}
          />
        </section>

        {/* Common Symptoms Selection */}
        <section className="symptoms-form-group">
          <h2 className="symptoms-section-label">
            {t('symptoms.selectSymptoms')}
          </h2>

          <div className="symptoms-chips-container">
            {COMMON_SYMPTOMS_LIST.map((symptom) => {
              const isSelected = selectedSymptoms.includes(symptom)
              const localizedLabel =
                t(`symptoms.symptomItems.${symptom}`) || symptom

              return (
                <button
                  key={symptom}
                  type="button"
                  className={`symptom-chip-btn ${
                    isSelected ? 'selected' : ''
                  }`}
                  onClick={() => handleToggleSymptom(symptom)}
                  aria-pressed={isSelected}
                  disabled={isLoading}
                >
                  <span className="chip-btn-text">
                    {localizedLabel}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Pain Sub-selection */}
          {selectedSymptoms.includes('Pain') && (
            <div className="symptoms-subchips-section">
              <span className="symptoms-subchips-label">
                {t('symptoms.painType')}
              </span>
              <div className="symptoms-subchips-container">
                {PAIN_TYPES_LIST.map((painType) => {
                  const isSubSelected = selectedPainType === painType
                  const localizedPain =
                    t(`symptoms.symptomItems.${painType}`) || painType

                  return (
                    <button
                      key={painType}
                      type="button"
                      className={`symptom-subchip-btn ${
                        isSubSelected ? 'selected' : ''
                      }`}
                      onClick={() => handleSelectPainType(painType)}
                      aria-pressed={isSubSelected}
                      disabled={isLoading}
                    >
                      <span className="chip-btn-text">{localizedPain}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* Duration Input Stepper */}
        <section className="symptoms-form-group symptoms-duration-group">
          <h2 className="symptoms-section-label">
            {t('symptoms.durationTitle')}
          </h2>

          <p className="symptoms-duration-subtext">
            {t('symptoms.durationSubtext')}
          </p>

          <div className="duration-stepper-container">
            <button
              type="button"
              className="duration-step-btn"
              onClick={() => setDurationDays((prev) => Math.max(1, prev - 1))}
              disabled={durationDays <= 1 || isLoading}
              aria-label="Decrease days"
            >
              −
            </button>

            <div className="duration-value-display">
              <span className="duration-number">{durationDays}</span>
              <span className="duration-unit">
                {durationDays === 1 ? t('symptoms.day') : t('symptoms.days')}
              </span>
            </div>

            <button
              type="button"
              className="duration-step-btn"
              onClick={() => setDurationDays((prev) => Math.min(30, prev + 1))}
              disabled={durationDays >= 30 || isLoading}
              aria-label="Increase days"
            >
              +
            </button>
          </div>
        </section>

        {/* Error Message */}
        {errorMessage && (
          <div
            role="alert"
            className="symptoms-error-message"
          >
            {errorMessage}
          </div>
        )}

        {/* Serious Emergency Warning Box */}
        <article className="serious-emergency-box">
          <div className="emergency-box-header">
            <span
              className="emergency-asterisk-icon"
              aria-hidden="true"
            >
              ✱
            </span>

            <h2 className="emergency-box-title">
              {t('symptoms.emergencyHeading')}
            </h2>
          </div>

          <p className="emergency-box-message">
            {t('symptoms.emergencyNotice')}
          </p>

          <button
            type="button"
            className="emergency-call-action-btn"
            onClick={handleEmergencyCall}
            aria-label={t('common.call108')}
          >
            <span
              className="emergency-phone-glyph"
              aria-hidden="true"
            >
              📞
            </span>

            <span>
              {t('common.call108')}
            </span>
          </button>
        </article>

        {/* AI Guidance Disclaimer Box */}
        <div className="ai-guidance-disclaimer">
          <div
            className="disclaimer-icon-wrapper"
            aria-hidden="true"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="#475569"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </div>

          <p className="disclaimer-text">
            {t('symptoms.disclaimer')}
          </p>
        </div>
      </main>

      {/* Accessible Bottom Sticky Action Container */}
      <footer className="symptoms-bottom-bar">
        <button
          type="button"
          className="symptoms-continue-btn"
          onClick={handleContinue}
          disabled={isLoading}
        >
          <span>
            {isLoading ? t('symptoms.checking') : t('symptoms.continueBtn')}
          </span>

          {!isLoading && (
            <span
              className="continue-arrow-glyph"
              aria-hidden="true"
            >
              →
            </span>
          )}
        </button>
      </footer>
    </div>
  )
}