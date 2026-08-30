export default function SOSButton({
  onClick,
  label = 'EMERGENCY (108)',
  compact = false,
}) {
  const handleClick = (e) => {
    if (onClick) {
      onClick(e)
    } else {
      window.location.href = 'tel:108'
    }
  }

  return (
    <button
      type="button"
      className={`sos-btn ${compact ? 'compact' : ''}`}
      onClick={handleClick}
      aria-label="Call Emergency 108"
    >
      <span className="sos-icon">🚨</span>
      <span className="sos-label">{label}</span>
    </button>
  )
}
