import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function HealthJourney({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('journey')

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    } else if (tabId === 'services') {
      if (onNavigate) {
        onNavigate(SCREENS.HEALTHCARE)
      }
    }
  }

  const handleBookSpecialist = () => {
    if (onNavigate) {
      onNavigate(SCREENS.AVAILABILITY)
    }
  }

  const timelineEvents = [
    {
      id: 'event-1',
      date: 'Oct 24',
      badge: 'Completed',
      title: 'Doctor Visit',
      description: 'Follow-up checkup completed.',
    },
    {
      id: 'event-2',
      date: 'Oct 21',
      badge: null,
      title: 'Appointment Booked',
      description: 'PHC Malshiras — General Medicine',
    },
    {
      id: 'event-3',
      date: 'Oct 20',
      badge: null,
      title: 'Care Guidance Received',
      description: 'Advised to visit a Primary Health Centre based on symptoms.',
    },
    {
      id: 'event-4',
      date: 'Oct 20',
      badge: null,
      title: 'Health Problem Reported',
      description: 'Symptoms reported: Fever and cough.',
    },
  ]

  return (
    <div className="journey-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="journey-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="journey-header-section">
          <h1 className="journey-main-title">Your Health Journey</h1>
          <p className="journey-subtitle">
            Track your care events and see what steps to take next.
          </p>
        </section>

        {/* Next Step Prominent Action Card */}
        <section className="journey-next-step-card">
          <div className="next-step-header-row">
            <div className="next-step-icon-box" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="next-step-title-group">
              <span className="next-step-label">Next Step:</span>
              <h2 className="next-step-heading">Specialist Consultation</h2>
            </div>
          </div>

          <p className="next-step-description">
            Your doctor referred you to a specialist. Please schedule this appointment to continue your care.
          </p>

          <button
            type="button"
            className="next-step-action-btn"
            onClick={handleBookSpecialist}
          >
            Book Specialist Visit
          </button>
        </section>

        {/* Timeline Section */}
        <section className="journey-timeline-section">
          <h2 className="journey-timeline-heading">Timeline</h2>

          <div className="journey-timeline-container">
            {timelineEvents.map((item, index) => {
              const isLast = index === timelineEvents.length - 1
              return (
                <div key={item.id} className="timeline-node-wrapper">
                  {/* Timeline Indicator Column */}
                  <div className="timeline-indicator-col">
                    <div className="timeline-check-circle" aria-hidden="true">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                    {!isLast && <div className="timeline-vertical-line" aria-hidden="true" />}
                  </div>

                  {/* Timeline Event Card */}
                  <article className="timeline-event-card">
                    <div className="timeline-event-header-row">
                      <span className="timeline-event-date">{item.date}</span>
                      {item.badge && (
                        <span className="timeline-event-badge">{item.badge}</span>
                      )}
                    </div>
                    <h3 className="timeline-event-title">{item.title}</h3>
                    <p className="timeline-event-desc">{item.description}</p>
                  </article>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {/* Fixed Bottom Navigation with Journey tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
