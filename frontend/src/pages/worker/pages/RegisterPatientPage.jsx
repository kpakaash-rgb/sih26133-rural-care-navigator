import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, User, Phone, Calendar, MapPin, Building2,
  UserPlus, CheckCircle2, Copy, AlertCircle,
  ChevronDown, Minus, Plus, ShieldCheck, X,
  ClipboardList
} from 'lucide-react'
import { registerPatient } from '../../../services/api'
import './RegisterPatientPage.css'

/* ΓöÇΓöÇ Villages & Districts ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const VILLAGES = [
  'Kovilur Village, Sector 4',
  'Rampur Tola, Ward 2',
  'Main Basti, Block A',
  'Khera Mod, Sector 1',
  'Old Colony, Ward 7',
  'Sundar Nagar, Block C',
]
const DISTRICTS = [
  'Ramanathapuram District',
  'Bareilly District',
  'Lucknow District',
  'Varanasi District',
  'Gorakhpur District',
  'Agra District',
]
const GENDERS = ['Female', 'Male', 'Other']

/* ΓöÇΓöÇ Validation helpers ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function validateForm(f) {
  const e = {}
  if (!f.fullName.trim())                         e.fullName = 'Full name is required'
  else if (f.fullName.trim().length < 3)          e.fullName = 'Name must be at least 3 characters'
  if (!f.mobile.trim())                           e.mobile   = 'Mobile number is required'
  else if (!/^\d{10}$/.test(f.mobile))            e.mobile   = 'Invalid mobile number. Please enter a valid 10-digit registered number.'
  if (!f.age)                                     e.age      = 'Age is required'
  else if (Number(f.age) < 0 || Number(f.age) > 120)
                                                  e.age      = 'Age must be between 0 and 120 years.'
  if (!f.gender)                                  e.gender   = 'Please select gender'
  if (!f.village)                                 e.village  = 'Village / Sector is required'
  if (!f.district)                                e.district = 'District is required'
  return e
}

/* ΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
export default function RegisterPatientPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: '', mobile: '', age: '', gender: '', village: '', district: '',
  })
  const [errors,  setErrors]  = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [registeredPatient, setRegisteredPatient] = useState(null)
  const [patientId, setPatientId] = useState(() =>
    'P' + Math.floor(100000 + Math.random() * 900000)
  )
  const [copied, setCopied] = useState(false)

  /* ── Helpers ── */
  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: '' }))
    setApiError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validateForm(form)
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    setLoading(true)
    setApiError('')
    try {
      const created = await registerPatient({
        full_name: form.fullName.trim(),
        mobile: form.mobile.trim(),
        age: Number(form.age),
        gender: form.gender,
        village: form.village,
        district: form.district,
      })
      setRegisteredPatient(created)
      if (created?.id) {
        setPatientId(`P${String(created.id).padStart(6, '0')}`)
      }
      setSuccess(true)
    } catch (err) {
      setApiError(err.message || 'Failed to register patient with backend.')
    } finally {
      setLoading(false)
    }
  }

  function handleCopyId() {
    navigator.clipboard?.writeText(patientId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const mobileLen = form.mobile.replace(/\D/g, '').length

  /* ΓöÇΓöÇ Derived display ΓöÇΓöÇ */
  const nameVerified  = form.fullName.trim().length >= 3 && !errors.fullName
  const mobileError    = errors.mobile
  const _mobilePartial = mobileLen > 0 && mobileLen < 10 && !mobileError

  return (
    <div className="rp-root">

      {/* ΓöÇΓöÇ Page Header ΓöÇΓöÇ */}
      <div className="rp-page-header">
        <button className="rp-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <div className="rp-header-text">
          <h1 className="rp-title">Register Patient</h1>
          <p className="rp-subtitle">Create a basic patient record for field care.</p>
        </div>
        <span className="rp-new-badge">New Intake</span>
      </div>

      {/* ABHA Banner */}
      <div className="rp-abha-banner">
        <ShieldCheck size={16} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
        <p className="rp-abha-text">
          All marked fields (<span className="rp-req-star">*</span>) link to the ABHA Health Registry.
        </p>
      </div>

      {apiError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', color: '#991b1b', fontSize: '13px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertCircle size={16} /> {apiError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <div className="rp-form-card">

          {/* Full Name */}
          <div className="rp-field-group">
            <div className="rp-label-row">
              <label className="rp-label" htmlFor="rp-fullname">
                Full Name <span className="rp-req-star">*</span>
              </label>
              {nameVerified && (
                <span className="rp-verified-badge">
                  <CheckCircle2 size={13} /> Verified
                </span>
              )}
            </div>
            <div className={`rp-input-wrap ${errors.fullName ? 'rp-err' : nameVerified ? 'rp-ok' : ''}`}>
              <User size={18} className="rp-icon" />
              <input
                id="rp-fullname"
                type="text"
                className="rp-input"
                placeholder="Pooja Sharma"
                value={form.fullName}
                onChange={(e) => set('fullName', e.target.value)}
                autoComplete="name"
              />
              {nameVerified && <CheckCircle2 size={18} className="rp-trail-ok" />}
            </div>
            {errors.fullName && (
              <p className="rp-err-msg"><AlertCircle size={13} /> {errors.fullName}</p>
            )}
          </div>

          {/* Mobile Number */}
          <div className="rp-field-group">
            <div className="rp-label-row">
              <label className="rp-label" htmlFor="rp-mobile">
                Mobile Number <span className="rp-req-star">*</span>
              </label>
              <span className={`rp-digit-counter ${mobileLen < 10 && mobileLen > 0 ? 'rp-counter-warn' : ''}`}>
                {mobileLen}/10 Digits
              </span>
            </div>
            <div className={`rp-input-wrap ${errors.mobile ? 'rp-err' : mobileLen === 10 ? 'rp-ok' : ''}`}>
              <Phone size={18} className="rp-icon" />
              <span className="rp-prefix">+91</span>
              <input
                id="rp-mobile"
                type="tel"
                inputMode="numeric"
                className="rp-input"
                placeholder="98421 82000"
                value={form.mobile}
                onChange={(e) => set('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                autoComplete="tel"
              />
              {errors.mobile && <AlertCircle size={18} style={{ color: 'var(--color-danger)', flexShrink: 0 }} />}
              {mobileLen === 10 && !errors.mobile && <CheckCircle2 size={18} className="rp-trail-ok" />}
            </div>
            {errors.mobile && (
              <p className="rp-err-msg"><AlertCircle size={13} /> {errors.mobile}</p>
            )}
          </div>

          {/* Age */}
          <div className="rp-field-group">
            <div className="rp-label-row">
              <label className="rp-label" htmlFor="rp-age">
                Age (in Years) <span className="rp-req-star">*</span>
              </label>
              <span className="rp-hint-inline">Range: 0 ΓÇô 120</span>
            </div>
            <div className={`rp-input-wrap rp-age-wrap ${errors.age ? 'rp-err' : form.age ? 'rp-ok' : ''}`}>
              <Calendar size={18} className="rp-icon" />
              <input
                id="rp-age"
                type="number"
                inputMode="numeric"
                className="rp-input"
                placeholder="26"
                min={0} max={120}
                value={form.age}
                onChange={(e) => set('age', e.target.value)}
              />
              <div className="rp-stepper">
                <button
                  type="button"
                  className="rp-step-btn"
                  onClick={() => set('age', String(Math.max(0, Number(form.age || 0) - 1)))}
                  aria-label="Decrease age"
                >
                  <Minus size={14} />
                </button>
                <button
                  type="button"
                  className="rp-step-btn"
                  onClick={() => set('age', String(Math.min(120, Number(form.age || 0) + 1)))}
                  aria-label="Increase age"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
            {errors.age
              ? <p className="rp-err-msg"><AlertCircle size={13} /> {errors.age}</p>
              : <p className="rp-hint">Age must be between 0 and 120 years.</p>
            }
          </div>

          {/* Gender */}
          <div className="rp-field-group">
            <label className="rp-label">
              Gender <span className="rp-req-star">*</span>
            </label>
            <div className="rp-gender-row">
              {GENDERS.map((g) => (
                <button
                  key={g}
                  type="button"
                  id={`gender-${g.toLowerCase()}`}
                  className={`rp-gender-chip ${form.gender === g ? 'rp-gender-active' : ''}`}
                  onClick={() => set('gender', g)}
                >
                  {form.gender === g && <CheckCircle2 size={14} />}
                  {g}
                </button>
              ))}
            </div>
            {errors.gender && (
              <p className="rp-err-msg"><AlertCircle size={13} /> {errors.gender}</p>
            )}
          </div>

          {/* Village */}
          <div className="rp-field-group">
            <label className="rp-label" htmlFor="rp-village">
              Village / Sector <span className="rp-req-star">*</span>
            </label>
            <div className={`rp-input-wrap ${errors.village ? 'rp-err' : form.village ? 'rp-ok' : ''}`}>
              <MapPin size={18} className="rp-icon" />
              <select
                id="rp-village"
                className="rp-select"
                value={form.village}
                onChange={(e) => set('village', e.target.value)}
              >
                <option value="">Select village / sector</option>
                {VILLAGES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <ChevronDown size={16} className="rp-select-arrow" />
            </div>
            {errors.village && (
              <p className="rp-err-msg"><AlertCircle size={13} /> {errors.village}</p>
            )}
          </div>

          {/* District */}
          <div className="rp-field-group" style={{ marginBottom: 0 }}>
            <label className="rp-label" htmlFor="rp-district">
              District <span className="rp-req-star">*</span>
            </label>
            <div className={`rp-input-wrap ${errors.district ? 'rp-err' : form.district ? 'rp-ok' : ''}`}>
              <Building2 size={18} className="rp-icon" />
              <select
                id="rp-district"
                className="rp-select"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              >
                <option value="">Select district</option>
                {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <ChevronDown size={16} className="rp-select-arrow" />
            </div>
            {errors.district && (
              <p className="rp-err-msg"><AlertCircle size={13} /> {errors.district}</p>
            )}
          </div>

        </div>

        {/* ΓöÇΓöÇ Submit Button ΓöÇΓöÇ */}
        <button
          type="submit"
          id="btn-register-patient-submit"
          className={`rp-submit-btn ${loading ? 'rp-loading' : ''}`}
          disabled={loading}
        >
          {loading
            ? <span className="rp-spinner" />
            : <><UserPlus size={20} /> Register Patient</>
          }
        </button>
      </form>

      {/* ΓöÇΓöÇ Success Bottom Sheet ΓöÇΓöÇ */}
      {success && (
        <>
          <div className="rp-overlay" onClick={() => setSuccess(false)} />
          <div className="rp-success-sheet animate-slide-up">
            <button className="rp-sheet-close" onClick={() => setSuccess(false)} aria-label="Close">
              <X size={18} />
            </button>

            <div className="rp-success-top">
              <div className="rp-success-icon-wrap">
                <CheckCircle2 size={34} />
              </div>
              <div>
                <p className="rp-success-eyebrow">REGISTRATION SUCCESS</p>
                <h2 className="rp-success-title">Patient Registered</h2>
              </div>
            </div>

            <div className="rp-patient-id-row">
              <ClipboardList size={16} style={{ color: 'var(--color-primary)' }} />
              <span className="rp-patient-id-label">Patient ID:</span>
              <span className="rp-patient-id-val">{patientId}</span>
              <button
                className="rp-copy-btn"
                onClick={handleCopyId}
                aria-label="Copy patient ID"
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>

            <div className="rp-patient-preview">
              <div className="avatar avatar-md rp-patient-avatar">
                {form.fullName
                  ? form.fullName.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
                  : 'P'}
              </div>
              <div>
                <p className="rp-preview-name">{form.fullName || 'Patient'}</p>
                <p className="rp-preview-meta">
                  {form.gender || 'ΓÇö'}, {form.age ? form.age + ' Yrs' : 'ΓÇö'}
                  {form.village ? ' ΓÇó ' + form.village.split(',')[0] : ''}
                </p>
              </div>
            </div>

            <button
              id="btn-start-screening"
              className="rp-start-btn"
              onClick={() => navigate('/worker/screening', { state: { patientId: registeredPatient?.id } })}
            >
              <ClipboardList size={18} />
              Start Screening
            </button>

            <button
              className="rp-back-dash"
              onClick={() => navigate('/worker/home')}
            >
              <ArrowLeft size={15} />
              Back to Dashboard
            </button>
          </div>
        </>
      )}
    </div>
  )
}
