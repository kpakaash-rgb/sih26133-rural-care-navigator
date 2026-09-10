import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import RoleSelection from './pages/RoleSelection'
import StaffLogin from './pages/staff/StaffLogin'
import PatientApp from './pages/patient/PatientApp'
import DoctorApp from './pages/doctor/DoctorApp'
import WorkerApp from './pages/worker/WorkerApp'
import { LanguageProvider } from './i18n'

/**
 * Root Application Router
 *
 * Architecture:
 * /            → Role Selection (Patient / Healthcare Staff)
 * /staff/login → Healthcare Staff Login (Doctors & Frontline Workers)
 * /patient/*   → Patient Flow (Preserves all existing 21 screens and state transitions)
 * /doctor/*    → Doctor Flow (Preserves existing state-machine navigation and 8 screens)
 * /worker/*    → Frontline Worker Module (Complete SPA flow)
 */
function App() {
  return (
    <LanguageProvider>
      <Routes>
        {/* Role Selection Landing */}
        <Route path="/" element={<RoleSelection />} />

        {/* Healthcare Staff Authentication */}
        <Route path="/staff/login" element={<StaffLogin />} />
        <Route path="/staff" element={<Navigate to="/staff/login" replace />} />
        <Route path="/staff/*" element={<Navigate to="/staff/login" replace />} />

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
    </LanguageProvider>
  )
}

export default App