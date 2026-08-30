import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Home({ onNavigate }) {
  const quickServices = [
    {
      id: SCREENS.SYMPTOMS,
      title: 'Symptom Triage',
      desc: 'Check health concerns & get instant guidance',
      icon: '🩺',
      color: 'teal',
    },
    {
      id: SCREENS.HEALTHCARE,
      title: 'Nearby PHC / CHC',
      desc: 'Find closest facilities, doctors & services',
      icon: '🏥',
      color: 'blue',
    },
    {
      id: SCREENS.APPOINTMENTS,
      title: 'OPD Appointments',
      desc: 'Book slot & view live queue tokens',
      icon: '📅',
      color: 'amber',
    },
    {
      id: SCREENS.MOBILE_CLINIC,
      title: 'Mobile Clinic (MMU)',
      desc: 'Track village visit schedule & live location',
      icon: '🚐',
      color: 'green',
    },
    {
      id: SCREENS.SCHEMES,
      title: 'Govt Schemes',
      desc: 'Ayushman Bharat, Janani Suraksha benefits',
      icon: '🏛️',
      color: 'indigo',
    },
    {
      id: SCREENS.ABHA,
      title: 'ABHA Health Card',
      desc: 'Digital records & linked health IDs',
      icon: '🪪',
      color: 'purple',
    },
  ]

  return (
    <div className="page-container home-page">
      <div className="home-patient-banner">
        <div className="patient-greeting">
          <span className="greeting-small">Good day,</span>
          <h2 className="greeting-name">Rural Patient / Citizen</h2>
          <p className="greeting-location">📍 Shirpur Sub-District, Maharashtra</p>
        </div>
      </div>

      <div className="home-sos-section">
        <SOSButton />
      </div>

      <section className="home-services-grid">
        <h3 className="section-title">Core Healthcare Services</h3>
        <div className="services-grid">
          {quickServices.map((srv) => (
            <button
              key={srv.id}
              type="button"
              className={`service-card service-${srv.color}`}
              onClick={() => onNavigate(srv.id)}
            >
              <div className="service-icon">{srv.icon}</div>
              <div className="service-text">
                <h4 className="service-name">{srv.title}</h4>
                <p className="service-desc">{srv.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="home-extra-links">
        <div className="extra-actions-card">
          <h4 className="card-mini-title">Quick Care Shortcuts</h4>
          <div className="shortcuts-row">
            <button
              type="button"
              className="shortcut-btn"
              onClick={() => onNavigate(SCREENS.REFERRAL)}
            >
              🔄 Referral Slips
            </button>
            <button
              type="button"
              className="shortcut-btn"
              onClick={() => onNavigate(SCREENS.HEALTH_JOURNEY)}
            >
              📈 Health Timeline
            </button>
            <button
              type="button"
              className="shortcut-btn"
              onClick={() => onNavigate(SCREENS.FOLLOW_UP)}
            >
              ⏰ Follow-ups
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
