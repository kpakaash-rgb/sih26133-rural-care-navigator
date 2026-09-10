import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { HeartPulse, Stethoscope, ArrowRight, ShieldCheck } from 'lucide-react'
import { getStaffSession } from '../services/api'
import { useLanguage } from '../i18n'
import LanguageSelector from '../components/LanguageSelector'
import './RoleSelection.css'

export default function RoleSelection() {
  const navigate = useNavigate()
  const { t } = useLanguage()

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
        
        {/* Language selector bar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <LanguageSelector />
        </div>

        {/* Brand & Platform Header */}
        <header className="role-brand-header">
          <div className="role-badge-pill">
            <ShieldCheck size={14} />
            <span>{t('roleSelection.network')}</span>
          </div>

          <div className="role-brand-logo-wrap">
            <img
              src="/mythri-icon.png"
              alt="Mythri"
              className="role-brand-logo-img"
            />
          </div>

          <h1 className="role-brand-title">{t('common.appName')}</h1>
          <p className="role-brand-subtitle">
            {t('common.tagline')}
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
                <h2 className="role-card-title">{t('roleSelection.patient')}</h2>
                <span className="role-tag role-tag-live">{t('roleSelection.publicAccess')}</span>
              </div>
              <p className="role-card-desc">
                {t('roleSelection.patientDesc')}
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
                <h2 className="role-card-title">{t('roleSelection.staff')}</h2>
                <span className="role-tag role-tag-verified">{t('roleSelection.authorizedStaff')}</span>
              </div>
              <p className="role-card-desc">
                {t('roleSelection.staffDesc')}
              </p>
            </div>
            <ArrowRight className="role-arrow-icon" size={20} />
          </button>

        </main>

      </div>
    </div>
  )
}
