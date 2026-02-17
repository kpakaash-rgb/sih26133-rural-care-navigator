import { useState, useEffect } from 'react'
import Navbar from './Navbar'

function Scoreboard({ onNavigate, currentPage }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [timeRemaining, setTimeRemaining] = useState('04:23:15')

  // Simulate countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const [hours, minutes, seconds] = prev.split(':').map(Number)
        let newSeconds = seconds - 1
        let newMinutes = minutes
        let newHours = hours

        if (newSeconds < 0) {
          newSeconds = 59
          newMinutes -= 1
        }
        if (newMinutes < 0) {
          newMinutes = 59
          newHours -= 1
        }
        if (newHours < 0) {
          return '00:00:00'
        }

        return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Top 3 podium teams
  const podium = [
    {
      rank: 2,
      name: 'RedTeamGo',
      college: 'MIT',
      score: 4850,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=RedTeamGo',
      lastSolved: '8m ago',
      borderColor: 'border-gray-400',
      glowColor: 'shadow-[0_0_30px_rgba(192,192,192,0.3)]'
    },
    {
      rank: 1,
      name: 'NullPointer',
      college: 'Stanford University',
      score: 5000,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=NullPointer',
      lastSolved: '2m ago',
      borderColor: 'border-yellow-500',
      glowColor: 'shadow-[0_0_40px_rgba(234,179,8,0.5)]',
      badge: true
    },
    {
      rank: 3,
      name: 'SudoSu',
      college: 'Carnegie Mellon',
      score: 4200,
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SudoSu',
      lastSolved: '15m ago',
      borderColor: 'border-orange-700',
      glowColor: 'shadow-[0_0_30px_rgba(194,65,12,0.3)]'
    }
  ]

  // Rankings table data
  const rankings = [
    { rank: 4, name: 'CryptoKnights', college: 'UC Berkeley', solved: 42, points: 3950, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=CryptoKnights' },
    { rank: 5, name: 'ByteBandits', college: 'Georgia Tech', solved: 40, points: 3800, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ByteBandits' },
    { rank: 6, name: 'PacketLoss', college: 'UT Austin', solved: 38, points: 3650, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=PacketLoss' },
    { rank: 7, name: 'OverflowGang', college: 'Purdue University', solved: 35, points: 3400, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=OverflowGang' },
    { rank: 8, name: 'ZeroDay', college: 'University of Waterloo', solved: 34, points: 3250, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ZeroDay' },
    { rank: 9, name: 'Whitelets', college: 'Imperial College London', solved: 30, points: 2900, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Whitelets' },
    { rank: 10, name: 'SQLInjectors', college: 'ETH Zurich', solved: 28, points: 2600, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=SQLInjectors' }
  ]

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] relative">
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      ></div>

      {/* Radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,217,255,0.1)_0%,_transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(0,150,255,0.1)_0%,_transparent_50%)]"></div>

      {/* Main Content */}
      <div className="relative z-10">
        
        {/* Shared Navbar */}
        <Navbar currentPage={currentPage} onNavigate={onNavigate} timeRemaining={timeRemaining} />

        {/* Podium Section */}
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-end justify-center gap-6 mb-16">
            
            {/* Render podium in order: 2nd, 1st, 3rd */}
            {[podium[0], podium[1], podium[2]].map((team, index) => (
              <div
                key={team.rank}
                className={`
                  relative rounded-xl border-2 ${team.borderColor} ${team.glowColor}
                  ${team.rank === 1 ? 'w-80' : 'w-64'}
                  ${team.rank === 1 ? 'mt-0' : 'mt-12'}
                  transition-all duration-300 hover:scale-105
                `}
              >
                <div className="glass-effect rounded-xl p-6 text-center">
                  {/* Badge for #1 */}
                  {team.badge && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center border-4 border-[#0A1628] shadow-[0_0_20px_rgba(234,179,8,0.6)]">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  )}

                  {/* Rank Badge */}
                  <div className={`
                    absolute -top-4 -right-4 w-10 h-10 rounded-full flex items-center justify-center font-bold text-white border-4 border-[#0A1628]
                    ${team.rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : ''}
                    ${team.rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : ''}
                    ${team.rank === 3 ? 'bg-gradient-to-br from-orange-600 to-orange-800' : ''}
                  `}>
                    {team.rank}
                  </div>

                  {/* Avatar */}
                  <div className={`
                    mx-auto rounded-full overflow-hidden border-4 mb-4
                    ${team.rank === 1 ? 'w-24 h-24 border-yellow-500/50' : 'w-20 h-20 border-gray-600/50'}
                  `}>
                    <img src={team.avatar} alt={team.name} className="w-full h-full" />
                  </div>

                  {/* Team Info */}
                  <h3 className={`font-bold text-white mb-1 ${team.rank === 1 ? 'text-2xl' : 'text-xl'}`}>
                    {team.name}
                  </h3>
                  <p className="text-gray-500 text-sm mb-4">{team.college}</p>

                  {/* Score */}
                  <div className={`
                    font-bold mb-2
                    ${team.rank === 1 ? 'text-5xl text-yellow-500 text-glow' : 'text-3xl text-cyber-blue'}
                  `}>
                    {team.score.toLocaleString()}
                  </div>

                  {/* Last Solved */}
                  <p className="text-gray-600 text-xs">Last: {team.lastSolved}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Live Rankings Section */}
          <div className="glass-effect rounded-xl p-6 shadow-neon-blue">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <svg className="w-6 h-6 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Live Rankings
              </h2>

              {/* Search & Filter */}
              <div className="flex items-center gap-3">
                <div className="relative">
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search team by name..."
                    className="w-64 bg-[rgba(5,15,35,0.8)] border border-gray-700/50 rounded-lg pl-10 pr-4 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                  />
                </div>
                <button className="p-2 bg-[rgba(15,30,60,0.6)] hover:bg-[rgba(15,30,60,0.9)] border border-gray-700 rounded-lg transition-colors">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left text-gray-500 text-xs uppercase tracking-wider py-3 px-4">Rank</th>
                    <th className="text-left text-gray-500 text-xs uppercase tracking-wider py-3 px-4">Team Name</th>
                    <th className="text-left text-gray-500 text-xs uppercase tracking-wider py-3 px-4">College</th>
                    <th className="text-left text-gray-500 text-xs uppercase tracking-wider py-3 px-4">Solved</th>
                    <th className="text-left text-gray-500 text-xs uppercase tracking-wider py-3 px-4">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/50">
                  {rankings.map((team) => (
                    <tr 
                      key={team.rank}
                      className="hover:bg-white/5 transition-colors rounded-lg"
                    >
                      <td className="py-4 px-4">
                        <span className="text-white font-mono font-medium">{team.rank}</span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-700">
                            <img src={team.avatar} alt={team.name} className="w-full h-full" />
                          </div>
                          <span className="text-white font-medium">{team.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-400">{team.college}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-300">{team.solved}</span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-cyber-blue font-bold text-lg">{team.points.toLocaleString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-800">
              <p className="text-gray-600 text-sm">Showing 4-10 of 248 teams</p>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  Prev
                </button>
                <button className="px-4 py-2 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 rounded-lg transition-colors">
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 bg-[rgba(10,22,40,0.6)] backdrop-blur-sm mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left - Status */}
              <p className="text-gray-600 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                </svg>
                © 2026 Trace the Truth. All systems operational.
              </p>

              {/* Right - Links */}
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  Privacy Policy
                </a>
                <span className="text-gray-700">|</span>
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  Terms of Service
                </a>
                <span className="text-gray-700">|</span>
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  API
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}

export default Scoreboard
