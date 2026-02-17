import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

function AdminLogin() {
  const [formData, setFormData] = useState({
    adminId: '',
    securePhrase: '',
    rememberSession: false
  })
  const [showPassword, setShowPassword] = useState(false)
  const [cursorBlink, setCursorBlink] = useState(true)
  const [systemIp, setSystemIp] = useState('192.168.x.x [PROXY_DETECTED]')
  
  const navigate = useNavigate()
  const { setIsLoggedIn } = useAuth()

  // Simulate cursor blinking
  useEffect(() => {
    const interval = setInterval(() => {
      setCursorBlink(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [])

  // Simulate dynamic IP
  useEffect(() => {
    const randomOctet = Math.floor(Math.random() * 255)
    setSystemIp(`192.168.${randomOctet}.x [PROXY_DETECTED]`)
  }, [])

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Form submitted:', formData)
    
    // For testing - navigate regardless of input
    console.log('Navigating to admin dashboard...')
    setIsLoggedIn(true)
    
    // Use direct window.location for debugging
    window.location.href = '/naandhaaadmin/dashboard'
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background gradient */}
      <div className="absolute inset-0">
        {/* Dark navy gradient base */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900"></div>
        
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,217,255,0.05)_1px,transparent_1px),linear-gradient(rgba(0,217,255,0.05)_1px,transparent_1px)] bg-[length:40px_40px]"></div>
        
        {/* Soft radial neon blue glow from center */}
        <div className="absolute inset-0 bg-radial-glow via-transparent to-transparent" style={{
          background: 'radial-gradient(ellipse 800px 600px at 50% 50%, rgba(3, 168, 244, 0.15), transparent 80%)'
        }}></div>
      </div>

      {/* Centered glassmorphic card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="backdrop-blur-xl bg-slate-900/40 border border-cyan-500/30 rounded-xl p-8 shadow-2xl hover:shadow-blue-500/20 transition-shadow duration-300">
          {/* Top badge */}
          <div className="flex justify-center mb-8">
            <div className="px-4 py-2 border border-cyan-500/50 rounded-full text-xs font-mono tracking-widest text-cyan-400">
              &gt; SYSTEM_ADMIN_LOGIN
            </div>
          </div>

          {/* Main title */}
          <h1 className="text-3xl font-bold text-center mb-2 font-sans tracking-tight">
            Identify Yourself
          </h1>

          {/* Subtitle */}
          <p className="text-center text-slate-400 text-sm mb-8 font-sans">
            Enter your credentials to access the forensics mainframe.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Admin ID field */}
            <div>
              <label className="block text-xs font-mono text-cyan-400 mb-2 tracking-wider">
                &gt; ADMIN_ID
              </label>
              <div className="relative group">
                <input
                  type="text"
                  name="adminId"
                  value={formData.adminId}
                  onChange={handleInputChange}
                  placeholder="usr_root_01"
                  className="w-full bg-slate-950/60 border border-cyan-500/30 rounded-lg px-4 py-3 text-cyan-300 font-mono text-sm placeholder-slate-600 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:bg-slate-950/80 focus:shadow-[0_0_20px_rgba(3,168,244,0.3)] focus:ring-1 focus:ring-cyan-500/50"
                />
                {/* Blinking cursor indicator */}
                {formData.adminId && (
                  <div className={`absolute right-3 top-1/2 -translate-y-1/2 text-cyan-400 font-mono text-lg transition-opacity ${cursorBlink ? 'opacity-100' : 'opacity-0'}`}>
                    _
                  </div>
                )}
              </div>
            </div>

            {/* Secure phrase field */}
            <div>
              <label className="block text-xs font-mono text-cyan-400 mb-2 tracking-wider">
                &gt; SECURE_PHRASE
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-cyan-500 flex items-center">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0 1 10 0v2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zm8-2v2H7V7a3 3 0 0 1 6 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="securePhrase"
                  value={formData.securePhrase}
                  onChange={handleInputChange}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/60 border border-cyan-500/30 rounded-lg pl-12 pr-4 py-3 text-cyan-300 font-mono text-sm placeholder-slate-600 transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:bg-slate-950/80 focus:shadow-[0_0_20px_rgba(3,168,244,0.3)] focus:ring-1 focus:ring-cyan-500/50"
                />
                {/* Show/hide password button */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-500 hover:text-cyan-300 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
                      <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.262l1.514 1.515a2.003 2.003 0 002.45 2.45l1.514 1.514a4 4 0 00-5.478-5.479z" clipRule="evenodd" />
                      <path d="M15.171 13.576l1.414 1.414A10.016 10.016 0 0020.331 10c-1.274-4.057-5.064-7-9.331-7a9.948 9.948 0 00-2.611.38l1.83 1.83a4 4 0 014.3 4.472l3.585 3.585z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Checkbox and forgot credentials */}
            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center space-x-2 cursor-pointer group">
                <input
                  type="checkbox"
                  name="rememberSession"
                  checked={formData.rememberSession}
                  onChange={handleInputChange}
                  className="w-4 h-4 rounded border-cyan-500/50 bg-slate-950/60 accent-cyan-500 cursor-pointer"
                />
                <span className="font-mono text-slate-400 group-hover:text-cyan-400 transition-colors">
                  REMEMBER_SESSION
                </span>
              </label>
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-mono text-cyan-500 hover:text-cyan-300 transition-colors"
              >
                FORGOT_CREDS?
              </a>
            </div>

            {/* Authenticate button */}
            <button
              type="submit"
              className="w-full mt-8 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-mono font-bold py-3 rounded-lg transition-all duration-300 shadow-lg hover:shadow-[0_0_30px_rgba(3,168,244,0.5)] hover:shadow-cyan-500/50 active:scale-95 text-sm tracking-widest"
            >
              [ AUTHENTICATE ]
            </button>

            {/* Warning text */}
            <div className="flex items-center justify-center space-x-2 mt-6 pt-6 border-t border-red-500/30">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-red-500 text-xs font-mono">
                ROOT ACCESS ONLY // UNAUTHORIZED ACCESS LOGGED
              </span>
            </div>
          </form>
        </div>

        {/* Bottom system info */}
        <div className="flex justify-between items-center mt-8 px-4 text-xs font-mono text-slate-500">
          <span>IP: {systemIp}</span>
          <span>LATENCY: 24ms</span>
        </div>
      </div>

      {/* Floating particles effect */}
      <div className="fixed inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-cyan-400/10 blur-xl"
            style={{
              width: Math.random() * 300 + 50 + 'px',
              height: Math.random() * 300 + 50 + 'px',
              left: Math.random() * 100 + '%',
              top: Math.random() * 100 + '%',
              animation: `float ${Math.random() * 10 + 15}s infinite ease-in-out`,
              animationDelay: Math.random() * 5 + 's'
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          50% { transform: translate(30px, -30px) scale(1.1); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}

export default AdminLogin
