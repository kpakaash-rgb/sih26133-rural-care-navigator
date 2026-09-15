import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { registerPatientSelf } from '../../services/api'
import { useLanguage } from '../../i18n'

export default function Onboarding({ onNavigate, registrationData }) {
  const { t, language, setLanguage } = useLanguage()

  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [village, setVillage] = useState('')
  const [district, setDistrict] = useState('')
  const [preferredLang, setPreferredLang] = useState(language || 'en')
  const [emergencyContact, setEmergencyContact] = useState('')
  const [abhaNumber, setAbhaNumber] = useState('')
  const [hasConsented, setHasConsented] = useState(true)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const registrationToken = registrationData?.registration_token || null
  const verifiedMobile = registrationData?.mobile || ''
  const isMobileVerified = Boolean(verifiedMobile && registrationToken)

  const handleLanguageChange = (langCode) => {
    setPreferredLang(langCode)
    if (setLanguage) {
      setLanguage(langCode)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!isMobileVerified || !registrationToken) {
      setError(t('auth.otpRequiredDesc') || 'Mobile number must be verified with OTP before creating a profile.')
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

    let cleanEmergencyContact = undefined
    if (emergencyContact && emergencyContact.trim()) {
      cleanEmergencyContact = emergencyContact.trim().replace(/\D/g, '')
      if (cleanEmergencyContact.length !== 10 || !/^[6-9]\d{9}$/.test(cleanEmergencyContact)) {
        setError(t('auth.invalidEmergencyContact') || 'Emergency contact must be a valid 10-digit Indian mobile number starting with 6-9.')
        return
      }
    }

    if (!hasConsented) {
      setError(t('auth.consentRequired') || 'Consent is required to create your profile and access healthcare services.')
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
        preferred_language: preferredLang,
        emergency_contact: cleanEmergencyContact || undefined,
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

      const nextScreen = registrationData?.returnScreen || SCREENS.HOME
      onNavigate(nextScreen, { patient: res?.patient })
    } catch (err) {
      setError(err.message || 'Profile creation failed. Please check all details and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="registration-screen-wrapper">
      <Header
        title={t('common.appName')}
        showLogo
        showBack
        onBack={() => onNavigate(SCREENS.WELCOME)}
        rightAction={<SOSButton label="SOS" icon="▲" />}
      />

      <div className="registration-content-container">
        {/* Title Header */}
        <div className="registration-header-text">
          <h1 className="registration-title">
            {t('auth.completeProfileTitle')}
          </h1>
          <p className="registration-subtitle">
            {t('auth.completeProfileSubtitle')}
          </p>
        </div>

        {/* OTP Verification status banner */}
        {isMobileVerified ? (
          <div
            style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: '8px',
              padding: '8px 12px',
              color: '#166534',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600,
            }}
          >
            <span aria-hidden="true" style={{ color: '#16A34A', fontWeight: 800 }}>✓</span>
            <span>Mobile number verified</span>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFBEB',
              border: '1px solid #FDE68A',
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#92400E',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
            role="alert"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13.5px' }}>
              <span>ℹ️</span>
              <span>{t('auth.otpRequiredTitle')}</span>
            </div>
            <p style={{ margin: 0, lineHeight: 1.4 }}>
              {t('auth.otpRequiredDesc')}
            </p>
            <button
              type="button"
              onClick={() => onNavigate(SCREENS.LOGIN)}
              style={{
                alignSelf: 'flex-start',
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {t('auth.backToLogin')}
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEF2F2',
              border: '1px solid #FCA5A5',
              borderRadius: '8px',
              padding: '10px 12px',
              color: '#991B1B',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 500,
            }}
            role="alert"
          >
            <span aria-hidden="true" style={{ fontSize: '15px' }}>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* SECTION 1 — PERSONAL DETAILS */}
          <div className="registration-section-card">
            <h2 className="registration-section-title">
              <span>👤</span>
              <span>{t('auth.sectionPersonal')}</span>
            </h2>

            {/* Full Name */}
            <div className="form-field-group">
              <label htmlFor="onbFullName" className="form-field-label">
                <span>{t('auth.fullName')} *</span>
              </label>
              <input
                id="onbFullName"
                type="text"
                className="reg-text-input"
                placeholder={t('auth.fullNamePlaceholder')}
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value)
                  if (error) setError(null)
                }}
                required
                disabled={loading || !isMobileVerified}
              />
            </div>

            {/* Mobile Number (Read-only / Verified) */}
            <div className="form-field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="onbMobile" className="form-field-label">
                  <span>{t('auth.mobileVerified')} *</span>
                </label>
                {isMobileVerified && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#15803D',
                    backgroundColor: '#DCFCE7',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid #BBF7D0',
                  }}>
                    {t('auth.verifiedBadge')}
                  </span>
                )}
              </div>
              <input
                id="onbMobile"
                type="tel"
                className="reg-text-input"
                value={verifiedMobile}
                readOnly
                disabled
                style={{
                  backgroundColor: '#F8FAFC',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'not-allowed',
                }}
              />
            </div>

            {/* Age & Gender */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-field-group">
                <label htmlFor="onbAge" className="form-field-label">
                  <span>{t('auth.age')} *</span>
                </label>
                <input
                  id="onbAge"
                  type="number"
                  min="1"
                  max="120"
                  className="reg-text-input"
                  placeholder={t('auth.agePlaceholder')}
                  value={age}
                  onChange={(e) => {
                    setAge(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                  disabled={loading || !isMobileVerified}
                />
              </div>

              <div className="form-field-group">
                <label htmlFor="onbGender" className="form-field-label">
                  <span>{t('auth.gender')} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '11.5px' }}>({t('common.optional') || 'Optional'})</span></span>
                </label>
                <select
                  id="onbGender"
                  className="reg-text-input"
                  value={gender}
                  onChange={(e) => {
                    setGender(e.target.value)
                    if (error) setError(null)
                  }}
                  disabled={loading || !isMobileVerified}
                  style={{
                    backgroundColor: '#FFFFFF',
                    height: '42px',
                  }}
                >
                  <option value="">Select (Optional)</option>
                  <option value="MALE">{t('auth.male')}</option>
                  <option value="FEMALE">{t('auth.female')}</option>
                  <option value="OTHER">{t('auth.other')}</option>
                  <option value="PREFER_NOT_TO_SAY">{t('auth.preferNotToSay')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2 — LOCATION */}
          <div className="registration-section-card">
            <h2 className="registration-section-title">
              <span>📍</span>
              <span>{t('auth.sectionLocation')}</span>
            </h2>

            {/* Village / Area */}
            <div className="form-field-group">
              <label htmlFor="onbVillage" className="form-field-label">
                <span>{t('auth.village')} *</span>
              </label>
              <input
                id="onbVillage"
                type="text"
                className="reg-text-input"
                placeholder={t('auth.villagePlaceholder')}
                value={village}
                onChange={(e) => {
                  setVillage(e.target.value)
                  if (error) setError(null)
                }}
                required
                disabled={loading || !isMobileVerified}
              />
            </div>

            {/* District */}
            <div className="form-field-group">
              <label htmlFor="onbDistrict" className="form-field-label">
                <span>{t('auth.district')} *</span>
              </label>
              <input
                id="onbDistrict"
                type="text"
                className="reg-text-input"
                placeholder={t('auth.districtPlaceholder')}
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value)
                  if (error) setError(null)
                }}
                required
                disabled={loading || !isMobileVerified}
              />
            </div>
          </div>

          {/* SECTION 3 — PREFERENCES */}
          <div className="registration-section-card">
            <h2 className="registration-section-title">
              <span>🌐</span>
              <span>{t('auth.sectionPreferences')}</span>
            </h2>

            <label className="form-field-label" style={{ marginBottom: '8px' }}>
              {t('auth.prefLanguage')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { code: 'en', label: 'English' },
                { code: 'hi', label: 'हिंदी' },
                { code: 'mr', label: 'मराठी' },
              ].map((lang) => {
                const isSelected = preferredLang === lang.code
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    disabled={loading || !isMobileVerified}
                    style={{
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: isSelected ? '1.5px solid #0A58CA' : '1px solid #CBD5E1',
                      background: isSelected ? '#EBF3FC' : '#FFFFFF',
                      color: isSelected ? '#0A58CA' : '#334155',
                      fontWeight: isSelected ? 700 : 600,
                      fontSize: '13.5px',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      minHeight: '42px',
                    }}
                  >
                    {lang.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* SECTION 4 — EMERGENCY CONTACT */}
          <div className="registration-section-card">
            <h2 className="registration-section-title">
              <span>🚨</span>
              <span>{t('auth.sectionEmergency')} <span style={{ fontWeight: 400, color: '#64748B', fontSize: '11.5px' }}>({t('common.optional') || 'Optional'})</span></span>
            </h2>

            <div className="form-field-group">
              <label htmlFor="onbEmergency" className="form-field-label">
                <span>{t('auth.emergencyContact')}</span>
              </label>
              <p style={{ margin: '0 0 6px 0', fontSize: '11.5px', color: '#64748B', lineHeight: 1.35 }}>
                {t('auth.emergencyContactHelp')}
              </p>
              <input
                id="onbEmergency"
                type="tel"
                className="reg-text-input"
                placeholder={t('auth.emergencyContactPlaceholder')}
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                maxLength={10}
                disabled={loading || !isMobileVerified}
              />
            </div>
          </div>

          {/* ABHA Number (Optional) Highlight Card */}
          <div className="abha-highlight-card">
            <div className="abha-card-header">
              <span className="abha-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              className="reg-text-input"
              placeholder={t('auth.abhaPlaceholder')}
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              maxLength={17}
              disabled={loading || !isMobileVerified}
              style={{
                backgroundColor: '#FFFFFF',
                borderColor: '#86EFAC',
              }}
            />
          </div>

          {/* SECTION 5 — CONSENT */}
          <div className="registration-section-card">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                id="onbConsentBox"
                type="checkbox"
                checked={hasConsented}
                onChange={(e) => setHasConsented(e.target.checked)}
                disabled={loading || !isMobileVerified}
                style={{
                  marginTop: '3px',
                  width: '18px',
                  height: '18px',
                  accentColor: '#0A58CA',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <label htmlFor="onbConsentBox" style={{ fontSize: '12.5px', color: '#1E293B', lineHeight: 1.45, cursor: 'pointer', fontWeight: 500 }}>
                {t('auth.onboardingConsentText')}
              </label>
            </div>
          </div>

          {/* Create Profile Button */}
          <button
            type="submit"
            className="registration-submit-btn"
            disabled={loading || !isMobileVerified || !hasConsented}
            style={{
              opacity: loading || !isMobileVerified || !hasConsented ? 0.65 : 1,
              cursor: loading || !isMobileVerified || !hasConsented ? 'not-allowed' : 'pointer',
            }}
          >
            <span>{loading ? t('auth.creatingProfileBtn') : `${t('auth.createProfileBtn')} →`}</span>
          </button>

          {!isMobileVerified && (
            <div style={{ textAlign: 'center', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => onNavigate(SCREENS.LOGIN)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0A58CA',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
