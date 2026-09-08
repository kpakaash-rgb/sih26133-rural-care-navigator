import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CalendarCheck, GitMerge, HeartPulse,
  AlertOctagon, ChevronRight, UserPlus,
  Clock, MapPin, Navigation,
  Cloud, ArrowUpRight
} from 'lucide-react'
import './HomePage.css'

/* ΓöÇΓöÇ Demo Data ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
const worker = {
  name: 'Meena',
  fullName: 'Meena Devi',
  sector: 'Field Sector A-4',
  zone: 'Zone 3',
  initials: 'MD',
}

const caseloadStats = [
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

/* ΓöÇΓöÇ Component ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ */
export default function HomePage() {
  const navigate = useNavigate()

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="hd-root animate-fade-in">

      {/* ΓöÇΓöÇ Greeting Row ΓöÇΓöÇ */}
      <div className="hd-greeting-area">
        <div className="hd-badges-row">
          <span className="hd-sector-badge">{worker.sector}</span>
          <span className="hd-live-badge">
            <span className="hd-live-dot" />
            Live Sync
          </span>
        </div>
        <div className="hd-greeting-row">
          <div>
            <h1 className="hd-greeting">{greeting}, {worker.name}</h1>
            <p className="hd-greeting-sub">Here are your community health tasks today.</p>
          </div>
          <div className="avatar avatar-lg hd-worker-avatar">{worker.initials}</div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Emergency Alert ΓöÇΓöÇ */}
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
          <span className="hd-zone-label">{worker.zone} • Today</span>
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
