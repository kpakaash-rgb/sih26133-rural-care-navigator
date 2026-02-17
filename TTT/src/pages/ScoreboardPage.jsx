import { useState, useEffect } from 'react'

function ScoreboardPage() {
  const [timeRemaining, setTimeRemaining] = useState('04:23:15')
  const [searchQuery, setSearchQuery] = useState('')

  const teams = [
    { rank: 1, name: 'Cyber Phantoms', logo: '👻', solved: 24, points: 8950, streak: 12 },
    { rank: 2, name: 'Shadow Hackers', logo: '🕵️', solved: 22, points: 8420, streak: 8 },
    { rank: 3, name: 'Elite Coders', logo: '⚡', solved: 21, points: 8100, streak: 9 },
    { rank: 4, name: 'Binary Ninjas', logo: '🥷', solved: 19, points: 7650, streak: 6 },
    { rank: 5, name: 'Crypto Dragons', logo: '🐉', solved: 18, points: 7200, streak: 7 },
    { rank: 6, name: 'Zero Trojans', logo: '🛡️', solved: 17, points: 6890, streak: 5 },
    { rank: 7, name: 'Silent Storm', logo: '⛈️', solved: 15, points: 6100, streak: 4 },
    { rank: 8, name: 'Quantum Leap', logo: '🚀', solved: 14, points: 5800, streak: 3 },
    { rank: 9, name: 'Neon Pulse', logo: '💫', solved: 12, points: 4900, streak: 2 },
    { rank: 10, name: 'Firewall Breakers', logo: '🔥', solved: 11, points: 4500, streak: 1 },
  ]

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const [hours, minutes, seconds] = prev.split(':').map(Number)
        let h = hours, m = minutes, s = seconds
        
        if (s > 0) s--
        else if (m > 0) {
          m--
          s = 59
        } else if (h > 0) {
          h--
          m = 59
          s = 59
        } else {
          return '00:00:00'
        }
        
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const filteredTeams = teams.filter(team =>
    team.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] relative overflow-hidden">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{backgroundImage: 'linear-gradient(0deg, rgba(0,217,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,217,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}>
      </div>

      {/* Radial glows */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[120px]"></div>
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-500/20 rounded-full blur-[120px]"></div>

      {/* Main Content */}
      <div className="relative z-10 pt-20 pb-20 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          
          {/* Header */}
          <div className="mb-12">
            <h1 className="text-5xl md:text-6xl font-bold text-white text-glow-white mb-4">
              Global Scoreboard
            </h1>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <p className="text-gray-400 text-lg">
                Real-time rankings across all participating teams
              </p>
              <div className="flex items-center gap-4 glass-effect rounded-lg px-6 py-3 shadow-neon-blue w-fit">
                <span className="text-gray-400 text-sm">TIME REMAINING:</span>
                <span className="text-cyber-blue font-bold text-lg font-mono">{timeRemaining}</span>
              </div>
            </div>
          </div>

          {/* Podium Section */}
          <div className="mb-16">
            <div className="grid grid-cols-3 gap-4 md:gap-6 mb-12">
              
              {/* Silver (2nd) */}
              <div className="flex flex-col items-center">
                <div className="glass-effect rounded-lg p-8 w-full shadow-neon-blue relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-400 to-gray-400"></div>
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold mb-2">🥈</div>
                    <h3 className="text-lg md:text-xl font-bold text-gray-300 mb-2">{teams[1].name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{teams[1].logo} • {teams[1].solved} challenges</p>
                    <div className="text-2xl md:text-3xl font-bold text-gray-300">
                      {teams[1].points}
                      <span className="text-sm text-gray-500 ml-2">pts</span>
                    </div>
                  </div>
                </div>
                <div className="text-gray-500 font-bold text-lg md:text-xl">2nd Place</div>
              </div>

              {/* Gold (1st) */}
              <div className="flex flex-col items-center transform -translate-y-8">
                <div className="glass-effect rounded-lg p-8 w-full shadow-neon-blue relative overflow-hidden mb-4" style={{boxShadow: '0 0 30px rgba(255,215,0,0.4)'}}>
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-400 to-yellow-500"></div>
                  <div className="text-center">
                    <div className="text-6xl md:text-7xl font-bold mb-2">🏆</div>
                    <h3 className="text-lg md:text-2xl font-bold text-yellow-300 mb-2">{teams[0].name}</h3>
                    <p className="text-yellow-400 text-sm mb-4">{teams[0].logo} • {teams[0].solved} challenges</p>
                    <div className="text-3xl md:text-4xl font-bold text-yellow-300">
                      {teams[0].points}
                      <span className="text-sm text-yellow-500 ml-2">pts</span>
                    </div>
                  </div>
                </div>
                <div className="text-yellow-400 font-bold text-xl md:text-2xl">1st Place</div>
              </div>

              {/* Bronze (3rd) */}
              <div className="flex flex-col items-center">
                <div className="glass-effect rounded-lg p-8 w-full shadow-neon-blue relative overflow-hidden mb-4">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-orange-400"></div>
                  <div className="text-center">
                    <div className="text-5xl md:text-6xl font-bold mb-2">🥉</div>
                    <h3 className="text-lg md:text-xl font-bold text-orange-300 mb-2">{teams[2].name}</h3>
                    <p className="text-gray-400 text-sm mb-4">{teams[2].logo} • {teams[2].solved} challenges</p>
                    <div className="text-2xl md:text-3xl font-bold text-orange-300">
                      {teams[2].points}
                      <span className="text-sm text-orange-600 ml-2">pts</span>
                    </div>
                  </div>
                </div>
                <div className="text-orange-500 font-bold text-lg md:text-xl">3rd Place</div>
              </div>
            </div>
          </div>

          {/* Rankings Table */}
          <div className="glass-effect rounded-lg shadow-neon-blue p-6 md:p-8">
            {/* Search and Filter */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search teams..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue"
                />
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button className="px-4 py-2 border border-gray-700 rounded-lg text-gray-300 hover:border-cyber-blue hover:text-cyber-blue transition-colors">
                Filter
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-2 text-gray-400 font-semibold">RANK</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-semibold">TEAM NAME</th>
                    <th className="text-left py-3 px-2 text-gray-400 font-semibold">CHALLENGES</th>
                    <th className="text-right py-3 px-2 text-gray-400 font-semibold">POINTS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeams.map((team) => (
                    <tr key={team.rank} className="border-b border-gray-700/50 hover:bg-cyan-500/5 transition-colors">
                      <td className="py-4 px-2">
                        <span className="text-cyber-blue font-bold">#{team.rank}</span>
                      </td>
                      <td className="py-4 px-2">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{team.logo}</span>
                          <span className="text-white font-semibold">{team.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-2 text-gray-300">{team.solved}</td>
                      <td className="py-4 px-2 text-right">
                        <span className="font-bold text-cyber-blue text-lg">{team.points}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>


          </div>
        </div>
      </div>
    </div>
  )
}

export default ScoreboardPage
