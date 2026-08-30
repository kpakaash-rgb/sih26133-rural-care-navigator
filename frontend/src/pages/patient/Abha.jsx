import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function Abha({ onNavigate }) {
  return (
    <div className="page-container abha-page">
      <div className="abha-card-preview">
        <div className="abha-card-top">
          <span className="gov-emblem">🇮🇳 National Health Authority</span>
          <span className="abha-brand">ABHA</span>
        </div>

        <div className="abha-card-middle">
          <div className="abha-avatar-box">👤</div>
          <div className="abha-patient-details">
            <h3 className="patient-name">Ramesh Patil</h3>
            <p className="patient-meta">Gender: Male | Year of Birth: 1984</p>
            <p className="patient-meta">Mobile: 9876543210</p>
          </div>
        </div>

        <div className="abha-number-box">
          <div className="abha-label">ABHA Number</div>
          <div className="abha-number">91-4432-8821-0092</div>
          <div className="abha-address">ramesh.patil@abdm</div>
        </div>

        <div className="abha-card-footer">
          <span className="qr-sim">📱 QR Scannable</span>
          <span className="linked-tag">✓ 3 Health Records Linked</span>
        </div>
      </div>

      <div className="abha-actions-card">
        <h3 className="section-title">ABHA Account Features</h3>
        <ul className="feature-list">
          <li>🔗 Paperless OPD Registration at all Govt & Network Hospitals</li>
          <li>📑 Digital Prescriptions & Lab Reports securely accessible</li>
          <li>🔒 Consent-driven sharing with Doctors and ASHA workers</li>
        </ul>
      </div>

      <div className="action-buttons-stack">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.HEALTH_JOURNEY)}
        >
          View Linked Health Records
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
