import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

const MMU_SCHEDULE = [
  {
    village: 'Shirpur Gram Panchayat Basti',
    date: 'Today (31 Aug)',
    timing: '10:00 AM - 01:30 PM',
    status: 'arrived',
    location: 'Community Hall Grounds',
  },
  {
    village: 'Wada Pada Ward 4',
    date: 'Tomorrow (1 Sep)',
    timing: '09:30 AM - 01:00 PM',
    status: 'scheduled',
    location: 'Zilla Parishad School',
  },
  {
    village: 'Kalyanpur Tanda',
    date: 'Wednesday (2 Sep)',
    timing: '10:00 AM - 02:00 PM',
    status: 'scheduled',
    location: 'Temple Chowk',
  },
]

export default function MobileClinic({ onNavigate }) {
  return (
    <div className="page-container mobile-clinic-page">
      <div className="mmu-live-card">
        <div className="live-header">
          <span className="live-pill">● MMU Unit #3 Active</span>
          <span className="mmu-van-icon">🚐</span>
        </div>
        <h2 className="mmu-title">Mobile Medical Unit (MMU)</h2>
        <p className="mmu-subtitle">
          Doctor, Lab Technician, and free medicines coming to your village.
        </p>
        <div className="mmu-current-location-box">
          <span className="loc-label">Current Stop:</span>
          <span className="loc-val">Shirpur Gram Panchayat Grounds</span>
          <span className="status-pill status-online">Arrived & Operating</span>
        </div>
      </div>

      <div className="schedule-section">
        <h3 className="section-title">Upcoming Village Route Schedule</h3>
        <div className="schedule-list">
          {MMU_SCHEDULE.map((sch, i) => (
            <div key={i} className={`schedule-card ${sch.status}`}>
              <div className="sch-top">
                <h4 className="sch-village">{sch.village}</h4>
                <span className="sch-date">{sch.date}</span>
              </div>
              <p className="sch-timing">⏰ {sch.timing}</p>
              <p className="sch-location">📍 {sch.location}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.HOME)}
        >
          Back to Dashboard
        </PrimaryButton>
      </div>
    </div>
  )
}
