import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { triageSymptoms } from '../../services/api'
import { runOfflineTriage } from '../../services/offlineTriage'
import ConnectivityBanner from '../../components/ConnectivityBanner'
import { useTranslation } from '../../i18n'
import { useVoiceInput } from '../../hooks/useVoiceInput'

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
  const { t, language } = useTranslation()
  const [problemDescription, setProblemDescription] = useState('')
  const [selectedSymptoms, setSelectedSymptoms] = useState([])
  const [selectedPainType, setSelectedPainType] = useState(null)
  const [durationDays, setDurationDays] = useState(1)

  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const regionalLangCode =
    language === 'ta'
      ? 'ta-IN'
      : language === 'hi'
      ? 'hi-IN'
      : language === 'mr'
      ? 'mr-IN'
      : 'en-IN'

  const {
    isListening,
    isProcessing,
    isDone,
    transcript: recognizedTranscript,
    error: voiceError,
    demoMode: isVoiceDemo,
    startListening,
    stopListening,
    resetVoice,
  } = useVoiceInput({
    defaultLanguage: regionalLangCode,
  })

  const handleMicClick = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening({ language: regionalLangCode })
    }
  }

  const handleApplyVoiceTranscript = () => {
    if (!recognizedTranscript) return
    setProblemDescription((prev) => {
      const trimmed = prev.trim()
      return trimmed ? `${trimmed} ${recognizedTranscript}` : recognizedTranscript
    })
    resetVoice()
  }

  const handleClearVoiceTranscript = () => {
    resetVoice()
  }

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

    const triagePayload = {
      symptoms: payloadSymptoms,
      description: problemDescription.trim(),
      duration_days: durationDays,
    }

    try {
      let result = null

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // Fast-path client-side rule evaluation when offline
        result = runOfflineTriage(triagePayload)
      } else {
        try {
          result = await triageSymptoms(triagePayload)
        } catch (apiError) {
          // If server error or dropped connection, seamlessly fallback to offline triage
          console.warn('Online triage request failed, using offline triage fallback:', apiError)
          result = runOfflineTriage(triagePayload)
        }
      }

      if (onNavigate && result) {
        onNavigate(SCREENS.CARE_GUIDANCE, {
          urgency: result.urgency,
          recommended_care: result.recommended_care,
          reason: result.reason,
          emergency: result.emergency,
          reportedSymptoms: payloadSymptoms.length > 0 ? payloadSymptoms : (result.symptoms || []),
          problemDescription: problemDescription.trim(),
          duration_days: durationDays,
          offline: Boolean(result.offline),
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

      {/* Connectivity Alert Banner */}
      <ConnectivityBanner />

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

        {/* Problem Description Text Area with Regional Voice AI */}
        <section className="symptoms-form-group">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label
              htmlFor="problemInput"
              className="symptoms-section-label"
              style={{ margin: 0 }}
            >
              {t('symptoms.describeProblem')}
            </label>

            <button
              type="button"
              className={`voice-mic-btn ${isListening ? 'listening' : ''} ${isProcessing ? 'processing' : ''}`}
              onClick={handleMicClick}
              disabled={isLoading || isProcessing}
              aria-label={isListening ? t('voice.stopReading') || 'Stop Recording' : t('voice.tapToSpeak') || 'Record Voice'}
            >
              <span aria-hidden="true" style={{ fontSize: '15px' }}>
                {isListening ? '⏹️' : isProcessing ? '⏳' : '🎙️'}
              </span>
              <span>
                {isListening
                  ? t('voice.listening') || 'Listening...'
                  : isProcessing
                  ? t('voice.processing') || 'Processing...'
                  : t('voice.tapToSpeak') || 'Speak'}
              </span>
            </button>
          </div>

          <textarea
            id="problemInput"
            className="symptoms-problem-textarea"
            rows={3}
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder={t('symptoms.describePlaceholder')}
            disabled={isLoading || isProcessing}
          />

          {/* Voice Error Notice */}
          {voiceError && (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#9f1239',
                borderRadius: '6px',
                padding: '8px 12px',
                marginTop: '8px',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>⚠️ {voiceError}</span>
              <button
                type="button"
                onClick={resetVoice}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9f1239',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '13px',
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Voice Recognized Review Box ("Did we get this right?") */}
          {isDone && recognizedTranscript && (
            <div className="voice-review-card">
              <div className="voice-review-header">
                <span className="voice-review-title">
                  <span aria-hidden="true">{isVoiceDemo ? '🧪' : '🗣️'}</span>
                  <span>
                    {isVoiceDemo
                      ? (t('voice.demoTitle') || 'Demo Sample — Live STT Unconfigured')
                      : t('voice.reviewTitle') || 'Did we get this right?'}
                  </span>
                </span>
                {isVoiceDemo && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontWeight: 600,
                    }}
                  >
                    {t('voice.demoBadge') || 'Demo Mode'}
                  </span>
                )}
              </div>

              {isVoiceDemo && (
                <p
                  style={{
                    fontSize: '11.5px',
                    color: '#92400e',
                    margin: '4px 0 8px 0',
                    lineHeight: 1.4,
                  }}
                >
                  {t('voice.demoNotice') ||
                    'Sarvam API key is unconfigured. Showing sample clinical text for testing:'}
                </p>
              )}

              <div className="voice-review-text">
                "{recognizedTranscript}"
              </div>

              <div className="voice-review-btn-row">
                <button
                  type="button"
                  className="voice-review-apply-btn"
                  onClick={handleApplyVoiceTranscript}
                >
                  {isVoiceDemo
                    ? (t('voice.useSampleBtn') || 'Use Sample for Demo')
                    : `✓ ${t('voice.keepTranscript') || 'Use This Description'}`}
                </button>
                <button
                  type="button"
                  className="voice-review-clear-btn"
                  onClick={handleClearVoiceTranscript}
                >
                  ✕ {t('voice.clearTranscript') || 'Clear'}
                </button>
              </div>
            </div>
          )}
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