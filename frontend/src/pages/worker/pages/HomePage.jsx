import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CalendarCheck, GitMerge, HeartPulse,
  AlertOctagon, ChevronRight, UserPlus,
  Clock, MapPin, Navigation,
  Cloud, ArrowUpRight, CheckCircle2, RefreshCw
} from 'lucide-react'
import {
  getFacilityQueue,
  updateFacilityQueue,
  getWorkerSession,
  getWorkerMe,
  getWorkerPatients
} from '../../../services/api'
import { formatQueueLastUpdated } from '../../../utils'
import './HomePage.css'

/* ── Fallback / Demo Data ── */
const defaultWorker = {
  name: 'Meena',
  fullName: 'Meena Devi',
  sector: 'Field Sector A-4',
  zone: 'Zone 3',
  initials: 'MD',
}

const defaultCaseloadStats = [
  { id: 1, icon: Users,         value: 8,  label: 'Patients to Visit',    color: '#2563EB' },
  { id: 2, icon: CalendarCheck, value: 5,  label: 'Follow-ups Due',        color: '#7C3AED' },
  { id: 3, icon: GitMerge,      value: 2,  label: 'Pending Referrals',     color: '#DC2626' },
  { id: 4, icon: HeartPulse,    value: 6,  label: "Today's Screenings",    color: '#16A34A' },
]

const tasks = [
  {
    id: 1,
    icon: Users,
    title: 'Patient follow-up',
    desc: 'Post-partum vitals & neonatal check',
    time: '10:00 AM',
    village: 'Example Village',
    status: 'Pending',
    statusColor: '#D97706',
    statusBg: '#FFFBEB',
  },
  {
    id: 2,
    icon: HeartPulse,
    title: 'Blood pressure screening',
    desc: 'NCD monthly monitoring cohort (Age 50+)',
    time: '11:30 AM',
    village: 'Kovilur',
    status: 'Upcoming',
    statusColor: '#2563EB',
    statusBg: '#EFF6FF',
  },
]

const routeProgress = { completed: 4, total: 9, kmRemaining: 3.4 }

/* ── Component ── */
export default function HomePage() {
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [workerData, setWorkerData] = useState(() => {
    const session = getWorkerSession()
    return session?.worker || defaultWorker
  })

  const queueFacilityId = workerData?.facility_id || 1
  const [queueData, setQueueData] = useState(null)
  const [waitingPatients, setWaitingPatients] = useState(8)
  const [estimatedWait, setEstimatedWait] = useState(35)
  const [queueStatus, setQueueStatus] = useState('NORMAL')
  const [isUpdatingQueue, setIsUpdatingQueue] = useState(false)
  const [queueSuccessMsg, setQueueSuccessMsg] = useState('')
  const [queueErrorMsg, setQueueErrorMsg] = useState('')
  const [patientCount, setPatientCount] = useState(null)

  useEffect(() => {
    let isMounted = true

    // Fetch worker details if token exists
    getWorkerMe()
      .then((res) => {
        if (isMounted && res) {
          setWorkerData(res)
        }
      })
      .catch(() => {})

    // Fetch worker's assigned patients count
    getWorkerPatients()
      .then((patients) => {
        if (isMounted && Array.isArray(patients)) {
          setPatientCount(patients.length)
        }
      })
      .catch(() => {})

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    getFacilityQueue(queueFacilityId)
      .then((data) => {
        if (isMounted && data) {
          setQueueData(data)
          setWaitingPatients(data.waiting_patients ?? 0)
          setEstimatedWait(data.estimated_wait_minutes ?? 0)
          setQueueStatus(data.status || 'NORMAL')
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [queueFacilityId])

  async function handleUpdateQueue(e) {
    e.preventDefault()
    setIsUpdatingQueue(true)
    setQueueSuccessMsg('')
    setQueueErrorMsg('')
    try {
      const updated = await updateFacilityQueue(queueFacilityId, {
        waiting_patients: Number(waitingPatients),
        estimated_wait_minutes: Number(estimatedWait),
        status: queueStatus,
      })
      setQueueData(updated)
      setQueueSuccessMsg('Facility queue updated and broadcasted!')
      setTimeout(() => setQueueSuccessMsg(''), 3500)
    } catch {
      setQueueErrorMsg('Failed to update facility queue.')
    } finally {
      setIsUpdatingQueue(false)
    }
  }

  const displayName = workerData?.name || workerData?.fullName || 'Meena Devi'
  const initials = displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  const sectorName = workerData?.sector || (workerData?.facility_id ? `PHC Facility #${workerData.facility_id}` : 'Field Sector A-4')

  const caseloadStats = defaultCaseloadStats.map((s) => {
    if (s.id === 1 && patientCount !== null) {
      return { ...s, value: patientCount }
    }
    return s
  })

  return (
    <div className="hd-root animate-fade-in">

      {/* ── Greeting Row ── */}
      <div className="hd-greeting-area">
        <div className="hd-badges-row">
          <span className="hd-sector-badge">{sectorName}</span>
          <span className="hd-live-badge">
            <span className="hd-live-dot" />
            Live Sync
          </span>
        </div>
        <div className="hd-greeting-row">
          <div>
            <h1 className="hd-greeting">{greeting}, {displayName}</h1>
            <p className="hd-greeting-sub">Here are your community health tasks today.</p>
          </div>
          <div className="avatar avatar-lg hd-worker-avatar">{initials}</div>
        </div>
      </div>

      {/* ── Facility Queue Management Section (Worker Update) ── */}
      <section
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #bfdbfe',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '16px',
          boxShadow: '0 2px 8px rgba(37,99,235,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Facility Management
            </span>
            <h3 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 700, color: '#1e293b' }}>
              PHC Malshiras Queue
            </h3>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '999px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: (queueData?.status || queueStatus) === 'NORMAL' ? '#dcfce7' : (queueData?.status || queueStatus) === 'BUSY' ? '#fef3c7' : '#fee2e2',
              color: (queueData?.status || queueStatus) === 'NORMAL' ? '#166534' : (queueData?.status || queueStatus) === 'BUSY' ? '#92400e' : '#991b1b',
            }}
          >
            {queueData?.status || queueStatus}
          </span>
        </div>

        {queueSuccessMsg && (
          <div style={{ backgroundColor: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '8px 12px', color: '#065f46', fontSize: '12px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} /> {queueSuccessMsg}
          </div>
        )}

        {queueErrorMsg && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', color: '#991b1b', fontSize: '12px', fontWeight: 600, marginBottom: '10px' }}>
            {queueErrorMsg}
          </div>
        )}

        <form onSubmit={handleUpdateQueue}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                Patients Waiting
              </label>
              <input
                id="worker-waiting-patients"
                type="number"
                min="0"
                value={waitingPatients}
                onChange={(e) => setWaitingPatients(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
                Est. Wait (min)
              </label>
              <input
                id="worker-estimated-wait"
                type="number"
                min="0"
                value={estimatedWait}
                onChange={(e) => setEstimatedWait(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0f172a',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#475569', marginBottom: '4px', textTransform: 'uppercase' }}>
              Queue Status
            </label>
            <select
              id="worker-queue-status"
              value={queueStatus}
              onChange={(e) => setQueueStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                boxSizing: 'border-box',
              }}
            >
              <option value="NORMAL">NORMAL (Standard flow)</option>
              <option value="BUSY">BUSY (High patient volume)</option>
              <option value="OVERLOADED">OVERLOADED (Severe wait)</option>
              <option value="CLOSED">CLOSED (OPD finished)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>
              {queueData?.last_updated ? formatQueueLastUpdated(queueData.last_updated).text : 'Ready to sync'}
            </span>

            <button
              id="btn-update-facility-queue"
              type="submit"
              disabled={isUpdatingQueue}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: isUpdatingQueue ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isUpdatingQueue ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Updating...
                </>
              ) : (
                'Update Queue'
              )}
            </button>
          </div>
        </form>
      </section>

      {/* ── Emergency Alert ── */}
      <div className="hd-alert-card">
        <div className="hd-alert-top-row">
          <span className="hd-triage-label">TRIAGE LEVEL 1</span>
          <span className="hd-high-risk-badge">High Risk</span>
        </div>
        <div className="hd-alert-body">
          <div className="hd-alert-icon-wrap">
            <AlertOctagon size={26} />
          </div>
          <div className="hd-alert-text">
            <h3 className="hd-alert-title">Urgent Attention Required</h3>
            <p className="hd-alert-desc">
              A patient has an urgent referral pending for severe antenatal
              hypertension at Kovilur Sub-center.
            </p>
          </div>
        </div>
        <div className="hd-alert-footer">
          <span className="hd-alert-time">
            <Clock size={13} />
            Escalated 24m ago
          </span>
          <button
            className="hd-review-btn"
            id="btn-review-patient"
            onClick={() => navigate('/worker/patient-summary')}
          >
            Review Patient <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* ── Register Patient ── */}
      <button
        id="btn-register-patient"
        className="hd-register-btn"
        onClick={() => navigate('/worker/register-patient')}
      >
        <UserPlus size={20} />
        + Register Patient
      </button>

      {/* ── Caseload Overview ── */}
      <section>
        <div className="hd-section-row">
          <h2 className="section-title">Caseload Overview</h2>
          <span className="hd-zone-label">{workerData?.zone || 'Zone 3'} • Today</span>
        </div>
        <div className="hd-stats-grid">
          {caseloadStats.map((s) => (
            <div
              key={s.id}
              className="hd-stat-card"
              style={{ cursor: 'pointer' }}
              onClick={() => navigate(s.id === 1 ? '/worker/patients' : s.id === 4 ? '/worker/tasks' : '/worker/patients')}
            >
              <div className="hd-stat-top">
                <div className="hd-stat-icon" style={{ background: s.color + '1A', color: s.color }}>
                  <s.icon size={20} />
                </div>
                <span className="hd-stat-arrow">
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <p className="hd-stat-value" style={{ color: s.color }}>{s.value}</p>
              <p className="hd-stat-label">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Field Route ── */}
      <div className="hd-route-card">
        <div className="hd-route-header">
          <div className="flex items-center gap-2">
            <Navigation size={16} style={{ color: 'var(--color-primary)' }} />
            <span className="hd-route-title">Optimal Field Route Active</span>
          </div>
          <span className="hd-route-km">{routeProgress.kmRemaining} km remaining</span>
        </div>
        <div className="hd-route-bar-wrap">
          <div
            className="hd-route-bar"
            style={{ width: `${(routeProgress.completed / routeProgress.total) * 100}%` }}
          />
        </div>
        <div className="hd-route-meta">
          <span>Completed: {routeProgress.completed} households</span>
          <span>Remaining: {routeProgress.total - routeProgress.completed} households</span>
        </div>
      </div>

      {/* ── Today's Tasks ── */}
      <section>
        <div className="hd-section-row">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Today's Tasks</h2>
            <span className="hd-task-count">{tasks.length}</span>
          </div>
          <button
            className="hd-view-tasks-link"
            onClick={() => navigate('/worker/tasks')}
          >
            View Tasks <ChevronRight size={15} />
          </button>
        </div>

        <div className="hd-tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="hd-task-card">
              <div className="hd-task-header">
                <div className="hd-task-icon-wrap">
                  <task.icon size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <div className="flex-1">
                  <div className="hd-task-title-row">
                    <h4 className="hd-task-title">{task.title}</h4>
                    <span
                      className="hd-task-status"
                      style={{ color: task.statusColor, background: task.statusBg }}
                    >
                      <span className="hd-status-dot" style={{ background: task.statusColor }} />
                      {task.status}
                    </span>
                  </div>
                  <p className="hd-task-desc">{task.desc}</p>
                </div>
              </div>
              <div className="hd-task-footer">
                <span className="hd-task-meta">
                  <Clock size={13} />
                  {task.time}
                </span>
                <span className="hd-task-meta">
                  <MapPin size={13} />
                  Village: {task.village}
                </span>
                <ChevronRight size={16} className="hd-task-arrow ml-auto" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ΓöÇΓöÇ Offline / Sync Footer ΓöÇΓöÇ */}
      <div className="hd-offline-bar">
        <Cloud size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span className="hd-offline-text">
          Offline kit ready ΓÇó 18 records queued securely
        </span>
        <button className="hd-offline-detail">Details</button>
      </div>

    </div>
  )
}
