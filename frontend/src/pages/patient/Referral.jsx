import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function Referral({ onNavigate }) {
  return (
    <div className="page-container referral-page">
      <div className="referral-slip-card">
        <div className="referral-header">
          <span className="referral-tag">Official Health Referral</span>
          <h2 className="referral-title">Ref # REF-2026-8831</h2>
        </div>

        <div className="referral-route-box">
          <div className="route-step">
            <span className="step-badge">From</span>
            <div className="step-info">
              <h4>Shirpur PHC</h4>
              <p>Referred by Dr. Sanjay Patil</p>
            </div>
          </div>
          <div className="route-arrow">⬇️ Transfer for Specialist Care</div>
          <div className="route-step highlight">
            <span className="step-badge target">To</span>
            <div className="step-info">
              <h4>District Civil Hospital</h4>
              <p>Department of Cardiology / General Medicine</p>
            </div>
          </div>
        </div>

        <div className="referral-meta-list">
          <div className="meta-row">
            <span className="lbl">Diagnosis Summary:</span>
            <span className="val">Suspected Angina / ECG Evaluation</span>
          </div>
          <div className="meta-row">
            <span className="lbl">Urgency:</span>
            <span className="val badge-danger">Priority within 24h</span>
          </div>
          <div className="meta-row">
            <span className="lbl">Ambulance Arranged:</span>
            <span className="val">108 Dialed (ETA 18 mins)</span>
          </div>
        </div>
      </div>

      <div className="action-buttons-stack">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.TRACK_REFERRAL)}
        >
          Track Live Referral Status
        </PrimaryButton>
        <PrimaryButton
          fullWidth
          variant="outline"
          onClick={() => onNavigate(SCREENS.HOME)}
        >
          Back to Home
        </PrimaryButton>
      </div>
    </div>
  )
}
