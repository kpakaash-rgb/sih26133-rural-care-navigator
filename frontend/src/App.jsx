import React from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { Users, ArrowLeft } from 'lucide-react'
import RoleSelection from './pages/RoleSelection'
import PatientApp from './pages/patient/PatientApp'
import DoctorPlaceholder from './pages/doctor/DoctorPlaceholder'

/**
 * Temporary Frontline Worker Module placeholder.
 * Replaced in Phase 4 when Worker routing is un-nested and integrated.
 */
function WorkerPlaceholder() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#F8FAFC',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: '#DCFCE7',
        color: '#059669',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Users size={32} />
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
        Frontline Worker Module
      </h1>

      <p style={{ color: '#64748B', maxWidth: 360, marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.5 }}>
        Integration in progress. Sub-router migration will complete in Phase 4.
      </p>

      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 12,
          background: '#0A58CA',
          color: '#FFFFFF',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} />
        Back to Role Selection
      </button>
    </div>
  )
}

/**
 * Root Application Router
 *
 * Architecture:
 * /          → Role Selection (Patient / Doctor / Frontline Worker)
 * /patient/* → Patient Flow (Preserves all existing 21 screens and state transitions)
 * /doctor/*  → Doctor Module (Placeholder until Phase 3)
 * /worker/*  → Frontline Worker Module (Placeholder until Phase 4)
 */
function App() {
  return (
    <Routes>
      {/* Role Selection Landing */}
      <Route path="/" element={<RoleSelection />} />

      {/* Patient Application */}
      <Route path="/patient/*" element={<PatientApp />} />

      {/* Doctor Module Placeholder (Integration in Phase 3) */}
      <Route path="/doctor/*" element={<DoctorPlaceholder />} />

      {/* Frontline Worker Module Placeholder (Integration in Phase 4) */}
      <Route path="/worker/*" element={<WorkerPlaceholder />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App