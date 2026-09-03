import { useState } from 'react';
import { BriefcaseMedical, Smartphone, Lock, Eye, EyeOff, KeyRound } from 'lucide-react';
import './index.css';

export default function Login({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="app-container">
      {/* --- BRANDING HEADER --- */}
      <header className="brand-header">
        <div className="brand-icon">
          <BriefcaseMedical size={28} strokeWidth={2} />
        </div>
        <h1 className="brand-name">Rural Care Navigator</h1>
        <p className="brand-role">Doctor / Healthcare Professional</p>
      </header>

      {/* --- LOGIN CARD --- */}
      <main className="login-card">
        <div className="card-header">
          <h2 className="card-title">Doctor Login</h2>
          <p className="card-subtitle">Sign in to manage patients and consultations.</p>
        </div>

        <form className="login-form" onSubmit={(e) => { e.preventDefault(); onLogin && onLogin(); }}>
          {/* Mobile Number Field */}
          <div className="input-group">
            <label htmlFor="mobile">MOBILE NUMBER</label>
            <div className="input-wrapper">
              <Smartphone className="input-icon" size={20} />
              <input
                type="tel"
                id="mobile"
                placeholder="(555) 000-0000"
                className="form-input"
                autoComplete="tel"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="input-group">
            <label htmlFor="password">PASSWORD</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                placeholder="••••••••"
                className="form-input"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className="forgot-password">
            <a href="#" className="text-link">Forgot Password?</a>
          </div>

          {/* Primary CTA */}
          <button type="submit" className="btn btn-primary">
            Sign In
          </button>

          <div className="divider">
            <span>or</span>
          </div>

          {/* Secondary Auth */}
          <button type="button" className="btn btn-secondary">
            <KeyRound className="btn-icon" size={20} />
            <span>Use OTP instead</span>
          </button>
        </form>
      </main>

      {/* --- FOOTER --- */}
      <footer className="app-footer">
        <p>Need help? <a href="#" className="text-link">Contact IT Support</a></p>
      </footer>
    </div>
  );
}
