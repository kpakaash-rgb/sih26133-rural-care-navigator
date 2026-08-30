import PrimaryButton from './PrimaryButton'

export default function FacilityCard({
  name = 'Primary Health Centre (PHC)',
  type = 'PHC',
  distance = '2.4 km',
  address = 'Main Village Road, Taluka',
  doctorAvailable = true,
  timings = '8:00 AM - 4:00 PM',
  onSelect,
  actionLabel = 'View & Book',
}) {
  return (
    <article className="facility-card">
      <div className="facility-card-header">
        <div>
          <span className="facility-badge">{type}</span>
          <h3 className="facility-name">{name}</h3>
          <p className="facility-address">{address}</p>
        </div>
        <div className="facility-distance">
          <span className="distance-icon">📍</span>
          <span>{distance}</span>
        </div>
      </div>

      <div className="facility-meta">
        <div className="meta-item">
          <span className="meta-label">Doctor Status:</span>
          <span
            className={`status-pill ${doctorAvailable ? 'status-online' : 'status-offline'}`}
          >
            {doctorAvailable ? '● Doctor on Duty' : '○ Doctor on Call'}
          </span>
        </div>
        <div className="meta-item">
          <span className="meta-label">OPD Timings:</span>
          <span className="meta-value">{timings}</span>
        </div>
      </div>

      {onSelect && (
        <div className="facility-card-footer">
          <PrimaryButton onClick={onSelect} fullWidth variant="primary">
            {actionLabel}
          </PrimaryButton>
        </div>
      )}
    </article>
  )
}
