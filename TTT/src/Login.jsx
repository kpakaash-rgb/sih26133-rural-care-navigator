import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function Login() {
  const [formData, setFormData] = useState({
    identifier: '',
    accessCode: '',
    stayLoggedIn: false
  })
  const navigate = useNavigate()
  const { setIsLoggedIn } = useAuth()

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Login attempt:', formData)
    setIsLoggedIn(true)
    navigate('/dashboard')
  }

  return (
    <div className="ttt-login">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap');

        .ttt-login {
          min-height: 100vh;
          background: radial-gradient(circle at top, rgba(36, 80, 160, 0.2), transparent 40%),
            linear-gradient(180deg, #0a1220 0%, #0a1628 45%, #0b1c34 100%);
          color: #e6f1ff;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          padding: 40px 16px;
        }

        .ttt-grid {
          position: absolute;
          inset: 0;
          background-image: linear-gradient(90deg, rgba(0, 217, 255, 0.07) 1px, transparent 1px);
          background-size: 80px 100%;
          opacity: 0.25;
          pointer-events: none;
        }

        .ttt-card {
          width: min(420px, 100%);
          padding: 40px;
          border-radius: 14px;
          background: rgba(12, 20, 36, 0.7);
          border: 1px solid rgba(0, 164, 255, 0.2);
          box-shadow: 0 0 24px rgba(0, 153, 255, 0.22), 0 24px 60px rgba(2, 8, 20, 0.6);
          backdrop-filter: blur(12px);
          position: relative;
          z-index: 1;
        }

        .ttt-title {
          font-family: 'Orbitron', sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.18em;
          font-size: 20px;
          text-align: center;
          margin-bottom: 8px;
        }

        .ttt-subtitle {
          text-align: center;
          color: rgba(193, 219, 255, 0.65);
          font-size: 12px;
          margin-bottom: 28px;
        }

        .ttt-label {
          font-size: 11px;
          color: rgba(0, 185, 255, 0.9);
          letter-spacing: 0.18em;
          margin-bottom: 8px;
          display: block;
        }

        .ttt-field {
          position: relative;
          margin-bottom: 18px;
        }

        .ttt-input {
          width: 100%;
          background: rgba(8, 16, 30, 0.9);
          border: 1px solid rgba(0, 164, 255, 0.3);
          border-radius: 10px;
          color: #e6f1ff;
          padding: 12px 12px 12px 44px;
          font-size: 14px;
          outline: none;
          transition: border 0.2s ease, box-shadow 0.2s ease;
        }

        .ttt-input::placeholder {
          color: rgba(140, 170, 210, 0.6);
        }

        .ttt-input:focus {
          border-color: rgba(0, 195, 255, 0.8);
          box-shadow: 0 0 0 2px rgba(0, 195, 255, 0.15), 0 0 18px rgba(0, 195, 255, 0.25);
        }

        .ttt-icon {
          position: absolute;
          top: 50%;
          left: 14px;
          transform: translateY(-50%);
          color: rgba(160, 190, 230, 0.7);
          width: 18px;
          height: 18px;
        }

        .ttt-options {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin: 6px 0 22px;
          font-size: 11px;
          color: rgba(170, 196, 230, 0.7);
        }

        .ttt-options label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          letter-spacing: 0.08em;
        }

        .ttt-options a {
          color: rgba(0, 175, 255, 0.75);
          text-decoration: none;
          transition: color 0.2s ease;
        }

        .ttt-options a:hover {
          color: rgba(0, 210, 255, 0.95);
        }

        .ttt-button {
          width: 100%;
          border: none;
          border-radius: 10px;
          padding: 12px 16px;
          font-family: 'Orbitron', sans-serif;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          background: linear-gradient(90deg, #1f7adf, #1aa1ff);
          color: #e6f7ff;
          cursor: pointer;
          box-shadow: 0 0 16px rgba(25, 146, 255, 0.4);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .ttt-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 28px rgba(25, 176, 255, 0.55);
        }

        .ttt-footer {
          margin-top: 20px;
          text-align: center;
          font-size: 12px;
          color: rgba(170, 196, 230, 0.7);
        }

        .ttt-footer button {
          background: none;
          border: none;
          color: rgba(0, 175, 255, 0.85);
          letter-spacing: 0.12em;
          font-size: 12px;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .ttt-footer button:hover {
          color: rgba(0, 220, 255, 1);
        }

        .ttt-meta {
          display: flex;
          justify-content: space-between;
          margin-top: 28px;
          font-size: 10px;
          color: rgba(120, 145, 185, 0.7);
          letter-spacing: 0.12em;
        }

        @media (max-width: 480px) {
          .ttt-card {
            padding: 32px 24px;
          }

          .ttt-meta {
            flex-direction: column;
            gap: 8px;
            text-align: center;
          }
        }
      `}</style>

      <div className="ttt-grid"></div>

      <div className="ttt-card">
        <div className="ttt-title">LOG IN TO CONSOLE</div>
        <div className="ttt-subtitle">Enter your investigator credentials to begin.</div>

        <form onSubmit={handleSubmit}>
          <label className="ttt-label">&gt; IDENTIFIER</label>
          <div className="ttt-field">
            <svg className="ttt-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <input
              className="ttt-input"
              type="email"
              name="identifier"
              value={formData.identifier}
              onChange={handleInputChange}
              placeholder="agent@tracethetruth.com"
              required
            />
          </div>

          <label className="ttt-label">&gt; ACCESS_CODE</label>
          <div className="ttt-field">
            <svg className="ttt-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c1.657 0 3-1.343 3-3V7a3 3 0 10-6 0v1c0 1.657 1.343 3 3 3zm-7 8h14a2 2 0 002-2v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2a2 2 0 002 2z" />
            </svg>
            <input
              className="ttt-input"
              type="password"
              name="accessCode"
              value={formData.accessCode}
              onChange={handleInputChange}
              placeholder="••••••••"
              required
            />
          </div>

          <div className="ttt-options">
            <label>
              <input
                type="checkbox"
                name="stayLoggedIn"
                checked={formData.stayLoggedIn}
                onChange={handleInputChange}
              />
              STAY_LOGGED_IN
            </label>
            <a href="#">FORGOT ACCESS CODE?</a>
          </div>

          <button className="ttt-button" type="submit">
            [ ENTER_PLATFORM ]
          </button>
        </form>

        <div className="ttt-footer">
          New Investigator?{' '}
          <button type="button" onClick={() => navigate('/')}>
            [ REGISTER_HERE ]
          </button>
        </div>

        <div className="ttt-meta">
          <span>NODE: USER_NODE_04</span>
          <span>SESSION_ID: #X92_BETA</span>
        </div>
      </div>
    </div>
  )
}

export default Login
