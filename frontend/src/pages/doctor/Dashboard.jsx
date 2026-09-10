import React, { useState, useEffect, useCallback } from 'react';
import { 
  BriefcaseMedical, Bell, AlertTriangle, Users, 
  Calendar, CheckCircle2, Clock, Eye, ChevronRight,
  LayoutDashboard, UserCircle, CalendarDays, RefreshCw
} from 'lucide-react';
import { getDoctorDashboard } from '../../services/api';

export default function Dashboard({ navigate, openPatient, startConsultation }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getDoctorDashboard();
      setDashboardData(res);
      setError(null);
    } catch (err) {
      console.error('Failed to load doctor dashboard:', err);
      setError('Unable to load doctor dashboard metrics. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await getDoctorDashboard();
        if (!ignore) {
          setDashboardData(res);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load doctor dashboard:', err);
          setError('Unable to load doctor dashboard metrics. Please check your connection.');
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

  const doctor = dashboardData?.doctor;
  const doctorName = doctor?.name || 'Doctor';
  const facilityName = doctor?.facility_name || 'Primary Health Centre';

  return (
    <div className="app-container pb-24">
      {/* Header */}
      <header className="global-header">
        <div className="header-brand">
          <BriefcaseMedical size={20} strokeWidth={2.5} />
          <span>Rural Care Navigator</span>
        </div>
        <div className="header-actions">
          <button 
            onClick={refreshDashboard} 
            title="Refresh dashboard"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Bell size={24} className="header-bell" strokeWidth={2} />
          <span className="header-indicator"></span>
        </div>
      </header>
      
      {/* Role */}
      <p className="role-text">{doctor?.specialization || 'General Medicine'} • {facilityName}</p>

      {/* Greeting */}
      <div className="greeting-wrapper">
        <h1 className="greeting-title">Good day, {doctorName}</h1>
        <p className="greeting-sub">Live patient care and clinical operations overview.</p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
          borderRadius: '12px', marginBottom: '1rem', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Emergency / Alert Banner */}
      {(dashboardData?.urgent_cases_count > 0) ? (
        <div className="emergency-alert" onClick={() => { if (navigate) navigate('patients'); }} style={{ cursor: 'pointer' }}>
          <AlertTriangle className="emergency-icon" size={20} strokeWidth={2.5} />
          <div>
            <h3 className="emergency-title">Priority Attention Required</h3>
            <p className="emergency-text">
              {dashboardData.urgent_cases_count} patient{dashboardData.urgent_cases_count > 1 ? 's' : ''} with urgent or emergency triage in queue.
            </p>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          background: '#ecfdf5', border: '1px solid #a7f3d0',
          borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1.25rem'
        }}>
          <CheckCircle2 size={20} className="text-emerald-600" />
          <div style={{ fontSize: '0.85rem', color: '#065f46' }}>
            <strong>Queue Operational:</strong> No critical emergencies pending right now.
          </div>
        </div>
      )}

      {/* Patient Queue Live Card */}
      <div className="queue-card">
        <div className="queue-bg-icon">
          <Users size={140} strokeWidth={1} />
        </div>
        
        <div className="queue-header">
          <h2 className="queue-title">Patient Queue</h2>
          <span className="queue-badge">
            {loading ? 'Checking...' : `${dashboardData?.waiting_patients_count ?? 0} Waiting (${dashboardData?.queue_status || 'NORMAL'})`}
          </span>
        </div>
        
        <div className="queue-stats">
          <div>
            <p className="queue-label">Facility</p>
            <p className="queue-val" style={{ fontSize: '1rem' }}>{facilityName}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p className="queue-label">Est. Avg Wait</p>
            <p className="queue-val">
              {loading ? '...' : `~${dashboardData?.estimated_wait_minutes ?? 0} min`}
            </p>
          </div>
        </div>
        
        <button className="queue-btn" onClick={() => { if (navigate) navigate('patients'); }}>
          <Eye size={18} strokeWidth={2.5} />
          View Patient Queue
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <Calendar size={22} className="icon-blue" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">{loading ? '-' : dashboardData?.today_appointments_count ?? 0}</h3>
            <p className="summary-label">Today's Appointments</p>
          </div>
        </div>
        <div className="summary-card">
          <Users size={22} className="icon-blue" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">{loading ? '-' : dashboardData?.waiting_patients_count ?? 0}</h3>
            <p className="summary-label">Patients Waiting</p>
          </div>
        </div>
        <div className="summary-card">
          <AlertTriangle size={22} className="icon-orange" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">{loading ? '-' : dashboardData?.urgent_cases_count ?? 0}</h3>
            <p className="summary-label">Urgent / Emergency</p>
          </div>
        </div>
        <div className="summary-card">
          <Clock size={22} className="icon-teal" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">{loading ? '-' : dashboardData?.completed_consultations_count ?? 0}</h3>
            <p className="summary-label">Completed Visits</p>
          </div>
        </div>
      </div>

      {/* Today's Appointments List */}
      <div className="section-header">
        <h2 className="section-title">Today's Schedule & Consultations</h2>
        <button 
          onClick={() => { if (navigate) navigate('appointments'); }}
          className="view-all"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          View All <ChevronRight size={14} strokeWidth={3} />
        </button>
      </div>

      <div className="appt-list">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading appointments...
          </div>
        ) : (dashboardData?.recent_appointments && dashboardData.recent_appointments.length > 0) ? (
          dashboardData.recent_appointments.map((appt) => (
            <div key={appt.id} className={`appt-card ${appt.status === 'URGENT' ? 'urgent' : ''}`}>
              <div className="appt-header">
                <div>
                  <div className="appt-id-row">
                    <span className="appt-id">#P{appt.patient_id}</span>
                    <span className={`status-badge ${appt.status === 'COMPLETED' ? 'badge-confirmed' : 'badge-waiting'}`}>
                      <span className="indicator"></span> {appt.status}
                    </span>
                  </div>
                  <h3 className="appt-name">{appt.patient_name}</h3>
                  <p className="appt-details">{appt.time} • {appt.service_name}</p>
                </div>
                <div className="appt-icon-box">
                  <Calendar size={24} strokeWidth={2} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
                <button 
                  className="btn btn-primary appt-btn"
                  style={{ flex: 1 }}
                  onClick={() => {
                    if (startConsultation) {
                      startConsultation(appt.patient_id, appt.id);
                    } else if (navigate) {
                      navigate('consultation');
                    }
                  }}
                >
                  Start Consultation
                </button>
                <button 
                  className="btn-outline appt-btn"
                  style={{ width: 'auto', padding: '0.5rem 1rem' }}
                  onClick={() => {
                    if (openPatient) {
                      openPatient(appt.patient_id, appt.id);
                    } else if (navigate) {
                      navigate('patient_details');
                    }
                  }}
                >
                  View Chart
                </button>
              </div>
            </div>
          ))
        ) : (
          <div style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '2rem', textAlign: 'center', color: 'var(--text-muted)'
          }}>
            <Calendar size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ fontWeight: '600', color: 'var(--text-dark)', marginBottom: '4px' }}>No Scheduled Appointments</p>
            <p style={{ fontSize: '0.85rem' }}>All consultations for today are either complete or patients can be seen via the Patient Queue.</p>
            <button 
              className="btn btn-primary" 
              style={{ marginTop: '1rem', width: 'auto', display: 'inline-flex', padding: '0.5rem 1.25rem' }}
              onClick={() => { if (navigate) navigate('patients'); }}
            >
              Open Live Queue
            </button>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item active">
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); if (navigate) navigate('patients'); }}>
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); if (navigate) navigate('appointments'); }}>
          <CalendarDays size={24} />
          <span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); if (navigate) navigate('profile'); }}>
          <UserCircle size={24} />
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
