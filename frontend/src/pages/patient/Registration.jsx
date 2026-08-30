import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Registration({ onNavigate }) {
  const [mobileNumber, setMobileNumber] = useState('')
  const [district, setDistrict] = useState('')
  const [abhaNumber, setAbhaNumber] = useState('')
  const [hasConsented, setHasConsented] = useState(true)

  const handleSubmit = (e) => {
    e.preventDefault()
    onNavigate(SCREENS.HOME)
  }

  return (
    <div className="registration-screen-wrapper">
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" />}
      />

      <div className="registration-content-container">
        <div className="registration-header-text">
          <h1 className="registration-title">Patient Registration</h1>
          <p className="registration-subtitle">
            Please provide your details below to create your health profile and access services.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="registration-form">
          {/* Mobile Number Field */}
          <div className="form-field-group">
            <label htmlFor="regMobile" className="form-field-label">
              <span className="field-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </span>
              <span>Mobile Number</span>
            </label>
            <input
              id="regMobile"
              type="tel"
              className="reg-text-input"
              placeholder="10-digit mobile number"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value)}
              maxLength={10}
            />
          </div>

          {/* District Field */}
          <div className="form-field-group">
            <label htmlFor="regDistrict" className="form-field-label">
              <span className="field-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                </svg>
              </span>
              <span>District</span>
            </label>
            <input
              id="regDistrict"
              type="text"
              className="reg-text-input"
              placeholder="Enter district name"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
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
              <span className="abha-title">ABHA Number (Optional)</span>
            </div>
            <p className="abha-subtext">Optional, but recommended for unified records.</p>
            <input
              type="text"
              className="reg-text-input abha-input"
              placeholder="14-digit ABHA ID"
              value={abhaNumber}
              onChange={(e) => setAbhaNumber(e.target.value)}
              maxLength={17}
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
            />
            <label htmlFor="consentBox" className="consent-label">
              I consent to the collection and processing of my healthcare data for medical purposes.
            </label>
          </div>

          {/* Complete Registration Button */}
          <button type="submit" className="registration-submit-btn">
            <span>Complete Registration</span>
            <span className="btn-arrow-glyph" aria-hidden="true">→</span>
          </button>
        </form>
      </div>
    </div>
  )
}
