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
            <img
              src="/mythri-icon.png"
              alt="Mythri"
              className="header-logo-icon"
              width="26"
              height="26"
              style={{ objectFit: 'contain', borderRadius: '4px' }}
            />
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

