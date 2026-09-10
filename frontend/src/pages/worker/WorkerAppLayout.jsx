import React, { useEffect } from 'react'
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { Home, Users, CheckSquare, User, Bell } from 'lucide-react'
import { getStaffSession, clearStaffSession } from '../../services/api'

/**
 * Persistent layout shell for all authenticated Worker screens.
 * Renders the app header, the active page via <Outlet />, and
 * the bottom navigation bar.
 */
export default function WorkerAppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const session = getStaffSession()

  // Role guard: Ensure valid WORKER session. If missing or role mismatch, redirect to /staff/login
  useEffect(() => {
    const current = getStaffSession()
    if (!current || !current.token || current.role !== 'WORKER') {
      navigate('/staff/login', { replace: true })
    }
  }, [navigate])

  const handleLogout = () => {
    clearStaffSession()
    navigate('/staff/login', { replace: true })
  }

  // Prevent rendering protected screens if unauthenticated
  if (!session || !session.token || session.role !== 'WORKER') {
    return null
  }

  const workerName = session.user?.name || 'Frontline Worker'
  const facilityName = session.user?.facility_name || 'Primary Health Centre'

  const navItems = [
    { to: '/worker/home',     icon: Home,        label: 'Home' },
    { to: '/worker/patients', icon: Users,       label: 'Patients' },
    { to: '/worker/tasks',    icon: CheckSquare, label: 'Tasks', badge: 3 },
    { to: '/worker/profile',  icon: User,        label: 'Profile' },
  ]

  return (
    <div className="page">
      {/* ── App Header ── */}
      <header className="app-header">
        <div className="header-brand">
          {/* Logo mark */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 34, height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="8" y="1" width="4" height="18" rx="1.5" fill="white"/>
                <rect x="1" y="8" width="18" height="4" rx="1.5" fill="white"/>
              </svg>
            </div>
            <div>
              <div className="header-title">{facilityName}</div>
              <div className="header-role">Worker: {workerName}</div>
            </div>
          </div>
        </div>

        {/* Sync status badge & Switch / Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={handleLogout}
            className="header-switch-role-btn"
            title="Sign out of worker session"
            id="worker-logout-btn"
            style={{
              background: 'rgba(239,68,68,0.25)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 20,
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            Sign Out
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="header-switch-role-btn"
            title="Portal Home"
            style={{
              background: 'rgba(255,255,255,0.18)',
              border: 'none',
              borderRadius: 20,
              color: 'white',
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '4px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            ← Home
          </button>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(255,255,255,0.18)',
            borderRadius: 20, padding: '4px 10px',
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: '#4ADE80',
              boxShadow: '0 0 0 2px rgba(74,222,128,0.35)',
              display: 'inline-block',
            }} />
            <span style={{ color: 'white', fontSize: '0.72rem', fontWeight: 700, lineHeight: 1 }}>
              Sync OK
            </span>
          </div>
          <button className="header-icon-btn" aria-label="Notifications">
            <Bell size={18} />
          </button>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="page-content animate-fade-in">
        <Outlet />
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map(({ to, icon: Icon, label, badge }) => {
          const active = location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} className={`nav-item ${active ? 'active' : ''}`}>
              {active && <span className="nav-active-indicator" />}
              <span className="nav-icon">
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {badge && <span className="nav-badge">{badge}</span>}
              </span>
              <span className="nav-label">{label}</span>
            </NavLink>
          )
        })}
      </nav>
    </div>
  )
}
