import React from 'react';
import { 
  BriefcaseMedical, Bell, AlertTriangle, Users, 
  Calendar, FileOutput, Clock, Eye, ChevronRight,
  LayoutDashboard, UserCircle, CalendarDays
} from 'lucide-react';
import './index.css';

export default function Dashboard({ navigate, onLogout }) {
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
      
      {/* Role */}
      <p className="role-text">Doctor / Healthcare Professional</p>

      {/* Greeting */}
      <div className="greeting-wrapper">
        <h1 className="greeting-title">Good morning, Doctor</h1>
        <p className="greeting-sub">Here's what needs your attention today.</p>
      </div>

      {/* Emergency Alert */}
      <div className="emergency-alert">
        <AlertTriangle className="emergency-icon" size={20} strokeWidth={2.5} />
        <div>
          <h3 className="emergency-title">Urgent Patient Alert</h3>
          <p className="emergency-text">Patient #P1042 requires priority attention.</p>
        </div>
      </div>

      {/* Patient Queue Card */}
      <div className="queue-card">
        <div className="queue-bg-icon">
          <Users size={140} strokeWidth={1} />
        </div>
        
        <div className="queue-header">
          <h2 className="queue-title">Patient Queue</h2>
          <span className="queue-badge">8 Waiting</span>
        </div>
        
        <div className="queue-stats">
          <div>
            <p className="queue-label">Next Patient</p>
            <p className="queue-val">Patient #P1024</p>
          </div>
          <div style={{textAlign: 'right'}}>
            <p className="queue-label">Waiting</p>
            <p className="queue-val">18 min</p>
          </div>
        </div>
        
        <button className="queue-btn" onClick={() => navigate && navigate('patients')}>
          <Eye size={18} strokeWidth={2.5} />
          View Queue
        </button>
      </div>

      {/* Summary Cards */}
      <div className="summary-grid">
        <div className="summary-card">
          <Calendar size={22} className="icon-blue" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">12</h3>
            <p className="summary-label">Today's Appointments</p>
          </div>
        </div>
        <div className="summary-card">
          <Users size={22} className="icon-blue" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">8</h3>
            <p className="summary-label">Patients Waiting</p>
          </div>
        </div>
        <div className="summary-card">
          <FileOutput size={22} className="icon-orange" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">3</h3>
            <p className="summary-label">Pending Referrals</p>
          </div>
        </div>
        <div className="summary-card">
          <Clock size={22} className="icon-teal" strokeWidth={2.5} />
          <div>
            <h3 className="summary-val">5</h3>
            <p className="summary-label">Follow-ups Due</p>
          </div>
        </div>
      </div>

      {/* Today's Appointments List */}
      <div className="section-header">
        <h2 className="section-title">Today's Appointments</h2>
        <a href="#" className="view-all">
          View All <ChevronRight size={14} strokeWidth={3} />
        </a>
      </div>

      <div className="appt-list">
        {/* Appointment 1 */}
        <div className="appt-card">
          <div className="appt-header">
            <div>
              <div className="appt-id-row">
                <span className="appt-id">#P1024</span>
                <span className="status-badge badge-waiting"><span className="indicator"></span> Waiting</span>
              </div>
              <h3 className="appt-name">Arun Kumar</h3>
              <p className="appt-details">09:30 AM • General Consultation</p>
            </div>
            <div className="appt-icon-box">
              <Calendar size={24} strokeWidth={2} />
            </div>
          </div>
          <button className="btn btn-primary appt-btn">
             Start Consultation
          </button>
        </div>

        {/* Appointment 2 */}
        <div className="appt-card">
          <div className="appt-header">
            <div>
              <div className="appt-id-row">
                <span className="appt-id">#P1027</span>
                <span className="status-badge badge-confirmed"><span className="indicator"></span> Confirmed</span>
              </div>
              <h3 className="appt-name">Meena Raj</h3>
              <p className="appt-details">10:00 AM • Follow-up</p>
            </div>
            <div className="appt-icon-box">
              <Calendar size={24} strokeWidth={2} />
            </div>
          </div>
          <button className="btn-outline appt-btn">
            View Details
          </button>
        </div>

        {/* Appointment 3 */}
        <div className="appt-card urgent">
          <div className="appt-header" style={{paddingLeft: '0.5rem'}}>
            <div>
              <div className="appt-id-row">
                <span className="appt-id">#P1042</span>
                <span className="status-badge badge-urgent"><span className="indicator"></span> Urgent</span>
              </div>
              <h3 className="appt-name">Ravi Kumar</h3>
              <p className="appt-details">10:30 AM • General Consultation</p>
            </div>
            <div className="appt-icon-box">
              <AlertTriangle size={24} strokeWidth={2} />
            </div>
          </div>
          <button className="btn-urgent appt-btn" style={{marginLeft: '0.5rem', width: 'calc(100% - 0.5rem)'}}>
             View Details
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <a href="#" className="nav-item active">
          <LayoutDashboard size={24} />
          <span className="nav-label">Dashboard</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate && navigate('patients'); }}>
          <Users size={24} />
          <span className="nav-label">Patients</span>
        </a>
        <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); navigate && navigate('appointments'); }}>
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
