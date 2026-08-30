import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

export default function Login({ onNavigate }) {
  return (
    <div className="page-container login-page">
      <div className="form-card">
        <h2 className="form-title">Patient Login</h2>
        <p className="form-description">
          Enter your 10-digit mobile number or ABHA ID to receive an OTP.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); onNavigate(SCREENS.HOME); }}>
          <div className="form-group">
            <label htmlFor="mobile" className="form-label">
              Mobile Number / ABHA ID
            </label>
            <input
              id="mobile"
              type="tel"
              className="form-input"
              placeholder="e.g. 9876543210"
              maxLength={14}
            />
          </div>

          <div className="form-group">
            <label htmlFor="otp" className="form-label">
              One-Time Password (OTP)
            </label>
            <input
              id="otp"
              type="text"
              className="form-input"
              placeholder="Enter 4 or 6-digit OTP"
              maxLength={6}
            />
          </div>

          <div className="form-actions">
            <PrimaryButton fullWidth type="submit" variant="primary">
              Verify & Sign In
            </PrimaryButton>
          </div>
        </form>

        <div className="form-footer">
          <p>
            Don't have an account?{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => onNavigate(SCREENS.REGISTRATION)}
            >
              Register Here
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
