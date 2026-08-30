export default function Header({
  title = 'Rural Care Navigator',
  subtitle,
  showBack = false,
  onBack,
  rightAction,
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button
            type="button"
            className="header-back-btn"
            onClick={onBack}
            aria-label="Go back"
          >
            ←
          </button>
        )}
        <div className="header-titles">
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {rightAction && <div className="header-right">{rightAction}</div>}
    </header>
  )
}
