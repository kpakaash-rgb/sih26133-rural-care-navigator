import React, { useState } from 'react'
import {
  ClipboardCheck, Search, Mic, Phone,
  CheckCircle2, AlertTriangle, Activity,
  FileText, ShieldCheck, MapPin, Check,
  Clock, AlertCircle, X
} from 'lucide-react'
import './TasksPage.css'

/* ── Initial Mock Data ───────────────────────────────────── */
const INITIAL_TASKS = [
  {
    id: 1,
    type: 'Follow-up required',
    typeIcon: AlertCircle,
    iconTheme: 'tk-ci-amber',
    patient: 'Demo Patient',
    initials: 'DP',
    avatarTheme: 'tk-av-blue',
    hamlet: 'Hamlet: Kovilur • Female, 34y',
    village: 'Kovilur',
    reason: 'Review recent blood pressure screening',
    reasonIcon: AlertTriangle,
    dueText: 'Due Tomorrow',
    dueTheme: 'tk-due-tomorrow',
    status: 'Pending',
    tab: 'today',
  },
  {
    id: 2,
    type: 'Post-referral follow-up',
    typeIcon: FileText,
    iconTheme: 'tk-ci-red',
    patient: 'Priya S.',
    initials: 'PS',
    avatarTheme: 'tk-av-green',
    hamlet: 'Example Village • Ward 3',
    village: 'Example Village',
    reason: 'Confirm District Hospital discharge advice & medicines',
    reasonIcon: FileText,
    dueText: 'Due Today',
    dueTheme: 'tk-due-today',
    status: 'Pending',
    tab: 'today',
  },
  {
    id: 3,
    type: 'Screening reminder',
    typeIcon: Activity,
    iconTheme: 'tk-ci-blue',
    patient: 'Ravi K.',
    initials: 'RK',
    avatarTheme: 'tk-av-peach',
    hamlet: 'Hamlet: Kovilur • Male, 58y',
    village: 'Kovilur',
    reason: 'Quarterly Diabetic HbA1c & foot exam check',
    reasonIcon: Activity,
    dueText: 'Due Today',
    dueTheme: 'tk-due-blue',
    status: 'Pending',
    tab: 'today',
  },
  {
    id: 4,
    type: 'Routine maternal health visit',
    typeIcon: Activity,
    iconTheme: 'tk-ci-amber',
    patient: 'Meena K.',
    initials: 'MK',
    avatarTheme: 'tk-av-green',
    hamlet: 'Hamlet: Kovilur • Female, 26y',
    village: 'Kovilur',
    reason: 'Third trimester antenatal vitals & nutrition checklist',
    reasonIcon: Activity,
    dueText: 'In 2 days',
    dueTheme: 'tk-due-tomorrow',
    status: 'Pending',
    tab: 'upcoming',
  },
  {
    id: 5,
    type: 'Screening reminder',
    typeIcon: Activity,
    iconTheme: 'tk-ci-blue',
    patient: 'Ramesh P.',
    initials: 'RP',
    avatarTheme: 'tk-av-blue',
    hamlet: 'Old Colony • Male, 52y',
    village: 'Old Colony',
    reason: 'Monthly TB medication adherence & sputum follow-up',
    reasonIcon: AlertTriangle,
    dueText: 'In 3 days',
    dueTheme: 'tk-due-blue',
    status: 'Pending',
    tab: 'upcoming',
  },
]

const COMPLETED_LIST = [
  {
    id: 101,
    title: 'Antenatal check follow-up',
    patient: 'Sunita M.',
    sub: 'Village: Kovilur • Recorded at 09:15 AM',
    time: '09:15 AM',
  },
]

const VILLAGE_FILTERS = ['All Villages', 'Kovilur', 'Example Village', 'Old Colony']

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState('today')
  const [tasks, setTasks]         = useState(INITIAL_TASKS)
  const [search, setSearch]       = useState('')
  const [villageFilter, setVillageFilter] = useState('All Villages')
  const [toastMsg, setToastMsg]   = useState(null)

  /* ── Stats ── */
  const todayCount     = tasks.filter((t) => t.tab === 'today' && t.status !== 'Completed').length
  const upcomingCount  = tasks.filter((t) => t.tab === 'upcoming' && t.status !== 'Completed').length
  const completedCount = tasks.filter((t) => t.status === 'Completed').length + COMPLETED_LIST.length

  /* ── Filtered items ── */
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

  /* ── Actions ── */
  function handleToggleComplete(id) {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const isDone = t.status === 'Completed'
          const updated = {
            ...t,
            status: isDone ? 'Pending' : 'Completed',
          }
          showToast(isDone ? `Task marked pending for ${t.patient}` : `Task marked completed for ${t.patient}`)
          return updated
        }
        return t
      })
    )
  }

  function handleContactPatient(patientName) {
    showToast(`Prototype Action: Initiating contact with ${patientName} (Simulated)`)
  }

  function showToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 3000)
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
            <p className="tk-progress-title">Morning Routine: 2 of 4 visits done</p>
            <p className="tk-progress-sub">On track for midday sync</p>
          </div>
        </div>
        <span className="tk-progress-percent">50%</span>
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
          onClick={() => showToast('Voice search activated (Simulated)')}
        >
          <Mic size={18} />
        </button>
      </div>

      {/* ── Filter Chips ── */}
      <div className="tk-chips-row">
        {VILLAGE_FILTERS.map((v) => (
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

      {/* ── Tasks List ── */}
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
                    onClick={() => handleContactPatient(t.patient)}
                  >
                    <Phone size={15} />
                    Contact Patient
                  </button>

                  <button
                    type="button"
                    className={`tk-btn-complete ${isDone ? 'is-completed' : ''}`}
                    onClick={() => handleToggleComplete(t.id)}
                  >
                    {isDone ? <Check size={16} /> : <CheckCircle2 size={16} />}
                    {isDone ? 'Completed' : 'Mark Complete'}
                  </button>
                </div>
              </div>
            )
          })
        )}

        {/* If on Completed tab, also render previous completed items */}
        {activeTab === 'completed' && COMPLETED_LIST.map((c) => (
          <div key={c.id} className="tk-completed-card">
            <div className="tk-completed-icon-circle">
              <CheckCircle2 size={18} />
            </div>
            <div className="tk-completed-body">
              <div className="tk-completed-top-row">
                <span className="tk-completed-task-title">{c.title}</span>
                <span className="tk-badge-completed">Completed</span>
              </div>
              <p className="tk-completed-patient">Patient: {c.patient}</p>
              <p className="tk-completed-sub">{c.sub}</p>
            </div>
            <ShieldCheck size={16} className="tk-completed-seal" />
          </div>
        ))}
      </div>

      {/* ── Completed Today Section (Shown at bottom of Today tab) ── */}
      {activeTab === 'today' && (
        <div className="tk-completed-section">
          <div className="tk-completed-header">
            <span className="tk-completed-title">
              <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
              Completed Today
            </span>
            <span className="tk-completed-count">{COMPLETED_LIST.length} Task</span>
          </div>

          {COMPLETED_LIST.map((c) => (
            <div key={c.id} className="tk-completed-card">
              <div className="tk-completed-icon-circle">
                <CheckCircle2 size={18} />
              </div>
              <div className="tk-completed-body">
                <div className="tk-completed-top-row">
                  <span className="tk-completed-task-title">{c.title}</span>
                  <span className="tk-badge-completed">Completed</span>
                </div>
                <p className="tk-completed-patient">Patient: {c.patient}</p>
                <p className="tk-completed-sub">{c.sub}</p>
              </div>
              <ShieldCheck size={16} className="tk-completed-seal" />
            </div>
          ))}
        </div>
      )}

      {/* ── Prototype Toast ── */}
      {toastMsg && (
        <div className="tk-toast">
          <Phone size={14} style={{ color: '#60A5FA' }} />
          <span>{toastMsg}</span>
        </div>
      )}

    </div>
  )
}
