import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AppLayout            from './components/AppLayout'
import LoginPage            from './pages/LoginPage'
import HomePage             from './pages/HomePage'
import PatientsPage         from './pages/PatientsPage'
import TasksPage            from './pages/TasksPage'
import ProfilePage          from './pages/ProfilePage'
import RegisterPatientPage  from './pages/RegisterPatientPage'
import ScreeningPage        from './pages/ScreeningPage'
import PatientSummaryPage   from './pages/PatientSummaryPage'
import ReferPatientPage     from './pages/ReferPatientPage'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated layout */}
        <Route path="/" element={<AppLayout />}>
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
