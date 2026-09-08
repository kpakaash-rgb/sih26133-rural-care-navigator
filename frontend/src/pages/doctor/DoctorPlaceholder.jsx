import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Stethoscope, ArrowLeft } from 'lucide-react'

export default function DoctorPlaceholder() {
  const navigate = useNavigate()

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: '#F8FAFC',
      fontFamily: 'Inter, sans-serif',
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: '#EDE9FE',
        color: '#6D28D9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
      }}>
        <Stethoscope size={32} />
      </div>

      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>
        Doctor Module
      </h1>

      <p style={{ color: '#64748B', maxWidth: 360, marginBottom: 24, fontSize: '0.95rem', lineHeight: 1.5 }}>
        Coming next. Manage appointments, review patients, consult and create referrals.
      </p>

      <button
        type="button"
        onClick={() => navigate('/')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 12,
          background: '#0A58CA',
          color: '#FFFFFF',
          border: 'none',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={18} />
        Back to Role Selection
      </button>
    </div>
  )
}
