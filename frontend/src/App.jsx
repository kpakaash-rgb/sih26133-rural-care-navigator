import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RoleSelection from './pages/RoleSelection'
import PatientApp from './pages/patient/PatientApp'
import DoctorPlaceholder from './pages/doctor/DoctorPlaceholder'
import WorkerApp from './pages/worker/WorkerApp'

/**
 * Root Application Router
 *
 * Architecture:
 * /          → Role Selection (Patient / Doctor / Frontline Worker)
 * /patient/* → Patient Flow (Preserves all existing 21 screens and state transitions)
 * /doctor/*  → Doctor Module (Placeholder until Phase 5)
 * /worker/*  → Frontline Worker Module (Complete SPA flow)
 */
function App() {
  return (
    <Routes>
      {/* Role Selection Landing */}
      <Route path="/" element={<RoleSelection />} />

      {/* Patient Application */}
      <Route path="/patient" element={<PatientApp />} />
      <Route path="/patient/*" element={<PatientApp />} />

      {/* Doctor Module Placeholder */}
      <Route path="/doctor" element={<DoctorPlaceholder />} />
      <Route path="/doctor/*" element={<DoctorPlaceholder />} />

      {/* Frontline Worker Module */}
      <Route path="/worker/*" element={<WorkerApp />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App