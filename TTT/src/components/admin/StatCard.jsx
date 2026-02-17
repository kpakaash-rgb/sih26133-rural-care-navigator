function StatCard({ title, value, metric, metricType, icon }) {
  const metricColors = {
    success: 'text-green-500',
    warning: 'text-yellow-500',
    danger: 'text-red-500',
    neutral: 'text-slate-400'
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800/50 rounded-xl p-6 hover:shadow-xl hover:shadow-cyan-500/5 transition-all duration-300 hover:-translate-y-0.5 group">
      <div className="flex items-start justify-between mb-6">
        <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
          {title}
        </h3>
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/10 to-cyan-500/5 rounded-xl flex items-center justify-center border border-blue-500/10 group-hover:border-blue-500/20 transition-colors">
          {icon}
        </div>
      </div>
      <div className="space-y-3">
        <p className="text-white text-4xl font-bold tracking-tight">
          {value}
        </p>
        <p className={`text-sm font-medium ${metricColors[metricType]}`}>
          {metric}
        </p>
      </div>
    </div>
  )
}

export default StatCard
