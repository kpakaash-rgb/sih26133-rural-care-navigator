import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function CareGuidance({ onNavigate }) {
  return (
    <div className="page-container care-guidance-page">
      <div className="guidance-banner priority-moderate">
        <div className="guidance-badge">Priority Assessment: Moderate (Level 2)</div>
        <h2 className="guidance-title">Primary Health Centre Visit Recommended</h2>
        <p className="guidance-summary">
          Based on reported symptoms (Fever for 2-3 days), visit a Primary Health Centre
          within 24 hours for evaluation and fever profile check.
        </p>
      </div>

      <div className="guidance-card">
        <h3 className="section-title">Immediate Care & First Aid Steps</h3>
        <ul className="guidance-checklist">
          <li>
            <span className="check-icon">💧</span>
            <span>Drink plenty of clean boiled water / ORS fluids to prevent dehydration.</span>
          </li>
          <li>
            <span className="check-icon">🛌</span>
            <span>Take complete bed rest in a well-ventilated room.</span>
          </li>
          <li>
            <span className="check-icon">⚠️</span>
            <span>Do NOT consume unprescribed antibiotics or heavy analgesics.</span>
          </li>
        </ul>
      </div>

      <div className="recommended-action-box">
        <h3 className="section-title">Recommended Facility Near You</h3>
        <p className="section-subtitle">
          Primary Health Centre Shirpur has OPD active today.
        </p>
        <div className="action-buttons-stack">
          <PrimaryButton
            fullWidth
            variant="primary"
            onClick={() => onNavigate(SCREENS.BOOKING)}
          >
            Book Free OPD Slot at PHC Shirpur
          </PrimaryButton>
          <PrimaryButton
            fullWidth
            variant="outline"
            onClick={() => onNavigate(SCREENS.HEALTHCARE)}
          >
            View All Nearby Health Centres
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}
