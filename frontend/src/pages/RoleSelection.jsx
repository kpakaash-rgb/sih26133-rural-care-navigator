import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Stethoscope, Users, ArrowRight, ShieldCheck, Activity } from 'lucide-react'
import './RoleSelection.css'

export default function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div className="role-selection-wrapper">
      <div className="role-selection-container">
        
        {/* Brand & Platform Header */}
        <header className="role-brand-header">
          <div className="role-badge-pill">
            <ShieldCheck size={14} />
            <span>National Rural Health Network</span>
          </div>

          <div className="role-brand-logo-wrap">
            <Activity size={30} strokeWidth={2.4} />
          </div>

          <h1 className="role-brand-title">Rural Care Navigator</h1>
          <p className="role-brand-subtitle">
            One unified healthcare platform connecting rural patients, doctors, and frontline workers.
          </p>
        </header>

        {/* Role Cards Stack */}
        <main className="role-cards-stack">
          
          {/* 1. PATIENT ROLE */}
          <button
            type="button"
            className="role-card-btn role-card-patient"
            onClick={() => navigate('/patient')}
            id="role-card-patient"
          >
            <div className="role-icon-box">
              <HeartPulse size={26} strokeWidth={2.2} />
            </div>
            <div className="role-card-content">
              <div className="role-card-title-row">
                <h2 className="role-card-title">Patient</h2>
                <span className="role-tag role-tag-live">Active</span>
              </div>
              <p className="role-card-desc">
                Find the right care, check availability, book appointments and track your care.
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

          {/* 2. DOCTOR ROLE */}
          <button
            type="button"
            className="role-card-btn role-card-doctor"
            onClick={() => navigate('/doctor')}
            id="role-card-doctor"
          >
            <div className="role-icon-box">
              <Stethoscope size={26} strokeWidth={2.2} />
            </div>
            <div className="role-card-content">
              <div className="role-card-title-row">
                <h2 className="role-card-title">Doctor</h2>
                <span className="role-tag role-tag-dev">Phase 3/4</span>
              </div>
              <p className="role-card-desc">
                Manage appointments, review patients, consult and create referrals.
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

          {/* 3. FRONTLINE WORKER ROLE */}
          <button
            type="button"
            className="role-card-btn role-card-worker"
            onClick={() => navigate('/worker')}
            id="role-card-worker"
          >
            <div className="role-icon-box">
              <Users size={26} strokeWidth={2.2} />
            </div>
            <div className="role-card-content">
              <div className="role-card-title-row">
                <h2 className="role-card-title">Frontline Worker</h2>
                <span className="role-tag role-tag-dev">Phase 4</span>
              </div>
              <p className="role-card-desc">
                Register patients, perform screening, manage tasks and support referrals.
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

        </main>

        {/* Platform Footer */}
        <footer className="role-footer">
          <div className="role-footer-indicators">
            <span><span className="role-dot"></span>FastAPI Connected</span>
            <span><span className="role-dot"></span>AI Triage Ready</span>
            <span><span className="role-dot"></span>Offline PWA</span>
          </div>
          <p className="role-footer-copy">
            Smart India Hackathon • SIH 26133
          </p>
        </footer>

      </div>
    </div>
  )
}
