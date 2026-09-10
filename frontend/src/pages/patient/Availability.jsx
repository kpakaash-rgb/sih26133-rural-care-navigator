import { useState, useEffect } from 'react'
import Header from '../../components/Header'
import BottomNav from '../../components/BottomNav'
import SOSButton from '../../components/SOSButton'
import { SCREENS } from '../../utils/constants'
import { getFacilityAvailability, getFacilityServices } from '../../services/api'
import { useTranslation } from '../../i18n'

function formatTime(timeStr) {
  if (!timeStr) return ''
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr
  const parts = timeStr.split(':')
  if (parts.length < 2) return timeStr
  let hour = parseInt(parts[0], 10)
  const minute = parts[1]
  const ampm = hour >= 12 ? 'PM' : 'AM'
  hour = hour % 12 || 12
  return `${hour}:${minute} ${ampm}`
}

function formatDateDisplay(dateStr, index, t) {
  if (!dateStr) return { id: 'default', title: t ? t('common.today') : 'Today', date: 'Available', fullDate: 'Available Date' }
  try {
    const d = new Date(dateStr + 'T00:00:00')
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const weekday = days[d.getDay()]
    const month = months[d.getMonth()]
    const dayNum = d.getDate()
    return {
      id: dateStr,
      title: index === 0 ? (t ? t('availability.selectDate') : 'Earliest') : weekday,
      date: `${month} ${dayNum}`,
      fullDate: `${weekday}, ${month} ${dayNum}`,
    }
  } catch {
    return { id: dateStr, title: 'Date', date: dateStr, fullDate: dateStr }
  }
}

export default function Availability({ onNavigate, bookingData, onUpdateBooking }) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('services')

  const facilityId = bookingData?.facilityId || 1
  const facilityName = bookingData?.facility || 'PHC Malshiras'

  // Appointment Type State ('in_person' | 'teleconsultation')
  const [appointmentType, setAppointmentType] = useState(
    bookingData?.typeKey || 'in_person'
  )

  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)

  const [slots, setSlots] = useState([])
  const [dateOptions, setDateOptions] = useState([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlotId, setSelectedSlotId] = useState(null)

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  // 1. Fetch facility services to identify real service ID
  useEffect(() => {
    let isMounted = true

    async function loadServices() {
      try {
        const srvList = await getFacilityServices(facilityId)
        if (isMounted && Array.isArray(srvList) && srvList.length > 0) {
          setServices(srvList)
          // Find service matching current bookingData or pick General Medicine / first available
          const match =
            srvList.find((s) => s.id === bookingData?.serviceId) ||
            srvList.find(
              (s) =>
                s.name.toLowerCase() ===
                (bookingData?.service || 'General Medicine').toLowerCase()
            ) ||
            srvList[0]
          setSelectedService(match)
        }
      } catch {
        if (isMounted) {
          // Fallback service
          setSelectedService({ id: 1, name: bookingData?.service || 'General Medicine' })
        }
      }
    }

    loadServices()

    return () => {
      isMounted = false
    }
  }, [facilityId, bookingData?.serviceId, bookingData?.service])

  // 2. Fetch real availability slots for facility and selected service
  useEffect(() => {
    let isMounted = true

    async function loadSlots() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const queryParams = { status: 'AVAILABLE' }
        if (selectedService?.id) {
          queryParams.service_id = selectedService.id
        }

        const data = await getFacilityAvailability(facilityId, queryParams)
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setSlots(data)

            // Extract unique dates
            const uniqueDates = Array.from(new Set(data.map((s) => s.date))).sort()
            const dateOpts = uniqueDates.map((dStr, idx) => formatDateDisplay(dStr, idx, t))
            setDateOptions(dateOpts)

            const initialDate = uniqueDates[0]
            setSelectedDate(initialDate)

            // Auto-select first slot for initial date
            const dateSlots = data.filter((s) => s.date === initialDate)
            if (dateSlots.length > 0) {
              setSelectedSlotId(dateSlots[0].id)
            }
          } else {
            setSlots([])
            setDateOptions([])
            setSelectedDate('')
            setSelectedSlotId(null)
          }
        }
      } catch (err) {
        if (isMounted) {
          setErrorMessage(
            err.message || 'Unable to load availability slots. Please try again.'
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    if (selectedService) {
      loadSlots()
    }

    return () => {
      isMounted = false
    }
  }, [facilityId, selectedService, t])

  // When selectedDate changes, ensure selectedSlotId belongs to the selected date
  const filteredSlots = slots.filter((s) => s.date === selectedDate)

  const handleSelectDate = (dateId) => {
    setSelectedDate(dateId)
    const matching = slots.filter((s) => s.date === dateId)
    if (matching.length > 0) {
      setSelectedSlotId(matching[0].id)
    } else {
      setSelectedSlotId(null)
    }
  }

  const handleSosClick = () => {
    window.location.href = 'tel:108'
  }

  const handleNavClick = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'home' || tabId === SCREENS.HOME) {
      if (onNavigate) {
        onNavigate(SCREENS.HOME)
      }
    }
  }

  const handleContinueBooking = () => {
    const selectedSlot = slots.find((s) => s.id === selectedSlotId)
    if (!selectedSlot) {
      setErrorMessage('Please select an available time slot.')
      return
    }

    const selectedDateObj = dateOptions.find((d) => d.id === selectedDate)
    const typeLabel = appointmentType === 'in_person' ? 'In-person' : 'Teleconsultation'

    const updatedData = {
      facility: facilityName,
      facilityId: facilityId,
      service: selectedService?.name || selectedSlot.service_name || 'General Medicine',
      serviceId: selectedService?.id || selectedSlot.service_id,
      slotId: selectedSlot.id,
      date: selectedDateObj ? selectedDateObj.fullDate : selectedSlot.date,
      dateRaw: selectedSlot.date,
      time: `${formatTime(selectedSlot.start_time)} - ${formatTime(selectedSlot.end_time)}`,
      startTime: selectedSlot.start_time,
      endTime: selectedSlot.end_time,
      type: typeLabel,
      typeKey: appointmentType,
      selectedSlot,
    }

    if (onUpdateBooking) {
      onUpdateBooking(updatedData)
    }

    if (onNavigate) {
      onNavigate(SCREENS.BOOKING, updatedData)
    }
  }

  return (
    <div className="availability-screen-wrapper">
      {/* Top Header with SOS */}
      <Header
        title={t('common.appName')}
        showLogo
        rightAction={<SOSButton label="SOS" icon="▲" onClick={handleSosClick} />}
      />

      {/* Main Vertically Scrollable Content Area */}
      <main className="availability-scrollable-content">
        {/* Page Title */}
        <section className="availability-title-section">
          <h1 className="availability-main-title">{t('availability.title')}</h1>
        </section>

        {/* Facility and Service Info Card */}
        <section className="availability-facility-card">
          <div className="facility-identity-row">
            <span className="facility-plus-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="#004b87" strokeWidth="2" />
                <path d="M12 8v8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
                <path d="M8 12h8" stroke="#004b87" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="facility-name-text">{facilityName}</span>
          </div>

          <div className="facility-service-row" style={{ flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="service-stethoscope-icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#004b87"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
                  <path d="M9 12.5v3.5a3 3 0 0 0 3 3h1a3 3 0 0 0 3-3v-1.5" />
                  <circle cx="16" cy="14.5" r="1.5" fill="#004b87" />
                </svg>
              </span>
              <span className="service-name-text">
                {selectedService?.name || 'General Medicine'}
              </span>
            </div>

            {services.length > 1 && (
              <div style={{ marginTop: '8px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {services.map((srv) => {
                  const isSrvActive = selectedService?.id === srv.id
                  return (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedService(srv)}
                      style={{
                        backgroundColor: isSrvActive ? '#004b87' : '#f1f5f9',
                        color: isSrvActive ? '#ffffff' : '#334155',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '3px 10px',
                        fontSize: '11.5px',
                        fontWeight: isSrvActive ? 600 : 500,
                        cursor: 'pointer',
                      }}
                    >
                      {srv.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* Error message */}
        {errorMessage && (
          <div
            role="alert"
            style={{
              backgroundColor: '#fee2e2',
              border: '1px solid #f87171',
              borderRadius: '6px',
              padding: '10px 14px',
              margin: '0 16px 12px',
              color: '#991b1b',
              fontSize: '13px',
            }}
          >
            {errorMessage}
          </div>
        )}

        {/* 1. Appointment Type Section */}
        <section className="availability-section-group">
          <h2 className="availability-section-label">{t('booking.service')}</h2>
          <div className="appointment-type-toggle-row">
            {/* In-person button */}
            <button
              type="button"
              className={`type-toggle-btn ${appointmentType === 'in_person' ? 'active' : ''}`}
              onClick={() => setAppointmentType('in_person')}
              aria-pressed={appointmentType === 'in_person'}
            >
              <span className="type-btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span className="type-btn-text">In-person</span>
            </button>

            {/* Teleconsultation button */}
            <button
              type="button"
              className={`type-toggle-btn ${appointmentType === 'teleconsultation' ? 'active' : ''}`}
              onClick={() => setAppointmentType('teleconsultation')}
              aria-pressed={appointmentType === 'teleconsultation'}
            >
              <span className="type-btn-icon" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </span>
              <span className="type-btn-text">Teleconsultation</span>
            </button>
          </div>
        </section>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <p>{t('common.loading')}</p>
          </div>
        ) : dateOptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 16px', color: '#64748b' }}>
            <p>{t('availability.noSlots')}</p>
          </div>
        ) : (
          <>
            {/* 2. Select Date Section */}
            <section className="availability-section-group">
              <h2 className="availability-section-label">{t('availability.selectDate')}</h2>
              <div className="date-selection-cards-row">
                {dateOptions.map((opt) => {
                  const isSelected = selectedDate === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`date-choice-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectDate(opt.id)}
                      aria-pressed={isSelected}
                    >
                      <span className="date-card-title">{opt.title}</span>
                      <span className="date-card-sub">{opt.date}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            {/* 3. Available Times Section */}
            <section className="availability-section-group">
              <h2 className="availability-section-label">{t('availability.availableSlots')}</h2>
              {filteredSlots.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b', padding: '8px 4px' }}>
                  {t('availability.noSlots')}
                </p>
              ) : (
                <div className="available-times-grid">
                  {filteredSlots.map((slot) => {
                    const isSelected = selectedSlotId === slot.id
                    const timeLabel = formatTime(slot.start_time)

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        className={`time-slot-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => setSelectedSlotId(slot.id)}
                        aria-pressed={isSelected}
                      >
                        <div className="time-slot-header-row">
                          <span className="time-slot-hour">{timeLabel}</span>
                          {isSelected && (
                            <span className="time-slot-checkmark" aria-hidden="true">
                              ✓
                            </span>
                          )}
                        </div>
                        <span className="time-slot-status-label">
                          {isSelected ? t('common.confirm') : 'Available'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}

        {/* Primary Action Button */}
        <div className="availability-action-container">
          <button
            type="button"
            className="availability-primary-btn"
            disabled={isLoading || !selectedSlotId}
            onClick={handleContinueBooking}
            style={{ opacity: isLoading || !selectedSlotId ? 0.6 : 1 }}
          >
            {t('availability.proceedToBook')}
          </button>
        </div>
      </main>

      {/* Fixed Bottom Navigation */}
      <BottomNav activeScreen={activeTab} onNavigate={handleNavClick} />
    </div>
  )
}

