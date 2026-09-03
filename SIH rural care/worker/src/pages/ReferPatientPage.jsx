import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Copy, ChevronDown, ShieldCheck,
  MapPin, Clock, User, Mic, CloudOff, Send,
  CheckCircle2, Bell, Info, Building2,
  AlertTriangle, Siren, CalendarClock, Wifi
} from 'lucide-react'
import './ReferPatientPage.css'

/* ── Demo Data ──────────────────────────────────────────── */
const patient = {
  name: 'Anitha Kumar', initials: 'AK', gender: 'Female',
  id: 'P104827', age: 42, village: 'Kovilur',
  visitTime: 'Today, 09:30 AM',
  lastVitals: '138/88 mmHg',
}

const REASONS = [
  'Further clinical assessment required',
  'Suspected high-risk pregnancy',
  'Uncontrolled blood pressure',
  'Respiratory distress',
  'Post-screening follow-up',
  'Immunisation adverse reaction',
]

const FACILITIES = [
  { id: 1, name: 'Kovilur Primary Health Centre', type: 'Sub-district PHC', sector: 'Sector B-4', km: 4.2, doctor: 'Dr. R. Sundaram', transit: '~15 mins', open: true },
  { id: 2, name: 'Ramanathapuram District Hospital', type: 'District Hospital', sector: 'Sector A-1', km: 18.5, doctor: 'Dr. P. Muthu', transit: '~45 mins', open: true },
]

const PRIORITIES = [
  {
    key: 'routine', label: 'Routine',
    icon: CalendarClock, color: 'neutral',
    desc: 'Within 7 days · Scheduled clinical review or preventive assessment.',
    time: 'Within 7 days',
  },
  {
    key: 'urgent', label: 'Urgent',
    icon: AlertTriangle, color: 'warning',
    desc: 'Within 24–48 hours · Escalated queue. Coordinator notified.',
    time: 'Within 24–48 hours',
  },
  {
    key: 'emergency', label: 'Emergency',
    icon: Siren, color: 'danger',
    desc: 'Immediate · Critical distress / ambulance dispatch required.',
    time: 'Immediate',
  },
]

const DEMO_NOTES = `Patient reports persistent fever for 3 days with elevated BP (138/88) and mild respiratory fatigue. Vitals recorded during morning home visit. Routine antipyretic advised locally; awaiting medical officer evaluation.`

/* ── Component ──────────────────────────────────────────── */
export default function ReferPatientPage() {
  const navigate = useNavigate()

  const [reason,   setReason]   = useState(REASONS[0])
  const [facility, setFacility] = useState(FACILITIES[0])
  const [priority, setPriority] = useState('urgent')
  const [notes,    setNotes]    = useState(DEMO_NOTES)
  const [loading,  setLoading]  = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [idCopied, setIdCopied] = useState(false)
  const [ptCopied, setPtCopied] = useState(false)

  const REFERRAL_ID = 'REF-2026-1842'

  function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => { setLoading(false); setSuccess(true) }, 1400)
  }

  function copy(val, setter) {
    navigator.clipboard?.writeText(val)
    setter(true); setTimeout(() => setter(false), 2000)
  }

  /* ── Success state ── */
  if (success) {
    return (
      <div className="rr-root animate-fade-in">
        {/* Header */}
        <div className="rr-page-header">
          <button className="rr-back-btn" onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
          <h1 className="rr-title">Refer Patient</h1>
        </div>

        <div className="rr-success-card animate-slide-up">
          {/* Top */}
          <div className="rr-success-top">
            <div className="rr-success-icon"><CheckCircle2 size={36} /></div>
            <div>
              <div className="rr-success-title-row">
                <h2 className="rr-success-title">Referral Created</h2>
                <span className="rr-transmitted-badge"><Wifi size={11} /> Transmitted</span>
              </div>
              <p className="rr-success-sub">PHC coordinator alerted via push notification</p>
            </div>
          </div>

          <div className="rr-divider" />

          {/* Ref ID */}
          <div className="rr-ref-id-row">
            <div>
              <p className="rr-ref-label">Referral Reference ID</p>
              <p className="rr-ref-val">{REFERRAL_ID}</p>
            </div>
            <button className="rr-copy-btn" onClick={() => copy(REFERRAL_ID, setIdCopied)}>
              <Copy size={14} /> {idCopied ? 'Copied!' : 'Copy'}
            </button>
          </div>

          {/* Info grid */}
          <div className="rr-success-grid">
            <div className="rr-sg-item">
              <p className="rr-sg-label"><Building2 size={12} /> Destination Facility</p>
              <p className="rr-sg-val">{facility.name}</p>
              <p className="rr-sg-meta">{facility.type}</p>
            </div>
            <div className="rr-sg-item">
              <p className="rr-sg-label"><AlertTriangle size={12} /> Triage Priority</p>
              <p className="rr-sg-val rr-priority-urgent">
                {PRIORITIES.find(p => p.key === priority)?.label} Escalation
              </p>
              <p className="rr-sg-meta">Target: &lt;24 hours</p>
            </div>
          </div>

          {/* Status row */}
          <div className="rr-status-row">
            <span className="rr-status-item rr-si-green">
              <CheckCircle2 size={13} /> Offline Queue Synced
            </span>
            <span className="rr-status-item rr-si-blue">
              <Clock size={13} /> Status: Pending Intake
            </span>
          </div>
        </div>

        {/* Actions */}
        <button id="btn-track-referral" className="rr-submit-btn" style={{ marginTop: 0 }}>
          <Bell size={18} /> Track Referral
        </button>
        <button className="rr-back-summary" onClick={() => navigate('/patient-summary')}>
          <ArrowLeft size={15} /> Back to Patient Summary
        </button>
      </div>
    )
  }

  /* ── Form state ── */
  return (
    <form className="rr-root animate-fade-in" onSubmit={handleSubmit}>

      {/* ── Page Header ── */}
      <div className="rr-page-header">
        <button type="button" className="rr-back-btn" onClick={() => navigate(-1)}><ArrowLeft size={22} /></button>
        <div className="rr-header-mid">
          <h1 className="rr-title">Refer Patient</h1>
          <div className="rr-header-badges">
            <span className="rr-badge-warn">Escalation to PHC</span>
            <span className="rr-badge-green"><Wifi size={11} /> Field Sync Ready</span>
          </div>
        </div>
        <button type="button" className="rr-info-btn" aria-label="Info"><Info size={18} /></button>
      </div>

      {/* ── Patient Summary Card ── */}
      <div className="rr-patient-card">
        <div className="rr-patient-top">
          <div className="rr-patient-avatar">AK</div>
          <div className="rr-patient-info">
            <div className="rr-patient-name-row">
              <span className="rr-patient-name">{patient.name}</span>
              <span className="rr-patient-gender">♀</span>
              <span className="rr-id-badge">🪪 {patient.id}</span>
              <button type="button" className="rr-copy-icon" onClick={() => copy(patient.id, setPtCopied)}>
                <Copy size={12} />{ptCopied && <span className="rr-tip">Copied!</span>}
              </button>
            </div>
            <p className="rr-patient-meta">Village: {patient.village} • Age: {patient.age} • {patient.gender}</p>
          </div>
        </div>
        <div className="rr-patient-footer">
          <span className="rr-pf-item"><Clock size={12} /> Visit: {patient.visitTime}</span>
          <span className="rr-pf-item"><ShieldCheck size={12} /> Vitals: {patient.lastVitals}</span>
        </div>
      </div>

      {/* ── Reason for Referral ── */}
      <div className="rr-section">
        <div className="rr-section-header">
          <h3 className="rr-section-title">Reason for Referral</h3>
          <span className="rr-required-badge">Required</span>
        </div>
        <div className="rr-select-wrap">
          <ClipboardIcon />
          <select
            className="rr-select"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          >
            {REASONS.map((r) => <option key={r}>{r}</option>)}
          </select>
          <ChevronDown size={16} className="rr-select-arrow" />
        </div>
        <p className="rr-section-hint">
          <ShieldCheck size={13} style={{ flexShrink: 0 }} />
          Protocol-guided frontline triage escalation standard.
        </p>
      </div>

      {/* ── Recommended Facility ── */}
      <div className="rr-section">
        <div className="rr-section-header">
          <h3 className="rr-section-title">Recommended Facility</h3>
          <button type="button" className="rr-change-link">Change</button>
        </div>
        <div className="rr-facility-card">
          <div className="rr-facility-header">
            <div className="rr-facility-icon"><Building2 size={18} /></div>
            <div className="rr-facility-name-wrap">
              <p className="rr-facility-name">{facility.name}</p>
              <p className="rr-facility-type">{facility.type} • {facility.sector}</p>
            </div>
            {facility.open && <span className="rr-open-badge">Open Now</span>}
          </div>
          <div className="rr-facility-meta">
            <span className="rr-fac-meta"><MapPin size={12} /> {facility.km} km away</span>
            <span className="rr-fac-meta"><User size={12} /> On Duty: {facility.doctor}</span>
            <span className="rr-fac-meta"><Clock size={12} /> Transit: {facility.transit}</span>
          </div>
        </div>
      </div>

      {/* ── Priority Level ── */}
      <div className="rr-section">
        <div className="rr-section-header">
          <h3 className="rr-section-title">Priority Level</h3>
          <span className="rr-hint-inline">Select response time</span>
        </div>
        <div className="rr-priority-list">
          {PRIORITIES.map((p) => {
            const active = priority === p.key
            return (
              <button
                key={p.key}
                type="button"
                className={`rr-priority-card rr-pc-${p.color} ${active ? `rr-pc-active-${p.color}` : ''}`}
                onClick={() => setPriority(p.key)}
                aria-pressed={active}
              >
                <div className="rr-pc-left">
                  <div className={`rr-pc-icon rr-pci-${p.color}`}><p.icon size={18} /></div>
                  <div>
                    <div className="rr-pc-label-row">
                      <span className="rr-pc-label">{p.label}</span>
                      {active && <span className="rr-pc-active-tag">ACTIVE CHOICE</span>}
                    </div>
                    <p className="rr-pc-desc">{p.desc}</p>
                  </div>
                </div>
                <div className={`rr-pc-check ${active ? 'rr-pc-check-visible' : ''}`}>
                  <CheckCircle2 size={20} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Notes ── */}
      <div className="rr-section">
        <div className="rr-section-header">
          <h3 className="rr-section-title">Notes for Receiving Clinician</h3>
          <span className="rr-hint-inline">Field Log</span>
        </div>
        <div className="rr-notes-wrap">
          <textarea
            className="rr-notes"
            rows={6}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Enter clinical observations, vitals context, or instructions for the receiving clinician..."
          />
          <div className="rr-notes-footer">
            <span className="rr-notes-meta"><Mic size={12} /> Voice note attached (2s)</span>
            <span className="rr-notes-count">{notes.length} / 500 chars</span>
          </div>
        </div>
      </div>

      {/* ── Submit ── */}
      <button
        type="submit"
        id="btn-submit-referral"
        className={`rr-submit-btn ${loading ? 'rr-loading' : ''}`}
        disabled={loading}
      >
        {loading ? <span className="rr-spinner" /> : <><Send size={18} /> Submit Referral</>}
      </button>

      <button type="button" className="rr-draft-btn">
        <CloudOff size={16} /> Save Offline Draft
      </button>

    </form>
  )
}

/* tiny helper so we avoid import collision with lucide */
function ClipboardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--color-text-muted)' }}>
      <rect x="9" y="2" width="6" height="4" rx="1"/><path d="M17 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
    </svg>
  )
}
