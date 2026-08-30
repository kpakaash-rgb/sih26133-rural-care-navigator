import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

const JOURNEY_ENTRIES = [
  {
    date: '24 Aug 2026',
    title: 'CHC Taluka - Orthopedic Consultation',
    doctor: 'Dr. A. Kulkarni',
    summary: 'Sprain evaluated. X-Ray Normal. Paracetamol + Gel prescribed.',
    type: 'Consultation',
  },
  {
    date: '10 Jul 2026',
    title: 'Shirpur PHC - Routine Immunization & BP Check',
    doctor: 'ANM Rekha Gaikwad',
    summary: 'Blood pressure 120/80 mmHg. Normal vitals.',
    type: 'Routine Visit',
  },
  {
    date: '15 Mar 2026',
    title: 'Mobile Medical Unit - Eye Screening',
    doctor: 'Dr. V. Sharma',
    summary: 'Basic vision test completed. Free reading glasses prescribed.',
    type: 'Camp',
  },
]

export default function HealthJourney({ onNavigate }) {
  return (
    <div className="page-container health-journey-page">
      <div className="section-header">
        <h2 className="section-title">My Health Journey</h2>
        <p className="section-subtitle">
          Chronological record of visits, diagnoses, and treatments.
        </p>
      </div>

      <div className="journey-list">
        {JOURNEY_ENTRIES.map((entry, idx) => (
          <article key={idx} className="journey-card">
            <div className="journey-header">
              <span className="journey-badge">{entry.type}</span>
              <span className="journey-date">{entry.date}</span>
            </div>
            <h3 className="journey-title">{entry.title}</h3>
            <p className="journey-doctor">👨‍⚕️ {entry.doctor}</p>
            <p className="journey-summary">{entry.summary}</p>
          </article>
        ))}
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="outline"
          onClick={() => onNavigate(SCREENS.ABHA)}
        >
          View ABHA Linked Health Records
        </PrimaryButton>
      </div>
    </div>
  )
}
