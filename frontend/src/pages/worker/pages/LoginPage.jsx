import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Phone, Lock, Eye, EyeOff, MessageSquare,
  AlertCircle
} from 'lucide-react'
import { loginWorker } from '../../../services/api'
import './LoginPage.css'

export default function LoginPage() {
  const navigate = useNavigate()

  const [mobile,   setMobile]   = useState('9842182000')
  const [password, setPassword] = useState('password123')
  const [showPass, setShowPass] = useState(false)
  const [errors,   setErrors]   = useState({})
  const [loading,  setLoading]  = useState(false)

  /* ── Validation ────────────────────────────────────────── */
  function validate() {
    const e = {}
    if (!mobile.trim())                         e.mobile = 'Mobile number or Worker ID is required'
    if (!password.trim())                       e.password = 'Password / MPIN is required'
    else if (password.length < 4)              e.password = 'Must be at least 4 characters'
    return e
  }

  async function handleSignIn(e) {
    e.preventDefault()
    const e2 = validate()
    setErrors(e2)
    if (Object.keys(e2).length > 0) return

    setLoading(true)
    try {
      const cleanInput = mobile.replace(/\s/g, '')
      const isPhone = /^\d{10}$/.test(cleanInput)
      await loginWorker({
        ...(isPhone ? { mobile: cleanInput } : { worker_id: mobile.trim() }),
        password: password.trim(),
      })
      navigate('/worker/home')
    } catch (err) {
      setErrors({ server: err.message || 'Authentication failed. Please check credentials.' })
    } finally {
      setLoading(false)
    }
  }

  async function handleOTP(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await loginWorker({
        worker_id: 'FHW-20841',
        password: 'password123',
      })
      navigate('/worker/home')
    } catch (err) {
      setErrors({ server: err.message || 'Demo OTP authentication failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-root">
      {/* ── Status bar / Switch role ── */}
      <div className="login-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 16px' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ← Switch Role
        </button>
        <span className="login-topbar-title">Frontline Worker Login</span>
        <span style={{ width: 70 }} />
      </div>

      <div className="login-scroll">
        {/* ΓöÇΓöÇ Branding ΓöÇΓöÇ */}
        <div className="login-brand">
          <div className="login-logo-wrap">
            <img
              src="/mythri-icon.png"
              alt="Mythri"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '12px', background: '#FFFFFF' }}
            />
          </div>
          <h1 className="login-app-name">Mythri</h1>
          <p className="login-app-role">Frontline Healthcare Worker</p>
        </div>

        {/* ΓöÇΓöÇ Card ΓöÇΓöÇ */}
        <div className="login-card">
          <h2 className="login-card-title">Sign In</h2>
          <p className="login-card-sub">Enter your credentials to access the portal.</p>

          <form onSubmit={handleSignIn} noValidate>
            {/* Mobile */}
            <div className="lf-group">
              <label className="lf-label">MOBILE NUMBER</label>
              <div className={`lf-input-wrap ${errors.mobile ? 'lf-error' : mobile ? 'lf-success' : ''}`}>
                <Phone size={18} className="lf-icon" />
                <span className="lf-prefix">+91</span>
                <input
                  id="mobile"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  className="lf-input"
                  placeholder="98421 82000"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))
                    setErrors((prev) => ({ ...prev, mobile: '' }))
                  }}
                  autoComplete="tel"
                />
              </div>
              {errors.mobile && (
                <p className="lf-err-msg">
                  <AlertCircle size={13} /> {errors.mobile}
                </p>
              )}
            </div>

            {/* Password / MPIN */}
            <div className="lf-group">
              <label className="lf-label">PASSWORD / MPIN</label>
              <div className={`lf-input-wrap ${errors.password ? 'lf-error' : password ? 'lf-success' : ''}`}>
                <Lock size={18} className="lf-icon" />
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="lf-input"
                  placeholder="ΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇóΓÇó"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setErrors((prev) => ({ ...prev, password: '' }))
                  }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lf-eye"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="lf-err-msg">
                  <AlertCircle size={13} /> {errors.password}
                </p>
              )}
              <div className="lf-forgot-row">
                <button type="button" className="lf-forgot">Forgot Password?</button>
              </div>
            </div>

            {/* Sign In */}
            <button
              type="submit"
              id="btn-sign-in"
              className={`lf-btn-primary ${loading ? 'lf-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="lf-spinner" />
              ) : 'Sign In'}
            </button>
          </form>

          {/* OR divider */}
          <div className="lf-or">
            <span className="lf-or-line" />
            <span className="lf-or-text">OR</span>
            <span className="lf-or-line" />
          </div>

          {/* OTP button */}
          <button
            id="btn-otp"
            type="button"
            className="lf-btn-outline"
            onClick={handleOTP}
          >
            <MessageSquare size={18} />
            Use OTP instead
          </button>
        </div>

        {/* ΓöÇΓöÇ Footer ΓöÇΓöÇ */}
        <div className="login-footer">
          <p className="login-footer-help">
            Need help?{' '}
            <a href="#" className="login-footer-link">Contact IT Support</a>
          </p>
          <div className="login-footer-tags">
            <span className="login-footer-tag">
              <span className="login-dot" />
              Offline Sync Supported
            </span>
            <span className="login-footer-sep">ΓÇó</span>
            <span className="login-footer-tag">NHM Certified</span>
          </div>
        </div>
      </div>
    </div>
  )
}
