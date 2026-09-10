import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { requestOtp, verifyOtp } from '../../services/api'
import { useLanguage } from '../../i18n'

export default function Login({ onNavigate }) {
  const { t } = useLanguage()
  const [mobileNumber, setMobileNumber] = useState('')
  const [showOtpStep, setShowOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [demoOtp, setDemoOtp] = useState(null)

  const handleGetOtp = async (e) => {
    e.preventDefault()
    setError(null)
    const cleanMobile = mobileNumber.replace(/\D/g, '')

    if (cleanMobile.length !== 10) {
      setError(t('auth.invalidMobile'))
      return
    }

    setLoading(true)
    try {
      const data = await requestOtp(cleanMobile)
      setShowOtpStep(true)
      if (data?.demo_otp) {
        setDemoOtp(data.demo_otp)
        setOtpCode(data.demo_otp)
      }
    } catch (err) {
      setError(err.message || t('auth.sendOtpFailed'))
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    setError(null)
    const cleanOtp = otpCode.trim()
    const cleanMobile = mobileNumber.replace(/\D/g, '')

    if (!cleanOtp) {
      setError(t('auth.enterOtpRequired'))
      return
    }

    setLoading(true)
    try {
      const data = await verifyOtp(cleanMobile, cleanOtp)
      if (data?.access_token) {
        localStorage.setItem('access_token', data.access_token)
      }
      if (data?.patient) {
        localStorage.setItem('patient', JSON.stringify(data.patient))
      }
      onNavigate(SCREENS.HOME, { patient: data?.patient })
    } catch (err) {
      setError(err.message || t('auth.verifyFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-screen-wrapper">
      <Header title={t('common.appName')} showLogo />

      <div className="login-content-container">
        <div className="login-header-text">
          <h1 className="login-title">{t('auth.welcomeBack')}</h1>
          <p className="login-subtitle">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          {error && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '10px 12px',
                marginBottom: '14px',
                color: '#991b1b',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              role="alert"
            >
              <span aria-hidden="true">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {!showOtpStep ? (
            <form onSubmit={handleGetOtp} className="login-form">
              <label htmlFor="mobileInput" className="field-label">
                {t('auth.enterMobile')}
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                    <line x1="12" y1="18" x2="12.01" y2="18" />
                  </svg>
                </span>
                <input
                  id="mobileInput"
                  type="tel"
                  className="clean-text-input"
                  placeholder={t('auth.enterMobilePlaceholder')}
                  value={mobileNumber}
                  onChange={(e) => {
                    setMobileNumber(e.target.value)
                    if (error) setError(null)
                  }}
                  maxLength={10}
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
              >
                <span>{loading ? t('auth.requestingOtp') : t('auth.requestOtp')}</span>
                <span className="btn-arrow-glyph" aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="login-form">
              {demoOtp && (
                <div
                  style={{
                    backgroundColor: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    color: '#1e40af',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{t('auth.demoOtp')}: <strong>{demoOtp}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpCode(demoOtp)
                      if (error) setError(null)
                    }}
                    style={{
                      background: '#dbeafe',
                      border: '1px solid #93c5fd',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      fontWeight: 600,
                      color: '#1e40af',
                      cursor: 'pointer',
                    }}
                  >
                    {t('auth.autoFill')}
                  </button>
                </div>
              )}

              <label htmlFor="otpInput" className="field-label">
                {t('auth.enterOtpToMobile', { mobile: mobileNumber || 'your number' })}
              </label>
              <div className="input-with-icon">
                <span className="input-icon-left" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="otpInput"
                  type="text"
                  className="clean-text-input"
                  placeholder={t('auth.enterOtp')}
                  value={otpCode}
                  onChange={(e) => {
                    setOtpCode(e.target.value)
                    if (error) setError(null)
                  }}
                  maxLength={6}
                  autoFocus
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                className="login-btn-primary"
                disabled={loading}
                style={{ opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
              >
                <span>{loading ? t('auth.verifying') : t('auth.verifyAndLogin')}</span>
                <span className="btn-arrow-glyph" aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="link-change-number"
                onClick={() => {
                  setShowOtpStep(false)
                  setError(null)
                  setDemoOtp(null)
                }}
                disabled={loading}
              >
                {t('auth.changeMobile')}
              </button>
            </form>
          )}
        </div>

        {/* Register Option */}
        <div className="login-register-prompt">
          <p className="register-prompt-text">{t('auth.newPrompt')}</p>
          <button
            type="button"
            className="register-outline-btn"
            onClick={() => onNavigate(SCREENS.REGISTRATION)}
          >
            {t('auth.register')}
          </button>
        </div>

        {/* Emergency / SOS Box */}
        <div className="login-emergency-box">
          <div className="emergency-box-header">
            <span className="emergency-star" aria-hidden="true">✱</span>
            <span className="emergency-box-title">{t('common.emergencySos')}</span>
          </div>
          <p className="emergency-box-subtitle">{t('auth.emergencyHelp')}</p>
          <SOSButton variant="card" label={t('auth.callEmergency')} />
        </div>
      </div>
    </div>
  )
}
