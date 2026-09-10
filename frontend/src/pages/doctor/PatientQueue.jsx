import { useState, useEffect, useCallback } from 'react';
import {
  Bell, UserCircle, LayoutDashboard, Users, CalendarDays,
  ArrowRight, PlayCircle, Clock, AlertTriangle, RefreshCw, CheckCircle2
} from 'lucide-react';
import { getDoctorQueue } from '../../services/api';

export default function PatientQueue({ navigate, _onLogout, openPatient, startConsultation }) {
  const [queueList, setQueueList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshQueue = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDoctorQueue();
      setQueueList(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Failed to load patient queue for doctor:', err);
      setError('Unable to load live patient queue. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const data = await getDoctorQueue();
        if (!ignore) {
          setQueueList(Array.isArray(data) ? data : []);
          setError(null);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Failed to load patient queue for doctor:', err);
          setError('Unable to load live patient queue. Please try again.');
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

  const urgentCount = queueList.filter(p => p.priority === 'EMERGENCY' || p.priority === 'URGENT').length;

  return (
    <div className="app-container pb-24">
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
            onClick={refreshQueue}
            title="Refresh queue"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <Bell size={24} className="header-bell" strokeWidth={2} />
          <span className="header-indicator"></span>
        </div>
      </header>

      {/* Title */}
      <div className="greeting-wrapper" style={{ marginTop: '1rem' }}>
        <h1 className="greeting-title" style={{ fontSize: '1.5rem' }}>Patient Queue</h1>
        <p className="greeting-sub">Triage-prioritized consultation waiting list for your facility.</p>
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', color: '#b91c1c', padding: '0.75rem 1rem',
          borderRadius: '12px', marginBottom: '1rem', fontSize: '0.875rem'
        }}>
          {error}
        </div>
      )}

      {/* Queue Summary Card */}
      <div style={{
        background: 'var(--white, #fff)',
        border: '1px solid var(--border, #e2e8f0)',
        borderRadius: '12px',
        padding: '1rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-dark)' }}>
              {loading ? 'Refreshing queue...' : `${queueList.length} Patients in Queue`}
            </span>
            {urgentCount > 0 && (
              <span style={{
                fontSize: '0.7rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: '#fee2e2',
                color: '#b91c1c',
                textTransform: 'uppercase'
              }}>
                {urgentCount} Priority
              </span>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Est. Wait</div>
            <div style={{ fontWeight: '700', color: 'var(--primary-blue)' }}>
              {loading ? '...' : `~${queueList.length * 12} min`}
            </div>
          </div>
        </div>

        <div style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          paddingTop: '0.25rem',
          borderTop: '1px solid var(--border-light, #f1f5f9)'
        }}>
          <Clock size={12} />
          <span>Queue sorted by clinical urgency: EMERGENCY &gt; URGENT &gt; NORMAL</span>
        </div>
      </div>

      {/* Waiting Patients List */}
      <div className="section-header" style={{ marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Consultation Queue ({queueList.length})
        </h2>
      </div>

      {loading ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <Clock size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <p style={{ fontWeight: '600' }}>Loading live facility queue...</p>
        </div>
      ) : queueList.length === 0 ? (
        <div style={{
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px',
          padding: '2.5rem 1rem', textAlign: 'center', color: 'var(--text-muted)'
        }}>
          <CheckCircle2 size={36} style={{ margin: '0 auto 0.75rem', color: '#10b981' }} />
          <h3 style={{ fontWeight: '700', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>No Patients Waiting</h3>
          <p style={{ fontSize: '0.875rem' }}>The consultation queue for your facility is currently clear.</p>
        </div>
      ) : (
        <div className="appt-list">
          {queueList.map((patient) => {
            const isUrgent = patient.priority === 'URGENT' || patient.priority === 'EMERGENCY';
            const isEmergency = patient.priority === 'EMERGENCY';

            return (
              <div key={patient.patient_id} className={`appt-card ${isUrgent ? 'urgent' : ''}`}>
                <div className="appt-header" style={{ paddingLeft: isUrgent ? '0.5rem' : '0' }}>
                  <div style={{ flex: 1 }}>
                    <div className="appt-id-row">
                      <h3 className="appt-name">{patient.name}</h3>
                      {isEmergency ? (
                        <span className="status-badge" style={{ background: '#7f1d1d', color: '#fff' }}>
                          <AlertTriangle size={12} /> Emergency
                        </span>
                      ) : isUrgent ? (
                        <span className="status-badge badge-urgent">
                          <span className="indicator"></span> Urgent
                        </span>
                      ) : (
                        <span className="status-badge badge-waiting">
                          <span className="indicator"></span> Normal
                        </span>
                      )}
                    </div>
                    <p className="appt-details" style={{ marginBottom: '0.35rem' }}>
                      {patient.patient_code} • Age {patient.age || 'N/A'} • {patient.gender || 'Patient'} • {patient.village}
                    </p>
                    {patient.appointment_time && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--primary-blue)', fontWeight: '600', marginBottom: '0.25rem' }}>
                        Appointment: {patient.appointment_time}
                      </p>
                    )}
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-dark)' }}>
                      {patient.chief_complaint}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Est. Wait</p>
                    <p style={{ fontWeight: '700', color: isUrgent ? 'var(--error-red)' : 'var(--text-dark)' }}>
                      ~{patient.wait_time_minutes || 10} min
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '0.875rem' }}>
                  <button
                    className="btn-primary"
                    style={{
                      flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center',
                      gap: '0.5rem', padding: '0.7rem'
                    }}
                    onClick={() => startConsultation ? startConsultation(patient.patient_id, patient.appointment_id) : (navigate?.('consultation'))}
                  >
                    <PlayCircle size={18} /> Start Consultation
                  </button>
                  <button
                    className="btn-outline"
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.25rem',
                      padding: '0.7rem 0.9rem'
                    }}
                    onClick={() => openPatient ? openPatient(patient.patient_id, patient.appointment_id) : (navigate?.('patient_details'))}
                  >
                    Open Chart <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('dashboard'); }}>
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item active">
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate?.('appointments'); }}>
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
