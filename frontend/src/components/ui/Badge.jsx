const styles = {
  scheduled: 'bg-blue-primary/10 text-blue-light border-blue-primary/20',
  in_progress: 'bg-red-500/10 text-red-400 border-red-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-white/5 text-white/40 border-white/10',
  free: 'bg-green-500/10 text-green-400 border-green-500/20',
  busy: 'bg-red-500/10 text-red-400 border-red-500/20',
  upcoming: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const labels = {
  scheduled: 'Scheduled',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export default function Badge({ status, children, pulse }) {
  const key = status || 'scheduled'
  return (
    <span className={`
      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
      text-xs font-semibold border tracking-wide
      ${styles[key] || styles.scheduled}
    `}>
      {pulse && (
        <span className={`w-1.5 h-1.5 rounded-full bg-current animate-pulse-slow`} />
      )}
      {children || labels[key] || key}
    </span>
  )
}