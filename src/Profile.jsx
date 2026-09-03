import React, { useState } from 'react';
import {
  BriefcaseMedical, Bell, Edit3, Clock, Settings2,
  ShieldCheck, LogOut, ChevronRight, MapPin, BadgeCheck,
  LayoutDashboard, Users, CalendarDays, UserCircle
} from 'lucide-react';
import './index.css';

/* ─── Reusable Toggle ─────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 999, flexShrink: 0,
        background: checked ? 'var(--primary-blue)' : '#D1D5DB',
        position: 'relative', cursor: 'pointer', transition: 'background 0.25s',
      }}
    >
      <div style={{
        position: 'absolute',
        top: 2, left: checked ? 22 : 2,
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.25s',
      }} />
    </div>
  );
}

/* ─── Section Card wrapper ────────────────────────── */
function Card({ children, style = {} }) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: '1px solid #F1F5F9',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      overflow: 'hidden',
      ...style,
    }}>
      {children}
    </div>
  );
}

/* ─── Section Title row ───────────────────────────── */
function SectionTitle({ icon: Icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      padding: '1rem 1rem 0.75rem',
      borderBottom: '1px solid #F1F5F9',
    }}>
      <Icon size={17} style={{ color: 'var(--primary-blue)', flexShrink: 0 }} strokeWidth={2.5} />
      <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>{label}</span>
    </div>
  );
}

/* ─── Preference Row ──────────────────────────────── */
function PrefRow({ label, sub, checked, onChange }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '0.875rem 1rem',
    }}>
      <div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{label}</div>
        <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

/* ─── Security Row ────────────────────────────────── */
function SecRow({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '0.875rem 1rem',
        background: 'none', border: 'none', cursor: 'pointer',
        borderBottom: '1px solid #F9FAFB',
      }}
    >
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{label}</span>
      <ChevronRight size={16} style={{ color: '#9CA3AF' }} />
    </button>
  );
}

/* ─── Main Component ──────────────────────────────── */
export default function Profile({ navigate, onLogout }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const [prefs, setPrefs] = useState({
    criticalAlerts: true,
    appointmentReminders: true,
    referralUpdates: false,
  });

  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="app-container pb-24 min-h-screen" style={{ background: '#F0F4F8' }}>

      {/* ── Global Header ── */}
      <header className="global-header">
        <div className="header-brand">
          <BriefcaseMedical size={20} strokeWidth={2.5} />
          <span>Rural Care Navigator</span>
        </div>
        <div className="header-actions">
          <Bell size={22} className="header-bell" strokeWidth={2} />
          <span className="header-indicator" />
        </div>
      </header>

      {/* ── Scrollable body ── */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* ── 1. Profile Hero Card ── */}
        <Card>
          {/* Blue gradient banner */}
          <div style={{
            height: 72,
            background: 'linear-gradient(135deg, #0A58CA 0%, #3B82F6 100%)',
          }} />

          {/* Avatar + name block */}
          <div style={{ padding: '0 1.25rem 1.25rem', position: 'relative' }}>
            {/* Avatar */}
            <div style={{
              width: 80, height: 80, borderRadius: '50%',
              background: '#DBEAFE', color: 'var(--primary-blue)',
              fontWeight: 900, fontSize: '1.6rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(10,88,202,0.15)',
              position: 'absolute', top: -40, left: '50%', transform: 'translateX(-50%)',
            }}>
              PS
            </div>

            {/* Spacer for avatar */}
            <div style={{ height: 48 }} />

            {/* Name & specialization */}
            <div style={{ textAlign: 'center', marginBottom: '0.875rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827' }}>
                Dr. Priya Sharma
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: 3 }}>
                General Medicine
              </div>
            </div>

            {/* Chips */}
            <div style={{
              display: 'flex', gap: '0.5rem', justifyContent: 'center',
              flexWrap: 'wrap', marginBottom: '1.125rem',
            }}>
              {[
                { icon: BadgeCheck, label: 'DOC-2048' },
                { icon: MapPin, label: 'Rural Care Health Centre' },
              ].map(({ icon: Icon, label }) => (
                <span key={label} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  background: '#F1F5F9', color: '#475569',
                  fontSize: '0.72rem', fontWeight: 700,
                  padding: '5px 12px', borderRadius: 999,
                }}>
                  <Icon size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                  {label}
                </span>
              ))}
            </div>

            {/* Contact row */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '1.5rem',
              borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9',
              padding: '0.75rem 0', marginBottom: '1rem',
            }}>
              {[
                { label: 'Patients', value: '248' },
                { label: 'Referrals', value: '31' },
                { label: 'Exp.', value: '8 yr' },
              ].map(({ label, value }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0A58CA' }}>{value}</div>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 1 }}>{label}</div>
                </div>
              ))}
            </div>

            {/* Edit Profile button */}
            <button style={{
              width: '100%', padding: '0.75rem',
              background: 'var(--primary-blue)', color: '#fff',
              border: 'none', borderRadius: 12, cursor: 'pointer',
              fontWeight: 700, fontSize: '0.95rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 14px rgba(10,88,202,0.25)',
            }}>
              <Edit3 size={16} /> Edit Profile
            </button>
          </div>
        </Card>

        {/* ── 2. Availability ── */}
        <Card>
          <SectionTitle icon={Clock} label="Availability" />
          <div style={{ padding: '0 1rem' }}>
            {[
              { day: 'Mon – Fri', time: '08:00 – 18:00', off: false },
              { day: 'Saturday', time: '09:00 – 13:00', off: false },
              { day: 'Sunday', time: 'Off Call', off: true },
            ].map(({ day, time, off }) => (
              <div key={day} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.875rem 0',
                borderBottom: day !== 'Sunday' ? '1px solid #F9FAFB' : 'none',
              }}>
                <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 600 }}>{day}</span>
                <span style={{
                  fontSize: '0.8rem', fontWeight: 700,
                  color: off ? '#9CA3AF' : '#1D4ED8',
                  background: off ? 'transparent' : '#EFF6FF',
                  padding: off ? 0 : '4px 12px', borderRadius: 8,
                }}>
                  {time}
                </span>
              </div>
            ))}
          </div>
          <div style={{ padding: '0.75rem 1rem 1rem' }}>
            <button style={{
              width: '100%', padding: '0.65rem',
              border: '1.5px solid var(--primary-blue)',
              borderRadius: 10, color: 'var(--primary-blue)',
              background: 'transparent', fontWeight: 700, fontSize: '0.875rem',
              cursor: 'pointer',
            }}>
              Manage Schedule
            </button>
          </div>
        </Card>

        {/* ── 3. Notification Preferences ── */}
        <Card>
          <SectionTitle icon={Settings2} label="Preferences" />
          <div>
            <PrefRow
              label="Critical Alerts"
              sub="SMS & Push for emergencies"
              checked={prefs.criticalAlerts}
              onChange={() => toggle('criticalAlerts')}
            />
            <div style={{ height: 1, background: '#F9FAFB', margin: '0 1rem' }} />
            <PrefRow
              label="Appointment Reminders"
              sub="Push notifications"
              checked={prefs.appointmentReminders}
              onChange={() => toggle('appointmentReminders')}
            />
            <div style={{ height: 1, background: '#F9FAFB', margin: '0 1rem' }} />
            <PrefRow
              label="Referral Updates"
              sub="In-app notifications"
              checked={prefs.referralUpdates}
              onChange={() => toggle('referralUpdates')}
            />
          </div>

          {/* Language */}
          <div style={{
            padding: '0.875rem 1rem',
            borderTop: '1px solid #F1F5F9',
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Language
            </div>
            <div style={{ position: 'relative' }}>
              <select style={{
                width: '100%', padding: '0.65rem 2.5rem 0.65rem 0.875rem',
                border: '1.5px solid #E5E7EB', borderRadius: 10,
                fontSize: '0.875rem', fontWeight: 600, color: '#111827',
                background: '#F9FAFB', appearance: 'none', cursor: 'pointer',
              }}>
                <option>English</option>
                <option>Hindi</option>
                <option>Tamil</option>
                <option>Telugu</option>
              </select>
              <ChevronRight
                size={16}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: '#9CA3AF', pointerEvents: 'none' }}
              />
            </div>
          </div>
        </Card>

        {/* ── 4. Security ── */}
        <Card>
          <SectionTitle icon={ShieldCheck} label="Security" />
          <SecRow label="Authentication Settings" />
          <SecRow label="Change Password" />
          <div style={{ height: 4 }} />
        </Card>

        {/* ── 5. Sign Out ── */}
        <button
          onClick={() => setShowSignOut(true)}
          style={{
            width: '100%', padding: '0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: '#FEF2F2', color: '#DC2626',
            border: '1.5px solid #FECACA', borderRadius: 14,
            fontWeight: 700, fontSize: '0.925rem', cursor: 'pointer',
          }}
        >
          <LogOut size={18} /> Sign Out
        </button>

        {/* bottom spacer so sign-out is above nav */}
        <div style={{ height: '0.5rem' }} />
      </div>

      {/* ── Sign Out Modal ── */}
      {showSignOut && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 340, boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#FEE2E2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <LogOut size={22} />
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Sign Out?</h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to sign out of Rural Care Navigator?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <button
                  onClick={() => setShowSignOut(false)}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 12,
                    background: '#F3F4F6', color: '#374151',
                    fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.925rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => { setShowSignOut(false); onLogout(); }}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 12,
                    background: '#DC2626', color: '#fff',
                    fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '0.925rem',
                  }}
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate('dashboard'); }}>
          <LayoutDashboard size={24} /><span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate('patients'); }}>
          <Users size={24} /><span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate('appointments'); }}>
          <CalendarDays size={24} /><span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item active" onClick={e => { e.preventDefault(); navigate('profile'); }}>
          <UserCircle size={24} /><span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
