import { useState } from 'react'

function ChallengesManagement() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const challenges = [
    {
      id: 1,
      title: 'The Hidden Truth',
      subtitle: 'ID: WEB-001',
      category: 'Web Security',
      points: 500,
      difficulty: 'EASY',
      solves: 242,
      status: true
    },
    {
      id: 2,
      title: 'Kernel Panic 0x41',
      subtitle: 'ID: PWN-034',
      category: 'Binary Exploitation',
      points: 1200,
      difficulty: 'HARD',
      solves: 12,
      status: true
    },
    {
      id: 3,
      title: 'Ghost in the RAM',
      subtitle: 'ID: FOR-009',
      category: 'Forensics',
      points: 800,
      difficulty: 'MEDIUM',
      solves: 54,
      status: false
    },
    {
      id: 4,
      title: 'Cipher Stream Alpha',
      subtitle: 'ID: CRY-112',
      category: 'Cryptography',
      points: 300,
      difficulty: 'EASY',
      solves: 198,
      status: true
    },
    {
      id: 5,
      title: 'Recursive Injection',
      subtitle: 'ID: WEB-098',
      category: 'Web Security',
      points: 1000,
      difficulty: 'HARD',
      solves: 41,
      status: true
    }
  ]

  const stats = [
    {
      title: 'TOTAL CHALLENGES',
      value: '48',
      badge: '+4%',
      badgeType: 'success'
    },
    {
      title: 'ACTIVE NOW',
      value: '32',
      badge: 'Stable',
      badgeType: 'neutral'
    },
    {
      title: 'TOTAL SOLVES',
      value: '1,240',
      badge: '+12%',
      badgeType: 'success'
    },
    {
      title: 'AVG. SOLVES/DAY',
      value: '18.4',
      badge: '-2%',
      badgeType: 'danger'
    }
  ]

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-500/15 text-green-400 border-green-500/20'
      case 'MEDIUM':
        return 'bg-orange-500/15 text-orange-400 border-orange-500/20'
      case 'HARD':
        return 'bg-red-500/15 text-red-400 border-red-500/20'
      default:
        return 'bg-slate-500/15 text-slate-400 border-slate-500/20'
    }
  }

  const getBadgeColor = (type) => {
    switch (type) {
      case 'success':
        return 'text-green-400'
      case 'danger':
        return 'text-red-400'
      default:
        return 'text-slate-400'
    }
  }

  return (
    <div className="p-10">
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight mb-2">
              Challenges Management
            </h1>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500 font-medium">Admin</span>
              <svg className="w-4 h-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span className="text-slate-400 font-medium">Challenges</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search challenges..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-80 bg-slate-800/70 border border-slate-700/50 rounded-xl pl-12 pr-5 py-3 text-slate-300 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800 transition-all"
              />
            </div>

            {/* Add Challenge Button */}
            <button 
              onClick={() => window.location.href = '/naandhaaadmin/create-challenge'}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all duration-200 shadow-lg shadow-blue-600/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Challenge
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div key={index} className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300">
            <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">
              {stat.title}
            </h3>
            <div className="flex items-end justify-between">
              <p className="text-white text-4xl font-bold tracking-tight">
                {stat.value}
              </p>
              <span className={`text-sm font-semibold ${getBadgeColor(stat.badgeType)}`}>
                {stat.badge}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Challenge List Card */}
      <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-8 shadow-xl">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-white text-xl font-bold tracking-tight">Challenge List</h2>
          
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition-all duration-200 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filter
            </button>
            
            <button className="flex items-center gap-2 px-4 py-2.5 bg-transparent border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 rounded-lg transition-all duration-200 text-sm font-medium">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto -mx-4">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Challenge Title
                </th>
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Category
                </th>
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Points
                </th>
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Difficulty
                </th>
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Solves
                </th>
                <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Status
                </th>
                <th className="text-right text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {challenges.map((challenge, index) => (
                <tr 
                  key={challenge.id} 
                  className="border-b border-slate-800/30 last:border-0 hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-5 px-4">
                    <div>
                      <p className="text-white text-sm font-semibold mb-1">
                        {challenge.title}
                      </p>
                      <p className="text-slate-500 text-xs font-mono">
                        {challenge.subtitle}
                      </p>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-slate-400 text-sm font-medium">
                    {challenge.category}
                  </td>
                  <td className="py-5 px-4">
                    <span className="text-blue-400 text-sm font-bold">
                      {challenge.points}
                    </span>
                  </td>
                  <td className="py-5 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border ${getDifficultyColor(challenge.difficulty)}`}>
                      {challenge.difficulty}
                    </span>
                  </td>
                  <td className="py-5 px-4 text-slate-300 text-sm font-medium">
                    {challenge.solves}
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      {/* Toggle Switch */}
                      <button
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                          challenge.status ? 'bg-blue-600' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            challenge.status ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${
                        challenge.status ? 'text-blue-400' : 'text-slate-500'
                      }`}>
                        {challenge.status ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                  </td>
                  <td className="py-5 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2 text-slate-400 hover:text-blue-400 hover:bg-slate-800 rounded-lg transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-all duration-200">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default ChallengesManagement
