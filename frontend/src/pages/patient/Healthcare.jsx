import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Healthcare({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('services')

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === SCREENS.HOME && onNavigate) {
      onNavigate(SCREENS.HOME)
    }
  }

  return (
    <div className="healthcare-screen-wrapper">
      {/* Top Header */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content */}
      <main className="healthcare-scrollable-content">
        {/* Title and Prototype Badge */}
        <section className="healthcare-intro-section">
          <h1 className="healthcare-page-title">Places that can help you</h1>
          <p className="healthcare-page-subtitle">
            Based on your information, these healthcare options may be suitable.
          </p>
          <div className="prototype-data-pill">
            <span className="prototype-info-icon" aria-hidden="true">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#475569">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
              </svg>
            </span>
            <span className="prototype-text">Prototype Data</span>
          </div>
        </section>

        {/* Facility Cards List */}
        <div className="suitable-facilities-list">
          {/* Card 1: PHC Malshiras */}
          <article className="suitable-facility-card">
            <div className="facility-header-row">
              <div className="facility-identity">
                <h2 className="facility-title">PHC Malshiras</h2>
                <p className="facility-category">Primary Health Centre</p>
              </div>
              <div className="distance-badge distance-primary">
                <svg
                  className="distance-pin-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#004b87"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>4.2 km away</span>
              </div>
            </div>

            <div className="facility-services-group">
              <h3 className="services-heading">Services:</h3>
              <ul className="services-checklist">
                <li className="service-item">
                  <span className="service-check" aria-hidden="true">✓</span>
                  <span>Doctor</span>
                </li>
                <li className="service-item">
                  <span className="service-check" aria-hidden="true">✓</span>
                  <span>Basic tests</span>
                </li>
                <li className="service-item">
                  <span className="service-check" aria-hidden="true">✓</span>
                  <span>Medicines</span>
                </li>
              </ul>
            </div>

            <div className="facility-availability-row">
              <span className="availability-label">Available:</span>
              <span className="availability-items">
                <span className="service-check" aria-hidden="true">✓</span> Doctor,{' '}
                <span className="service-check" aria-hidden="true">✓</span> Basic tests,{' '}
                <span className="service-check" aria-hidden="true">✓</span> Medicines
              </span>
            </div>

            <div className="why-facility-box">
              <div className="why-facility-title-row">
                <svg
                  className="why-facility-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22v-7" />
                  <path d="M9 7.5A4.5 4.5 0 0 1 18 9c0 4.5-6 6-6 6s-6-1.5-6-6a4.5 4.5 0 0 1 3-4.24" />
                </svg>
                <h4 className="why-facility-heading">Why this facility?</h4>
              </div>
              <p className="why-facility-desc">
                This place has what you need and is near you.
              </p>
            </div>

            <button type="button" className="facility-solid-btn">
              View Details
            </button>
          </article>

          {/* Card 2: CHC Akluj */}
          <article className="suitable-facility-card">
            <div className="facility-header-row">
              <div className="facility-identity">
                <h2 className="facility-title">CHC Akluj</h2>
                <p className="facility-category">Community Health Centre</p>
              </div>
              <div className="distance-badge distance-secondary">
                <svg
                  className="distance-pin-icon"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#475569"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <div className="distance-stacked-text">
                  <span>12.5 km</span>
                  <span>away</span>
                </div>
              </div>
            </div>

            <div className="facility-services-group">
              <h3 className="services-heading">Services:</h3>
              <ul className="services-checklist">
                <li className="service-item">
                  <span className="service-check" aria-hidden="true">✓</span>
                  <span>Specialist Doctor</span>
                </li>
                <li className="service-item">
                  <span className="service-check" aria-hidden="true">✓</span>
                  <span>Advanced tests</span>
                </li>
              </ul>
            </div>

            <div className="facility-availability-row">
              <span className="availability-label">Available:</span>
              <span className="availability-items">
                <span className="service-check" aria-hidden="true">✓</span> Doctor,{' '}
                <span className="service-check" aria-hidden="true">✓</span> Advanced tests
              </span>
            </div>

            <div className="why-facility-box">
              <div className="why-facility-title-row">
                <svg
                  className="why-facility-icon"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#0284c7"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M12 22v-7" />
                  <path d="M9 7.5A4.5 4.5 0 0 1 18 9c0 4.5-6 6-6 6s-6-1.5-6-6a4.5 4.5 0 0 1 3-4.24" />
                </svg>
                <h4 className="why-facility-heading">Why this facility?</h4>
              </div>
              <p className="why-facility-desc">
                This place has more tests but is further away.
              </p>
            </div>

            <button type="button" className="facility-outline-btn">
              View Details
            </button>
          </article>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
