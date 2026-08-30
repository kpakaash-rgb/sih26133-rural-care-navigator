import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function Registration({ onNavigate }) {
  return (
    <div className="page-container registration-page">
      <div className="form-card">
        <h2 className="form-title">Patient Registration</h2>
        <p className="form-description">
          Register to maintain your medical history and book priority consultations.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onNavigate(SCREENS.HOME); }}>
          <div className="form-group">
            <label htmlFor="fullName" className="form-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="form-input"
              placeholder="e.g. Ramesh Patil"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age" className="form-label">
                Age
              </label>
              <input
                id="age"
                type="number"
                className="form-input"
                placeholder="Years"
                min="0"
                max="120"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="gender" className="form-label">
                Gender
              </label>
              <select id="gender" className="form-select" defaultValue="female">
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="village" className="form-label">
              Village / Gram Panchayat
            </label>
            <input
              id="village"
              type="text"
              className="form-input"
              placeholder="e.g. Shirpur Village"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="mobile" className="form-label">
              Mobile Number
            </label>
            <input
              id="mobile"
              type="tel"
              className="form-input"
              placeholder="10-digit number"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="abha" className="form-label">
              ABHA ID (Optional)
            </label>
            <input
              id="abha"
              type="text"
              className="form-input"
              placeholder="e.g. 14-digit ABHA number"
            />
          </div>

          <div className="form-actions">
            <PrimaryButton fullWidth type="submit" variant="primary">
              Create Profile & Continue
            </PrimaryButton>
          </div>
        </form>

        <div className="form-footer">
          <p>
            Already registered?{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate(SCREENS.LOGIN)}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
