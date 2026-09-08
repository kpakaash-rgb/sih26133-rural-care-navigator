import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import WorkerAppLayout         from './WorkerAppLayout'
import LoginPage               from './pages/LoginPage'
import HomePage                from './pages/HomePage'
import PatientsPage            from './pages/PatientsPage'
import TasksPage               from './pages/TasksPage'
import ProfilePage             from './pages/ProfilePage'
import RegisterPatientPage     from './pages/RegisterPatientPage'
import ScreeningPage           from './pages/ScreeningPage'
import PatientSummaryPage      from './pages/PatientSummaryPage'
import ReferPatientPage        from './pages/ReferPatientPage'

/**
 * Root router for the Worker SPA.
 * Uses basename="/worker" so all routes are nested under /worker in the browser URL.
 * This component is mounted by worker-main.jsx in its own React root — it shares
 * nothing with the Patient App.jsx.
 */
export default function WorkerApp() {
  return (
    <BrowserRouter basename="/worker">
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated layout shell */}
        <Route path="/" element={<WorkerAppLayout />}>
          <Route index element={<Navigate to="/home" replace />} />
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

        {/* Fallback → login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
