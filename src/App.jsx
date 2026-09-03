import { useState } from 'react';
import Login from './Login';
import Dashboard from './Dashboard';
import PatientQueue from './PatientQueue';
import PatientDetails from './PatientDetails';
import Consultation from './Consultation';
import CreateReferral from './CreateReferral';
import Appointments from './Appointments';
import Profile from './Profile';

function App() {
  const [currentScreen, setCurrentScreen] = useState('dashboard');

  if (currentScreen === 'login') {
    return <Login onLogin={() => setCurrentScreen('dashboard')} />;
  }

  if (currentScreen === 'patients') {
    return <PatientQueue navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
  }

  if (currentScreen === 'patient_details') {
    return <PatientDetails navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
  }

  if (currentScreen === 'consultation') {
    return <Consultation navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
  }

  if (currentScreen === 'create_referral') {
    return <CreateReferral navigate={setCurrentScreen} />;
  }

  if (currentScreen === 'appointments') {
    return <Appointments navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
  }

  if (currentScreen === 'profile') {
    return <Profile navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
  }
  
  return <Dashboard navigate={setCurrentScreen} onLogout={() => setCurrentScreen('login')} />;
}

export default App;
