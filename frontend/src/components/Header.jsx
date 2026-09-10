import LanguageSelector from './LanguageSelector'
import { useTranslation } from '../i18n'

export default function Header({
  title,
  showLogo = true,
  showBack = false,
  onBack,
  rightAction,
  showLanguageSelector = true,
}) {
  const { t } = useTranslation()
  const displayTitle = title || t('common.appName')

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button
            type="button"
            className="header-back-btn"
            onClick={onBack}
            aria-label={t('common.back')}
          >
            ←
          </button>
        )}
        <div className="header-brand">
          {showLogo && (
            <svg
              className="header-logo-icon"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                d="M9 7V5.5C9 4.67157 9.67157 4 10.5 4H13.5C14.3284 4 15 4.67157 15 5.5V7"
                stroke="#004b87"
                strokeWidth="1.75"
                strokeLinecap="round"
              />
              <rect x="4" y="7" width="16" height="13" rx="3" fill="#004b87" />
              <path d="M12 10.5V16.5" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
              <path d="M9 13.5H15" stroke="white" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
          <span className="header-brand-title">{displayTitle}</span>
        </div>
      </div>
      <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {showLanguageSelector && <LanguageSelector />}
        {rightAction}
      </div>
    </header>
  )
}

