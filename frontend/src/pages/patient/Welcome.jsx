import { SCREENS } from '../../utils/constants'

export default function Welcome({ onNavigate }) {
  return (
    <div className="welcome-screen-container">
      <div className="welcome-center-content">
        <div className="welcome-icon-box" aria-hidden="true">
          <svg
            className="welcome-medical-icon"
            width="50"
            height="50"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Bag Handle */}
            <path
              d="M18 14V10.5C18 9.11929 19.1193 8 20.5 8H27.5C28.8807 8 30 9.11929 30 10.5V14"
              stroke="#00478f"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Bag Body */}
            <rect x="8" y="14" width="32" height="26" rx="6" fill="#00478f" />
            {/* Medical Cross */}
            <path
              d="M24 21V33"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
            <path
              d="M18 27H30"
              stroke="white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="welcome-heading">
          Welcome to Rural<br />Care Navigator
        </h1>

        <p className="welcome-subheading">
          Your companion for easy access to healthcare in rural communities.
        </p>
      </div>

      <div className="welcome-actions">
        <button
          type="button"
          className="welcome-btn-primary"
          onClick={() => onNavigate(SCREENS.REGISTRATION)}
        >
          <span>Register as New Patient</span>
          <span className="welcome-btn-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          className="welcome-btn-secondary"
          onClick={() => onNavigate(SCREENS.LOGIN)}
        >
          Login
        </button>
      </div>
    </div>
  )
}
