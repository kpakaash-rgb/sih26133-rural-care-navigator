export default function SOSButton({
  onClick,
  label = 'SOS',
  variant = 'pill', // 'pill' | 'card' | 'banner'
  icon = '▲',
}) {
  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    } else {
      window.location.href = 'tel:108'
    }
  }

  if (variant === 'card') {
    return (
      <button
        type="button"
        className="sos-card-btn"
        onClick={handleClick}
        aria-label="Call Emergency Help"
      >
        <span className="sos-phone-icon">📞</span>
        <span>{label === 'SOS' ? 'Call Emergency Help' : label}</span>
      </button>
    )
  }

  return (
    <button
      type="button"
      className="header-sos-pill"
      onClick={handleClick}
      aria-label="Emergency SOS 108"
    >
      <span className="sos-pill-icon">{icon}</span>
      <span className="sos-pill-text">{label}</span>
    </button>
  )
}
