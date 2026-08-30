import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function AppointmentConfirmed({ onNavigate }) {
  return (
    <div className="page-container confirmed-page">
      <div className="success-banner">
        <div className="success-icon">✅</div>
        <h2 className="success-title">Appointment Confirmed!</h2>
        <p className="success-subtitle">
          Your OPD token has been generated and sent via SMS.
        </p>
      </div>

      <div className="token-slip-card">
        <div className="token-top-bar">
          <span className="token-id">OPD Token #</span>
          <span className="token-big">T-14</span>
        </div>

        <div className="slip-content">
          <div className="slip-row">
            <span className="slip-label">Facility:</span>
            <span className="slip-val">Shirpur PHC</span>
          </div>
          <div className="slip-row">
            <span className="slip-label">Doctor:</span>
            <span className="slip-val">Dr. Sanjay Patil</span>
          </div>
          <div className="slip-row">
            <span className="slip-label">Date & Time:</span>
            <span className="slip-val">Today, 10:00 AM - 11:00 AM</span>
          </div>
          <div className="slip-row">
            <span className="slip-label">Patient:</span>
            <span className="slip-val">Ramesh Patil (42 M)</span>
          </div>
        </div>

        <div className="qr-placeholder-box">
          <div className="qr-box">📱 QR Code for OPD Counter Scan</div>
          <p className="qr-caption">Show this screen or SMS at PHC Registration desk.</p>
        </div>
      </div>

      <div className="action-buttons-stack">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.APPOINTMENTS)}
        >
          View in My Appointments
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
