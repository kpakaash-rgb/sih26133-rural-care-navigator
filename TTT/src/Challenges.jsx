import { useState } from 'react'
import ChallengeModal from './ChallengeModal'
import Navbar from './Navbar'

function Challenges({ onNavigate, currentPage }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChallenge, setSelectedChallenge] = useState(null)

  // Sample challenges data
  const challenges = [
    {
      id: 1,
      title: 'Hidden in Plain Sight',
      points: 100,
      description: 'The target left a digital footprint on a popular social media platform. Can you find the hidden geotag in their last post?',
      difficulty: 'easy',
      solved: false
    },
    {
      id: 2,
      title: 'Pixel Peeping',
      points: 300,
      description: 'This image looks normal, but the LSB (Least Significant Bit) hides a secret message. Extract it to proceed.',
      difficulty: 'medium',
      solved: false
    },
    {
      id: 3,
      title: 'SQL Injection Master',
      points: 500,
      description: 'Break into the admin panel. The login form seems vulnerable to advanced SQL injection techniques. No automated tools allowed.',
      difficulty: 'hard',
      solved: false,
      highlighted: true
    },
    {
      id: 4,
      title: "Caesar's Salad",
      points: 200,
      description: 'A simple rotation cipher. Or is it? Decrypt the message to find the flag.',
      difficulty: 'easy',
      solved: true
    },
    {
      id: 5,
      title: 'Corrupted Memory',
      points: 450,
      description: "We recovered a memory dump from a compromised server. Analyze the dump to find the attacker's entry point.",
      difficulty: 'medium',
      solved: false
    },
    {
      id: 6,
      title: 'The Time Bomb',
      points: 800,
      description: "This binary will self-destruct in 24 hours. Reverse the validation logic and generate a key before it's too late.",
      difficulty: 'hard',
      solved: false
    }
  ]

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'hard':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const handleSolveChallenge = (challenge) => {
    console.log('Opening challenge:', challenge.id)
    setSelectedChallenge(challenge)
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#0A1628] via-[#0D1B36] to-[#0A1628] relative">
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(0,217,255,0.1)_0%,_transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(0,150,255,0.1)_0%,_transparent_50%)]"></div>

      {/* Main Content */}
      <div className="relative z-10">
        
        {/* Shared Navbar */}
        <Navbar currentPage={currentPage} onNavigate={onNavigate} />

        {/* Page Header */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-12">
            
            {/* Left - Title & Subtitle */}
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                Active Challenges
              </h1>
              <p className="text-gray-400 text-lg">
                Solve puzzles, capture flags, and climb the leaderboard.
              </p>
            </div>

            {/* Right - Search */}
            <div className="lg:min-w-[300px]">
              <div className="relative">
                <svg 
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500"
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
                  placeholder="Search challenge..."
                  className="w-full bg-[rgba(15,30,60,0.6)] border border-gray-700/50 rounded-lg pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* Challenge Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {challenges.map((challenge) => (
              <div
                key={challenge.id}
                className={`
                  relative rounded-xl overflow-hidden
                  ${challenge.highlighted ? 'border-l-4 border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)]' : ''}
                  ${challenge.solved ? 'opacity-75' : ''}
                `}
              >
                <div className="glass-effect p-6 h-full flex flex-col hover:shadow-neon-blue transition-all duration-300">
                  
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-xl font-bold text-white flex-1">
                      {challenge.title}
                    </h3>
                    <div className="text-cyber-blue font-bold text-lg ml-4">
                      {challenge.points} pts
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-6 flex-1">
                    {challenge.description}
                  </p>

                  {/* Divider */}
                  <div className="h-px bg-gradient-to-r from-transparent via-gray-700 to-transparent mb-4"></div>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    {/* Difficulty */}
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${getDifficultyColor(challenge.difficulty)}`}></span>
                      <span className="text-gray-500 text-xs uppercase tracking-wide">
                        {challenge.difficulty}
                      </span>
                      {challenge.solved && (
                        <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-500 text-xs font-medium rounded border border-green-500/30">
                          Solved
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Button */}
                  <button
                    onClick={() => handleSolveChallenge(challenge)}
                    disabled={challenge.solved}
                    className={`
                      mt-4 w-full py-3 px-4 rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-2
                      ${challenge.solved 
                        ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-white shadow-neon-blue hover:shadow-neon-blue-lg hover:-translate-y-1'
                      }
                    `}
                  >
                    {challenge.solved ? (
                      'Flag Captured'
                    ) : (
                      <>
                        Solve Challenge
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Load More Button */}
          <div className="flex justify-center">
            <button className="px-8 py-3 bg-transparent border-2 border-gray-700 text-gray-400 hover:border-cyber-blue hover:text-cyber-blue rounded-lg font-medium transition-all duration-300 flex items-center gap-2 hover:shadow-neon-blue">
              Load More Challenges
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800/50 bg-[rgba(10,22,40,0.6)] backdrop-blur-sm mt-16">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              {/* Left - Copyright */}
              <p className="text-gray-600 text-sm">
                © 2026 Trace the Truth. All rights reserved.
              </p>

              {/* Right - Links */}
              <div className="flex items-center gap-6 text-sm">
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  Terms of Service
                </a>
                <span className="text-gray-700">|</span>
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  Privacy Policy
                </a>
                <span className="text-gray-700">|</span>
                <a href="#" className="text-gray-500 hover:text-cyber-blue transition-colors">
                  Support
                </a>
              </div>
            </div>
          </div>
        </footer>

      </div>

      {/* Challenge Modal */}
      {selectedChallenge && (
        <ChallengeModal 
          challenge={selectedChallenge} 
          onClose={() => setSelectedChallenge(null)} 
        />
      )}
    </div>
  )
}

export default Challenges
