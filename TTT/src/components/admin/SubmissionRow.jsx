function SubmissionRow({ submission }) {
  return (
    <tr className="hover:bg-slate-800/40 transition-colors border-b border-slate-800/30 last:border-0">
      <td className="py-4 px-4 text-slate-400 text-sm font-mono">
        {submission.timestamp}
      </td>
      <td className="py-4 px-4">
        <div>
          <p className="text-white text-sm font-semibold">{submission.team}</p>
          <p className="text-slate-500 text-xs font-mono mt-0.5">{submission.teamId}</p>
        </div>
      </td>
      <td className="py-4 px-4 text-slate-300 text-sm font-medium">
        {submission.challenge}
      </td>
      <td className="py-4 px-4">
        {submission.status === 'success' ? (
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 border border-green-500/20">
            SUCCESS
          </span>
        ) : (
          <span className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/20">
            INCORRECT
          </span>
        )}
      </td>
      <td className="py-4 px-4 text-right">
        <span className={`text-sm font-bold ${submission.points > 0 ? 'text-green-400' : 'text-slate-600'}`}>
          {submission.points > 0 ? `+${submission.points}` : submission.points}
        </span>
      </td>
    </tr>
  )
}

export default SubmissionRow
