import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

const TIMELINE_STEPS = [
  { id: 1, title: 'Referral Initiated', time: '09:15 AM', status: 'completed', desc: 'Dr. Patil created referral slip #REF-8831' },
  { id: 2, title: 'Bed / OPD Reserved', time: '09:25 AM', status: 'completed', desc: 'District Hospital OPD Token #D-42 reserved' },
  { id: 3, title: 'Transport / Ambulance En Route', time: '09:40 AM', status: 'current', desc: '108 Ambulance MH-18-AZ-4412 on way' },
  { id: 4, title: 'Reception at District Hospital', time: 'Pending', status: 'pending', desc: 'Direct entry via triage desk' },
]

export default function TrackReferral({ onNavigate }) {
  return (
    <div className="page-container track-referral-page">
      <div className="status-overview-card">
        <span className="live-pill">● Live Tracking</span>
        <h2 className="overview-title">Referral in Progress</h2>
        <p className="overview-desc">Destination: District Civil Hospital (28 km)</p>
      </div>

      <div className="timeline-card">
        <h3 className="section-title">Transfer Milestones</h3>
        <div className="timeline-steps">
          {TIMELINE_STEPS.map((step) => (
            <div key={step.id} className={`timeline-item ${step.status}`}>
              <div className="timeline-bullet" />
              <div className="timeline-details">
                <div className="step-header">
                  <h4 className="step-name">{step.title}</h4>
                  <span className="step-time">{step.time}</span>
                </div>
                <p className="step-desc">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="action-buttons-stack">
        <PrimaryButton
          fullWidth
          variant="outline"
          onClick={() => onNavigate(SCREENS.REFERRAL)}
        >
          View Referral Slip
        </PrimaryButton>
        <PrimaryButton
          fullWidth
          variant="secondary"
          onClick={() => onNavigate(SCREENS.HOME)}
        >
          Back to Home
        </PrimaryButton>
      </div>
    </div>
  )
}
