import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function TeamPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [createAccessKey, setCreateAccessKey] = useState('')
  const [joinTeamName, setJoinTeamName] = useState('')
  const [joinKey, setJoinKey] = useState('')
  const navigate = useNavigate()
  const { setHasTeam } = useAuth()

  const handleCreateTeam = (e) => {
    e.preventDefault()
    console.log('Team created:', { name: teamName, accessKey: createAccessKey })
    setHasTeam(true)
    setShowCreateModal(false)
    setTeamName('')
    setCreateAccessKey('')
    navigate('/dashboard')
  }

  const handleJoinTeam = (e) => {
    e.preventDefault()
    console.log('Team joined:', { teamName: joinTeamName, accessKey: joinKey })
    setHasTeam(true)
    setShowJoinModal(false)
    setJoinTeamName('')
    setJoinKey('')
    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] relative overflow-hidden pt-20">
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
      <div className="relative z-10 min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-16">
        <div className="max-w-7xl w-full">
          
          {/* Header */}
          <div className="text-center mb-20">
            <h1 className="text-6xl md:text-7xl font-bold text-white text-glow-white mb-4">
              Initialize Operation
            </h1>
            <p className="text-gray-400 text-lg tracking-[0.15em]">
              CREATE OR JOIN A TEAM TO BEGIN
            </p>
          </div>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-12 max-w-2xl mx-auto">
            
            {/* Create New Team Card */}
            <div className="glass-effect rounded-2xl p-10 shadow-neon-blue group hover:shadow-neon-blue-lg transition-all duration-300 relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-cyan-500/30 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-cyan-500/30 rounded-br-2xl"></div>

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 inline-block p-4 bg-cyan-500/10 rounded-lg">
                  <svg className="w-8 h-8 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-3">
                  Create New Team
                </h2>

                {/* Description */}
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Form a new squad and establish your operational base. Lead your team through the investigation.
                </p>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full"></span>
                    Unlimited team members
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full"></span>
                    Custom team branding
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-cyber-blue rounded-full"></span>
                    Full administrative control
                  </li>
                </ul>

                {/* Button */}
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white font-bold py-3 px-6 rounded-lg shadow-neon-blue hover:shadow-neon-blue-lg transform hover:scale-[1.02] transition-all duration-300"
                >
                  Create Squad
                </button>
              </div>
            </div>

            {/* Join Existing Team Card */}
            <div className="glass-effect rounded-2xl p-10 shadow-neon-blue group hover:shadow-neon-blue-lg transition-all duration-300 relative overflow-hidden">
              {/* Corner accents */}
              <div className="absolute top-0 left-0 w-20 h-20 border-t-2 border-l-2 border-blue-500/30 rounded-tl-2xl"></div>
              <div className="absolute bottom-0 right-0 w-20 h-20 border-b-2 border-r-2 border-blue-500/30 rounded-br-2xl"></div>

              <div className="relative z-10">
                {/* Icon */}
                <div className="mb-6 inline-block p-4 bg-blue-500/10 rounded-lg">
                  <svg className="w-8 h-8 text-cyber-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white mb-3">
                  Join Existing Team
                </h2>

                {/* Description */}
                <p className="text-gray-400 mb-8 leading-relaxed">
                  Enter a team that's already in the investigation. Contribute your skills to the existing squad.
                </p>

                {/* Features List */}
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Collaborate with teammates
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Shared resource pool
                  </li>
                  <li className="flex items-center gap-3 text-gray-300">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                    Team notifications & updates
                  </li>
                </ul>

                {/* Button */}
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white font-bold py-3 px-6 rounded-lg shadow-neon-blue hover:shadow-neon-blue-lg transform hover:scale-[1.02] transition-all duration-300"
                >
                  Join Squad
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-2xl p-8 w-full max-w-md shadow-neon-blue">
            <h3 className="text-2xl font-bold text-white mb-6">Create New Squad</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter squad name"
                className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue"
                required
              />
              <input
                type="text"
                value={createAccessKey}
                onChange={(e) => setCreateAccessKey(e.target.value)}
                placeholder="Create access key"
                className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue"
                required
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false)
                    setTeamName('')
                    setCreateAccessKey('')
                  }}
                  className="flex-1 border border-gray-600 text-white py-2 px-4 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2 px-4 rounded-lg shadow-neon-blue hover:shadow-neon-blue-lg transition-all"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Team Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-effect rounded-2xl p-8 w-full max-w-md shadow-neon-blue">
            <h3 className="text-2xl font-bold text-white mb-6">Join Existing Squad</h3>
            <form onSubmit={handleJoinTeam} className="space-y-4">
              <input
                type="text"
                value={joinTeamName}
                onChange={(e) => setJoinTeamName(e.target.value)}
                placeholder="Enter squad name"
                className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue"
                required
              />
              <input
                type="text"
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
                placeholder="Enter squad access key"
                className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue"
                required
              />
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false)
                    setJoinTeamName('')
                    setJoinKey('')
                  }}
                  className="flex-1 border border-gray-600 text-white py-2 px-4 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold py-2 px-4 rounded-lg shadow-neon-blue hover:shadow-neon-blue-lg transition-all"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamPage
