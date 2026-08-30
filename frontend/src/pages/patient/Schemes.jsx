import { SCREENS } from '../../utils/constants'

const SCHEMES_LIST = [
  {
    id: 'pmjay',
    name: 'Ayushman Bharat (PM-JAY)',
    coverage: 'Up to ₹5,00,000 per family/year',
    type: 'National Health Protection',
    badge: 'Popular',
    desc: 'Cashless inpatient secondary and tertiary hospital care.',
  },
  {
    id: 'jsy',
    name: 'Janani Suraksha Yojana (JSY)',
    coverage: 'Direct Cash Transfer ₹1,400 (Rural)',
    type: 'Maternal & Child Health',
    badge: 'Maternity',
    desc: 'Safe institutional deliveries for rural pregnant women.',
  },
  {
    id: 'rbsk',
    name: 'Rashtriya Bal Swasthya Karyakram (RBSK)',
    coverage: '100% Free Child Screening & Surgeries',
    type: 'Child Health (0-18 yrs)',
    badge: 'Children',
    desc: 'Screening for birth defects, diseases, and deficiencies.',
  },
  {
    id: 'state-scheme',
    name: 'Mahatma Jyotirao Phule Jan Arogya Yojana',
    coverage: 'Up to ₹1,50,000 - ₹5,00,000',
    type: 'State Healthcare Plan',
    badge: 'State',
    desc: 'Empaneled multi-speciality treatment in government & private network hospitals.',
  },
]

export default function Schemes({ onNavigate }) {
  return (
    <div className="page-container schemes-page">
      <div className="section-header">
        <h2 className="section-title">Government Health Schemes</h2>
        <p className="section-subtitle">
          Explore eligibility, cashless benefits, and application guidelines.
        </p>
      </div>

      <div className="schemes-list">
        {SCHEMES_LIST.map((sc) => (
          <article key={sc.id} className="scheme-card">
            <div className="scheme-card-top">
              <span className="scheme-badge">{sc.badge}</span>
              <span className="scheme-type">{sc.type}</span>
            </div>
            <h3 className="scheme-name">{sc.name}</h3>
            <div className="scheme-coverage">
              <span className="cov-icon">💰</span>
              <span className="cov-text">{sc.coverage}</span>
            </div>
            <p className="scheme-desc">{sc.desc}</p>
            <div className="scheme-card-footer">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => onNavigate(SCREENS.SCHEME_DETAILS)}
              >
                View Eligibility & Documents →
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
