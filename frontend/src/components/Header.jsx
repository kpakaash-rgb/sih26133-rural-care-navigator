export default function Header({
  title = 'Rural Care Navigator',
  showLogo = true,
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
          <span className="header-brand-title">{title}</span>
        </div>
      </div>
      {rightAction && <div className="header-right">{rightAction}</div>}
    </header>
  )
}
