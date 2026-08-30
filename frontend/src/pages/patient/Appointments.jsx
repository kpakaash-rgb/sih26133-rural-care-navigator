import { useState } from 'react'
import AppointmentCard from '../../components/AppointmentCard'
import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

const APPOINTMENTS_DATA = [
  {
    id: 'apt-01',
    facilityName: 'Shirpur Primary Health Centre',
    doctorName: 'Dr. Sanjay Patil (Medical Officer)',
    department: 'General OPD',
    date: 'Today, 10:30 AM',
    tokenNumber: 'T-14',
    status: 'confirmed',
  },
  {
    id: 'apt-02',
    facilityName: 'Taluka Community Health Centre',
    doctorName: 'Dr. A. Kulkarni (Orthopedic)',
    department: 'Specialist OPD',
    date: '24 Aug 2026, 11:00 AM',
    tokenNumber: 'T-06',
    status: 'completed',
  },
]

export default function Appointments({ onNavigate }) {
  const [tab, setTab] = useState('upcoming')

  return (
    <div className="page-container appointments-page">
      <div className="tab-buttons-row">
        <button
          type="button"
          className={`tab-btn ${tab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          Upcoming (1)
        </button>
        <button
          type="button"
          className={`tab-btn ${tab === 'history' ? 'active' : ''}`}
          onClick={() => setTab('history')}
        >
          Past Visits (1)
        </button>
      </div>

      <div className="appointments-list">
        {tab === 'upcoming' ? (
          <AppointmentCard
            {...APPOINTMENTS_DATA[0]}
            onViewDetails={() => onNavigate(SCREENS.APPOINTMENT_CONFIRMED)}
          />
        ) : (
          <AppointmentCard
            {...APPOINTMENTS_DATA[1]}
            onViewDetails={() => onNavigate(SCREENS.HEALTH_JOURNEY)}
          />
        )}
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.HEALTHCARE)}
        >
          + Book New Consultation
        </PrimaryButton>
      </div>
    </div>
  )
}
