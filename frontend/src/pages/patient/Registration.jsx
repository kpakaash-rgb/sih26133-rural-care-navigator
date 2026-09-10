import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { registerPatientSelf } from '../../services/api'
import { useLanguage } from '../../i18n'

export default function Registration({ onNavigate, registrationData }) {
  const { t } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [mobileNumber, setMobileNumber] = useState(registrationData?.mobile || '')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('MALE')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [abhaNumber, setAbhaNumber] = useState('')
  const [hasConsented, setHasConsented] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const registrationToken = registrationData?.registration_token || null
  const verifiedMobile = registrationData?.mobile || mobileNumber
  const isMobileVerified = Boolean(registrationData?.mobile && registrationToken)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isMobileVerified && !registrationToken) {
      setError('Mobile number must be verified with OTP before completing registration.')
      return
    }

    const trimmedName = fullName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter a valid full name (minimum 2 characters).')
      return
    }

    const cleanMobile = verifiedMobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.')
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError('Please enter a valid age between 1 and 120.')
      return
    }

    if (!gender) {
      setError('Please select your gender.')
      return
    }

    const trimmedVillage = village.trim()
    if (!trimmedVillage) {
      setError('Please enter your village or residential area.')
      return
    }

    const trimmedDistrict = district.trim()
    if (!trimmedDistrict) {
      setError('Please enter your district name.')
      return
    }

    if (!hasConsented) {
      setError('Consent is required to register for rural healthcare services.')
      return
    }

    setLoading(true)
    try {
      const res = await registerPatientSelf({
        full_name: trimmedName,
        mobile: cleanMobile,
        age: ageNum,
        gender,
        village: trimmedVillage,
        district: trimmedDistrict,
        abha_number: abhaNumber.trim() || undefined,
        consent: hasConsented,
        registration_token: registrationToken,
      })

      if (res?.access_token) {
        localStorage.setItem('access_token', res.access_token)
      }
      if (res?.patient) {
        localStorage.setItem('patient', JSON.stringify(res.patient))
      }

      onNavigate(SCREENS.HOME, { patient: res?.patient })
    } catch (err) {
      setError(err.message || 'Registration failed. Please verify all details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registration-screen-wrapper">
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" />}
      />

      <div className="registration-content-container">
        <div className="registration-header-text">
          <h1 className="registration-title">{t('auth.regTitle')}</h1>
          <p className="registration-subtitle">
            {isMobileVerified
              ? 'Complete your one-time profile details to access healthcare services.'
              : t('auth.regSubtitle')}
          </p>
        </div>

        {/* Missing OTP verification notice */}
        {!isMobileVerified && !registrationToken && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              color: '#92400e',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <span>ℹ️</span>
              <span>OTP Verification Required</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4 }}>
              To ensure data security and accuracy, please verify your mobile number with a quick OTP before registering.
            </p>
            <button
              type="button"
              onClick={() => onNavigate(SCREENS.LOGIN)}
              style={{
                alignSelf: 'flex-start',
                marginTop: '4px',
                background: '#d97706',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Verify Mobile with OTP →
            </button>
          </div>
        )}

        {/* Error Alert */}
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

        <form onSubmit={handleSubmit} className="registration-form">
          {/* Full Name Field */}
          <div className="form-field-group">
            <label htmlFor="regFullName" className="form-field-label">
              <span className="field-icon" aria-hidden="true">👤</span>
              <span>Full Name *</span>
            </label>
            <input
              id="regFullName"
              type="text"
              className="reg-text-input"
              placeholder="e.g. Ramesh Kumar / रमेश कुमार"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value)
                if (error) setError(null)
              }}
              required
              disabled={loading}
            />
          </div>

          {/* Mobile Number Field (Read-only if OTP verified) */}
          <div className="form-field-group">
            <label htmlFor="regMobile" className="form-field-label">
              <span className="field-icon" aria-hidden="true">📱</span>
              <span>Mobile Number {isMobileVerified ? '(OTP Verified)' : '*'}</span>
            </label>
            <input
              id="regMobile"
              type="tel"
              className="reg-text-input"
              placeholder={t('auth.enterMobilePlaceholder')}
              value={mobileNumber}
              onChange={(e) => {
                if (!isMobileVerified) setMobileNumber(e.target.value)
              }}
              maxLength={10}
              readOnly={isMobileVerified}
              disabled={isMobileVerified || loading}
              style={{
                backgroundColor: isMobileVerified ? '#f8fafc' : '#fff',
                color: isMobileVerified ? '#334155' : '#0f172a',
                cursor: isMobileVerified ? 'not-allowed' : 'text',
              }}
            />
          </div>

          {/* Age & Gender Row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-field-group">
              <label htmlFor="regAge" className="form-field-label">
                <span className="field-icon" aria-hidden="true">🎂</span>
                <span>Age *</span>
              </label>
              <input
                id="regAge"
                type="number"
                min="1"
                max="120"
                className="reg-text-input"
                placeholder="Years (1-120)"
                value={age}
                onChange={(e) => {
                  setAge(e.target.value)
                  if (error) setError(null)
                }}
                required
                disabled={loading}
              />
            </div>

            <div className="form-field-group">
              <label htmlFor="regGender" className="form-field-label">
                <span className="field-icon" aria-hidden="true">⚧</span>
                <span>Gender *</span>
              </label>
              <select
                id="regGender"
                className="reg-text-input"
                value={gender}
                onChange={(e) => {
                  setGender(e.target.value)
                  if (error) setError(null)
                }}
                disabled={loading}
                style={{ height: '42px' }}
              >
                <option value="MALE">Male (पुरुष)</option>
                <option value="FEMALE">Female (महिला)</option>
                <option value="OTHER">Other (अन्य)</option>
              </select>
            </div>
          </div>

          {/* Village / Local Area Field */}
          <div className="form-field-group">
            <label htmlFor="regVillage" className="form-field-label">
              <span className="field-icon" aria-hidden="true">🏡</span>
              <span>Village / Area *</span>
            </label>
            <input
              id="regVillage"
              type="text"
              className="reg-text-input"
              placeholder="e.g. Malshiras Village / Akluj"
              value={village}
              onChange={(e) => {
                setVillage(e.target.value)
                if (error) setError(null)
              }}
              required
              disabled={loading}
            />
          </div>

          {/* District Field */}
          <div className="form-field-group">
            <label htmlFor="regDistrict" className="form-field-label">
              <span className="field-icon" aria-hidden="true">📍</span>
              <span>District *</span>
            </label>
            <input
              id="regDistrict"
              type="text"
              className="reg-text-input"
              placeholder={t('auth.districtPlaceholder') || 'e.g. Solapur / Pune'}
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value)
                if (error) setError(null)
              }}
              required
              disabled={loading}
            />
          </div>

          {/* ABHA Number (Optional) Highlight Card */}
          <div className="abha-highlight-card">
            <div className="abha-card-header">
              <span className="abha-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1d4ed8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                  <circle cx="8" cy="9" r="2" />
                  <line x1="13" y1="8" x2="18" y2="8" />
                  <line x1="13" y1="12" x2="18" y2="12" />
                </svg>
              </span>
              <span className="abha-title">{t('auth.abhaOptional')}</span>
            </div>
            <p className="abha-subtext">{t('auth.abhaSubtext')}</p>
            <input
              type="text"
              className="reg-text-input abha-input"
              placeholder={t('auth.abhaPlaceholder')}
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              maxLength={17}
              disabled={loading}
            />
          </div>

          {/* Consent Checkbox */}
          <div className="consent-checkbox-row">
            <input
              id="consentBox"
              type="checkbox"
              className="consent-checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              disabled={loading}
            />
            <label htmlFor="consentBox" className="consent-label">
              {t('auth.consentText')}
            </label>
          </div>

          {/* Complete Registration Button */}
          <button
            type="submit"
            className="registration-submit-btn"
            disabled={loading || (!isMobileVerified && !registrationToken)}
            style={{
              opacity: loading || (!isMobileVerified && !registrationToken) ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            <span>{loading ? 'Registering...' : t('auth.completeReg')}</span>
            <span className="btn-arrow-glyph" aria-hidden="true">→</span>
          </button>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <button
              type="button"
              onClick={() => onNavigate(SCREENS.LOGIN)}
              style={{
                background: 'none',
                border: 'none',
                color: '#00478f',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Already registered? Login with OTP
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
