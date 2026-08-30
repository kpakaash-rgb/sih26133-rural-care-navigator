import PrimaryButton from '../../components/PrimaryButton'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Welcome({ onNavigate }) {
  return (
    <div className="page-container welcome-page">
      <div className="welcome-hero">
        <div className="brand-badge">🌾 Public Health Initiative</div>
        <h2 className="welcome-title">Welcome to Rural Care Navigator</h2>
        <p className="welcome-description">
          Fast, accessible healthcare coordination for rural communities. Check
          symptoms, find doctors, book OPD slots, and access government health schemes.
        </p>
      </div>

      <div className="quick-actions-card">
        <h3 className="section-title">Get Started</h3>
        <p className="section-subtitle">Choose how you want to continue</p>
        <div className="action-buttons-stack">
          <PrimaryButton
            fullWidth
            onClick={() => onNavigate(SCREENS.LOGIN)}
            variant="primary"
          >
            Login with Mobile Number
          </PrimaryButton>
          <PrimaryButton
            fullWidth
            onClick={() => onNavigate(SCREENS.REGISTRATION)}
            variant="outline"
          >
            New Patient Registration
          </PrimaryButton>
          <PrimaryButton
            fullWidth
            onClick={() => onNavigate(SCREENS.HOME)}
            variant="secondary"
          >
            Continue as Guest / Explore
          </PrimaryButton>
        </div>
      </div>

      <div className="emergency-banner-box">
        <p className="emergency-note">Need immediate medical help?</p>
        <SOSButton />
      </div>
    </div>
  )
}
