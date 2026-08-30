import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function FollowUp({ onNavigate }) {
  return (
    <div className="page-container follow-up-page">
      <div className="followup-alert-card">
        <span className="reminder-tag">🔔 Scheduled Follow-Up</span>
        <h2 className="followup-title">Post-Consultation Health Check</h2>
        <p className="followup-subtitle">
          From your visit at Shirpur PHC on 28 Aug 2026.
        </p>
      </div>

      <div className="form-card">
        <h3 className="section-title">How are you feeling today?</h3>
        <p className="section-subtitle">Select your recovery status</p>
        <div className="feedback-options-stack">
          <label className="feedback-option">
            <input type="radio" name="recovery" defaultChecked />
            <span>😊 Much Better / Symptoms Resolved</span>
          </label>
          <label className="feedback-option">
            <input type="radio" name="recovery" />
            <span>😐 Same / Mild Discomfort Persists</span>
          </label>
          <label className="feedback-option">
            <input type="radio" name="recovery" />
            <span>🤒 Worse / New Symptoms Developed</span>
          </label>
        </div>

        <div className="medicine-checklist-card">
          <h4 className="card-mini-title">Medication Adherence</h4>
          <label className="checkbox-item">
            <input type="checkbox" defaultChecked />
            <span>Completed 3-day course of Paracetamol 500mg</span>
          </label>
          <label className="checkbox-item">
            <input type="checkbox" defaultChecked />
            <span>Taking warm fluids & adequate rest</span>
          </label>
        </div>

        <div className="form-actions">
          <PrimaryButton
            fullWidth
            variant="primary"
            onClick={() => onNavigate(SCREENS.HOME)}
          >
            Submit Follow-Up Response
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
