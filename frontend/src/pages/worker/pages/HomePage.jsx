import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, CalendarCheck, GitMerge, HeartPulse,
  AlertOctagon, ChevronRight, UserPlus,
  Clock, MapPin, Navigation,
  Cloud, ArrowUpRight, CheckCircle2, RefreshCw,
  AlertCircle, Loader2
} from 'lucide-react'
import {
  getFacilityQueue,
  updateFacilityQueue,
  getWorkerSession,
  getWorkerMe,
  getWorkerDashboardStats
} from '../../../services/api'
import { formatQueueLastUpdated } from '../../../utils'
import './HomePage.css'

/* ── Fallback / Initial State ── */
const defaultWorker = {
  name: 'Worker',
  fullName: 'Frontline Worker',
  sector: 'Field Health Network',
  zone: 'Active Sector',
  initials: 'FW',
}

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
  const [waitingPatients, setWaitingPatients] = useState(0)
  const [estimatedWait, setEstimatedWait] = useState(0)
  const [queueStatus, setQueueStatus] = useState('NORMAL')
  const [isUpdatingQueue, setIsUpdatingQueue] = useState(false)
  const [queueSuccessMsg, setQueueSuccessMsg] = useState('')
  const [queueErrorMsg, setQueueErrorMsg] = useState('')

  /* ── Live Operational Dashboard Stats ── */
  const [dashboardStats, setDashboardStats] = useState(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await getWorkerDashboardStats()
      return { data, error: null }
    } catch (err) {
      return { data: null, error: err?.message || 'Failed to load live facility statistics.' }
    }
  }, [])

  const handleManualRefresh = useCallback(() => {
    setStatsLoading(true)
    setStatsError(null)
    fetchStats().then((res) => {
      if (res.data) setDashboardStats(res.data)
      if (res.error) setStatsError(res.error)
      setStatsLoading(false)
    })
  }, [fetchStats])

  useEffect(() => {
    let isMounted = true

    // Fetch authenticated worker details if token exists
    getWorkerMe()
      .then((res) => {
        if (isMounted && res) {
          setWorkerData(res)
        }
      })
      .catch(() => {})

    fetchStats().then((res) => {
      if (isMounted) {
        if (res.data) setDashboardStats(res.data)
        if (res.error) setStatsError(res.error)
        setStatsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [fetchStats])

  // Re-fetch stats on window focus to ensure freshly completed tasks are synced
  useEffect(() => {
    function handleFocus() {
      fetchStats().then((res) => {
        if (res.data) setDashboardStats(res.data)
        if (res.error) setStatsError(res.error)
      })
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchStats])

  // Load facility queue details
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
  const facilityTitle = workerData?.facility_name ? `${workerData.facility_name} Queue` : 'Facility Queue Management'

  /* ── Derived Live Statistics ── */
  const caseloadStats = [
    {
      id: 1,
      icon: Users,
      value: statsLoading ? '...' : (dashboardStats?.total_patients ?? 0),
      label: 'Patients to Visit',
      color: '#2563EB',
      path: '/worker/patients',
    },
    {
      id: 2,
      icon: CalendarCheck,
      value: statsLoading ? '...' : (dashboardStats?.follow_ups_due ?? 0),
      label: 'Follow-ups Due',
      color: '#7C3AED',
      path: '/worker/tasks',
    },
    {
      id: 3,
      icon: GitMerge,
      value: statsLoading ? '...' : (dashboardStats?.pending_referrals ?? 0),
      label: 'Pending Referrals',
      color: '#DC2626',
      path: '/worker/tasks',
    },
    {
      id: 4,
      icon: HeartPulse,
      value: statsLoading ? '...' : (dashboardStats?.today_screenings ?? 0),
      label: "Today's Screenings",
      color: '#16A34A',
      path: '/worker/patients',
    },
  ]

  const completedVisits = dashboardStats?.completed_today ?? 0
  const pendingVisits = dashboardStats?.pending_tasks ?? 0
  const totalVisits = completedVisits + pendingVisits
  const routePercent = totalVisits > 0 ? Math.min(100, Math.round((completedVisits / totalVisits) * 100)) : 100
  const kmRemaining = pendingVisits > 0 ? (pendingVisits * 0.8).toFixed(1) : '0.0'

  const urgentAlert = dashboardStats?.urgent_alert
  const recentTasks = dashboardStats?.recent_tasks || []

  return (
    <div className="hd-root animate-fade-in">

      {/* ── Greeting Row ── */}
      <div className="hd-greeting-area">
        <div className="hd-badges-row">
          <span className="hd-sector-badge">{sectorName}</span>
          <button
            type="button"
            onClick={handleManualRefresh}
            title="Click to refresh live facility data"
            className="hd-live-badge"
            style={{ cursor: 'pointer', border: 'none', background: 'inherit' }}
          >
            <span className="hd-live-dot" />
            {statsLoading ? 'Syncing...' : 'Live Sync'}
          </button>
        </div>
        <div className="hd-greeting-row">
          <div>
            <h1 className="hd-greeting">{greeting}, {displayName}</h1>
            <p className="hd-greeting-sub">Here are your community health tasks today.</p>
          </div>
          <div className="avatar avatar-lg hd-worker-avatar">{initials}</div>
        </div>
      </div>

      {/* ── Error Banner & Retry ── */}
      {statsError && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#991b1b',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{statsError}</span>
          </div>
          <button
            type="button"
            onClick={handleManualRefresh}
            style={{
              padding: '6px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #f87171',
              borderRadius: '6px',
              color: '#991b1b',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      )}

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
              {facilityTitle}
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

      {/* ── Emergency / Priority Alert ── */}
      {urgentAlert?.has_urgent ? (
        <div className="hd-alert-card">
          <div className="hd-alert-top-row">
            <span className="hd-triage-label">{urgentAlert.triage_level || 'TRIAGE LEVEL 1'}</span>
            <span className="hd-high-risk-badge">{urgentAlert.priority || 'High Risk'}</span>
          </div>
          <div className="hd-alert-body">
            <div className="hd-alert-icon-wrap">
              <AlertOctagon size={26} />
            </div>
            <div className="hd-alert-text">
              <h3 className="hd-alert-title">Urgent Attention Required</h3>
              <p className="hd-alert-desc">
                {urgentAlert.patient_name
                  ? `${urgentAlert.patient_name}${urgentAlert.village ? ` (${urgentAlert.village})` : ''}: ${urgentAlert.reason}`
                  : urgentAlert.reason}
              </p>
            </div>
          </div>
          <div className="hd-alert-footer">
            <span className="hd-alert-time">
              <Clock size={13} />
              Active Priority Case
            </span>
            <button
              type="button"
              className="hd-review-btn"
              id="btn-review-patient"
              onClick={() => {
                if (urgentAlert.source_type === 'REFERRAL') {
                  navigate('/worker/tasks')
                } else if (urgentAlert.patient_id) {
                  navigate(`/worker/patient-summary?id=${urgentAlert.patient_id}`)
                } else {
                  navigate('/worker/tasks')
                }
              }}
            >
              Review Patient <ChevronRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div
          className="hd-alert-card"
          style={{
            borderColor: '#bbf7d0',
            borderLeftColor: '#16a34a',
            boxShadow: '0 2px 10px rgba(22, 163, 74, 0.08)',
          }}
        >
          <div className="hd-alert-top-row">
            <span className="hd-triage-label" style={{ color: '#16a34a' }}>
              COMMUNITY HEALTH STATUS
            </span>
            <span
              className="hd-high-risk-badge"
              style={{
                color: '#166534',
                backgroundColor: '#dcfce7',
                borderColor: '#86efac',
              }}
            >
              Caseload Stable
            </span>
          </div>
          <div className="hd-alert-body">
            <div
              className="hd-alert-icon-wrap"
              style={{ backgroundColor: '#dcfce7', color: '#16a34a' }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div className="hd-alert-text">
              <h3 className="hd-alert-title">No Urgent Emergencies Pending</h3>
              <p className="hd-alert-desc">
                {urgentAlert?.reason || 'All registered patients in your community sector are currently stable.'}
              </p>
            </div>
          </div>
          <div className="hd-alert-footer">
            <span className="hd-alert-time" style={{ color: '#64748b' }}>
              <Clock size={13} />
              Live sector sync active
            </span>
            <button
              type="button"
              className="hd-review-btn"
              id="btn-review-patient"
              style={{ backgroundColor: '#f0fdf4', color: '#166534', borderColor: '#bbf7d0' }}
              onClick={() => navigate('/worker/patients')}
            >
              View Patients <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ── Register Patient ── */}
      <button
        type="button"
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
              onClick={() => navigate(s.path)}
            >
              <div className="hd-stat-top">
                <div className="hd-stat-icon" style={{ background: s.color + '1A', color: s.color }}>
                  <s.icon size={20} />
                </div>
                <span className="hd-stat-arrow">
                  <ArrowUpRight size={14} />
                </span>
              </div>
              <p className="hd-stat-value" style={{ color: s.color }}>
                {statsLoading ? (
                  <Loader2 size={18} className="animate-spin" style={{ display: 'inline-block' }} />
                ) : (
                  s.value
                )}
              </p>
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
            <span className="hd-route-title">Field Care Route Active</span>
          </div>
          <span className="hd-route-km">{kmRemaining} km remaining</span>
        </div>
        <div className="hd-route-bar-wrap">
          <div
            className="hd-route-bar"
            style={{ width: `${routePercent}%` }}
          />
        </div>
        <div className="hd-route-meta">
          <span>Completed: {completedVisits} tasks</span>
          <span>Remaining: {pendingVisits} tasks</span>
        </div>
      </div>

      {/* ── Today's Tasks ── */}
      <section>
        <div className="hd-section-row">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Today's Tasks</h2>
            <span className="hd-task-count">{recentTasks.length}</span>
          </div>
          <button
            type="button"
            className="hd-view-tasks-link"
            onClick={() => navigate('/worker/tasks')}
          >
            View All Tasks <ChevronRight size={15} />
          </button>
        </div>

        <div className="hd-tasks-list">
          {statsLoading && recentTasks.length === 0 ? (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: '#64748b' }}>
              <Loader2 size={20} className="animate-spin" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '13px' }}>Loading frontline tasks...</p>
            </div>
          ) : recentTasks.length > 0 ? (
            recentTasks.map((task) => {
              const TaskIcon = task.task_type === 'FOLLOW_UP' ? Users : GitMerge
              return (
                <div
                  key={`${task.task_type}-${task.id}`}
                  className="hd-task-card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate('/worker/tasks')}
                >
                  <div className="hd-task-header">
                    <div className="hd-task-icon-wrap">
                      <TaskIcon size={20} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <div className="flex-1">
                      <div className="hd-task-title-row">
                        <h4 className="hd-task-title">{task.title}: {task.patient_name}</h4>
                        <span
                          className="hd-task-status"
                          style={{ color: task.status_color, background: task.status_bg }}
                        >
                          <span className="hd-status-dot" style={{ background: task.status_color }} />
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
              )
            })
          ) : (
            <div
              style={{
                padding: '24px 16px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px dashed #cbd5e1',
              }}
            >
              <CheckCircle2 size={32} style={{ color: '#16a34a', margin: '0 auto 8px' }} />
              <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                All Tasks Completed!
              </h4>
              <p style={{ margin: '0 0 12px', fontSize: '13px', color: '#64748b' }}>
                No pending follow-ups or referrals in your facility queue today.
              </p>
              <button
                type="button"
                onClick={() => navigate('/worker/tasks')}
                style={{
                  padding: '6px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#2563eb',
                  cursor: 'pointer',
                }}
              >
                View Full Task Queue
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── Offline / Sync Footer ── */}
      <div className="hd-offline-bar">
        <Cloud size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
        <span className="hd-offline-text">
          Offline kit ready • Facility #{queueFacilityId} synced
        </span>
        <button
          type="button"
          className="hd-offline-detail"
          onClick={handleManualRefresh}
        >
          Sync Now
        </button>
      </div>

    </div>
  )
}
