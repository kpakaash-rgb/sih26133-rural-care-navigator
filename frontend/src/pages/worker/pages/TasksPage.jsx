import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  ClipboardCheck, Search, Mic, Phone,
  CheckCircle2, AlertTriangle,
  FileText, ShieldCheck, MapPin, Check,
  AlertCircle, RefreshCw, Loader2
} from 'lucide-react'
import {
  getPatientFollowUps,
  getPatientReferrals,
  completeFollowUp,
  cancelFollowUp,
  cancelReferral
} from '../../../services/api'
import './TasksPage.css'

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('today')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [search, setSearch] = useState('')
  const [villageFilter, setVillageFilter] = useState('All Villages')
  const [toastMsg, setToastMsg] = useState(null)

  const showToast = useCallback((msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3500)
  }, [])

  /* ── Load Real Tasks From Backend ── */
  const loadTasksData = useCallback(async () => {
    try {
      const [followUpsRes, referralsRes] = await Promise.allSettled([
        getPatientFollowUps(),
        getPatientReferrals(),
      ])

      const rawFollowUps =
        followUpsRes.status === 'fulfilled' && Array.isArray(followUpsRes.value)
          ? followUpsRes.value
          : []

      const rawReferrals =
        referralsRes.status === 'fulfilled' && Array.isArray(referralsRes.value)
          ? referralsRes.value
          : []

      if (followUpsRes.status === 'rejected' && referralsRes.status === 'rejected') {
        const errMsg =
          followUpsRes.reason?.message || referralsRes.reason?.message || 'Failed to load frontline tasks'
        return { data: [], error: errMsg }
      }

      const today = new Date()
      const todayStr = today.toISOString().slice(0, 10)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().slice(0, 10)

      const avatarThemes = ['tk-av-blue', 'tk-av-green', 'tk-av-peach']

      // 1. Transform Follow-Ups
      const transformedFollowUps = rawFollowUps.map((fu, idx) => {
        const patientName = fu.patient?.full_name || `Patient #${fu.patient_id}`
        const initials =
          patientName
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'PT'

        const hamletParts = []
        if (fu.patient?.village) hamletParts.push(`Village: ${fu.patient.village}`)
        if (fu.patient?.gender) hamletParts.push(fu.patient.gender)
        if (fu.patient?.age) hamletParts.push(`${fu.patient.age}y`)
        const hamlet = hamletParts.length > 0 ? hamletParts.join(' • ') : `Patient ID: #${fu.patient_id}`

        let dueText = 'Due Today'
        let dueTheme = 'tk-due-today'
        let tab = 'today'

        if (fu.follow_up_date) {
          if (fu.follow_up_date < todayStr) {
            dueText = 'Overdue'
            dueTheme = 'tk-due-today'
            tab = 'today'
          } else if (fu.follow_up_date === todayStr) {
            dueText = 'Due Today'
            dueTheme = 'tk-due-today'
            tab = 'today'
          } else if (fu.follow_up_date === tomorrowStr) {
            dueText = 'Due Tomorrow'
            dueTheme = 'tk-due-tomorrow'
            tab = 'upcoming'
          } else {
            const diffDays = Math.ceil(
              (new Date(fu.follow_up_date) - new Date(todayStr)) / (1000 * 60 * 60 * 24)
            )
            dueText = diffDays > 0 ? `In ${diffDays} days` : 'Due Soon'
            dueTheme = 'tk-due-blue'
            tab = 'upcoming'
          }
        }

        const isDone = fu.status === 'COMPLETED'
        const isCancelled = fu.status === 'CANCELLED'
        const statusText = isDone ? 'Completed' : isCancelled ? 'Cancelled' : 'Pending'

        return {
          id: `fu-${fu.id}`,
          backendId: fu.id,
          entityType: 'follow_up',
          type: fu.referral_id ? 'Post-referral follow-up' : 'Follow-up consultation',
          typeIcon: fu.referral_id ? FileText : AlertCircle,
          iconTheme: isDone ? 'tk-ci-blue' : 'tk-ci-amber',
          patient: patientName,
          mobile: fu.patient?.mobile || '',
          initials,
          avatarTheme: avatarThemes[idx % avatarThemes.length],
          hamlet,
          village: fu.patient?.village || 'Unknown',
          reason: fu.notes || (fu.referral_id ? 'Verify referral recovery & discharge advice' : 'Post-consultation symptom follow-up'),
          reasonIcon: AlertTriangle,
          dueText,
          dueTheme,
          status: statusText,
          tab,
        }
      })

      // 2. Transform Referrals
      const transformedReferrals = rawReferrals.map((ref, idx) => {
        const isUrgent = ref.priority === 'EMERGENCY' || ref.priority === 'URGENT'
        const patientName = ref.patient?.full_name || `Patient #${ref.patient_id}`
        const initials =
          patientName
            .split(' ')
            .map((n) => n[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'PT'

        const hamletParts = []
        if (ref.patient?.village) hamletParts.push(`Village: ${ref.patient.village}`)
        if (ref.to_facility?.name) hamletParts.push(`To: ${ref.to_facility.name}`)
        const hamlet = hamletParts.length > 0 ? hamletParts.join(' • ') : 'Specialist care transfer'

        const isDone = ref.status === 'COMPLETED' || ref.status === 'ACCEPTED'
        const isCancelled = ref.status === 'CANCELLED'
        const statusText = isDone ? 'Completed' : isCancelled ? 'Cancelled' : 'Pending'

        return {
          id: `ref-${ref.id}`,
          backendId: ref.id,
          entityType: 'referral',
          type: isUrgent
            ? `${ref.priority.charAt(0) + ref.priority.slice(1).toLowerCase()} Referral`
            : 'Specialist Referral',
          typeIcon: FileText,
          iconTheme: isUrgent ? 'tk-ci-red' : 'tk-ci-blue',
          patient: patientName,
          mobile: ref.patient?.mobile || '',
          initials,
          avatarTheme: avatarThemes[(idx + 1) % avatarThemes.length],
          hamlet,
          village: ref.patient?.village || 'Unknown',
          reason: ref.reason || 'Specialist healthcare coordination',
          reasonIcon: AlertTriangle,
          dueText: isUrgent ? 'Action Required' : `Priority: ${ref.priority || 'Routine'}`,
          dueTheme: isUrgent ? 'tk-due-today' : 'tk-due-blue',
          status: statusText,
          tab: isUrgent ? 'today' : 'upcoming',
        }
      })

      return { data: [...transformedFollowUps, ...transformedReferrals], error: null }
    } catch (err) {
      return { data: [], error: err?.message || 'Failed to load frontline tasks' }
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await loadTasksData()
    setTasks(res.data)
    setError(res.error)
    setLoading(false)
  }, [loadTasksData])

  useEffect(() => {
    let isMounted = true
    loadTasksData().then((res) => {
      if (isMounted) {
        setTasks(res.data)
        setError(res.error)
        setLoading(false)
      }
    })
    return () => {
      isMounted = false
    }
  }, [loadTasksData])

  /* ── Stats & Dynamic Progress ── */
  const todayCount = tasks.filter((t) => t.tab === 'today' && t.status !== 'Completed').length
  const upcomingCount = tasks.filter((t) => t.tab === 'upcoming' && t.status !== 'Completed').length
  const completedCount = tasks.filter((t) => t.status === 'Completed').length

  const todayTasks = tasks.filter((t) => t.tab === 'today')
  const todayDoneCount = todayTasks.filter((t) => t.status === 'Completed').length
  const todayTotalCount = todayTasks.length
  const progressPercent =
    todayTotalCount > 0 ? Math.round((todayDoneCount / todayTotalCount) * 100) : (tasks.length === 0 ? 100 : 0)

  /* ── Dynamic Village Filters ── */
  const villageFilters = useMemo(() => {
    const villages = Array.from(
      new Set(tasks.map((t) => t.village).filter((v) => v && v !== 'Unknown'))
    ).sort()
    return ['All Villages', ...villages]
  }, [tasks])

  /* ── Filtered tasks for current view ── */
  const visibleTasks = tasks.filter((t) => {
    if (activeTab === 'completed') {
      return t.status === 'Completed'
    }
    if (activeTab === 'today') {
      if (t.tab !== 'today' || t.status === 'Completed') return false
    }
    if (activeTab === 'upcoming') {
      if (t.tab !== 'upcoming' || t.status === 'Completed') return false
    }

    const matchesSearch =
      t.patient.toLowerCase().includes(search.toLowerCase()) ||
      t.village.toLowerCase().includes(search.toLowerCase()) ||
      t.reason.toLowerCase().includes(search.toLowerCase())

    const matchesVillage =
      villageFilter === 'All Villages' || t.village === villageFilter

    return matchesSearch && matchesVillage
  })

  // List of completed tasks to show in Completed tab or bottom of Today tab
  const completedTasks = tasks.filter((t) => t.status === 'Completed')

  /* ── Actions ── */
  async function handleToggleComplete(task) {
    if (actionLoadingId) return
    setActionLoadingId(task.id)

    try {
      if (task.entityType === 'follow_up') {
        if (task.status !== 'Completed') {
          await completeFollowUp(task.backendId)
          showToast(`Task marked completed for ${task.patient}`)
        } else {
          await cancelFollowUp(task.backendId)
          showToast(`Follow-up status updated for ${task.patient}`)
        }
      } else if (task.entityType === 'referral') {
        await cancelReferral(task.backendId)
        showToast(`Referral status updated for ${task.patient}`)
      }
      await fetchTasks()
    } catch (err) {
      showToast(`Action failed: ${err.message || 'Unable to update status'}`)
    } finally {
      setActionLoadingId(null)
    }
  }

  function handleContactPatient(task) {
    if (task.mobile) {
      window.open(`tel:${task.mobile}`, '_self')
      showToast(`Calling ${task.patient} (${task.mobile})`)
    } else {
      showToast(`Contacting ${task.patient} (No phone number on record)`)
    }
  }

  return (
    <div className="tk-root animate-fade-in">

      {/* ── Page Header ── */}
      <div className="tk-header">
        <div>
          <h1 className="tk-title">Follow-up Tasks</h1>
          <p className="tk-subtitle">Prioritized frontline field visits &amp; check-ins</p>
        </div>
        <span className="tk-queue-badge">
          <span className="tk-queue-dot" />
          Field Queue Active
        </span>
      </div>

      {/* ── Progress Card (Morning Routine) ── */}
      <div className="tk-progress-card">
        <div className="tk-progress-left">
          <div className="tk-progress-icon-wrap">
            <ClipboardCheck size={24} />
          </div>
          <div>
            <p className="tk-progress-title">
              Morning Routine: {todayDoneCount} of {todayTotalCount} visits done
            </p>
            <p className="tk-progress-sub">
              {todayTotalCount === 0
                ? 'All visits up to date'
                : todayDoneCount === todayTotalCount
                ? 'All scheduled visits completed'
                : 'On track for midday sync'}
            </p>
          </div>
        </div>
        <span className="tk-progress-percent">{progressPercent}%</span>
      </div>

      {/* ── Three Tabs ── */}
      <div className="tk-tabs-row" role="tablist">
        <button
          type="button"
          role="tab"
          id="tab-today"
          className={`tk-tab-btn ${activeTab === 'today' ? 'tk-tab-active' : ''}`}
          onClick={() => setActiveTab('today')}
        >
          Today
          <span className="tk-tab-count">{todayCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-upcoming"
          className={`tk-tab-btn ${activeTab === 'upcoming' ? 'tk-tab-active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
          <span className="tk-tab-count">{upcomingCount}</span>
        </button>

        <button
          type="button"
          role="tab"
          id="tab-completed"
          className={`tk-tab-btn ${activeTab === 'completed' ? 'tk-tab-active' : ''}`}
          onClick={() => setActiveTab('completed')}
        >
          Completed
          <span className="tk-tab-count">{completedCount}</span>
        </button>
      </div>

      {/* ── Search Bar ── */}
      <div className="tk-search-wrap">
        <Search size={18} className="tk-search-icon" />
        <input
          id="tasks-search-input"
          className="tk-search-input"
          placeholder="Search by patient, hamlet, or task…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoComplete="off"
        />
        <button
          type="button"
          className="tk-mic-btn"
          aria-label="Voice search"
          onClick={() => showToast('Voice search activated')}
        >
          <Mic size={18} />
        </button>
      </div>

      {/* ── Filter Chips ── */}
      {villageFilters.length > 1 && (
        <div className="tk-chips-row">
          {villageFilters.map((v) => (
            <button
              key={v}
              type="button"
              className={`tk-chip ${villageFilter === v ? 'tk-chip-active' : ''}`}
              onClick={() => setVillageFilter(v)}
            >
              {v !== 'All Villages' && <MapPin size={12} />}
              {v}
            </button>
          ))}
        </div>
      )}

      {/* ── Loading State ── */}
      {loading && (
        <div className="tk-loading">
          <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          <p>Loading field tasks from queue…</p>
        </div>
      )}

      {/* ── Error State ── */}
      {!loading && error && (
        <div className="tk-error">
          <AlertCircle size={32} style={{ color: '#DC2626' }} />
          <p className="tk-error-title">Unable to load tasks</p>
          <p className="tk-error-msg">{error}</p>
          <button type="button" className="tk-retry-btn" onClick={fetchTasks}>
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )}

      {/* ── Tasks List ── */}
      {!loading && !error && (
        <div className="tk-cards-list">
          {visibleTasks.length === 0 && activeTab !== 'completed' ? (
            <div className="tk-empty">
              <CheckCircle2 size={32} style={{ color: 'var(--color-success)' }} />
              <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                All caught up!
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                No pending tasks for this filter selection.
              </p>
            </div>
          ) : (
            visibleTasks.map((t) => {
              const TypeIcon = t.typeIcon
              const ReasonIcon = t.reasonIcon
              const isDone = t.status === 'Completed'
              const isBusy = actionLoadingId === t.id

              return (
                <div key={t.id} className="tk-card">
                  {/* Header inside card */}
                  <div className="tk-card-header">
                    <div className="tk-card-header-left">
                      <div className={`tk-card-icon-wrap ${t.iconTheme}`}>
                        <TypeIcon size={15} />
                      </div>
                      <span className="tk-card-type-title">{t.type}</span>
                    </div>
                    <span className={`tk-due-badge ${t.dueTheme}`}>{t.dueText}</span>
                  </div>

                  {/* Inner Patient Box */}
                  <div className="tk-patient-box">
                    <div className="tk-pb-top">
                      <div className={`tk-pb-avatar ${t.avatarTheme}`}>{t.initials}</div>
                      <div className="tk-pb-info">
                        <div className="tk-pb-name-row">
                          <span className="tk-pb-name">{t.patient}</span>
                          <span className={isDone ? 'tk-status-done' : 'tk-status-pending'}>
                            {t.status}
                          </span>
                        </div>
                        <p className="tk-pb-hamlet">
                          <MapPin size={11} />
                          {t.hamlet}
                        </p>
                      </div>
                    </div>

                    {/* Reason */}
                    <div className="tk-pb-reason">
                      <ReasonIcon size={14} className="tk-pb-reason-icon" />
                      <span>Reason: {t.reason}</span>
                    </div>
                  </div>

                  {/* Two Large Action Buttons */}
                  <div className="tk-actions-row">
                    <button
                      type="button"
                      className="tk-btn-contact"
                      onClick={() => handleContactPatient(t)}
                    >
                      <Phone size={15} />
                      Contact Patient
                    </button>

                    <button
                      type="button"
                      disabled={isBusy}
                      className={`tk-btn-complete ${isDone ? 'is-completed' : ''}`}
                      onClick={() => handleToggleComplete(t)}
                    >
                      {isBusy ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : isDone ? (
                        <Check size={16} />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      {isDone ? 'Completed' : 'Mark Complete'}
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* If on Completed tab and no items */}
          {activeTab === 'completed' && completedTasks.length === 0 && (
            <div className="tk-empty">
              <CheckCircle2 size={32} style={{ color: 'var(--color-primary)' }} />
              <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
                No completed tasks yet
              </p>
              <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                Completed follow-up visits will be recorded here.
              </p>
            </div>
          )}

          {/* If on Completed tab, render completed items list */}
          {activeTab === 'completed' &&
            completedTasks.map((c) => (
              <div key={c.id} className="tk-completed-card">
                <div className="tk-completed-icon-circle">
                  <CheckCircle2 size={18} />
                </div>
                <div className="tk-completed-body">
                  <div className="tk-completed-top-row">
                    <span className="tk-completed-task-title">{c.type}</span>
                    <span className="tk-badge-completed">Completed</span>
                  </div>
                  <p className="tk-completed-patient">Patient: {c.patient}</p>
                  <p className="tk-completed-sub">{c.hamlet}</p>
                </div>
                <ShieldCheck size={16} className="tk-completed-seal" />
              </div>
            ))}
        </div>
      )}

      {/* ── Completed Section (Shown at bottom of Today tab when completed tasks exist) ── */}
      {!loading && !error && activeTab === 'today' && completedTasks.length > 0 && (
        <div className="tk-completed-section">
          <div className="tk-completed-header">
            <span className="tk-completed-title">
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              Completed Tasks
            </span>
            <span className="tk-completed-count">
              {completedTasks.length} {completedTasks.length === 1 ? 'Task' : 'Tasks'}
            </span>
          </div>

          {completedTasks.map((c) => (
            <div key={c.id} className="tk-completed-card">
              <div className="tk-completed-icon-circle">
                <CheckCircle2 size={18} />
              </div>
              <div className="tk-completed-body">
                <div className="tk-completed-top-row">
                  <span className="tk-completed-task-title">{c.type}</span>
                  <span className="tk-badge-completed">Completed</span>
                </div>
                <p className="tk-completed-patient">Patient: {c.patient}</p>
                <p className="tk-completed-sub">{c.hamlet}</p>
              </div>
              <ShieldCheck size={16} className="tk-completed-seal" />
            </div>
          ))}
        </div>
      )}

      {/* ── Toast Notification ── */}
      {toastMsg && (
        <div className="tk-toast">
          <Phone size={14} style={{ color: '#60A5FA' }} />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  )
}

