import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function FacilityDetails({ onNavigate }) {
  return (
    <div className="page-container facility-details-page">
      <div className="facility-hero-card">
        <span className="facility-badge">PHC</span>
        <h2 className="facility-title">Shirpur Primary Health Centre</h2>
        <p className="facility-address">📍 Near Gram Panchayat Office, Shirpur, Taluka Dist.</p>
        <div className="facility-stats-grid">
          <div className="stat-card">
            <span className="stat-num">1.8 km</span>
            <span className="stat-lbl">Distance</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">12 mins</span>
            <span className="stat-lbl">Travel Time</span>
          </div>
          <div className="stat-card">
            <span className="stat-num">Open</span>
            <span className="stat-lbl">OPD Status</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Available Doctors Today</h3>
        <div className="doctor-item-card">
          <div className="doctor-avatar">👨‍⚕️</div>
          <div className="doctor-info">
            <h4 className="doctor-name">Dr. Sanjay Patil</h4>
            <p className="doctor-spec">MBBS, Medical Officer</p>
            <span className="status-pill status-online">● Present in OPD (Room 3)</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h3 className="section-title">Facility Infrastructure & Services</h3>
        <ul className="service-feature-list">
          <li>✅ Basic Diagnostic Lab (Blood, Urine, Malaria Rapid)</li>
          <li>✅ Free Essential Medicine Dispensary</li>
          <li>✅ Labour Room / Maternity Care</li>
          <li>✅ 108 Ambulance Dispatch Point</li>
        </ul>
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.AVAILABILITY)}
        >
          Check Doctor Slots & Tokens
        </PrimaryButton>
      </div>
    </div>
  )
}
