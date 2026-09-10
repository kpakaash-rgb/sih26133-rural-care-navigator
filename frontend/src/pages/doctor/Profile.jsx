import React, { useState, useEffect, useCallback } from 'react';
import {
  BriefcaseMedical, Bell, Clock, Settings2,
  ShieldCheck, LogOut, MapPin, BadgeCheck,
  LayoutDashboard, Users, CalendarDays, UserCircle, RefreshCw
} from 'lucide-react';
import { getDoctorMe, getStaffSession } from '../../services/api';

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

/* ─── Main Component ──────────────────────────────── */
export default function Profile({ navigate, onLogout }) {
  const [showSignOut, setShowSignOut] = useState(false);
  const [doctorProfile, setDoctorProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState({
    criticalAlerts: true,
    appointmentReminders: true,
    referralUpdates: true,
  });

  const session = getStaffSession();

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctorMe();
      setDoctorProfile(data);
    } catch (err) {
      console.error('Failed to fetch doctor profile:', err);
      if (session?.user) {
        setDoctorProfile(session.user);
      }
    } finally {
      setLoading(false);
    }
  }, [session?.user]);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await getDoctorMe();
        if (!ignore) {
          setDoctorProfile(data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to fetch doctor profile:', err);
          if (session?.user) {
            setDoctorProfile(session.user);
          }
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => { ignore = true; };
  }, [session?.user]);

  const toggle = key => setPrefs(p => ({ ...p, [key]: !p[key] }));

  const doctorName = doctorProfile?.name || session?.user?.name || 'Dr. Healthcare Officer';
  const doctorId = doctorProfile?.doctor_id || doctorProfile?.staff_id || 'DOC-10101';
  const specialization = doctorProfile?.specialization || 'General Medicine';
  const facilityName = doctorProfile?.facility_name || 'Primary Health Centre';
  const role = doctorProfile?.role || 'DOCTOR';
  const mobile = doctorProfile?.mobile || '9842183000';

  const initials = doctorName
    .replace('Dr.', '')
    .trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'DR';

  return (
    <div className="app-container pb-24 min-h-screen" style={{ background: '#F0F4F8' }}>
      {/* Global Header */}
      <header className="global-header">
        <div className="header-brand">
          <BriefcaseMedical size={20} strokeWidth={2.5} />
          <span>Rural Care Navigator</span>
        </div>
        <div className="header-actions">
          <button
            onClick={refreshProfile}
            title="Refresh profile"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Bell size={22} className="header-bell" strokeWidth={2} />
          <span className="header-indicator" />
        </div>
      </header>

      {/* Scrollable body */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>

        {/* Profile Card */}
        <Card>
          <div style={{
            height: 72,
            background: 'linear-gradient(135deg, #0A58CA 0%, #3B82F6 100%)',
          }} />

          <div style={{ padding: '0 1.25rem 1.25rem', position: 'relative' }}>
            <div style={{
              width: 76, height: 76, borderRadius: '50%',
              background: '#DBEAFE', color: 'var(--primary-blue)',
              fontWeight: 900, fontSize: '1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '4px solid #fff',
              boxShadow: '0 4px 12px rgba(10,88,202,0.15)',
              position: 'absolute', top: -38, left: '50%', transform: 'translateX(-50%)',
            }}>
              {initials}
            </div>

            <div style={{ height: 44 }} />

            <div style={{ textAlign: 'center', marginBottom: '0.875rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#111827' }}>
                {doctorName}
              </div>
              <div style={{ fontSize: '0.875rem', color: '#6B7280', marginTop: 2 }}>
                {specialization} • Role: <strong>{role}</strong>
              </div>
            </div>

            {/* Chips */}
            <div style={{
              display: 'flex', gap: '0.5rem', justifyContent: 'center',
              flexWrap: 'wrap', marginBottom: '1rem',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F1F5F9', color: '#475569',
                fontSize: '0.72rem', fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
              }}>
                <BadgeCheck size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                {doctorId}
              </span>

              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                background: '#F1F5F9', color: '#475569',
                fontSize: '0.72rem', fontWeight: 700,
                padding: '5px 12px', borderRadius: 999,
              }}>
                <MapPin size={12} strokeWidth={2.5} style={{ flexShrink: 0 }} />
                {facilityName}
              </span>
            </div>

            {/* Details Table */}
            <div style={{
              background: '#F8FAFC', borderRadius: '12px', padding: '0.75rem',
              border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: '0.5rem',
              fontSize: '0.85rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Official Mobile:</span>
                <span style={{ fontWeight: '600', color: '#1E293B' }}>+91 {mobile}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Primary Facility ID:</span>
                <span style={{ fontWeight: '600', color: '#1E293B' }}>Facility #{doctorProfile?.facility_id || 1}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Authentication:</span>
                <span style={{ fontWeight: '700', color: '#15803D' }}>Verified Staff JWT</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Schedule & Availability */}
        <Card>
          <SectionTitle icon={Clock} label="OPD Consultation Timings" />
          <div style={{ padding: '0 1rem' }}>
            {[
              { day: 'Mon – Fri', time: '09:00 – 17:00 (Daily OPD)', off: false },
              { day: 'Saturday', time: '09:00 – 13:00 (Half Day)', off: false },
              { day: 'Sunday', time: 'Emergency On-Call', off: true },
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
        </Card>

        {/* Preferences */}
        <Card>
          <SectionTitle icon={Settings2} label="Clinical Preferences" />
          <div>
            <PrefRow
              label="Critical Urgency Alerts"
              sub="Instant notifications for emergency triage"
              checked={prefs.criticalAlerts}
              onChange={() => toggle('criticalAlerts')}
            />
            <div style={{ height: 1, background: '#F9FAFB', margin: '0 1rem' }} />
            <PrefRow
              label="Appointment Updates"
              sub="Live queue synchronization"
              checked={prefs.appointmentReminders}
              onChange={() => toggle('appointmentReminders')}
            />
            <div style={{ height: 1, background: '#F9FAFB', margin: '0 1rem' }} />
            <PrefRow
              label="Referral Tracking"
              sub="Status notifications for dispatched referrals"
              checked={prefs.referralUpdates}
              onChange={() => toggle('referralUpdates')}
            />
          </div>
        </Card>

        {/* Security / System Info */}
        <Card>
          <SectionTitle icon={ShieldCheck} label="Security & Access Role" />
          <div style={{ padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>
            <p>
              Your session is authenticated under the <strong>DOCTOR</strong> role. 
              Only authorized clinical functions are permitted. Session data is never shared across facilities.
            </p>
          </div>
        </Card>

        {/* Sign Out Button */}
        <button
          onClick={() => setShowSignOut(true)}
          style={{
            width: '100%', padding: '0.875rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            background: '#FEF2F2', color: '#DC2626',
            border: '1.5px solid #FECACA', borderRadius: 14,
            fontWeight: 700, fontSize: '0.925rem', cursor: 'pointer',
          }}
          id="doctor-profile-signout-btn"
        >
          <LogOut size={18} /> Sign Out of Staff Portal
        </button>

        <div style={{ height: '0.5rem' }} />
      </div>

      {/* Sign Out Modal */}
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                Sign Out?
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Signing out will end your doctor session and return you to the staff login portal.
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
                  id="confirm-signout-btn"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate?.('dashboard'); }}>
          <LayoutDashboard size={24} /><span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate?.('patients'); }}>
          <Users size={24} /><span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate?.('appointments'); }}>
          <CalendarDays size={24} /><span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item active" onClick={e => { e.preventDefault(); navigate?.('profile'); }}>
          <UserCircle size={24} /><span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
