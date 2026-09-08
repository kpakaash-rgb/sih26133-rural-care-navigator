import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Phone, ShieldCheck,
  ChevronRight, LogOut, Globe, Bell,
  Headphones, HardDrive, Copy,
  Check, PlusSquare, Cloud
} from 'lucide-react'
import './ProfilePage.css'

const WORKER = {
  name: 'Meena Devi',
  initials: 'MD',
  id: 'FHW-20841',
  role: 'ASHA ΓÇó Senior Care Facilitator',
  phc: 'Kovilur Primary Health Centre (PHC)',
  cluster: 'Kovilur Health Zone ΓÇó Tiruvannamalai',
  phone: '+91 90000 12345',
}

const STATS = [
  { value: '42', label: 'Active Cohort', colorClass: 'pf-sv-blue' },
  { value: '68', label: 'Visits Made', colorClass: 'pf-sv-teal' },
  { value: '100%', label: 'Sync Rate', colorClass: 'pf-sv-green', icon: Cloud },
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [cacheCleared, setCacheCleared] = useState(false)

  function handleCopyId() {
    navigator.clipboard?.writeText(WORKER.id)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClearCache() {
    setCacheCleared(true)
    setTimeout(() => setCacheCleared(false), 2500)
  }

  function handleSignOut() {
    navigate('/login')
  }

  return (
    <div className="pf-root animate-fade-in">

      {/* ΓöÇΓöÇ Page Header ΓöÇΓöÇ */}
      <div className="pf-header">
        <div>
          <p className="pf-eyebrow">FRONTLINE HEALTH WORKER</p>
          <h1 className="pf-title">Worker Profile</h1>
        </div>
        <span className="pf-sync-badge">
          <span className="pf-sync-dot" />
          Field Sync OK
        </span>
      </div>

      {/* ΓöÇΓöÇ Profile Card ΓöÇΓöÇ */}
      <div className="pf-card">
        <div className="pf-card-top">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">{WORKER.initials}</div>
            <div className="pf-avatar-check" aria-label="Verified frontline worker">
              <Check size={13} strokeWidth={3} />
            </div>
          </div>

          <div className="pf-worker-info">
            <div className="pf-name-row">
              <h2 className="pf-worker-name">{WORKER.name}</h2>
              <span className="pf-id-badge">
                ≡ƒ¬¬ {WORKER.id}
                <button
                  type="button"
                  className="pf-copy-btn"
                  onClick={handleCopyId}
                  aria-label="Copy Worker ID"
                >
                  {copied ? <Check size={12} style={{ color: 'var(--color-success)' }} /> : <Copy size={12} />}
                </button>
              </span>
            </div>

            <p className="pf-role-title">{WORKER.role}</p>

            <div className="pf-phc-facility">
              <PlusSquare size={13} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
              <span>{WORKER.phc}</span>
            </div>
          </div>
        </div>

        {/* Inner Details Box */}
        <div className="pf-inner-details">
          <div className="pf-detail-row">
            <div className="pf-detail-left">
              <MapPin size={15} className="pf-detail-icon" />
              <div>
                <p className="pf-detail-label">Assigned Cluster</p>
                <p className="pf-detail-val">{WORKER.cluster}</p>
              </div>
            </div>
          </div>

          <div className="pf-detail-row" style={{ marginTop: 2 }}>
            <div className="pf-detail-left">
              <Phone size={15} className="pf-detail-icon" />
              <div>
                <p className="pf-detail-label">Registered SIM</p>
                <p className="pf-detail-val">{WORKER.phone}</p>
              </div>
            </div>
            <span className="pf-badge-official">Official</span>
          </div>
        </div>
      </div>

      {/* ΓöÇΓöÇ Monthly Field Reach ΓöÇΓöÇ */}
      <section>
        <div className="pf-section-header">
          <h3 className="pf-section-title">MONTHLY FIELD REACH</h3>
          <span className="pf-section-date">March 2025</span>
        </div>

        <div className="pf-stats-grid">
          {STATS.map((s) => {
            const Icon = s.icon
            return (
              <div key={s.label} className="pf-stat-card">
                <span className={`pf-stat-value ${s.colorClass}`}>
                  {Icon && <Icon size={16} />}
                  {s.value}
                </span>
                <span className="pf-stat-label">{s.label}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* ΓöÇΓöÇ Preferences & Settings ΓöÇΓöÇ */}
      <section>
        <div className="pf-section-header">
          <h3 className="pf-section-title">PREFERENCES &amp; SETTINGS</h3>
        </div>

        <div className="pf-settings-card">
          {/* Language */}
          <button type="button" className="pf-setting-row">
            <div className="pf-setting-left">
              <div className="pf-setting-icon-wrap">
                <Globe size={18} />
              </div>
              <div>
                <p className="pf-setting-title">App Language</p>
                <p className="pf-setting-sub">Tamil &amp; English enabled</p>
              </div>
            </div>
            <div className="pf-setting-right">
              <span className="pf-setting-text-val">English</span>
              <ChevronRight size={16} className="pf-chevron" />
            </div>
          </button>

          {/* Notifications / Triage Alerts */}
          <button type="button" className="pf-setting-row">
            <div className="pf-setting-left">
              <div className="pf-setting-icon-wrap">
                <Bell size={18} />
              </div>
              <div>
                <p className="pf-setting-title">Urgent Triage Alerts</p>
                <p className="pf-setting-sub">High-risk antenatal reminders</p>
              </div>
            </div>
            <div className="pf-setting-right">
              <span className="pf-badge-vibrate">Sound &amp; Vibrate</span>
              <ChevronRight size={16} className="pf-chevron" />
            </div>
          </button>

          {/* Security / PIN */}
          <button type="button" className="pf-setting-row">
            <div className="pf-setting-left">
              <div className="pf-setting-icon-wrap">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="pf-setting-title">Worker PIN &amp; Biometrics</p>
                <p className="pf-setting-sub">4-Digit Field Quick Unlock</p>
              </div>
            </div>
            <div className="pf-setting-right">
              <span className="pf-setting-text-val pf-setting-success">Configured</span>
              <ChevronRight size={16} className="pf-chevron" />
            </div>
          </button>

          {/* PHC Medical Officer Desk */}
          <button type="button" className="pf-setting-row">
            <div className="pf-setting-left">
              <div className="pf-setting-icon-wrap">
                <Headphones size={18} />
              </div>
              <div>
                <p className="pf-setting-title">PHC Medical Officer Desk</p>
                <p className="pf-setting-sub">Toll-free tele-triage dispatch</p>
              </div>
            </div>
            <div className="pf-setting-right">
              <span className="pf-setting-text-val">Call 104</span>
              <ChevronRight size={16} className="pf-chevron" />
            </div>
          </button>
        </div>
      </section>

      {/* ΓöÇΓöÇ Local Storage Allocation Card ΓöÇΓöÇ */}
      <div className="pf-storage-card">
        <div className="pf-storage-top">
          <span className="pf-storage-title">
            <HardDrive size={15} style={{ color: 'var(--color-primary)' }} />
            Local Storage Allocation
          </span>
          <span className="pf-storage-mb">18.4 MB of 500 MB</span>
        </div>

        <div className="pf-storage-bar-wrap">
          <div className="pf-storage-bar" />
        </div>

        <div className="pf-storage-bottom">
          <span className="pf-storage-encrypt">Offline records encrypted (AES-256)</span>
          <button
            type="button"
            className="pf-clear-cache-btn"
            onClick={handleClearCache}
          >
            {cacheCleared ? 'Cache Cleared Γ£ô' : 'Safe to clear cache'}
          </button>
        </div>
      </div>

      {/* ΓöÇΓöÇ Sign Out Action ΓöÇΓöÇ */}
      <button
        id="btn-sign-out"
        type="button"
        className="pf-signout-btn"
        onClick={handleSignOut}
      >
        <LogOut size={18} />
        Sign Out of Rural Care Device
      </button>

      {/* ΓöÇΓöÇ Footer Branding ΓöÇΓöÇ */}
      <footer className="pf-footer">
        <p className="pf-footer-brand">Rural Care Navigator ΓÇó v2.4 (NHM Certified)</p>
        <p className="pf-footer-sub">National Health Mission ΓÇó Frontline Build #849</p>
      </footer>

    </div>
  )
}
