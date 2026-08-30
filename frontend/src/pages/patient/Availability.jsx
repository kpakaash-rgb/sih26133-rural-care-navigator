import { useState } from 'react'
import PrimaryButton from '../../components/PrimaryButton'
import { SCREENS } from '../../utils/constants'

const TIME_SLOTS = [
  { id: 'slot-1', time: '09:00 AM - 10:00 AM', tokensLeft: 4 },
  { id: 'slot-2', time: '10:00 AM - 11:00 AM', tokensLeft: 2 },
  { id: 'slot-3', time: '11:00 AM - 12:00 PM', tokensLeft: 8 },
  { id: 'slot-4', time: '12:00 PM - 01:00 PM', tokensLeft: 6 },
]

export default function Availability({ onNavigate }) {
  const [selectedDate, setSelectedDate] = useState('Today, 31 Aug')
  const [selectedSlot, setSelectedSlot] = useState('slot-2')

  return (
    <div className="page-container availability-page">
      <div className="section-header">
        <h2 className="section-title">Select Date & OPD Slot</h2>
        <p className="section-subtitle">
          PHC Shirpur - General OPD with Dr. Sanjay Patil
        </p>
      </div>

      <div className="date-picker-row">
        {['Today, 31 Aug', 'Tomorrow, 1 Sep', 'Wed, 2 Sep'].map((d) => (
          <button
            key={d}
            type="button"
            className={`date-pill ${selectedDate === d ? 'active' : ''}`}
            onClick={() => setSelectedDate(d)}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="slots-container">
        <h3 className="section-title">Available Time Windows</h3>
        <div className="slots-grid">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              className={`slot-card ${selectedSlot === slot.id ? 'selected' : ''}`}
              onClick={() => setSelectedSlot(slot.id)}
            >
              <div className="slot-time">{slot.time}</div>
              <div className="slot-tokens-left">{slot.tokensLeft} slots left</div>
            </button>
          ))}
        </div>
      </div>

      <div className="floating-bottom-actions">
        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.BOOKING)}
        >
          Proceed to Patient Details
        </PrimaryButton>
      </div>
    </div>
  )
}
