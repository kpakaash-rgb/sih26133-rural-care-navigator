import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function Booking({ onNavigate }) {
  return (
    <div className="page-container booking-page">
      <div className="booking-summary-card">
        <h3 className="card-mini-title">Appointment Summary</h3>
        <div className="summary-row">
          <span className="summary-label">Facility:</span>
          <span className="summary-val">Shirpur PHC (Room 3)</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Doctor:</span>
          <span className="summary-val">Dr. Sanjay Patil</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Date & Time:</span>
          <span className="summary-val">Today, 10:00 AM - 11:00 AM</span>
        </div>
        <div className="summary-row">
          <span className="summary-label">Consultation Fee:</span>
          <span className="summary-val free-tag">FREE (Govt Public Health)</span>
        </div>
      </div>

      <div className="form-card">
        <h3 className="section-title">Patient Details</h3>
        <form onSubmit={(e) => { e.preventDefault(); onNavigate(SCREENS.APPOINTMENT_CONFIRMED); }}>
          <div className="form-group">
            <label htmlFor="patientName" className="form-label">
              Patient Full Name
            </label>
            <input
              id="patientName"
              type="text"
              className="form-input"
              defaultValue="Ramesh Patil"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="patientAge" className="form-label">
                Age
              </label>
              <input
                id="patientAge"
                type="number"
                className="form-input"
                defaultValue="42"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="patientGender" className="form-label">
                Gender
              </label>
              <select id="patientGender" className="form-select" defaultValue="male">
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="patientPhone" className="form-label">
              Mobile for SMS Token
            </label>
            <input
              id="patientPhone"
              type="tel"
              className="form-input"
              defaultValue="9876543210"
              required
            />
          </div>

          <div className="form-actions">
            <PrimaryButton fullWidth type="submit" variant="primary">
              Confirm OPD Token Booking
            </PrimaryButton>
          </div>
        </form>
      </div>
    </div>
  )
}
