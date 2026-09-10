import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Stethoscope, ArrowRight, ShieldCheck, Activity } from 'lucide-react'
import { getStaffSession } from '../services/api'
import './RoleSelection.css'

export default function RoleSelection() {
  const navigate = useNavigate()

  // If a valid session already exists, route directly to the respective portal
  useEffect(() => {
    const staffSession = getStaffSession()
    if (staffSession && staffSession.token) {
      if (staffSession.role === 'DOCTOR') {
        navigate('/doctor', { replace: true })
        return
      }
      if (staffSession.role === 'WORKER') {
        navigate('/worker/home', { replace: true })
        return
      }
    }

    const patientToken = localStorage.getItem('access_token')
    if (patientToken) {
      navigate('/patient', { replace: true })
    }
  }, [navigate])

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
          
          {/* 1. PATIENT */}
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
                <span className="role-tag role-tag-live">Public Access</span>
              </div>
              <p className="role-card-desc">
                For patients seeking healthcare
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

          {/* 2. HEALTHCARE STAFF */}
          <button
            type="button"
            className="role-card-btn role-card-staff"
            onClick={() => navigate('/staff/login')}
            id="role-card-staff"
          >
            <div className="role-icon-box">
              <Stethoscope size={26} strokeWidth={2.2} />
            </div>
            <div className="role-card-content">
              <div className="role-card-title-row">
                <h2 className="role-card-title">Healthcare Staff</h2>
                <span className="role-tag role-tag-verified">Authorized Staff</span>
              </div>
              <p className="role-card-desc">
                For doctors and frontline healthcare workers
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

        </main>

        {/* Platform Footer */}
        <footer className="role-footer">
          <div className="role-footer-indicators">
            <span><span className="role-dot"></span>FastAPI Connected</span>
            <span><span className="role-dot"></span>Role Security Active</span>
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
