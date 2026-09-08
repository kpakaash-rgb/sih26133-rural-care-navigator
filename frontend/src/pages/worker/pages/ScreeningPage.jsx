import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Copy, ShieldCheck, Check, Plus,
  Mic, Thermometer, Heart, Activity, Wind,
  Bluetooth, CheckCircle2, AlertCircle, AlertTriangle,
  Send, CloudOff, Info
} from 'lucide-react'
import './ScreeningPage.css'

/* ΓöÇΓöÇ Demo Patient ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const patient = {
  name: 'Anitha Kumar',
  id: 'P104827',
  initials: 'AK',
  meta: 'Female, 28 Yrs ΓÇó Kovilur Village',
}

/* ΓöÇΓöÇ Symptoms ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const SYMPTOMS_LIST = [
  'Fever', 'Cough', 'Breathing Difficulty', 'Pain',
  'Weakness', 'Headache', 'Other',
]

/* ΓöÇΓöÇ Vitals config ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const VITALS = [
  { key: 'temp',   label: 'Body Temp',         unit: '┬░C',   icon: Thermometer, placeholder: '36.6',  hint: 'Normal: 36.1 ΓÇô 37.2┬░C' },
  { key: 'bp',     label: 'Blood Pressure',     unit: 'mmHg', icon: Activity,    placeholder: '120/80', hint: 'Normal: < 120/80 mmHg'  },
  { key: 'hr',     label: 'Heart Rate',         unit: 'bpm',  icon: Heart,       placeholder: '72',     hint: 'Normal: 60 ΓÇô 100 bpm'   },
  { key: 'spo2',   label: 'Oxygen (SpO2)',       unit: '%',    icon: Wind,        placeholder: '98',     hint: 'Normal: ΓëÑ 95%'          },
]

/* ΓöÇΓöÇ Vital status evaluator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
function vitalStatus(key, value) {
  if (!value) return null
  const v = parseFloat(value)
  if (isNaN(v)) return null
  switch (key) {
    case 'temp':
      if (v >= 38.0) return { label: `Elevated (${((v * 9/5) + 32).toFixed(1)}┬░F)`, type: 'danger' }
      if (v < 36.1)  return { label: 'Hypothermia risk', type: 'warn' }
      return { label: 'Normal range', type: 'ok' }
    case 'hr':
      if (v > 100) return { label: 'Tachycardia', type: 'warn' }
      if (v < 60)  return { label: 'Bradycardia', type: 'warn' }
      return { label: 'Within limit', type: 'ok' }
    case 'spo2':
      if (v < 90)  return { label: 'Critical ΓÇö low oxygen', type: 'danger' }
      if (v < 95)  return { label: 'Below normal', type: 'warn' }
      return { label: 'Normal ambient', type: 'ok' }
    case 'bp': {
      const parts = value.split('/')
      if (parts.length !== 2) return null
      const sys = parseInt(parts[0]); const dia = parseInt(parts[1])
      if (sys >= 140 || dia >= 90) return { label: 'Hypertensive', type: 'danger' }
      if (sys >= 130 || dia >= 80) return { label: 'Pre-hypertensive', type: 'warn' }
      return { label: 'Normal range', type: 'ok' }
    }
    default: return null
  }
}

/* ΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
export default function ScreeningPage() {
  const navigate = useNavigate()

  const [symptoms,    setSymptoms]    = useState(['Fever', 'Cough', 'Breathing Difficulty', 'Headache'])
  const [description, setDescription] = useState('')
  const [vitals,      setVitals]      = useState({ temp: '38.2', bp: '138/88', hr: '96', spo2: '95' })
  const [copied,      setCopied]      = useState(false)
  const [submitted,   setSubmitted]   = useState(false)
  const [loading,     setLoading]     = useState(false)

  function toggleSymptom(s) {
    setSymptoms((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    )
  }

  function setVital(key, val) {
    setVitals((prev) => ({ ...prev, [key]: val }))
  }

  function handleCopyId() {
    navigator.clipboard?.writeText(patient.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setSubmitted(true)
    }, 1400)
  }

  if (submitted) {
    return (
      <div className="sc-submitted animate-slide-up">
        <div className="sc-submitted-icon">
          <CheckCircle2 size={52} />
        </div>
        <h2 className="sc-submitted-title">Screening Submitted</h2>
        <p className="sc-submitted-sub">
          Triage data for <strong>{patient.name}</strong> has been recorded and queued for review.
        </p>
        <div className="sc-submitted-id-row">
          <span className="sc-id-label">Patient ID</span>
          <span className="sc-id-val">{patient.id}</span>
        </div>
        <div className="sc-submitted-actions">
          <button className="sc-action-primary" onClick={() => navigate('/patient-summary')}>
            View Health Summary
          </button>
          <button className="sc-action-ghost" onClick={() => navigate('/home')}>
            Back to Dashboard
          </button>
          <button className="sc-action-ghost" onClick={() => { setSubmitted(false); setLoading(false) }}>
            New Screening
          </button>
        </div>
      </div>
    )
  }

  return (
    <form className="sc-root animate-fade-in" onSubmit={handleSubmit}>

      {/* ΓöÇΓöÇ Page Header ΓöÇΓöÇ */}
      <div className="sc-page-header">
        <button type="button" className="sc-back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={22} />
        </button>
        <div className="sc-header-text">
          <h1 className="sc-title">Patient Screening</h1>
          <p className="sc-subtitle">Field Triage Intake</p>
        </div>
        <span className="sc-offline-badge">
          <span className="sc-offline-dot" />
          Offline Ready
        </span>
      </div>

      {/* ΓöÇΓöÇ Patient Card ΓöÇΓöÇ */}
      <div className="sc-patient-card">
        <div className="sc-patient-left">
          <div className="sc-patient-avatar">AK</div>
          <div className="sc-patient-info">
            <div className="sc-patient-name-row">
              <h2 className="sc-patient-name">{patient.name}</h2>
              <span className="sc-patient-id-badge">
                <span className="sc-id-icon">≡ƒ¬¬</span>
                {patient.id}
              </span>
            </div>
            <p className="sc-patient-meta">{patient.meta}</p>
          </div>
        </div>
        <button type="button" className="sc-copy-id" onClick={handleCopyId} aria-label="Copy ID">
          <Copy size={16} />
          {copied && <span className="sc-copied-tip">Copied!</span>}
        </button>
      </div>

      {/* ΓöÇΓöÇ AI Banner ΓöÇΓöÇ */}
      <div className="sc-ai-banner">
        <ShieldCheck size={18} style={{ flexShrink: 0, color: 'var(--color-primary)' }} />
        <div>
          <p className="sc-ai-label">AI-ASSISTED TRIAGE SUPPORT</p>
          <p className="sc-ai-desc">
            Assists frontline triage prioritization only. Final clinical assessment
            conducted by Medical Officer at PHC.
          </p>
        </div>
      </div>

      {/* ΓöÇΓöÇ Symptoms ΓöÇΓöÇ */}
      <section className="sc-section">
        <div className="sc-section-header">
          <div>
            <h3 className="sc-section-title">What symptoms are you experiencing?</h3>
            <p className="sc-section-sub">Select all observed or reported symptoms</p>
          </div>
          {symptoms.length > 0 && (
            <span className="sc-selected-count">
              {symptoms.length} Selected
            </span>
          )}
        </div>
        <div className="sc-chips-wrap">
          {SYMPTOMS_LIST.map((s) => {
            const sel = symptoms.includes(s)
            return (
              <button
                key={s}
                type="button"
                className={`sc-chip ${sel ? 'sc-chip-active' : ''}`}
                onClick={() => toggleSymptom(s)}
                aria-pressed={sel}
              >
                {sel
                  ? <Check size={14} strokeWidth={2.5} />
                  : <Plus size={14} strokeWidth={2} />
                }
                {s}
              </button>
            )
          })}
        </div>
      </section>

      {/* ΓöÇΓöÇ Describe the Problem ΓöÇΓöÇ */}
      <section className="sc-section">
        <div className="sc-desc-header">
          <h3 className="sc-section-title">Describe the problem</h3>
          <button type="button" className="sc-mic-btn" aria-label="Voice note">
            <Mic size={18} />
          </button>
        </div>
        <div className="sc-textarea-wrap">
          <textarea
            id="sc-description"
            className="sc-textarea"
            rows={5}
            placeholder="Patient reports persistent fever for 3 days accompanied by moderate dry cough and mild shortness of breath upon exertion. No previous chronic respiratory history noted."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="sc-textarea-footer">
            <span className="sc-audio-note">
              <CheckCircle2 size={13} />
              Audio note transcribed
            </span>
            <span className="sc-char-count">{description.length} chars</span>
          </div>
        </div>
      </section>

      {/* ΓöÇΓöÇ Basic Screening Info ΓöÇΓöÇ */}
      <section className="sc-section">
        <div className="sc-section-header">
          <div>
            <h3 className="sc-section-title">Basic Screening Information</h3>
            <p className="sc-section-sub">Record current field measurements</p>
          </div>
          <button type="button" className="sc-sync-btn">
            <Bluetooth size={14} />
            Sync Device
          </button>
        </div>

        <div className="sc-vitals-grid">
          {VITALS.map(({ key, label, unit, icon: Icon, placeholder, hint }) => {
            const status = vitalStatus(key, vitals[key])
            return (
              <div key={key} className={`sc-vital-card ${status ? `sc-vital-${status.type}` : ''}`}>
                <div className="sc-vital-top">
                  <span className="sc-vital-label">{label}</span>
                  <div className="sc-vital-icon-wrap">
                    <Icon size={16} />
                  </div>
                </div>
                <div className="sc-vital-input-row">
                  <input
                    id={`vital-${key}`}
                    type={key === 'bp' ? 'text' : 'number'}
                    inputMode={key === 'bp' ? 'text' : 'decimal'}
                    step="any"
                    className="sc-vital-input"
                    placeholder={placeholder}
                    value={vitals[key]}
                    onChange={(e) => setVital(key, e.target.value)}
                    aria-label={`${label} in ${unit}`}
                  />
                  <span className="sc-vital-unit">{unit}</span>
                </div>
                {status
                  ? (
                    <div className={`sc-vital-status sc-vs-${status.type}`}>
                      {status.type === 'ok'
                        ? <CheckCircle2 size={12} />
                        : status.type === 'warn'
                        ? <AlertTriangle size={12} />
                        : <AlertCircle size={12} />
                      }
                      {status.label}
                    </div>
                  )
                  : <p className="sc-vital-hint">{hint}</p>
                }
              </div>
            )
          })}
        </div>
      </section>

      {/* ΓöÇΓöÇ Disclaimer ΓöÇΓöÇ */}
      <div className="sc-disclaimer">
        <Info size={14} style={{ flexShrink: 0 }} />
        <p>This screening assists triage prioritization only and does not constitute a medical diagnosis. Refer to PHC Medical Officer for clinical decisions.</p>
      </div>

      {/* ΓöÇΓöÇ Submit ΓöÇΓöÇ */}
      <button
        type="submit"
        id="btn-submit-screening"
        className={`sc-submit-btn ${loading ? 'sc-loading' : ''}`}
        disabled={loading}
      >
        {loading
          ? <span className="sc-spinner" />
          : <><Send size={18} /> Submit Screening</>
        }
      </button>

      {/* ΓöÇΓöÇ Save Draft ΓöÇΓöÇ */}
      <button type="button" className="sc-draft-btn">
        <CloudOff size={16} />
        Save Draft Offline
      </button>

    </form>
  )
}
