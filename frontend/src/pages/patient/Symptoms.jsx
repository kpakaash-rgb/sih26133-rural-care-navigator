import { useState } from 'react'
import PrimaryButton from '../../components/PrimaryButton'
import SymptomChip from '../../components/SymptomChip'
import { SCREENS } from '../../utils/constants'

const COMMON_SYMPTOMS = [
  { id: 'fever', label: 'High Fever / Heat', icon: '🌡️' },
  { id: 'cough', label: 'Persistent Cough', icon: '🗣️' },
  { id: 'chest_pain', label: 'Chest Pain / Tightness', icon: '💔', severity: 'severe' },
  { id: 'breathlessness', label: 'Difficulty Breathing', icon: '🫁', severity: 'severe' },
  { id: 'headache', label: 'Severe Headache', icon: '🤕' },
  { id: 'vomiting', label: 'Vomiting / Loose Motion', icon: '🤢' },
  { id: 'abdominal', label: 'Abdominal / Stomach Pain', icon: '🤰' },
  { id: 'fatigue', label: 'Extreme Weakness / Dizziness', icon: '🥱' },
  { id: 'injury', label: 'Accident / Bleeding Wound', icon: '🩹', severity: 'severe' },
]

export default function Symptoms({ onNavigate }) {
  const [selectedSymptoms, setSelectedSymptoms] = useState(['fever'])
  const [duration, setDuration] = useState('2-3 days')

  const toggleSymptom = (id) => {
    if (selectedSymptoms.includes(id)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== id))
    } else {
      setSelectedSymptoms([...selectedSymptoms, id])
    }
  }

  return (
    <div className="page-container symptoms-page">
      <div className="section-header">
        <h2 className="section-title">Select Presenting Symptoms</h2>
        <p className="section-subtitle">
          Tap on what the patient is experiencing to receive care guidance.
        </p>
      </div>

      <div className="chips-container">
        {COMMON_SYMPTOMS.map((sym) => (
          <SymptomChip
            key={sym.id}
            label={sym.label}
            icon={sym.icon}
            severity={sym.severity}
            selected={selectedSymptoms.includes(sym.id)}
            onClick={() => toggleSymptom(sym.id)}
          />
        ))}
      </div>

      <div className="form-card symptom-details-card">
        <h3 className="card-mini-title">Symptom Duration</h3>
        <div className="radio-pills">
          {['< 24 Hours', '2-3 days', 'More than a week'].map((dur) => (
            <button
              key={dur}
              type="button"
              className={`pill-btn ${duration === dur ? 'active' : ''}`}
              onClick={() => setDuration(dur)}
            >
              {dur}
            </button>
          ))}
        </div>

        <div className="form-group" style={{ marginTop: '1rem' }}>
          <label htmlFor="notes" className="form-label">
            Any other remarks or medical background (Optional)
          </label>
          <textarea
            id="notes"
            rows={3}
            className="form-textarea"
            placeholder="e.g. Diabetics, pregnant, child under 5 yrs..."
          />
        </div>

        <PrimaryButton
          fullWidth
          variant="primary"
          onClick={() => onNavigate(SCREENS.CARE_GUIDANCE)}
        >
          Analyze Symptoms & Get Guidance
        </PrimaryButton>
      </div>
    </div>
  )
}
