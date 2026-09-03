import React from 'react';
import { 
  BriefcaseMedical, Bell, UserCircle, LayoutDashboard, Users, CalendarDays, 
  ArrowRight, PlayCircle, AlertTriangle, Clock
} from 'lucide-react';
import './index.css';

export default function PatientQueue({ navigate, onLogout }) {
  return (
    <div className="app-container pb-24">
      {/* Header */}
      <header className="global-header">
        <div className="header-brand">
          <BriefcaseMedical size={20} strokeWidth={2.5} />
          <span>Rural Care Navigator</span>
        </div>
        <div className="header-actions">
          <Bell size={24} className="header-bell" strokeWidth={2} />
          <span className="header-indicator"></span>
        </div>
      </header>

      {/* Title */}
      <div className="greeting-wrapper" style={{marginTop: '1rem'}}>
        <h1 className="greeting-title" style={{fontSize: '1.5rem'}}>Patient Queue</h1>
        <p className="greeting-sub">Patients currently waiting for consultation.</p>
      </div>

      {/* Queue Summary */}
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
        <div style={{fontWeight: '700', color: 'var(--text-dark)'}}>8 Patients Waiting</div>
        <div style={{textAlign: 'right'}}>
          <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>Estimated Queue Time</div>
          <div style={{fontWeight: '700', color: 'var(--primary-blue)'}}>~45 min</div>
        </div>
      </div>

      {/* Now Consulting */}
      <div style={{marginBottom: '2rem'}}>
        <h2 style={{fontSize: '0.75rem', fontWeight: '700', color: 'var(--primary-blue)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem'}}>Now Consulting</h2>
        <div className="now-consulting-card">
          <div className="now-consulting-bar"></div>
          
          <div className="now-consulting-header">
            <div className="now-consulting-avatar">AK</div>
            <div style={{flex: 1}}>
              <h3 className="appt-name">Arun Kumar</h3>
              <p className="appt-details">Patient #P1024 • General Consultation</p>
            </div>
            <div style={{textAlign: 'right', flexShrink: 0}}>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem'}}>Duration</p>
              <p style={{fontWeight: '700', color: 'var(--primary-blue)'}}>18 min</p>
            </div>
          </div>
          
          <button className="btn-light-blue" onClick={() => navigate('patient_details')} style={{marginLeft: '0.5rem', width: 'calc(100% - 0.5rem)'}}>
             Open Chart <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Waiting Patients */}
      <div className="section-header" style={{marginBottom: '1rem'}}>
        <h2 style={{fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Waiting Patients (8)</h2>
      </div>

      <div className="appt-list">
        
        {/* Urgent Patient */}
        <div className="appt-card urgent">
          <div className="appt-header" style={{paddingLeft: '0.5rem'}}>
            <div style={{flex: 1}}>
              <div className="appt-id-row">
                <h3 className="appt-name">Ravi Kumar</h3>
                <span className="status-badge badge-urgent">
                  <span className="indicator"></span> Urgent
                </span>
              </div>
              <p className="appt-details" style={{marginBottom: '0.5rem'}}>Patient #P1042 • Age 56 • 10:30 AM</p>
              <p style={{fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-dark)'}}>Chest discomfort</p>
            </div>
            <div style={{textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem'}}>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem'}}>Wait Time</p>
              <p style={{fontWeight: '700', color: 'var(--error-red)'}}>7 min</p>
            </div>
          </div>
          <button className="btn-primary" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', width: '100%', padding: '0.75rem'}} onClick={() => navigate('consultation')}>
             <PlayCircle size={18} /> Start Consultation
          </button>
        </div>

        {/* Regular Patient 1 */}
        <div className="appt-card">
          <div className="appt-header">
            <div style={{flex: 1}}>
              <div className="appt-id-row">
                <h3 className="appt-name">Meena Raj</h3>
                <span className="status-badge badge-waiting"><span className="indicator"></span> Waiting</span>
              </div>
              <p className="appt-details" style={{marginBottom: '0.5rem'}}>Patient #P1027 • Age 42 • 10:00 AM</p>
              <p style={{fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-dark)'}}>Fever and fatigue</p>
            </div>
            <div style={{textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem'}}>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem'}}>Wait Time</p>
              <p style={{fontWeight: '700', color: 'var(--text-dark)'}}>12 min</p>
            </div>
          </div>
          <button className="btn-primary" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', width: '100%', padding: '0.75rem'}} onClick={() => navigate('consultation')}>
             <PlayCircle size={18} /> Start Consultation
          </button>
        </div>

        {/* Regular Patient 2 */}
        <div className="appt-card">
          <div className="appt-header">
            <div style={{flex: 1}}>
              <div className="appt-id-row">
                <h3 className="appt-name">Lakshmi Devi</h3>
                <span className="status-badge badge-waiting"><span className="indicator"></span> Waiting</span>
              </div>
              <p className="appt-details" style={{marginBottom: '0.5rem'}}>Patient #P1051 • Age 34 • 10:45 AM</p>
              <p style={{fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-dark)'}}>Headache</p>
            </div>
            <div style={{textAlign: 'right', flexShrink: 0, marginLeft: '0.5rem'}}>
              <p style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.125rem'}}>Wait Time</p>
              <p style={{fontWeight: '700', color: 'var(--text-dark)'}}>4 min</p>
            </div>
          </div>
          <button className="btn-primary" style={{display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '0.875rem', width: '100%', padding: '0.75rem'}} onClick={() => navigate('consultation')}>
             <PlayCircle size={18} /> Start Consultation
          </button>
        </div>

      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}>
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item active">
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate('appointments'); }}>
          <CalendarDays size={24} />
          <span className="nav-label">Appointments</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate && navigate('profile'); }}>
          <UserCircle size={24} />
          <span className="nav-label">Profile</span>
        </a>
      </nav>
    </div>
  );
}
