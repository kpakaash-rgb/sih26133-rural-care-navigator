import { useState, useEffect, useMemo } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getSchemes, getRelevantSchemes } from '../../services/api'
import { useTranslation } from '../../i18n'

export default function Schemes({ onNavigate }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [schemes, setSchemes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [_isPersonalized, setIsPersonalized] = useState(false)
  const [retryCount, setRetryCount] = useState(0)

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

  const handleCheckDetails = (scheme) => {
    if (onNavigate && SCREENS.SCHEME_DETAILS) {
      onNavigate(SCREENS.SCHEME_DETAILS, {
        ...scheme,
        schemeId: scheme.id,
        title: scheme.name || scheme.title,
        category: scheme.relevance || scheme.state || 'Government Scheme',
      })
    }
  }

  const handleRetry = () => {
    setIsLoading(true)
    setErrorMessage('')
    setRetryCount((prev) => prev + 1)
  }

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      const token = localStorage.getItem('access_token')
      let data = []
      let personalized = false

      // Prefer personalized relevant schemes if patient is authenticated
      if (token) {
        try {
          const relevant = await getRelevantSchemes()
          if (Array.isArray(relevant) && relevant.length > 0) {
            data = relevant
            personalized = true
          }
        } catch (err) {
          console.warn('Personalized schemes unavailable, attempting public directory:', err)
        }
      }

      // Fall back to public schemes directory if unauthenticated or no personalized records
      if (!data || data.length === 0) {
        try {
          const allSchemes = await getSchemes()
          data = Array.isArray(allSchemes) ? allSchemes : []
        } catch (err) {
          if (isMounted) {
            setErrorMessage(
              err.message || 'Unable to load government healthcare schemes. Please check your connection.'
            )
            setIsLoading(false)
          }
          return
        }
      }

      if (isMounted) {
        setSchemes(data)
        setIsPersonalized(personalized)
        setIsLoading(false)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [retryCount])

  // Dynamically derive category pills from retrieved scheme metadata
  const categories = useMemo(() => {
    const list = [{ id: 'all', label: t('schemes.allSchemes') }]
    if (schemes.some((s) => s.relevance)) {
      list.push({ id: 'relevant', label: t('healthcare.recommended') })
    }
    const distinctStates = Array.from(
      new Set(schemes.map((s) => s.state).filter(Boolean))
    )
    distinctStates.forEach((st) => {
      list.push({ id: st.toLowerCase(), label: st })
    })
    return list
  }, [schemes, t])

  // Filter schemes based on active category selection
  const filteredSchemes = useMemo(() => {
    if (selectedCategory === 'all') return schemes
    if (selectedCategory === 'relevant') {
      return schemes.filter((s) => Boolean(s.relevance))
    }
    return schemes.filter(
      (s) => s.state?.toLowerCase() === selectedCategory.toLowerCase()
    )
  }, [schemes, selectedCategory])

  return (
    <div className="schemes-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="schemes-scrollable-content">
        {/* Title and Subtitle Section */}
        <section className="schemes-header-section">
          <h1 className="schemes-main-title">{t('schemes.title')}</h1>
          <p className="schemes-subtitle">
            {t('schemes.subtitle')}
          </p>
        </section>

        {/* Category Filter Pills Row */}
        {!isLoading && !errorMessage && categories.length > 1 && (
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
        )}

        {/* API Error State */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: '8px',
              padding: '12px 16px',
              color: '#991b1b',
              fontSize: '13.5px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={handleRetry}
              style={{
                alignSelf: 'flex-start',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: '#64748b',
              fontSize: '14px',
            }}
          >
            <p style={{ margin: 0 }}>{t('common.loading')}</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && filteredSchemes.length === 0 && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px dashed #cbd5e1',
              borderRadius: '10px',
              padding: '32px 16px',
              textAlign: 'center',
            }}
          >
            <p style={{ color: '#64748b', fontSize: '14px', margin: '0 0 12px' }}>
              {t('common.noData')}
            </p>
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                style={{
                  backgroundColor: '#004b87',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {t('schemes.allSchemes')}
              </button>
            )}
          </div>
        )}

        {/* Schemes List Stack */}
        {!isLoading && !errorMessage && filteredSchemes.length > 0 && (
          <section className="schemes-list-section">
            {filteredSchemes.map((scheme) => (
              <article key={scheme.id} className="scheme-card">
                <div className="scheme-card-header">
                  {/* Scheme Icon Box */}
                  <div className="scheme-icon-box" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
                      <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                    </svg>
                  </div>

                  {/* Scheme Title & Category / Relevance */}
                  <div className="scheme-title-group">
                    <h2 className="scheme-card-title">{scheme.name || scheme.title}</h2>
                    <span className="scheme-category-badge">
                      {scheme.relevance || scheme.state || 'National'}
                    </span>
                  </div>
                </div>

                <p className="scheme-card-description">
                  {scheme.short_description || scheme.description}
                </p>

                {/* Action Button */}
                <button
                  type="button"
                  className="scheme-details-btn"
                  onClick={() => handleCheckDetails(scheme)}
                >
                  {t('schemes.viewDetails')}
                </button>
              </article>
            ))}
          </section>
        )}
      </main>

      {/* Fixed Bottom Navigation with Services tab active */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}
