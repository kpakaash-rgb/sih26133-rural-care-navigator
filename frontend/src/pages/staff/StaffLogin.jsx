import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Lock,
  Eye,
  EyeOff,
  UserCheck,
  AlertCircle,
  ShieldCheck,
  ArrowLeft
} from 'lucide-react'
import { loginStaff, getStaffSession } from '../../services/api'
import './StaffLogin.css'

export default function StaffLogin() {
  const navigate = useNavigate()

  const [staffId, setStaffId] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // Redirect if already authenticated as healthcare staff
  useEffect(() => {
    const session = getStaffSession()
    if (session && session.token) {
      if (session.role === 'DOCTOR') {
        navigate('/doctor', { replace: true })
      } else if (session.role === 'WORKER') {
        navigate('/worker/home', { replace: true })
      }
    }
  }, [navigate])

  function validate() {
    const errs = {}
    if (!staffId.trim()) {
      errs.staffId = 'Staff ID or registered mobile is required'
    }
    if (!password.trim()) {
      errs.password = 'Password / PIN is required'
    } else if (password.length < 4) {
      errs.password = 'Must be at least 4 characters'
    }
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationErrors = validate()
    setErrors(validationErrors)
    if (Object.keys(validationErrors).length > 0) return

    setLoading(true)
    setErrors({})

    try {
      const data = await loginStaff({
        staff_id: staffId.trim(),
        password: password.trim(),
      })

      // Role-aware redirection based purely on backend-authenticated role
      const authenticatedRole = data?.role || data?.user?.role
      if (authenticatedRole === 'DOCTOR') {
        navigate('/doctor', { replace: true })
      } else if (authenticatedRole === 'WORKER') {
        navigate('/worker/home', { replace: true })
      } else {
        setErrors({ server: 'Unrecognized healthcare staff role. Please contact IT.' })
      }
    } catch (err) {
      setErrors({
        server: err.message || 'Invalid Staff ID or Password. Please try again.',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="staff-login-root">
      {/* Top bar */}
      <header className="staff-login-topbar">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="staff-back-btn"
          aria-label="Back to portal home"
        >
          <ArrowLeft size={16} />
          <span>Portal Home</span>
        </button>
        <span className="staff-topbar-badge">National Health Mission</span>
      </header>

      <main className="staff-login-container">
        {/* Card */}
        <div className="staff-login-card">
          
          {/* Header */}
          <div className="staff-card-header">
            <div className="staff-icon-wrap" aria-hidden="true">
              <ShieldCheck size={28} strokeWidth={2.2} />
            </div>
            <h1 className="staff-title">Healthcare Staff Login</h1>
            <p className="staff-subtitle">Access your healthcare workspace securely</p>
          </div>

          {/* Server Error Alert */}
          {errors.server && (
            <div className="staff-alert-error" role="alert">
              <AlertCircle size={16} />
              <span>{errors.server}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate className="staff-form">
            
            {/* Staff ID */}
            <div className="staff-input-group">
              <label htmlFor="staffId" className="staff-label">
                STAFF ID
              </label>
              <div className={`staff-input-wrap ${errors.staffId ? 'has-error' : ''}`}>
                <UserCheck size={18} className="staff-input-icon" />
                <input
                  id="staffId"
                  name="staff_id"
                  type="text"
                  className="staff-input"
                  placeholder="Enter Staff ID or Mobile"
                  value={staffId}
                  onChange={(e) => {
                    setStaffId(e.target.value)
                    if (errors.staffId) setErrors((prev) => ({ ...prev, staffId: '' }))
                  }}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              {errors.staffId && (
                <p className="staff-err-text">
                  <AlertCircle size={12} /> {errors.staffId}
                </p>
              )}
            </div>

            {/* Password / PIN */}
            <div className="staff-input-group">
              <label htmlFor="password" className="staff-label">
                PASSWORD / PIN
              </label>
              <div className={`staff-input-wrap ${errors.password ? 'has-error' : ''}`}>
                <Lock size={18} className="staff-input-icon" />
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="staff-input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (errors.password) setErrors((prev) => ({ ...prev, password: '' }))
                  }}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="staff-eye-btn"
                  onClick={() => setShowPass((v) => !v)}
                  aria-label={showPass ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.password && (
                <p className="staff-err-text">
                  <AlertCircle size={12} /> {errors.password}
                </p>
              )}
            </div>

            {/* Primary Submit CTA */}
            <button
              type="submit"
              id="btn-sign-in"
              className={`staff-btn-submit ${loading ? 'is-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <span className="staff-spinner" aria-hidden="true" />
              ) : (
                'Sign In'
              )}
            </button>

            {/* Required Security Notice */}
            <p className="staff-notice-text">
              Authorized healthcare staff only
            </p>

          </form>

        </div>

        {/* Footer info */}
        <footer className="staff-login-footer">
          <p>
            Trouble signing in?{' '}
            <a href="mailto:support@ruralcare.gov.in" className="staff-footer-link">
              Contact Facility Administrator
            </a>
          </p>
          <div className="staff-security-badges">
            <span>• 256-bit Role Encryption</span>
            <span>• Session Isolation</span>
          </div>
        </footer>

      </main>
    </div>
  )
}
