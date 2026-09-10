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
            <div className="header-logo-box">
              <img
                src="/mythri-icon.png"
                alt="Mythri"
                className="header-logo-icon"
              />
            </div>
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

