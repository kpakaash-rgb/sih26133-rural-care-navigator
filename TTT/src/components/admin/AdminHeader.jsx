function AdminHeader({ countdown }) {
  return (
    <header className="bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/50 px-8 py-5 flex items-center justify-between sticky top-0 z-20 shadow-lg">
      <div className="flex items-center gap-8">
        {/* Live Event Badge */}
        <div className="flex items-center gap-2.5 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full shadow-sm">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse shadow-lg shadow-green-500/50"></span>
          <span className="text-green-500 text-xs font-bold tracking-widest">LIVE EVENT</span>
        </div>

        {/* Countdown */}
        <div className="flex items-center gap-3">
          <span className="text-slate-500 text-sm font-semibold uppercase tracking-wide">COUNTDOWN:</span>
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white px-3 py-2 rounded-lg text-sm font-bold min-w-[40px] text-center shadow-lg shadow-cyan-600/20">
              {String(countdown.hours).padStart(2, '0')}
            </div>
            <span className="text-cyan-500 font-bold text-lg">:</span>
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white px-3 py-2 rounded-lg text-sm font-bold min-w-[40px] text-center shadow-lg shadow-cyan-600/20">
              {String(countdown.minutes).padStart(2, '0')}
            </div>
            <span className="text-cyan-500 font-bold text-lg">:</span>
            <div className="bg-gradient-to-br from-cyan-600 to-cyan-700 text-white px-3 py-2 rounded-lg text-sm font-bold min-w-[40px] text-center shadow-lg shadow-cyan-600/20">
              {String(countdown.seconds).padStart(2, '0')}
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-12">
        <div className="relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search operations..."
            className="w-full bg-slate-800/70 border border-slate-700/50 rounded-xl pl-12 pr-5 py-3 text-slate-300 placeholder-slate-500 text-sm focus:outline-none focus:border-cyan-500/50 focus:bg-slate-800 transition-all"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-8">
        {/* Notification Bell */}
        <button className="relative text-slate-400 hover:text-white transition-colors p-2 hover:bg-slate-800/50 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
        </button>

        {/* Admin Profile */}
        <div className="flex items-center gap-4 pl-8 border-l border-slate-700/50">
          <div className="text-right">
            <p className="text-white text-sm font-semibold leading-tight">S. Kaine</p>
            <p className="text-slate-500 text-xs font-medium mt-0.5">Super Admin</p>
          </div>
          <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
            SK
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader
