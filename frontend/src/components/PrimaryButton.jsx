export default function PrimaryButton({
  children,
  onClick,
  variant = 'primary', // 'primary' | 'secondary' | 'outline' | 'danger'
  disabled = false,
  fullWidth = false,
  type = 'button',
  icon,
}) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${fullWidth ? 'btn-block' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
