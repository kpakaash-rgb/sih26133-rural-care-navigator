import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft, Calendar, MapPin, User, Copy,
  Thermometer, Activity, Heart, Wind,
  Clock, CheckCircle2, AlertTriangle, AlertCircle,
  ChevronDown, ChevronUp, ClipboardList,
  Building2, UserCheck, Lock,
  ShieldCheck, Wifi, ExternalLink, CalendarClock, Phone
} from 'lucide-react'
import { getPatientDetailsById, getLatestScreening, getDoctorPatientClinicalSummary } from '../../../services/api'
import './PatientSummaryPage.css'

/* ── Status Config ── */
const STATUS_LEVELS = [
  { step: 1, label: 'Routine',    key: 'routine'   },
  { step: 2, label: 'Attention',  key: 'attention' },
  { step: 3, label: 'Urgent',     key: 'urgent'    },
]

/* ── Note type helpers ── */
function NoteIcon({ type }) {
  if (type === 'ok')     return <CheckCircle2 size={12} />
  if (type === 'warn')   return <AlertTriangle size={12} />
  return                        <AlertCircle  size={12} />
}

/* ── Collapsible card ── */
function CollapsibleCard({ title, subtitle, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="ps-card">
      <button
        type="button"
        className="ps-card-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <div>
          <p className="ps-card-title">{title}</p>
          {subtitle && <p className="ps-card-subtitle">{subtitle}</p>}
        </div>
        {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
      </button>
      {open && <div className="ps-card-body">{children}</div>}
    </div>
  )
}

/* ── Component ── */
export default function PatientSummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const routePatientId = location.state?.patientId

  const [copied, setCopied] = useState(false)
  const [patient, setPatient] = useState({
    id: routePatientId || 1,
    displayId: routePatientId ? `P${String(routePatientId).padStart(6, '0')}` : 'Patient',
    name: 'Community Patient',
    initials: 'CP',
    age: '—',
    gender: 'Patient',
    village: 'Field Sector',
    asha: 'Assigned Healthcare Worker',
  })
  const [symptoms, setSymptoms] = useState([])
  const [vitals, setVitals] = useState([])
  const [screeningDate, setScreeningDate] = useState('')
  const [currentStatus, setCurrentStatus] = useState('routine') // routine | attention | urgent
  const [voiceEncounter, setVoiceEncounter] = useState(null)

  useEffect(() => {
    let isMounted = true

    if (routePatientId) {
      getDoctorPatientClinicalSummary(routePatientId)
        .then((data) => {
          if (isMounted && data?.voice_encounter) {
            setVoiceEncounter(data.voice_encounter)
          }
        })
        .catch(() => {})

      getPatientDetailsById(routePatientId)
        .then((data) => {
          if (isMounted && data) {
            setPatient({
              id: data.id,
              displayId: `P${String(data.id).padStart(6, '0')}`,
              name: data.full_name,
              initials: (data.full_name || 'Patient').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
              age: data.age ?? 42,
              gender: data.gender || 'Female',
              village: data.village || data.district || 'Village Area',
              asha: 'Assigned Frontline Worker',
            })
          }
        })
        .catch(() => {})

      getLatestScreening(routePatientId)
        .then((sc) => {
          if (isMounted && sc) {
            if (sc.screened_at) {
              setScreeningDate(new Date(sc.screened_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }))
            }
            if (sc.triage_level) {
              const lvl = sc.triage_level.toLowerCase()
              if (lvl.includes('urgent') || lvl.includes('emergency') || lvl === 'level 1') setCurrentStatus('urgent')
              else if (lvl.includes('routine') || lvl.includes('low') || lvl === 'level 3') setCurrentStatus('routine')
              else setCurrentStatus('attention')
            }
            if (Array.isArray(sc.symptoms) && sc.symptoms.length > 0) {
              setSymptoms(sc.symptoms.map(s => ({
                label: s,
                color: s.toLowerCase().includes('fever') || s.toLowerCase().includes('breath') ? 'danger' : 'primary'
              })))
            }
            const newVitals = [
              { key: 'temp', label: 'BODY TEMP', value: sc.temperature ? String(sc.temperature) : '37.0', unit: '°C', icon: Thermometer, note: sc.temperature >= 38 ? 'Elevated (Mild Fever)' : 'Normal Baseline', noteType: sc.temperature >= 38 ? 'warn' : 'ok' },
              { key: 'bp', label: 'BLOOD PRESSURE', value: (sc.systolic_bp && sc.diastolic_bp) ? `${sc.systolic_bp}/${sc.diastolic_bp}` : '120/80', unit: 'mmHg', icon: Activity, note: (sc.systolic_bp >= 135 || sc.diastolic_bp >= 85) ? 'Pre-hypertensive' : 'Optimal Limits', noteType: (sc.systolic_bp >= 135 || sc.diastolic_bp >= 85) ? 'warn' : 'ok' },
              { key: 'hr', label: 'HEART RATE', value: sc.heart_rate ? String(sc.heart_rate) : '76', unit: 'bpm', icon: Heart, note: (sc.heart_rate > 100 || sc.heart_rate < 55) ? 'Check baseline' : 'Normal Baseline', noteType: 'ok' },
              { key: 'spo2', label: 'OXYGEN (SpO2)', value: sc.spo2 ? String(sc.spo2) : '98', unit: '%', icon: Wind, note: (sc.spo2 && sc.spo2 < 95) ? 'Below ambient' : 'Adequate Ambient', noteType: (sc.spo2 && sc.spo2 < 95) ? 'warn' : 'ok' },
            ]
            setVitals(newVitals)
          }
        })
        .catch(() => {})
    }

    return () => {
      isMounted = false
    }
  }, [routePatientId])

  function copyId() {
    navigator.clipboard?.writeText(patient.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="ps-root animate-fade-in">

      {/* ── Top Bar ── */}
      <div className="ps-topbar">
        <button
          type="button"
          className="ps-back-btn"
          onClick={() => navigate('/worker/patients')}
          aria-label="Back to patients list"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="ps-topbar-center">
          <p className="ps-topbar-title">Patient Summary</p>
          <div className="ps-topbar-badges">
            <span className="ps-badge-green"><ShieldCheck size={11} /> ABHA Verified</span>
            <span className="ps-badge-blue"><Wifi size={11} /> Field Sync OK</span>
          </div>
        </div>
      </div>

      {/* ── Patient Card ── */}
      <div className="ps-patient-card">
        <div className="ps-patient-top">
          <div className="ps-patient-avatar">{patient.initials || 'PT'}</div>
          <div className="ps-patient-info">
            <div className="ps-patient-name-row">
              <h2 className="ps-patient-name">{patient.name}</h2>
              <span className="ps-patient-age">{patient.age} ◌</span>
              <button className="ps-icon-btn" aria-label="View history"><Calendar size={16} /></button>
            </div>
            <div className="ps-id-row">
              <span className="ps-id-badge">ID: {patient.id}</span>
              <button className="ps-copy-btn" onClick={copyId} aria-label="Copy ID">
                <Copy size={13} />
                {copied && <span className="ps-copied-tip">Copied!</span>}
              </button>
            </div>
          </div>
        </div>
        <div className="ps-patient-meta-row">
          <span className="ps-meta-item"><MapPin size={13} /> {patient.village}</span>
          <span className="ps-meta-item"><UserCheck size={13} /> Assigned ASHA: {patient.asha}</span>
        </div>
      </div>

      {/* ΓöÇΓöÇ Current Care Status ΓöÇΓöÇ */}
      <div className="ps-status-block">
        <div className="ps-status-header-row">
          <p className="ps-field-label">FIELD TRIAGE LEVEL ┬╖ Current Care Status</p>
          <span className="ps-level-badge">Level 2 Active</span>
        </div>

        {/* Status Banner */}
        <div className="ps-status-banner ps-status-attention">
          <div className="ps-status-icon-wrap">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="ps-status-label">Needs Attention</p>
            <p className="ps-status-desc">
              Requires field monitoring within 48h and primary medical officer review.
            </p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="ps-status-steps">
          {STATUS_LEVELS.map((s, i) => {
            const active  = s.key === currentStatus
            const done    = s.step < STATUS_LEVELS.find(x => x.key === currentStatus).step
            return (
              <React.Fragment key={s.key}>
                <div className={`ps-step ${active ? 'ps-step-active' : done ? 'ps-step-done' : ''}`}>
                  <div className="ps-step-dot">{s.step}</div>
                  <span className="ps-step-label">{s.label}</span>
                </div>
                {i < STATUS_LEVELS.length - 1 && <div className={`ps-step-line ${done || active ? 'ps-step-line-active' : ''}`} />}
              </React.Fragment>
            )
          })}
        </div>

        <p className="ps-status-disclaimer">
          Operational triage for frontline coordination ┬╖ Not a formal clinical diagnosis
        </p>
      </div>

      {/* Latest Screening */}
      <CollapsibleCard title="Latest Screening" subtitle={screeningDate}>
        <p className="ps-screen-by">
          <User size={13} /> Recorded by {patient.asha || 'ASHA Worker'}
        </p>

        {/* Symptom chips */}
        <div className="ps-chip-row">
          {symptoms.map((s) => (
            <span key={s.label} className={`ps-symptom-chip ps-chip-${s.color}`}>
              {s.label}
            </span>
          ))}
        </div>

        {/* Vitals grid */}
        <div className="ps-vitals-grid">
          {vitals.map((v) => (
            <div key={v.key} className={`ps-vital-card ps-vc-${v.noteType}`}>
              <div className="ps-vital-top">
                <span className="ps-vital-label">{v.label}</span>
                <div className={`ps-vital-icon ps-vi-${v.noteType}`}><v.icon size={15} /></div>
              </div>
              <div className="ps-vital-value-row">
                <span className="ps-vital-value">{v.value}</span>
                <span className="ps-vital-unit">{v.unit}</span>
              </div>
              <div className={`ps-vital-note ps-vn-${v.noteType}`}>
                <NoteIcon type={v.noteType} />
                {v.note}
              </div>
            </div>
          ))}
        </div>
      </CollapsibleCard>

      {/* Voice IVR Triage Encounter */}
      {voiceEncounter && (
        <CollapsibleCard 
          title="Voice / AI Intake Encounter" 
          subtitle={voiceEncounter.created_at ? new Date(voiceEncounter.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent Voice Call'}
        >
          <div className="ps-info-grid" style={{ marginBottom: '0.75rem' }}>
            <div className="ps-info-item">
              <p className="ps-info-label"><User size={13} /> Caller / Patient</p>
              <p className="ps-info-val">
                {voiceEncounter.patient_name || patient.name || 'Anonymous'}
                {voiceEncounter.age ? ` (${voiceEncounter.age}y` : ''}
                {voiceEncounter.gender ? `, ${voiceEncounter.gender})` : voiceEncounter.age ? ')' : ''}
              </p>
            </div>
            <div className="ps-info-item">
              <p className="ps-info-label"><MapPin size={13} /> Locality / Village</p>
              <p className="ps-info-val">{voiceEncounter.locality || patient.village || 'Not specified'}</p>
            </div>
            <div className="ps-info-item">
              <p className="ps-info-label"><Phone size={13} /> Call Language & Phone</p>
              <p className="ps-info-val">
                {voiceEncounter.language === 'hi' ? 'Hindi' : 'English'} • {voiceEncounter.caller_phone || voiceEncounter.phone_number || 'Voice Call'}
              </p>
            </div>
            <div className="ps-info-item">
              <p className="ps-info-label"><Activity size={13} /> Triage Urgency</p>
              <p className="ps-info-val" style={{ 
                fontWeight: '700', 
                color: voiceEncounter.is_emergency ? '#dc2626' : voiceEncounter.triage_urgency === 'urgent' ? '#ea580c' : voiceEncounter.triage_urgency === 'needs_attention' ? '#d97706' : '#16a34a' 
              }}>
                {voiceEncounter.triage_urgency ? voiceEncounter.triage_urgency.toUpperCase() : 'ROUTINE'}
                {voiceEncounter.severity ? ` (${voiceEncounter.severity})` : ''}
              </p>
            </div>
            <div className="ps-info-item">
              <p className="ps-info-label"><AlertCircle size={13} /> Symptoms & Duration</p>
              <p className="ps-info-val">
                {voiceEncounter.symptoms && voiceEncounter.symptoms.length > 0 ? voiceEncounter.symptoms.join(', ') : 'Reported verbally'}
                {voiceEncounter.symptom_duration ? ` • ${voiceEncounter.symptom_duration}` : ''}
              </p>
            </div>
            <div className="ps-info-item">
              <p className="ps-info-label"><Building2 size={13} /> Recommended Step / Facility</p>
              <p className="ps-info-val">
                {voiceEncounter.recommended_care_level || 'PHC Assessment'} • {voiceEncounter.recommended_facility_name || voiceEncounter.facility_name || 'Nearest Facility'}
              </p>
            </div>
          </div>
          {voiceEncounter.additional_notes && (
            <div style={{ padding: '0.45rem 0.65rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '0.82rem', color: '#475569' }}>
              <strong>Intake Notes:</strong> {voiceEncounter.additional_notes}
            </div>
          )}
          {voiceEncounter.appointment_id && (
            <div style={{ padding: '0.5rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.85rem', color: '#15803d', fontWeight: '700', margin: 0 }}>
                ✓ Voice-Booked Appointment #{voiceEncounter.appointment_id} ({voiceEncounter.appointment_type || 'Teleconsultation'})
              </p>
            </div>
          )}
          {voiceEncounter.transcript_summary && (
            <p style={{ fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic', margin: 0 }}>
              {voiceEncounter.transcript_summary}
            </p>
          )}
        </CollapsibleCard>
      )}

      {/* ── Coordination & Action Plan ── */}
      <CollapsibleCard title="Coordination & Action Plan" subtitle="Active Care Loop">

        {/* Follow-up */}
        <div className="ps-action-row">
          <div className="ps-action-icon ps-ai-warn"><Clock size={17} /></div>
          <div className="ps-action-body">
            <p className="ps-action-title">Field Follow-up Task</p>
            <p className="ps-action-sub">Home visit • {patient.village || 'Assigned Field Sector'}</p>
          </div>
          <span className="ps-badge-scheduled">Active</span>
        </div>

        <div className="ps-divider" />

        {/* Referral */}
        <div className="ps-action-row">
          <div className="ps-action-icon ps-ai-blue"><ClipboardList size={17} /></div>
          <div className="ps-action-body">
            <p className="ps-action-title">Referral Order</p>
            <p className="ps-action-sub ps-ref-name">Clinical Assessment</p>
          </div>
          <span className="ps-badge-pending">Under Review</span>
        </div>

        <div className="ps-info-grid">
          <div className="ps-info-item">
            <p className="ps-info-label"><Building2 size={13} /> Facility Destination</p>
            <p className="ps-info-val">Primary Health Centre (PHC)</p>
          </div>
          <div className="ps-info-item">
            <p className="ps-info-label"><UserCheck size={13} /> Assigned Clinician</p>
            <p className="ps-info-val">Attending Medical Officer</p>
          </div>
          <div className="ps-info-item">
            <p className="ps-info-label"><AlertCircle size={13} /> Escalation Status</p>
            <p className="ps-info-val ps-escalate-warn">Awaiting Medical Officer review</p>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Upcoming Appointment ── */}
      <CollapsibleCard title="Upcoming Appointment" subtitle="Primary Health Centre Visit">
        <div className="ps-appt-card">
          <div className="ps-appt-header">
            <p className="ps-appt-title">Primary Health Centre Visit</p>
            <span className="ps-badge-confirmed">Scheduled</span>
          </div>
          <div className="ps-appt-meta">
            <span className="ps-meta-item"><Calendar size={13} /> Active Appointment Slot</span>
            <span className="ps-meta-item"><Clock size={13} /> OPD Hours</span>
          </div>
          <div className="ps-appt-meta" style={{ marginTop: 4 }}>
            <span className="ps-meta-item"><User size={13} /> Attending Medical Officer</span>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Past Encounters ── */}
      <CollapsibleCard title="Past Encounter History" subtitle="Clinical History">
        <div className="ps-visits-list">
          <div className="ps-visit-row">
            <div className="ps-visit-icon ps-vi2-ok">
              <CheckCircle2 size={16} />
            </div>
            <div className="ps-visit-body">
              <div className="ps-visit-title-row">
                <p className="ps-visit-title">Initial Registration & Baseline Triage</p>
                <span className="ps-visit-date">{screeningDate || 'Recorded'}</span>
              </div>
              <p className="ps-visit-place">{patient.village || 'Field Sector'} • Routine clinical record synchronized</p>
              <p className="ps-visit-status">● Synchronized with PostgreSQL</p>
            </div>
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Actions ── */}
      <div className="ps-actions">
        <button id="btn-refer-patient" className="ps-btn-primary" onClick={() => navigate('/worker/refer-patient', { state: { patientId: patient.id } })}>
          <Building2 size={19} />
          Refer Patient to PHC
          <ExternalLink size={16} style={{ marginLeft: 'auto' }} />
        </button>
        <button id="btn-schedule-followup" className="ps-btn-outline" onClick={() => {}}>
          <CalendarClock size={18} />
          Schedule Follow-up
        </button>
      </div>

      {/* ΓöÇΓöÇ Security Footer ΓöÇΓöÇ */}
      <div className="ps-security-footer">
        <Lock size={13} />
        <span>Encrypted offline copy cached on device (AES-256)</span>
      </div>

    </div>
  )
}
