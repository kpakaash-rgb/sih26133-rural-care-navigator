import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function SchemeDetails({ onNavigate }) {
  return (
    <div className="page-container scheme-details-page">
      <div className="scheme-header-card">
        <span className="scheme-badge">National Scheme</span>
        <h2 className="scheme-title">Ayushman Bharat (PM-JAY)</h2>
        <p className="scheme-subtitle">
          Pradhan Mantri Jan Arogya Yojana - National Health Protection Mission
        </p>
        <div className="scheme-highlight-box">
          <span className="highlight-amount">₹5,00,000 / year</span>
          <span className="highlight-label">Cashless Health Cover per Family</span>
        </div>
      </div>

      <div className="scheme-section">
        <h3 className="section-title">Eligibility Checklist</h3>
        <ul className="checklist">
          <li>✅ Families categorized under SECC 2011 rural database</li>
          <li>✅ Holders of BPL / Antyodaya Ration Cards</li>
          <li>✅ No age bar or family size cap</li>
        </ul>
      </div>

      <div className="scheme-section">
        <h3 className="section-title">Required Documents</h3>
        <div className="documents-grid">
          <div className="doc-item">📄 Aadhaar Card of family members</div>
          <div className="doc-item">🌾 Ration Card / Proof of address</div>
          <div className="doc-item">🪪 ABHA Health ID</div>
        </div>
      </div>

      <div className="scheme-section">
        <h3 className="section-title">Empaneled Facilities in Taluka</h3>
        <p className="section-subtitle">
          District Hospital & Sub-district CHC offer full cashless admission.
        </p>
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.HEALTHCARE)}
        >
          Find PM-JAY Empaneled Hospitals
        </PrimaryButton>
      </div>
    </div>
  )
}
