import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

function Navbar() {
  const location = useLocation()
  const { isLoggedIn, hasTeam } = useAuth()

  if (!isLoggedIn) {
    return null
  }
  
  const showTeamInfo = location.pathname === '/challenges' || location.pathname === '/dashboard'

  return (
    <nav className="border-b border-gray-800/50 bg-[rgba(10,22,40,0.8)] backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          
          {/* Left - Logo & Branding */}
          <NavLink to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-lg flex items-center justify-center border border-cyber-blue/30">
              <svg className="w-6 h-6 text-cyber-blue" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/>
              </svg>
            </div>
            <div>
              <div className="text-white font-bold tracking-wide text-lg">TRACE THE TRUTH</div>
              <div className="text-gray-500 text-xs tracking-wider">2026 SEASON • CTF EVENT</div>
            </div>
          </NavLink>

          {/* Center - Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <NavLink
              to="/dashboard"
              className={({ isActive }) => `px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'text-cyber-blue'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/challenges"
              className={({ isActive }) => `px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'text-cyber-blue bg-blue-500/20'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Challenges
            </NavLink>
            <NavLink
              to="/scoreboard"
              className={({ isActive }) => `px-4 py-2 rounded-lg transition-colors font-medium ${
                isActive
                  ? 'text-cyber-blue'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Scoreboard
            </NavLink>
          </div>

          {/* Right - Profile */}
          <div className="flex items-center gap-4">
            {showTeamInfo && (
              <>
                <div className="text-right hidden sm:block">
                  <div className="text-white text-sm font-medium">Agent Cipher</div>
                  <div className="text-xs">
                    <span className="text-gray-500">ID: </span>
                    <span className="text-cyber-blue font-mono">0x4F3A</span>
                  </div>
                </div>
                <button className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cyan-500 rounded-full"></span>
                </button>
              </>
            )}
            
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center border-2 border-cyber-blue/30 overflow-hidden">
              <img 
                src="https://api.dicebear.com/7.x/avataaars/svg?seed=User" 
                alt="User Avatar"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
