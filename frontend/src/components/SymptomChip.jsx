export default function SymptomChip({
  label = 'Fever',
  selected = false,
  onClick,
  severity, // 'mild' | 'moderate' | 'severe'
  icon,
}) {
  return (
    <button
      type="button"
      className={`symptom-chip ${selected ? 'selected' : ''} ${severity ? `severity-${severity}` : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      {icon && <span className="chip-icon">{icon}</span>}
      <span className="chip-label">{label}</span>
      {selected && <span className="chip-check">✓</span>}
    </button>
  )
}
