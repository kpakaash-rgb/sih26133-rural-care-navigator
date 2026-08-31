import { useState } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'

export default function Schemes({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('services')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    } else if (tabId === 'journey') {
      if (onNavigate) {
        onNavigate(SCREENS.APPOINTMENTS)
      }
    }
  }

  const handleCheckDetails = (schemeId) => {
    // If Scheme Details route exists in the future, navigate to it; currently ready for future route
    if (onNavigate && SCREENS.SCHEME_DETAILS) {
      onNavigate(SCREENS.SCHEME_DETAILS, { schemeId })
    }
  }

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'coverage', label: 'Health Coverage' },
    { id: 'maternity', label: 'Maternity' },
    { id: 'senior', label: 'Senior Citizens' },
  ]

  const schemes = [
    {
      id: 'pmjay',
      title: 'Ayushman Bharat PM-JAY',
      category: 'Health Coverage',
      categoryId: 'coverage',
      description: 'Health coverage for eligible families.',
      iconType: 'shield',
    },
    {
      id: 'maternity-scheme',
      title: 'Maternity Benefit Scheme',
      category: 'Maternity',
      categoryId: 'maternity',
      description: 'Support for eligible pregnant women.',
      iconType: 'baby',
    },
    {
      id: 'senior-fund',
      title: 'Senior Citizen Health Fund',
      category: 'Senior Citizens',
      categoryId: 'senior',
      description: 'Special medical support for seniors over 60.',
      iconType: 'senior',
    },
  ]

  const filteredSchemes =
    selectedCategory === 'all'
      ? schemes
      : schemes.filter((s) => s.categoryId === selectedCategory)

  return (
    <div className="schemes-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title="Rural Care Navigator"
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="schemes-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="schemes-header-section">
          <h1 className="schemes-main-title">Government Schemes</h1>
          <p className="schemes-subtitle">
            Find government health programmes that may help you.
          </p>
        </section>

        {/* Category Filter Pills Row */}
        <div className="schemes-filter-row" role="tablist" aria-label="Scheme Categories">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id
            return (
              <button
                key={cat.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`scheme-filter-btn ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.label}
              </button>
            )
          })}
        </div>

        {/* Schemes List Stack */}
        <section className="schemes-list-section">
          {filteredSchemes.map((scheme) => (
            <article key={scheme.id} className="scheme-card">
              <div className="scheme-card-header">
                {/* Scheme Icon Box */}
                <div className="scheme-icon-box" aria-hidden="true">
                  {scheme.iconType === 'shield' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                  )}
                  {scheme.iconType === 'baby' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="9" cy="10" r="1" fill="#ffffff" />
                      <circle cx="15" cy="10" r="1" fill="#ffffff" />
                      <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
                    </svg>
                  )}
                  {scheme.iconType === 'senior' && (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="5" r="2" fill="#ffffff" />
                      <path d="M10 22v-6l-2-2v-4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3l-2 3v5" />
                      <path d="M17 14v8" strokeWidth="2" />
                    </svg>
                  )}
                </div>

                {/* Scheme Title & Category */}
                <div className="scheme-title-group">
                  <h2 className="scheme-card-title">{scheme.title}</h2>
                  <span className="scheme-category-badge">{scheme.category}</span>
                </div>
              </div>

              <p className="scheme-card-description">{scheme.description}</p>

              {/* Action Button */}
              <button
                type="button"
                className="scheme-details-btn"
                onClick={() => handleCheckDetails(scheme.id)}
              >
                Check Details
              </button>
            </article>
          ))}
        </section>
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
