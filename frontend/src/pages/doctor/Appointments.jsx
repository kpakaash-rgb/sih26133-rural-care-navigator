import React, { useState, useEffect, useCallback } from 'react';
import {
  Bell, Clock,
  LayoutDashboard, Users, CalendarDays, UserCircle,
  PlayCircle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { getDoctorAppointments } from '../../services/api';

function StatusBadge({ status }) {
  const norm = (status || 'SCHEDULED').toUpperCase();
  const cfg = {
    URGENT:    { bg: '#DC2626', color: '#FFFFFF', label: 'URGENT' },
    SCHEDULED: { bg: '#DBEAFE', color: '#1D4ED8', label: 'SCHEDULED' },
    WAITING:   { bg: '#FEF3C7', color: '#92400E', label: 'WAITING' },
    CONFIRMED: { bg: '#DCFCE7', color: '#15803D', label: 'CONFIRMED' },
    COMPLETED: { bg: '#F3F4F6', color: '#475569', label: 'COMPLETED' },
    CANCELLED: { bg: '#FEE2E2', color: '#B91C1C', label: 'CANCELLED' },
  };
  const c = cfg[norm] || cfg.SCHEDULED;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.07em',
      padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

export default function Appointments({ navigate, _onLogout, openPatient, startConsultation }) {
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const refreshAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctorAppointments();
      setAppointmentsList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Unable to load appointments schedule.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await getDoctorAppointments();
        if (!ignore) {
          setAppointmentsList(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load appointments:', err);
          setError('Unable to load appointments schedule.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    init();
    return () => { ignore = true; };
  }, []);

  const filteredAppointments = appointmentsList.filter((appt) => {
    const st = (appt.status || '').toUpperCase();
    if (activeTab === 'scheduled') return st === 'SCHEDULED' || st === 'WAITING' || st === 'CONFIRMED';
    if (activeTab === 'completed') return st === 'COMPLETED';
    return true;
  });

  return (
    <div className="app-container pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="global-header">
        <div className="header-brand">
          <img
            src="/mythri-icon.png"
            alt="Mythri"
            width="22"
            height="22"
            style={{ objectFit: 'contain', borderRadius: '4px' }}
          />
          <span>Mythri</span>
        </div>
        <div className="header-actions">
          <button 
            onClick={refreshAppointments} 
            title="Refresh schedule"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Bell size={24} className="header-bell" strokeWidth={2} />
          <span className="header-indicator"></span>
        </div>
      </header>

      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Title */}
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: 0 }}>
            Facility Appointments
          </h1>
          <p style={{ fontSize: '0.825rem', color: '#6B7280', marginTop: '2px' }}>
            Scheduled consultations at your primary care centre.
          </p>
        </div>

        {error && (
          <div style={{
            background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
            borderRadius: '12px', fontSize: '0.875rem'
          }}>
            {error}
          </div>
        )}

        {/* Tab Filters */}
        <div style={{
          display: 'flex', background: '#E5E7EB', borderRadius: 12, padding: 3,
          gap: 4
        }}>
          {[
            { id: 'all', label: `All (${appointmentsList.length})` },
            { id: 'scheduled', label: 'Upcoming' },
            { id: 'completed', label: 'Completed' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1, padding: '0.5rem', border: 'none', borderRadius: 9,
                fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                background: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? 'var(--primary-blue)' : '#4B5563',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#6B7280' }}>
            <Clock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <p style={{ fontWeight: 600 }}>Loading facility appointment schedule...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16,
            padding: '2.5rem 1rem', textAlign: 'center', color: '#6B7280'
          }}>
            <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', color: '#10B981' }} />
            <h3 style={{ fontWeight: 700, color: '#111827', marginBottom: '4px' }}>No Appointments Found</h3>
            <p style={{ fontSize: '0.85rem' }}>There are no appointments matching this category.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {filteredAppointments.map((appt) => {
              const isCompleted = (appt.status || '').toUpperCase() === 'COMPLETED';
              const isUrgent = (appt.status || '').toUpperCase() === 'URGENT';

              return (
                <div
                  key={appt.id}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    border: `1px solid ${isUrgent ? '#FECACA' : '#E5E7EB'}`,
                    borderLeft: `4px solid ${isUrgent ? '#DC2626' : isCompleted ? '#9CA3AF' : 'var(--primary-blue)'}`,
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                    opacity: isCompleted ? 0.85 : 1,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      color: isUrgent ? '#DC2626' : 'var(--primary-blue)',
                      fontWeight: 700, fontSize: '0.8rem',
                    }}>
                      <Clock size={14} strokeWidth={2.5} />
                      {appt.appointment_date} • {appt.time}
                    </div>
                    <StatusBadge status={appt.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
                      background: '#DBEAFE', color: 'var(--primary-blue)',
                      fontWeight: 800, fontSize: '0.9rem',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {appt.patient_name?.slice(0, 2).toUpperCase() || 'PT'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                        {appt.patient_name}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 1 }}>
                        {appt.service_name || 'General Medicine'} • ID: #P{appt.patient_id}
                      </div>
                    </div>
                  </div>

                  {!isCompleted && (
                    <div style={{ display: 'flex', gap: '8px', paddingTop: '0.25rem' }}>
                      <button
                        className="btn-primary"
                        style={{
                          flex: 1, padding: '0.6rem', fontSize: '0.85rem',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                        }}
                        onClick={() => startConsultation ? startConsultation(appt.patient_id, appt.id) : (navigate && navigate('consultation'))}
                      >
                        <PlayCircle size={16} /> Start Consultation
                      </button>
                      <button
                        className="btn-outline"
                        style={{ padding: '0.6rem 0.85rem', fontSize: '0.85rem' }}
                        onClick={() => openPatient ? openPatient(appt.patient_id, appt.id) : (navigate && navigate('patient_details'))}
                      >
                        Chart
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('dashboard'); }}>
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('patients'); }}>
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item active">
          <CalendarDays size={24} />
          <span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('profile'); }}>
          <UserCircle size={24} />
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
