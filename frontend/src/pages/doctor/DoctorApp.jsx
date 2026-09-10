import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Dashboard from './Dashboard';
import PatientQueue from './PatientQueue';
import PatientDetails from './PatientDetails';
import Consultation from './Consultation';
import CreateReferral from './CreateReferral';
import Appointments from './Appointments';
import Profile from './Profile';
import { getStaffSession, clearStaffSession } from '../../services/api';
import './doctor.css';

export default function DoctorApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [selectedAppointmentId, setSelectedAppointmentId] = useState(null);
  const navigate = useNavigate();
  const session = getStaffSession();

  // Role guard: Ensure valid DOCTOR session. If missing or role mismatch, redirect to /staff/login
  useEffect(() => {
    const current = getStaffSession();
    if (!current || !current.token || current.role !== 'DOCTOR') {
      navigate('/staff/login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    clearStaffSession();
    navigate('/staff/login', { replace: true });
  };

  const openPatient = (patientId, appointmentId = null) => {
    setSelectedPatientId(patientId);
    setSelectedAppointmentId(appointmentId);
    setCurrentScreen('patient_details');
  };

  const startConsultation = (patientId, appointmentId = null) => {
    setSelectedPatientId(patientId);
    setSelectedAppointmentId(appointmentId);
    setCurrentScreen('consultation');
  };

  const startReferral = (patientId, appointmentId = null) => {
    setSelectedPatientId(patientId);
    setSelectedAppointmentId(appointmentId);
    setCurrentScreen('create_referral');
  };

  // If not authenticated as doctor, do not render protected contents
  if (!session || !session.token || session.role !== 'DOCTOR') {
    return null;
  }

  const doctorName = session.user?.name || 'Doctor';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'patients':
        return (
          <PatientQueue
            navigate={setCurrentScreen}
            onLogout={handleLogout}
            openPatient={openPatient}
            startConsultation={startConsultation}
          />
        );
      case 'patient_details':
        return (
          <PatientDetails
            navigate={setCurrentScreen}
            onLogout={handleLogout}
            patientId={selectedPatientId}
            appointmentId={selectedAppointmentId}
            startConsultation={startConsultation}
            startReferral={startReferral}
          />
        );
      case 'consultation':
        return (
          <Consultation
            navigate={setCurrentScreen}
            onLogout={handleLogout}
            patientId={selectedPatientId}
            appointmentId={selectedAppointmentId}
            startReferral={startReferral}
          />
        );
      case 'create_referral':
        return (
          <CreateReferral
            navigate={setCurrentScreen}
            patientId={selectedPatientId}
            appointmentId={selectedAppointmentId}
          />
        );
      case 'appointments':
        return (
          <Appointments
            navigate={setCurrentScreen}
            onLogout={handleLogout}
            openPatient={openPatient}
            startConsultation={startConsultation}
          />
        );
      case 'profile':
        return <Profile navigate={setCurrentScreen} onLogout={handleLogout} />;
      case 'dashboard':
      default:
        return (
          <Dashboard
            navigate={setCurrentScreen}
            onLogout={handleLogout}
            openPatient={openPatient}
            startConsultation={startConsultation}
          />
        );
    }
  };

  return (
    <div className="doctor-app-shell">
      <div className="doctor-role-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="doctor-role-badge">Role: <strong>Doctor Portal</strong></span>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>({doctorName})</span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={handleLogout}
            className="doctor-switch-role-btn"
            style={{ borderColor: '#ef4444', color: '#dc2626' }}
            id="doctor-logout-btn"
          >
            Sign Out
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="doctor-switch-role-btn"
          >
            ← Portal Home
          </button>
        </div>
      </div>
      {renderScreen()}
    </div>
  );
}
