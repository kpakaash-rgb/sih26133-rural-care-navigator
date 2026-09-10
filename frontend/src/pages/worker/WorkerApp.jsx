import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import './worker.css'
import WorkerAppLayout         from './WorkerAppLayout'
import HomePage                from './pages/HomePage'
import PatientsPage            from './pages/PatientsPage'
import TasksPage               from './pages/TasksPage'
import ProfilePage             from './pages/ProfilePage'
import RegisterPatientPage     from './pages/RegisterPatientPage'
import ScreeningPage           from './pages/ScreeningPage'
import PatientSummaryPage      from './pages/PatientSummaryPage'
import ReferPatientPage        from './pages/ReferPatientPage'

/**
 * Root router for the Frontline Worker sub-application.
 * Mounted at `/worker/*` under the application's single top-level BrowserRouter.
 */
export default function WorkerApp() {
  return (
    <div className="worker-app-shell">
      <Routes>
        {/* Redirect standalone worker login to unified staff login */}
        <Route path="login" element={<Navigate to="/staff/login" replace />} />

        {/* Authenticated layout shell */}
        <Route path="/" element={<WorkerAppLayout />}>
          <Route index element={<Navigate to="/worker/home" replace />} />
          <Route path="home"             element={<HomePage />} />
          <Route path="patients"         element={<PatientsPage />} />
          <Route path="patient-summary"  element={<PatientSummaryPage />} />
          <Route path="register-patient" element={<RegisterPatientPage />} />
          <Route path="screening"        element={<ScreeningPage />} />
          <Route path="refer-patient"    element={<ReferPatientPage />} />
          <Route path="patient-list"     element={<PatientsPage />} />
          <Route path="tasks"            element={<TasksPage />} />
          <Route path="profile"          element={<ProfilePage />} />
        </Route>

        {/* Fallback → /staff/login */}
        <Route path="*" element={<Navigate to="/staff/login" replace />} />
      </Routes>
    </div>
  )
}

