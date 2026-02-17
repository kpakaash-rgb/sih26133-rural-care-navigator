import { useState } from 'react'

function ChallengeModal({ challenge, onClose }) {
  const [flagInput, setFlagInput] = useState('')

  const handleSubmitFlag = (e) => {
    e.preventDefault()
    console.log('Submitting flag:', flagInput)
    // Add your flag submission logic here
  }

  const handleUnlockHint = () => {
    console.log('Unlocking hint...')
    // Add your hint unlock logic here
  }

  const handleDownload = () => {
    console.log('Downloading evidence file...')
    // Add your download logic here
  }

  if (!challenge) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto glass rounded-lg shadow-xl" style={{boxShadow: 'var(--shadow-xl), var(--glow-primary)'}}>
        
        {/* Header */}
        <div className="sticky top-0 bg-gradient-main border-b border-border-color-1 px-8 py-6 z-10">
          <div className="flex items-start justify-between">
            {/* Left - Title & Info */}
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="icon icon-blue flex-shrink-0" style={{width: '48px', height: '48px'}}>
                <svg className="w-6 h-6 text-primary-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                </svg>
              </div>

              {/* Title & Metadata */}
              <div>
                <h2 className="text-2xl font-bold text-primary mb-2 tracking-wide" style={{fontFamily: 'var(--font-family-primary)'}}>
                  PACKET SNIFFER LEVEL 3
                </h2>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-primary-accent font-medium uppercase tracking-wider">NETWORK ANALYSIS</span>
                  <span className="text-border-color-1">•</span>
                  <div className="flex items-center gap-1">
                    <span className="text-muted">Difficulty:</span>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <svg
                          key={star}
                          className={`w-4 h-4 ${star <= 3 ? 'text-green-500' : 'text-border-color-3'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-secondary hover:text-primary hover:bg-white/10 rounded-md transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-8 py-6">
          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Points Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 badge-active">
                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-success font-bold tracking-wider">350 POINTS</span>
              </div>

              {/* Description */}
              <div className="space-y-4">
                <p className="text-secondary leading-relaxed">
                  We intercepted a suspicious transmission from the suspect's laptop during the raid on the safehouse. 
                  Our initial analysis suggests they were trying to exfiltrate data, but the connection was cut short.
                </p>
                <p className="text-secondary leading-relaxed">
                  Analyze the captured traffic and find the hidden flag. The suspect might be using a non-standard port or a 
                  custom protocol wrapper. Be on the lookout for fragmented packets.
                </p>
              </div>

              {/* Intel Note */}
              <div className="bg-bg-secondary border border-primary-light rounded-md p-4 shadow-sm">
                <div className="font-mono text-sm space-y-1">
                  <div className="text-muted">// Intel Note:</div>
                  <div className="text-primary-accent">
                    Look for the "GoldenKey" header in the TCP stream.
                  </div>
                </div>
              </div>

              {/* Evidence Section */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-muted text-sm uppercase tracking-wider">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  EVIDENCE FILE
                </div>

                {/* File Card */}
                <div 
                  className="flex items-center justify-between p-4 bg-bg-secondary border border-border-color-2 rounded-md hover:border-primary-light hover:bg-primary-ultra-light transition-all duration-300 cursor-pointer group"
                  onClick={handleDownload}
                >
                  <div className="flex items-center gap-4">
                    {/* File Icon */}
                    <div className="icon icon-blue" style={{width: '48px', height: '48px'}}>
                      <svg className="w-6 h-6 text-primary-accent" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>

                    {/* File Info */}
                    <div>
                      <div className="text-primary font-medium mb-1">suspicious_capture.pcapng</div>
                      <div className="text-muted text-sm">12.4 MB • SHA256 Verified</div>
                    </div>
                  </div>

                  {/* Download Icon */}
                  <svg className="w-5 h-5 text-secondary group-hover:text-primary-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              
              {/* Challenge Stats */}
              <div className="glass rounded-md p-5 space-y-4">
                <h3 className="text-muted text-xs uppercase tracking-wider mb-4">CHALLENGE STATS</h3>
                
                {/* Solves */}
                <div>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-muted text-sm">Solves</span>
                    <span className="text-primary font-bold text-2xl ml-auto">42</span>
                  </div>
                </div>

                {/* First Blood */}
                <div>
                  <div className="text-muted text-sm mb-1">First Blood</div>
                  <div className="text-primary-accent font-medium">@X_h4ck3r_X</div>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted">Solve Rate</span>
                    <span className="text-secondary">15%</span>
                  </div>
                  <div className="h-2 bg-border-color-3 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full" style={{ width: '15%' }}></div>
                  </div>
                </div>
              </div>

              {/* Hint Unlock */}
              <div className="space-y-2">
                <h3 className="text-muted text-xs uppercase tracking-wider">NEED HELP?</h3>
                <button
                  onClick={handleUnlockHint}
                  className="w-full p-4 border-2 border-dashed border-border-color-2 hover:border-primary-accent rounded-md transition-all duration-300 hover:shadow-lg group"
                >
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-5 h-5 text-muted group-hover:text-primary-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <span className="text-muted group-hover:text-primary-accent font-medium">Unlock Hint</span>
                    <span className="text-muted">-50 pts</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gradient-main border-t border-border-color-1 px-8 py-6">
          <form onSubmit={handleSubmitFlag} className="space-y-4">
            <div className="flex gap-4">
              {/* Flag Input */}
              <div className="flex-1 relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
                </svg>
                <input
                  type="text"
                  value={flagInput}
                  onChange={(e) => setFlagInput(e.target.value)}
                  placeholder="CTF{flag_goes_here}"
                  className="input w-full pl-12 font-mono focus-visible:ring-2 focus-visible:ring-primary-accent"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="btn btn-primary hover-lift"
                style={{fontFamily: 'var(--font-family-primary)'}}
              >
                SUBMIT FLAG
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

            {/* System Status */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
              <span className="text-muted uppercase tracking-wide">SERVER CONNECTED • LATENCY 24ms</span>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChallengeModal
