import { SCREENS } from '../../utils/constants'
import { useLanguage } from '../../i18n'

export default function Welcome({ onNavigate }) {
  const { t } = useLanguage()

  return (
    <div className="welcome-screen-container">
      <div className="welcome-center-content">
        <div className="welcome-icon-box" aria-hidden="true">
          <img
            src="/mythri-icon.png"
            alt="Mythri Logo"
            className="welcome-medical-icon"
          />
        </div>

        <h1 className="welcome-heading">
          {t('auth.welcomeTitle')}
        </h1>

        <p className="welcome-subheading">
          {t('auth.welcomeSubtitle')}
        </p>
      </div>

      <div className="welcome-actions">
        <button
          type="button"
          className="welcome-btn-primary"
          onClick={() => onNavigate(SCREENS.REGISTRATION)}
        >
          <span>{t('auth.register')}</span>
          <span className="welcome-btn-arrow" aria-hidden="true">→</span>
        </button>

        <button
          type="button"
          className="welcome-btn-secondary"
          onClick={() => onNavigate(SCREENS.LOGIN)}
        >
          {t('auth.login')}
        </button>
      </div>
    </div>
  )
}
