import { useState } from 'react'
import Header from '../../components/Header'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Login({ onNavigate }) {
  const [mobileNumber, setMobileNumber] = useState('')
  const [showOtpStep, setShowOtpStep] = useState(false)
  const [otpCode, setOtpCode] = useState('')

  const handleGetOtp = (e) => {
    e.preventDefault()
    if (!mobileNumber.trim()) {
      setShowOtpStep(true)
      return
    }
    setShowOtpStep(true)
  }

  const handleVerifyOtp = (e) => {
    e.preventDefault()
    onNavigate(SCREENS.HOME)
  }

  return (
    <div className="login-screen-wrapper">
      <Header title="Rural Care Navigator" showLogo />

      <div className="login-content-container">
        <div className="login-header-text">
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            Login to access your healthcare information and services.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="login-card">
          {!showOtpStep ? (
            <form onSubmit={handleGetOtp} className="login-form">
              <label htmlFor="mobileInput" className="field-label">
                Mobile Number
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
                  placeholder="Enter your mobile number"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  maxLength={10}
                />
              </div>

              <button type="submit" className="login-btn-primary">
                <span>Get OTP</span>
                <span className="btn-arrow-glyph" aria-hidden="true">→</span>
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="login-form">
              <label htmlFor="otpInput" className="field-label">
                Enter OTP (Sent to {mobileNumber || 'your number'})
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
                  placeholder="Enter 4 or 6-digit OTP"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  autoFocus
                />
              </div>

              <button type="submit" className="login-btn-primary">
                <span>Verify & Login</span>
                <span className="btn-arrow-glyph" aria-hidden="true">→</span>
              </button>
              <button
                type="button"
                className="link-change-number"
                onClick={() => setShowOtpStep(false)}
              >
                Change mobile number
              </button>
            </form>
          )}
        </div>

        {/* Register Option */}
        <div className="login-register-prompt">
          <p className="register-prompt-text">New to Rural Care Navigator?</p>
          <button
            type="button"
            className="register-outline-btn"
            onClick={() => onNavigate(SCREENS.REGISTRATION)}
          >
            Register as New Patient
          </button>
        </div>

        {/* Emergency / SOS Box */}
        <div className="login-emergency-box">
          <div className="emergency-box-header">
            <span className="emergency-star" aria-hidden="true">✱</span>
            <span className="emergency-box-title">Emergency / SOS</span>
          </div>
          <p className="emergency-box-subtitle">Need urgent medical help?</p>
          <SOSButton variant="card" label="Call Emergency Help" />
        </div>
      </div>
    </div>
  )
}
