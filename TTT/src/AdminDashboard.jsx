import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import StatCard from './components/admin/StatCard'
import AdminSidebar from './components/admin/AdminSidebar'
import AdminHeader from './components/admin/AdminHeader'
import SubmissionRow from './components/admin/SubmissionRow'
import ChallengesManagement from './ChallengesManagement'

function AdminDashboard() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [countdown, setCountdown] = useState({
    hours: 4,
    minutes: 22,
    seconds: 59
  })

  // Countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown(prev => {
        let { hours, minutes, seconds } = prev
        
        if (seconds > 0) {
          seconds--
        } else if (minutes > 0) {
          minutes--
          seconds = 59
        } else if (hours > 0) {
          hours--
          minutes = 59
          seconds = 59
        }
        
        return { hours, minutes, seconds }
      })
    }, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const recentSubmissions = [
    {
      timestamp: '14:22:31',
      team: 'GhostInShell',
      teamId: 'user_081',
      challenge: 'Memory Corruption I',
      status: 'success',
      points: 500
    },
    {
      timestamp: '14:22:15',
      team: 'ShadowCollective',
      teamId: 'user_324',
      challenge: 'Binary Ninja',
      status: 'incorrect',
      points: 0
    },
    {
      timestamp: '14:21:58',
      team: 'NullPointer',
      teamId: 'user_567',
      challenge: 'Web Exploitation: JWT',
      status: 'incorrect',
      points: 0
    },
    {
      timestamp: '14:21:42',
      team: 'GhostInShell',
      teamId: 'user_481',
      challenge: 'Basic Networking',
      status: 'success',
      points: 100
    },
    {
      timestamp: '14:21:18',
      team: 'CyberReaper',
      teamId: 'user_007',
      challenge: 'Stenography 101',
      status: 'incorrect',
      points: 0
    }
  ]

  const barChartData = [65, 72, 58, 85, 92, 78, 68, 55, 71]

  const statCards = [
    {
      title: 'Total Users',
      value: '1,240',
      metric: '+12% vs last hr',
      metricType: 'success',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      )
    },
    {
      title: 'Active Teams',
      value: '312',
      metric: '+5% vs last hr',
      metricType: 'success',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      )
    },
    {
      title: 'Challenges',
      value: '45 / 50',
      metric: '90% deployment',
      metricType: 'neutral',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    },
    {
      title: 'Submissions',
      value: '8,902',
      metric: 'High failure spike',
      metricType: 'danger',
      icon: (
        <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
          <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
        </svg>
      )
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex">
      {/* Sidebar */}
      <AdminSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content */}
      <div className="flex-1 ml-72">
        {/* Top Header */}
        <AdminHeader countdown={countdown} />

        {/* Conditionally render content based on activeTab */}
        {activeTab === 'challenges' ? (
          <ChallengesManagement />
        ) : (
          /* Main Content Area */
          <main className="p-10 space-y-10">
          {/* Stats Cards Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card, index) => (
              <StatCard key={index} {...card} />
            ))}
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Recent Submissions - Takes 2 columns */}
            <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-8 shadow-xl">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <h2 className="text-white text-xl font-bold tracking-tight">Recent Submissions</h2>
                </div>
                <button className="text-cyan-500 hover:text-cyan-400 text-sm font-semibold transition-colors hover:underline underline-offset-4">
                  View All Logs
                </button>
              </div>

              {/* Table */}
              <div className="overflow-x-auto -mx-4">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/50">
                      <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">Timestamp</th>
                      <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">Team / User</th>
                      <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">Challenge</th>
                      <th className="text-left text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">Status</th>
                      <th className="text-right text-slate-500 text-xs font-bold uppercase tracking-widest pb-4 px-4">Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSubmissions.map((submission, index) => (
                      <SubmissionRow key={index} submission={submission} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Column - Stacked Cards */}
            <div className="space-y-8">
              {/* Submission Trends */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-7 shadow-xl">
                <div className="flex items-center gap-4 mb-7">
                  <svg className="w-6 h-6 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-white text-lg font-bold tracking-tight">Submission Trends</h3>
                </div>

                {/* Bar Chart */}
                <div className="flex items-end justify-between gap-2 h-32 mb-7">
                  {barChartData.map((value, index) => (
                    <div key={index} className="flex-1 flex flex-col items-center">
                      <div
                        className={`w-full rounded-t transition-all duration-300 ${
                          index === 4 ? 'bg-gradient-to-t from-red-600 to-red-500 shadow-lg shadow-red-500/20' : 'bg-gradient-to-t from-blue-700 to-blue-600'
                        }`}
                        style={{ height: `${value}%` }}
                      ></div>
                    </div>
                  ))}
                </div>

                {/* Alert */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 backdrop-blur-sm">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-red-500/30">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-red-400 font-bold text-sm mb-1.5 tracking-wide">WRONG SPIKE ALERT</h4>
                      <p className="text-red-300/80 text-xs leading-relaxed">Sudden fail rate increase (24%)</p>
                    </div>
                  </div>
                </div>

                {/* Challenge Load */}
                <div className="mt-7 pt-7 border-t border-slate-800/50">
                  <div className="flex items-center gap-3 mb-3">
                    <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <h4 className="text-white text-sm font-bold tracking-wide">CHALLENGE LOAD</h4>
                    <svg className="w-4 h-4 text-cyan-500 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">High traffic on 'Memory Corruption'</p>
                </div>
              </div>

              {/* Infrastructure Status */}
              <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-7 shadow-xl">
                <h3 className="text-white text-lg font-bold mb-7 tracking-tight">Infrastructure Status</h3>

                <div className="space-y-6">
                  {/* Server Load */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-sm font-medium">Server Load</span>
                      <span className="text-white text-sm font-bold">42%</span>
                    </div>
                    <div className="h-2.5 bg-slate-800/70 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-500 rounded-full shadow-lg shadow-cyan-500/30 transition-all duration-500" style={{ width: '42%' }}></div>
                    </div>
                  </div>

                  {/* Database Latency */}
                  <div className="flex items-center justify-between py-3 border-b border-slate-800/30">
                    <span className="text-slate-400 text-sm font-medium">Database Latency</span>
                    <span className="text-green-400 text-sm font-bold">12ms</span>
                  </div>

                  {/* API Gateway */}
                  <div className="flex items-center justify-between py-3">
                    <span className="text-slate-400 text-sm font-medium">API Gateway</span>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
                      <span className="text-green-400 text-sm font-bold">Operational</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
