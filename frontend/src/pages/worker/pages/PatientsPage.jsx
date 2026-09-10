import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, ChevronRight, UserPlus, Clock,
  MapPin, X
} from 'lucide-react'
import { getWorkerPatients } from '../../../services/api'
import './PatientsPage.css'

const FILTERS = ['All', 'Needs Attention', 'High Risk', 'Routine', 'Antenatal Care']

export default function PatientsPage() {
  const navigate = useNavigate()
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState('All')
  const [livePatients, setLivePatients] = useState([])

  useEffect(() => {
    let isMounted = true
    getWorkerPatients(query)
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          const mapped = data.map((p) => ({
            id: p.id,
            displayId: `P${String(p.id).padStart(6, '0')}`,
            name: p.full_name,
            age: p.age ?? 35,
            gender: p.gender || 'Unknown',
            village: p.village || p.district || 'Village Sector',
            category: 'General Assessment',
            risk: 'Needs Attention',
            initials: (p.full_name || 'Patient').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
            lastVisit: 'Recently Added',
            tag: 'pp-badge-amber',
            accent: 'pp-card-attention',
          }))
          setLivePatients(mapped)
        }
      })
      .catch(() => {})
    return () => {
      isMounted = false
    }
  }, [query])

  const allPatients = livePatients

  const filtered = allPatients.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.village.toLowerCase().includes(query.toLowerCase()) ||
      String(p.id).toLowerCase().includes(query.toLowerCase()) ||
      (p.displayId && p.displayId.toLowerCase().includes(query.toLowerCase()))

    const matchesFilter =
      filter === 'All' ||
      p.risk === filter ||
      p.category === filter

    return matchesSearch && matchesFilter
  })

  function handleOpenPatient(patientId) {
    navigate('/worker/patient-summary', { state: { patientId } })
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
          onClick={() => navigate('/worker/register-patient')}
        >
          <UserPlus size={14} /> + Register New
        </button>
      </div>

      {/* ΓöÇΓöÇ Patient Cards List ΓöÇΓöÇ */}
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
                  {p.gender}, {p.age} yrs ΓÇó {p.id}
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
