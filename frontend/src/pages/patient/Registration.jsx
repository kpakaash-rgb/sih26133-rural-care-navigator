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
      setError(t('auth.otpRequiredDesc') || 'Mobile number must be verified with OTP before completing registration.')
      return
    }

    const trimmedName = fullName.trim()
    if (!trimmedName || trimmedName.length < 2) {
      setError(t('auth.nameRequired') || 'Please enter a valid full name (minimum 2 characters).')
      return
    }

    const cleanMobile = verifiedMobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      setError(t('auth.invalidMobile') || 'Please enter a valid 10-digit mobile number.')
      return
    }

    const ageNum = parseInt(age, 10)
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      setError(t('auth.invalidAge') || 'Please enter a valid age between 1 and 120.')
      return
    }

    const trimmedVillage = village.trim()
    if (!trimmedVillage) {
      setError(t('auth.villageRequired') || 'Please enter your village or residential area.')
      return
    }

    const trimmedDistrict = district.trim()
    if (!trimmedDistrict) {
      setError(t('auth.districtRequired') || 'Please enter your district name.')
      return
    }

    if (!hasConsented) {
      setError(t('auth.consentRequired') || 'Consent is required to register for rural healthcare services.')
      return
    }

    setLoading(true)
    try {
      const res = await registerPatientSelf({
        full_name: trimmedName,
        mobile: cleanMobile,
        age: ageNum,
        gender: gender ? gender.trim().toUpperCase().replace(/\s+/g, '_') : undefined,
        village: trimmedVillage,
        district: trimmedDistrict,
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
              <span>{t('auth.fullName')} *</span>
            </label>
            <input
              id="regFullName"
              type="text"
              className="reg-text-input"
              placeholder={t('auth.fullNamePlaceholder') || 'e.g. Arul Kumar / Priya Selvi'}
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
              <span>{t('auth.enterMobile')} {isMobileVerified ? `(${t('auth.verifiedBadge') || 'OTP Verified'})` : '*'}</span>
            </label>
            <input
              id="regMobile"
              type="tel"
              className="reg-text-input"
              placeholder={t('auth.enterMobilePlaceholder') || 'Enter 10-digit mobile number'}
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
                <span>{t('auth.age')} *</span>
              </label>
              <input
                id="regAge"
                type="number"
                min="1"
                max="120"
                className="reg-text-input"
                placeholder={t('auth.agePlaceholder') || 'Age in years (1–120)'}
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
                <span>{t('auth.gender')} ({t('common.optional') || 'Optional'})</span>
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
                style={{ backgroundColor: '#fff', height: '42px' }}
              >
                <option value="">{t('common.select') || 'Select'} ({t('common.optional') || 'Optional'})</option>
                <option value="MALE">{t('auth.male')}</option>
                <option value="FEMALE">{t('auth.female')}</option>
                <option value="OTHER">{t('auth.other')}</option>
                <option value="PREFER_NOT_TO_SAY">{t('auth.preferNotToSay')}</option>
              </select>
            </div>
          </div>

          {/* Village / Local Area Field */}
          <div className="form-field-group">
            <label htmlFor="regVillage" className="form-field-label">
              <span className="field-icon" aria-hidden="true">🏡</span>
              <span>{t('auth.village')} *</span>
            </label>
            <input
              id="regVillage"
              type="text"
              className="reg-text-input"
              placeholder={t('auth.villagePlaceholder') || 'e.g. Melmaruvathur / Uthiramerur / Thirukazhukundram'}
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
              <span>{t('auth.district')} *</span>
            </label>
            <input
              id="regDistrict"
              type="text"
              className="reg-text-input"
              placeholder={t('auth.districtPlaceholder') || 'e.g. Chengalpattu / Kancheepuram / Villupuram'}
              value={district}
              onChange={(e) => {
                setDistrict(e.target.value)
                if (error) setError(null)
              }}
              required
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
              {t('auth.backToLogin') || 'Already registered? Login with OTP'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
