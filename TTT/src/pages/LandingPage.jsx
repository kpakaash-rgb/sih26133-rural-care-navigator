import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function LandingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    college: '',
    accessKey: ''
  })
  const navigate = useNavigate()
  const { setIsLoggedIn } = useAuth()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Registration initiated:', formData)
    setIsLoggedIn(true)
    // After registration, navigate to team page
    navigate('/team')
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] relative overflow-hidden pt-20">
      {/* Radial glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px]"></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-7xl mx-auto grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
          
          {/* LEFT SIDE - Hero Section */}
          <div className="space-y-8">
            {/* System Status */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse"></span>
              <span className="text-cyber-blue text-sm font-medium tracking-wider">SYSTEM ONLINE</span>
            </div>

            {/* Main Heading */}
            <div className="space-y-2">
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-white text-glow-white">
                TRACE
              </h1>
              <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400 bg-clip-text text-transparent text-glow">
                THE TRUTH
              </h1>
              <p className="text-gray-400 text-lg tracking-[0.3em] font-light pt-2">
                2026 EDITION
              </p>
            </div>

            {/* Event Details Log Box */}
            <div className="glass-effect rounded-lg p-6 shadow-neon-blue max-w-md">
              <div className="font-mono text-sm space-y-2">
                <div className="text-cyber-blue mb-4">
                  &gt; Event_Details.log
                </div>
                <div className="text-gray-300 space-y-1">
                  <div>
                    <span className="text-gray-500">Target:</span> Capture The Flag (CTF)
                  </div>
                  <div>
                    <span className="text-gray-500">Protocol:</span> Secure Shell Access
                  </div>
                  <div>
                    <span className="text-gray-500">Location:</span> Remote // Global
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT SIDE - Registration Card */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md glass-effect rounded-2xl p-8 shadow-neon-blue">
              {/* Card Header */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">
                  Initialize Sequence
                </h2>
                <p className="text-gray-400 text-sm">
                  Enter your credentials to join the investigation.
                </p>
              </div>

              {/* Registration Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Full Name Input */}
                <div>
                  <label className="block text-cyber-blue text-xs font-medium mb-2 tracking-wide">
                    &gt; FULL NAME_
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      placeholder="John Doe"
                      className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Email Input */}
                <div>
                  <label className="block text-cyber-blue text-xs font-medium mb-2 tracking-wide">
                    &gt; EMAIL ADDRESS_
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="hacker@example.com"
                      className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                    />
                  </div>
                </div>

                {/* College Input */}
                <div>
                  <label className="block text-cyber-blue text-xs font-medium mb-2 tracking-wide">
                    &gt; COLLEGE_
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    <input
                      type="text"
                      name="college"
                      value={formData.college}
                      onChange={handleInputChange}
                      placeholder="Cyber University"
                      className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div>
                  <label className="block text-cyber-blue text-xs font-medium mb-2 tracking-wide">
                    &gt; ACCESS KEY (PASSWORD)_
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </span>
                    <input
                      type="password"
                      name="accessKey"
                      value={formData.accessKey}
                      onChange={handleInputChange}
                      placeholder="••••••••"
                      className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-12 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-4 px-6 rounded-lg shadow-neon-blue hover:shadow-neon-blue-lg transform hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2 mt-8"
                >
                  INITIATE REGISTRATION
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </form>

              {/* Login Link */}
              <div className="mt-6 text-center">
                <p className="text-gray-500 text-sm">
                  Already possess an access key?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-cyber-blue hover:underline font-medium"
                  >
                    Log in to Console
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LandingPage
