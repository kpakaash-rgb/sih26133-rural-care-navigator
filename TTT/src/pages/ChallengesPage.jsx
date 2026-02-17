import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChallengeModal from '../ChallengeModal'

function ChallengesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChallenge, setSelectedChallenge] = useState(null)
  const [solvedChallenges, setSolvedChallenges] = useState([])
  const navigate = useNavigate()

  const challenges = [
    {
      id: 1,
      title: 'SQL Injection 101',
      difficulty: 'easy',
      category: 'Web Security',
      points: 50,
      solved: false,
      description: 'Exploit a vulnerable SQL query to extract sensitive data from the database.',
      hints: [
        'Try using a single quote to break the SQL query',
        'Use UNION SELECT to retrieve data from other tables'
      ],
      evidence: ['database_dump.txt', 'query_log.sql'],
      challenges_solved: 234
    },
    {
      id: 2,
      title: 'Cryptanalysis Challenge',
      difficulty: 'medium',
      category: 'Cryptography',
      points: 100,
      solved: false,
      description: 'Decrypt a message using frequency analysis and known plaintext attacks.',
      hints: [
        'Analyze character frequency distribution',
        'Consider common English words'
      ],
      evidence: ['encrypted_message.txt', 'frequency_analysis.pdf'],
      challenges_solved: 156
    },
    {
      id: 3,
      title: 'Binary Exploitation',
      difficulty: 'hard',
      category: 'Reverse Engineering',
      points: 200,
      solved: false,
      description: 'Find and exploit a buffer overflow vulnerability in the provided binary.',
      hints: [
        'Use GDB to analyze the binary',
        'Look for unsafe string operations'
      ],
      evidence: ['binary_file', 'assembly_dump.txt'],
      challenges_solved: 89
    },
    {
      id: 4,
      title: 'OSINT Investigation',
      difficulty: 'easy',
      category: 'OSINT',
      points: 75,
      solved: false,
      description: 'Gather information about a target using publicly available sources.',
      hints: [
        'Check social media profiles',
        'Search for email addresses on dark web databases'
      ],
      evidence: ['target_info.txt', 'screenshots.zip'],
      challenges_solved: 312
    },
    {
      id: 5,
      title: 'Network Forensics',
      difficulty: 'medium',
      category: 'Network Security',
      points: 125,
      solved: false,
      description: 'Analyze a pcap file to identify malicious traffic and extract the flag.',
      hints: [
        'Use Wireshark to inspect packets',
        'Look for DNS queries'
      ],
      evidence: ['network_traffic.pcap', 'dns_log.txt'],
      challenges_solved: 198
    },
    {
      id: 6,
      title: 'Malware Analysis',
      difficulty: 'hard',
      category: 'Malware',
      points: 250,
      solved: false,
      description: 'Reverse engineer a malware sample to understand its behavior and find the C2 server.',
      hints: [
        'Check for string obfuscation',
        'Analyze network sockets/connections'
      ],
      evidence: ['malware_sample.exe', 'static_analysis.txt'],
      challenges_solved: 67
    }
  ]

  const filteredChallenges = challenges.filter(challenge =>
    challenge.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    challenge.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSolveChallenge = (challenge) => {
    setSelectedChallenge(challenge)
  }

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
            <h1 className="text-5xl md:text-6xl font-bold text-white text-glow-white mb-2">
              Challenge Dossier
            </h1>
            <p className="text-gray-400 text-lg">
              Select a challenge to begin your investigation.
            </p>
          </div>

          {/* Search Bar */}
          <div className="mb-10">
            <div className="relative max-w-xl">
              <input
                type="text"
                placeholder="Search challenges or categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[rgba(10,22,40,0.8)] border border-gray-700 rounded-lg px-6 py-4 text-white placeholder-gray-600 focus:outline-none focus:border-cyber-blue focus:shadow-neon-blue transition-all"
              />
              <svg className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Challenges Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredChallenges.map(challenge => (
              <div
                key={challenge.id}
                className="glass-effect rounded-lg p-6 shadow-neon-blue hover:shadow-neon-blue-lg hover:scale-[1.02] transition-all duration-300 cursor-pointer group relative overflow-hidden"
                onClick={() => handleSolveChallenge(challenge)}
              >
                {/* Corner accent */}
                <div className="absolute top-0 left-0 w-1 h-12 bg-gradient-to-b from-cyber-blue to-transparent group-hover:h-24 transition-all"></div>

                {/* Difficulty Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                    challenge.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                    challenge.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {challenge.difficulty}
                  </span>
                  <span className="text-cyber-blue font-bold">{challenge.points} pts</span>
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {challenge.title}
                </h3>

                {/* Category */}
                <p className="text-gray-400 text-sm mb-4">
                  {challenge.category}
                </p>

                {/* Solved Indicator */}
                {solvedChallenges.includes(challenge.id) && (
                  <div className="text-green-400 font-bold text-sm mb-4">
                    ✓ FLAG CAPTURED
                  </div>
                )}

                {/* Stats */}
                <div className="pt-4 border-t border-gray-700 text-gray-400 text-xs">
                  {challenge.challenges_solved} teams solved
                </div>

                {/* Action Button */}
                <button className="mt-4 w-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyber-blue py-2 rounded-lg hover:from-cyan-500/40 hover:to-blue-500/40 transition-all font-semibold">
                  Access Challenge
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Challenge Modal */}
      {selectedChallenge && (
        <ChallengeModal
          challenge={selectedChallenge}
          onClose={() => setSelectedChallenge(null)}
          onSubmitFlag={(flag) => {
            console.log('Flag submitted:', flag)
            setSolvedChallenges([...solvedChallenges, selectedChallenge.id])
            setSelectedChallenge(null)
          }}
        />
      )}
    </div>
  )
}

export default ChallengesPage
