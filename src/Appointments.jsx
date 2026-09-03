import React, { useState } from 'react';
import {
  BriefcaseMedical, Bell, Clock, AlertTriangle,
  LayoutDashboard, Users, CalendarDays, UserCircle,
  ChevronRight, CheckCircle2
} from 'lucide-react';
import './index.css';

const appointments = {
  today: [
    { id: 1, name: 'John Doe', initials: 'JD', avatarColor: '#DBEAFE', textColor: '#1D4ED8', time: '09:00 – 09:30 AM', service: 'Follow-up: Hypertension', status: 'Next' },
    { id: 2, name: 'Mary Johnson', initials: 'MJ', avatarColor: '#E0E7FF', textColor: '#4338CA', time: '09:45 – 10:15 AM', service: 'Initial Consult: Joint Pain', status: 'Waiting' },
    { id: 3, name: 'Robert Smith', initials: 'RS', avatarColor: '#FEE2E2', textColor: '#DC2626', time: '10:30 – 11:00 AM', service: 'Acute Chest Pain Evaluation', status: 'Urgent' },
    { id: 4, name: 'Priya Sharma', initials: 'PS', avatarColor: '#DCFCE7', textColor: '#16A34A', time: '11:15 – 11:45 AM', service: 'General Consultation', status: 'Confirmed' },
  ],
  upcoming: [
    { id: 5, name: 'Anita Verma', initials: 'AV', avatarColor: '#FEF9C3', textColor: '#CA8A04', time: 'Sep 5 • 10:00 AM', service: 'Follow-up: Diabetes Management', status: 'Confirmed' },
    { id: 6, name: 'Ramesh Nair', initials: 'RN', avatarColor: '#E0E7FF', textColor: '#4338CA', time: 'Sep 6 • 02:30 PM', service: 'Post-op Review', status: 'Confirmed' },
  ],
  completed: [
    { id: 7, name: 'Lakshmi Devi', initials: 'LD', avatarColor: '#F3F4F6', textColor: '#6B7280', time: '08:00 – 08:30 AM', service: 'General Consultation', status: 'Completed' },
    { id: 8, name: 'Arun Kumar', initials: 'AK', avatarColor: '#F3F4F6', textColor: '#6B7280', time: '08:30 – 09:00 AM', service: 'Blood Pressure Check', status: 'Completed' },
  ],
};

function StatusBadge({ status }) {
  const cfg = {
    Next:      { bg: '#DBEAFE', color: '#1D4ED8', label: 'NEXT' },
    Waiting:   { bg: '#F3F4F6', color: '#374151', label: 'WAITING' },
    Urgent:    { bg: '#DC2626', color: '#FFFFFF', label: 'URGENT' },
    Confirmed: { bg: '#DCFCE7', color: '#15803D', label: 'CONFIRMED' },
    Completed: { bg: '#F3F4F6', color: '#6B7280', label: 'DONE' },
  };
  const c = cfg[status] || cfg.Waiting;
  return (
    <span style={{
      background: c.bg, color: c.color,
      fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.07em',
      padding: '3px 10px', borderRadius: 999, textTransform: 'uppercase',
      whiteSpace: 'nowrap',
    }}>
      {c.label}
    </span>
  );
}

function AppointmentCard({ appt, navigate, onAction }) {
  const isUrgent    = appt.status === 'Urgent';
  const isCompleted = appt.status === 'Completed';

  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      border: `1px solid ${isUrgent ? '#FECACA' : '#E5E7EB'}`,
      borderLeft: `4px solid ${isUrgent ? '#DC2626' : isCompleted ? '#D1D5DB' : 'var(--primary-blue)'}`,
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.875rem',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      opacity: isCompleted ? 0.8 : 1,
    }}>
      {/* Row 1 – Time + Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.375rem',
          color: isUrgent ? '#DC2626' : 'var(--primary-blue)',
          fontWeight: 700, fontSize: '0.8rem',
        }}>
          <Clock size={14} strokeWidth={2.5} />
          {appt.time}
        </div>
        <StatusBadge status={appt.status} />
      </div>

      {/* Row 2 – Avatar + Patient Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: appt.avatarColor, color: appt.textColor,
          fontWeight: 800, fontSize: '0.9rem',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {appt.initials}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 700, fontSize: '1rem',
            color: isCompleted ? '#9CA3AF' : '#111827',
            textDecoration: isCompleted ? 'line-through' : 'none',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {appt.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: 1 }}>
            {appt.service}
          </div>
        </div>
      </div>

      {/* Row 3 – Actions */}
      {isCompleted ? (
        <button
          onClick={() => navigate('patient_details')}
          style={{
            width: '100%', padding: '0.6rem',
            border: '1.5px solid #E5E7EB', borderRadius: 10,
            fontWeight: 700, fontSize: '0.85rem', color: '#6B7280',
            background: 'transparent', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          <CheckCircle2 size={16} /> View Summary
        </button>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => navigate('patient_details')}
            style={{
              flex: 1, padding: '0.6rem 0.5rem',
              border: `1.5px solid var(--primary-blue)`,
              borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
              color: 'var(--primary-blue)', background: 'transparent', cursor: 'pointer',
            }}
          >
            View Patient
          </button>
          <button
            onClick={() => navigate('consultation')}
            style={{
              flex: 1, padding: '0.6rem 0.5rem',
              border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem',
              background: isUrgent ? '#DC2626' : 'var(--primary-blue)',
              color: '#fff', cursor: 'pointer',
            }}
          >
            Start Consultation
          </button>
        </div>
      )}

      {/* Secondary actions */}
      {!isCompleted && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          paddingTop: '0.25rem', borderTop: '1px solid #F3F4F6',
        }}>
          <button
            onClick={() => onAction('reschedule', appt.name)}
            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
          >
            Reschedule
          </button>
          <button
            onClick={() => onAction('cancel', appt.name)}
            style={{ fontSize: '0.75rem', fontWeight: 700, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem 0' }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

export default function Appointments({ navigate, onLogout }) {
  const [activeTab, setActiveTab] = useState('today');
  const [modal, setModal] = useState({ type: null, patient: null });

  const list = appointments[activeTab] || [];

  const tabs = [
    { key: 'today', label: 'Today' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'completed', label: 'Completed' },
  ];

  return (
    <div className="app-container pb-24 bg-gray-50 min-h-screen">
      {/* Global Header */}
      <header className="global-header">
        <div className="header-brand">
          <BriefcaseMedical size={20} strokeWidth={2.5} />
          <span>Rural Care Navigator</span>
        </div>
        <div className="header-actions">
          <Bell size={22} className="header-bell" strokeWidth={2} />
          <span className="header-indicator"></span>
        </div>
      </header>

      {/* Page Title + Summary Bar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '1rem 1rem 0' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
          Appointments
        </h1>
        <p style={{ fontSize: '0.8rem', color: '#6B7280', marginBottom: '1rem' }}>
          Manage today's consultations and upcoming visits.
        </p>

        {/* Summary chips */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {[
            { label: '4 Today', bg: '#DBEAFE', color: '#1D4ED8' },
            { label: '1 Urgent', bg: '#FEE2E2', color: '#DC2626' },
            { label: '2 Completed', bg: '#F3F4F6', color: '#6B7280' },
          ].map(chip => (
            <span key={chip.label} style={{
              background: chip.bg, color: chip.color,
              fontSize: '0.72rem', fontWeight: 700, padding: '4px 10px',
              borderRadius: 999,
            }}>{chip.label}</span>
          ))}
        </div>

        {/* Tab Bar */}
        <div style={{ display: 'flex' }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1, padding: '0.75rem 0', fontSize: '0.875rem', fontWeight: 700,
                textAlign: 'center', background: 'none', border: 'none', cursor: 'pointer',
                borderBottom: activeTab === tab.key
                  ? '2.5px solid var(--primary-blue)'
                  : '2.5px solid transparent',
                color: activeTab === tab.key ? 'var(--primary-blue)' : '#9CA3AF',
                transition: 'all 0.2s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Card List */}
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        {list.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#9CA3AF', padding: '3rem 0', fontSize: '0.9rem' }}>
            No appointments here.
          </div>
        ) : (
          list.map(appt => (
            <AppointmentCard
              key={appt.id}
              appt={appt}
              navigate={navigate}
              onAction={(type, patient) => setModal({ type, patient })}
            />
          ))
        )}
      </div>

      {/* Modal */}
      {modal.type && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 360, overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.15)' }}>
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: '#FEE2E2', color: '#DC2626',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
              }}>
                <AlertTriangle size={24} />
              </div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
                {modal.type === 'cancel' ? 'Cancel Appointment?' : 'Reschedule Appointment?'}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', marginBottom: '1.5rem', lineHeight: 1.5 }}>
                Are you sure you want to {modal.type} the appointment for{' '}
                <strong style={{ color: '#111827' }}>{modal.patient}</strong>?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                <button
                  onClick={() => setModal({ type: null, patient: null })}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 12,
                    background: '#F3F4F6', color: '#374151', fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontSize: '0.925rem',
                  }}
                >
                  Keep Appointment
                </button>
                <button
                  onClick={() => setModal({ type: null, patient: null })}
                  style={{
                    width: '100%', padding: '0.75rem', borderRadius: 12,
                    background: '#DC2626', color: '#fff', fontWeight: 700,
                    border: 'none', cursor: 'pointer', fontSize: '0.925rem',
                  }}
                >
                  {modal.type === 'cancel' ? 'Cancel Appointment' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate('dashboard'); }}>
          <LayoutDashboard size={24} /><span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate('patients'); }}>
          <Users size={24} /><span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item active" onClick={e => { e.preventDefault(); navigate('appointments'); }}>
          <CalendarDays size={24} /><span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item" onClick={e => { e.preventDefault(); navigate && navigate('profile'); }}>
          <UserCircle size={24} /><span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
