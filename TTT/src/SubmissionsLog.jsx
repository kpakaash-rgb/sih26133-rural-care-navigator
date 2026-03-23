import React from 'react'

function SubmissionsLog() {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', active: false },
    { id: 'submissions', label: 'Submissions Log', active: true },
    { id: 'users', label: 'Users & Teams', active: false },
    { id: 'challenges', label: 'Challenges', active: false },
    { id: 'leaderboard', label: 'Leaderboard', active: false }
  ]

  const metricCards = [
    {
      title: 'Total Submissions',
      value: '14,282',
      delta: '+12% from last hour',
      deltaClass: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-[#2F81F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h12M4 12h8M4 17h16" />
        </svg>
      )
    },
    {
      title: 'Success Rate',
      value: '42.5%',
      delta: '+2.4% avg',
      deltaClass: 'text-emerald-400',
      icon: (
        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Active Teams',
      value: '128',
      delta: '-2 teams offline',
      deltaClass: 'text-red-400',
      icon: (
        <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m8-6a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  ]

  const submissions = [
    {
      timestamp: '2023-11-20 14:02:45',
      relative: 'Just now',
      team: 'Dark Byte Knights',
      teamBadge: 'DB',
      badgeColor: 'bg-blue-500/20 text-blue-300',
      category: 'Binary Exploitation',
      challenge: 'Buffer Overlord II',
      flag: 'TTT{v3ry_s3cur3_fl4g_123}',
      status: 'Correct'
    },
    {
      timestamp: '2023-11-20 14:01:12',
      relative: '1min ago',
      team: 'Cyber Ninjas',
      teamBadge: 'CN',
      badgeColor: 'bg-amber-500/20 text-amber-300',
      category: 'Web Security',
      challenge: 'SQLi injections',
      flag: 'TTT{wrong_flag_format}',
      status: 'Incorrect'
    },
    {
      timestamp: '2023-11-20 13:58:45',
      relative: '4 mins ago',
      team: 'PwnHub',
      teamBadge: 'PH',
      badgeColor: 'bg-emerald-500/20 text-emerald-300',
      category: 'Forensics',
      challenge: 'Memory Dump',
      flag: 'TTT{m3m0ry_unl0cked_v1}',
      status: 'Correct'
    },
    {
      timestamp: '2023-11-20 13:55:01',
      relative: '7 mins ago',
      team: 'Root Access',
      teamBadge: 'RA',
      badgeColor: 'bg-rose-500/20 text-rose-300',
      category: 'Web Security',
      challenge: 'SQLi injections',
      flag: 'admin" --',
      status: 'Incorrect'
    },
    {
      timestamp: '2023-11-20 13:50:22',
      relative: '12 mins ago',
      team: 'Little Bobby Tables',
      teamBadge: 'LB',
      badgeColor: 'bg-cyan-500/20 text-cyan-300',
      category: 'Cryptography',
      challenge: 'Prime Suspect',
      flag: 'TTT{rsa_w4s_t00_3asy_f0r_m3}',
      status: 'Correct'
    }
  ]

  const pulseBars = [32, 48, 58, 42, 68, 76, 54, 62, 49, 38]

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-[#071421] via-[#0B1E2D] to-[#071421] text-[#A9C1D9] relative"
      style={{ fontFamily: 'Rajdhani, Orbitron, sans-serif' }}
    >
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/30 pointer-events-none" />

      <div className="relative flex">
        {/* Sidebar */}
        <aside className="w-72 min-h-screen bg-white/5 backdrop-blur-xl border-r border-white/10 fixed left-0 top-0 flex flex-col">
          <div className="p-7 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2F81F7]/20 border border-[#2F81F7]/40 flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2F81F7]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-semibold tracking-wider">TRACE THE TRUTH</p>
                <p className="text-xs text-[#2F81F7] tracking-[0.3em]">ADMIN</p>
              </div>
            </div>
          </div>

          <nav className="px-5 py-6 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  item.active
                    ? 'bg-[#2F81F7]/20 text-white border border-[#2F81F7]/40 shadow-[0_0_18px_rgba(47,129,247,0.35)]'
                    : 'text-[#A9C1D9] hover:bg-white/5 hover:text-white'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
                {item.label}
              </button>
            ))}

            <div className="pt-6 mt-6 border-t border-white/10">
              <p className="text-xs text-[#A9C1D9]/70 tracking-[0.3em] mb-3">SYSTEM</p>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-[#A9C1D9] hover:bg-white/5 hover:text-white transition-all duration-200">
                <span className="w-2.5 h-2.5 rounded-full bg-current opacity-70" />
                Settings
              </button>
            </div>
          </nav>

          <div className="mt-auto p-6">
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#2F81F7]/60 to-[#2F81F7]/20 border border-[#2F81F7]/40 flex items-center justify-center text-white font-semibold">
                AC
              </div>
              <div>
                <p className="text-white text-sm font-semibold">Alex Chen</p>
                <p className="text-xs text-[#A9C1D9]">Lead Administrator</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 ml-72 px-10 py-8 space-y-8">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {metricCards.map((card, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_12px_30px_rgba(3,12,24,0.45)] hover:-translate-y-0.5 transition-transform duration-200"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    {card.icon}
                  </div>
                  <span className="text-xs text-[#A9C1D9]/70">Live</span>
                </div>
                <p className="text-sm text-[#A9C1D9] mb-1">{card.title}</p>
                <p className="text-3xl text-white font-semibold tracking-tight mb-2">{card.value}</p>
                <p className={`text-sm ${card.deltaClass}`}>{card.delta}</p>
              </div>
            ))}
          </div>

          {/* Submissions Table */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_12px_30px_rgba(3,12,24,0.45)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
              <div className="relative w-full lg:w-1/2">
                <svg className="w-4 h-4 text-[#A9C1D9] absolute left-4 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by team name or flag content..."
                  className="w-full bg-[#071421]/70 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-[#A9C1D9]/60 focus:outline-none focus:border-[#2F81F7]/60 focus:ring-2 focus:ring-[#2F81F7]/20 transition-all"
                />
              </div>

              <div className="flex items-center gap-3">
                <button className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#2F81F7]/20 text-white border border-[#2F81F7]/40">
                  All
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-[#A9C1D9] bg-white/5 border border-white/10 hover:text-white hover:border-white/20 transition-all">
                  Correct
                </button>
                <button className="px-4 py-2 rounded-lg text-sm font-semibold text-[#A9C1D9] bg-white/5 border border-white/10 hover:text-white hover:border-white/20 transition-all">
                  Incorrect
                </button>
                <button className="ml-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-[#A9C1D9] hover:text-white hover:border-white/20 transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[#A9C1D9]/70 uppercase tracking-widest border-b border-white/10">
                    <th className="pb-4">Timestamp</th>
                    <th className="pb-4">Team Name</th>
                    <th className="pb-4">Challenge</th>
                    <th className="pb-4">Submitted Flag</th>
                    <th className="pb-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((row, index) => (
                    <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-4">
                        <p className="text-white text-xs font-medium">{row.timestamp}</p>
                        <p className="text-xs text-[#A9C1D9]/60">{row.relative}</p>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${row.badgeColor}`}>
                            {row.teamBadge}
                          </span>
                          <span className="text-white text-sm font-semibold">{row.team}</span>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 text-xs text-[#A9C1D9]">
                          {row.category}
                        </span>
                        <p className="text-white text-sm mt-1">{row.challenge}</p>
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 rounded-md bg-black/30 border border-white/10 text-xs text-white font-mono">
                          {row.flag}
                        </span>
                      </td>
                      <td className="py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            row.status === 'Correct'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border border-red-500/30'
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-6 text-xs text-[#A9C1D9]/70">
              <p>Showing 1 to 5 of 14,282 entries</p>
              <div className="flex items-center gap-2">
                {['1', '2', '3', '4'].map((page) => (
                  <button
                    key={page}
                    className={`w-8 h-8 rounded-lg border text-xs font-semibold transition-all ${
                      page === '1'
                        ? 'bg-[#2F81F7]/30 border-[#2F81F7]/50 text-white'
                        : 'bg-white/5 border-white/10 text-[#A9C1D9] hover:text-white hover:border-white/20'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_12px_30px_rgba(3,12,24,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">Anomaly Detection</h3>
                <svg className="w-5 h-5 text-[#FFC857]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <p className="text-[#A9C1D9] mb-5">Rapid submission burst from "Root Access"</p>
              <button className="px-4 py-2 bg-[#FFC857]/20 text-[#FFC857] border border-[#FFC857]/40 rounded-lg text-sm font-semibold hover:bg-[#FFC857]/30 transition-all">
                Review
              </button>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 shadow-[0_12px_30px_rgba(3,12,24,0.45)]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white text-lg font-semibold">Real-time Submission Pulse</h3>
                <span className="text-xs text-[#A9C1D9]/70">60s ago → Now</span>
              </div>
              <div className="flex items-end gap-2 h-28">
                {pulseBars.map((height, index) => (
                  <div
                    key={index}
                    className={`w-5 rounded-md bg-gradient-to-t from-[#2F81F7]/20 to-[#2F81F7]/60 ${
                      index > pulseBars.length - 3 ? 'animate-pulse' : ''
                    }`}
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default SubmissionsLog
