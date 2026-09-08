import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';
import PatientQueue from './PatientQueue';
import PatientDetails from './PatientDetails';
import Consultation from './Consultation';
import CreateReferral from './CreateReferral';
import Appointments from './Appointments';
import Profile from './Profile';
import './doctor.css';

export default function DoctorApp() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');
  const navigateToRole = useNavigate();

  const renderScreen = () => {
    switch (currentScreen) {
      case 'login':
        return <Login onLogin={() => setCurrentScreen('dashboard')} />;
      case 'patients':
        return <PatientQueue navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
      case 'patient_details':
        return <PatientDetails navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
      case 'consultation':
        return <Consultation navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
      case 'create_referral':
        return <CreateReferral navigate={setCurrentScreen} />;
      case 'appointments':
        return <Appointments navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
      case 'profile':
        return <Profile navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
      case 'dashboard':
      default:
        return <Dashboard navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
    }
  };

  return (
    <div className="doctor-app-shell">
      <div className="doctor-role-bar">
        <span className="doctor-role-badge">Role: <strong>Doctor Portal</strong></span>
        <button
          type="button"
          onClick={() => navigateToRole('/')}
          className="doctor-switch-role-btn"
        >
          ← Switch Role
        </button>
      </div>
      {renderScreen()}
    </div>
  );
}
