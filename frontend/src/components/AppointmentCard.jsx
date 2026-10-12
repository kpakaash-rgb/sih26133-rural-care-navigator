import { useTranslation } from '../i18n'
import { getLocalizedFacilityName } from '../utils/hospitalLocalization'

export default function AppointmentCard({
  id = 'APT-1001',
  facilityName = 'Community Health Centre',
  doctorName = 'Dr. R. Karthik (General Physician)',
  department = 'General OPD',
  date = 'Tomorrow, 10:30 AM',
  tokenNumber = 'T-14',
  status = 'confirmed', // 'confirmed' | 'pending' | 'completed' | 'cancelled'
  onViewDetails,
}) {
  const { t } = useTranslation()
  const getStatusLabel = (st) => {
    switch (st) {
      case 'confirmed':
        return t ? (t('appointments.statusConfirmed') || 'Confirmed') : 'Confirmed'
      case 'pending':
        return 'In Queue'
      case 'completed':
        return 'Completed'
      case 'cancelled':
        return t ? (t('appointments.cancelled') || 'Cancelled') : 'Cancelled'
      default:
        return st
    }
  }

  return (
    <article className={`appointment-card status-${status}`} data-id={id}>
      <div className="appointment-card-top">
        <div className="appointment-token-badge">
          <span className="token-label">Token</span>
          <span className="token-number">{tokenNumber}</span>
        </div>
        <span className={`appointment-status-badge badge-${status}`}>
          {getStatusLabel(status)}
        </span>
      </div>

      <div className="appointment-body">
        <h3 className="appointment-facility">{getLocalizedFacilityName(facilityName, t)}</h3>
        <p className="appointment-doctor">{doctorName}</p>
        <div className="appointment-details">
          <div className="detail-item">
            <span className="detail-icon">📅</span>
            <span>{date}</span>
          </div>
          <div className="detail-item">
            <span className="detail-icon">🏷️</span>
            <span>{department}</span>
          </div>
        </div>
      </div>

      {onViewDetails && (
        <div className="appointment-card-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onViewDetails}
          >
            View Details & Slip
          </button>
        </div>
      )}
    </article>
  )
}
