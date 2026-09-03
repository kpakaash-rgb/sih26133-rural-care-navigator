import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronRight, UserPlus, Clock,
  MapPin, X, AlertTriangle, CheckCircle2
} from 'lucide-react'
import './PatientsPage.css'

const PATIENTS = [
  {
    id: 'P104827',
    name: 'Anitha Kumar',
    age: 42,
    gender: 'Female',
    village: 'Kovilur, Ward 3',
    category: 'General Assessment',
    risk: 'Needs Attention',
    initials: 'AK',
    lastVisit: 'Today, 09:30 AM',
    tag: 'pp-badge-amber',
    accent: 'pp-card-attention',
  },
  {
    id: 'P104812',
    name: 'Meena Kumari',
    age: 26,
    gender: 'Female',
    village: 'Rampur Tola, Ward 2',
    category: 'Antenatal Care',
    risk: 'High Risk',
    initials: 'MK',
    lastVisit: 'Yesterday',
    tag: 'pp-badge-red',
    accent: 'pp-card-urgent',
  },
  {
    id: 'P104803',
    name: 'Sunita Yadav',
    age: 23,
    gender: 'Female',
    village: 'Main Basti, Block A',
    category: 'Postnatal Care',
    risk: 'Routine',
    initials: 'SY',
    lastVisit: '3 days ago',
    tag: 'pp-badge-green',
  },
  {
    id: 'P104791',
    name: 'Raju Singh',
    age: 4,
    gender: 'Male',
    village: 'Rampur Tola, Ward 2',
    category: 'Child Immunisation',
    risk: 'Routine',
    initials: 'RS',
    lastVisit: '4 days ago',
    tag: 'pp-badge-blue',
  },
  {
    id: 'P104778',
    name: 'Prabha Devi',
    age: 34,
    gender: 'Female',
    village: 'Khera Mod, Sector 1',
    category: 'Antenatal Care',
    risk: 'Routine',
    initials: 'PD',
    lastVisit: '1 week ago',
    tag: 'pp-badge-green',
  },
  {
    id: 'P104765',
    name: 'Ramesh Prasad',
    age: 52,
    gender: 'Male',
    village: 'Old Colony, Ward 7',
    category: 'NCD Screening',
    risk: 'High Risk',
    initials: 'RP',
    lastVisit: '5 days ago',
    tag: 'pp-badge-red',
    accent: 'pp-card-urgent',
  },
  {
    id: 'P104752',
    name: 'Laxmi Bai',
    age: 38,
    gender: 'Female',
    village: 'Main Basti, Block A',
    category: 'Nutrition Support',
    risk: 'Needs Attention',
    initials: 'LB',
    lastVisit: '2 days ago',
    tag: 'pp-badge-amber',
    accent: 'pp-card-attention',
  },
]

const FILTERS = ['All', 'Needs Attention', 'High Risk', 'Routine', 'Antenatal Care']

export default function PatientsPage() {
  const navigate = useNavigate()
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')

  const filtered = PATIENTS.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.village.toLowerCase().includes(query.toLowerCase()) ||
      p.id.toLowerCase().includes(query.toLowerCase())

    const matchesFilter =
      filter === 'All' ||
      p.risk === filter ||
      p.category === filter

    return matchesSearch && matchesFilter
  })

  function handleOpenPatient(patientId) {
    navigate('/patient-summary')
  }

  return (
    <div className="pp-root animate-fade-in">

      {/* ── Search Bar ── */}
      <div className="pp-search-wrap">
        <Search size={18} className="pp-search-icon" />
        <input
          id="patient-search-input"
          className="pp-search-input"
          placeholder="Search patient name, ID, village…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="pp-search-clear"
            onClick={() => setQuery('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Filter Chips ── */}
      <div className="pp-filters-row">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={`pp-filter-chip ${filter === f ? 'pp-filter-active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {/* ── Count & Action ── */}
      <div className="pp-count-row">
        <span className="pp-count-text">
          {filtered.length} patient{filtered.length !== 1 ? 's' : ''} assigned
        </span>
        <button
          type="button"
          className="pp-new-patient-link"
          onClick={() => navigate('/register-patient')}
        >
          <UserPlus size={14} /> + Register New
        </button>
      </div>

      {/* ── Patient Cards List ── */}
      <div className="pp-list">
        {filtered.length === 0 ? (
          <div className="pp-empty">
            <div className="pp-empty-icon">
              <Search size={26} />
            </div>
            <p style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', color: 'var(--color-text-primary)' }}>
              No matching patients found
            </p>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
              Try searching by different name, village, or ID
            </p>
          </div>
        ) : (
          filtered.map((p) => (
            <div
              key={p.id}
              id={`patient-card-${p.id}`}
              className={`pp-card ${p.accent || ''}`}
              onClick={() => handleOpenPatient(p.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') handleOpenPatient(p.id) }}
            >
              <div className="pp-avatar">{p.initials}</div>

              <div className="pp-card-body">
                <div className="pp-card-top-row">
                  <h3 className="pp-patient-name">{p.name}</h3>
                  <span className={`pp-badge ${p.tag}`}>{p.risk}</span>
                </div>

                <p className="pp-card-meta">
                  {p.gender}, {p.age} yrs • {p.id}
                </p>

                <div className="pp-card-submeta">
                  <span className="pp-submeta-item">
                    <MapPin size={11} /> {p.village}
                  </span>
                  <span className="pp-submeta-item">
                    <Clock size={11} /> {p.lastVisit}
                  </span>
                </div>
              </div>

              <ChevronRight size={18} className="pp-arrow" />
            </div>
          ))
        )}
      </div>

    </div>
  )
}
