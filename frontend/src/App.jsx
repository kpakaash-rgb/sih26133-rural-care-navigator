import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RoleSelection from './pages/RoleSelection'
import PatientApp from './pages/patient/PatientApp'
import DoctorApp from './pages/doctor/DoctorApp'
import WorkerApp from './pages/worker/WorkerApp'

/**
 * Root Application Router
 *
 * Architecture:
 * /          → Role Selection (Patient / Doctor / Frontline Worker)
 * /patient/* → Patient Flow (Preserves all existing 21 screens and state transitions)
 * /doctor/*  → Doctor Flow (Preserves existing state-machine navigation and 8 screens)
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

      {/* Doctor Application */}
      <Route path="/doctor" element={<DoctorApp />} />
      <Route path="/doctor/*" element={<DoctorApp />} />

      {/* Frontline Worker Module */}
      <Route path="/worker/*" element={<WorkerApp />} />

      {/* Catch-all Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App