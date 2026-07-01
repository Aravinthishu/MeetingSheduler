// src/components/ui/Badge.jsx
const styles = {
  scheduled: 'bg-[#388add]/10 text-[#388add] border-[#388add]/30 dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20',
  in_progress: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  completed: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  cancelled: 'bg-[#f7fafc] text-[#a0aec0] border-[#e2e8f0] dark:bg-white/5 dark:text-white/40 dark:border-white/10',
  free: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20',
  busy: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
  upcoming: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
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