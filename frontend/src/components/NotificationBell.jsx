// src/components/NotificationBell.jsx
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import { format, parse } from 'date-fns'

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState([])
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = useMeetings({ date: today, status: 'scheduled' })
  const meetings = data?.results || data || []

  // Find meetings starting within 30 mins
  const upcoming = meetings.filter(m => {
    const startDt = parse(`${m.date} ${m.start_time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
    const diff = (startDt - new Date()) / 60000
    return diff > 0 && diff <= 30 && !dismissed.includes(m.id)
  })

  const count = upcoming.length

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(p => !p)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-red-500 rounded-full text-white text-xs font-bold leading-none">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-[#e2e8f0] rounded-xl shadow-2xl shadow-black/10 z-50 overflow-hidden animate-slide-up dark:bg-navy-800 dark:border-white/10 dark:shadow-black/60">
          <div className="px-4 py-3 border-b border-[#e2e8f0] flex items-center justify-between dark:border-white/5">
            <h4 className="text-xs font-semibold text-[#a0aec0] uppercase tracking-wider dark:text-white/60">Upcoming Soon</h4>
            <button onClick={() => setOpen(false)} className="text-[#a0aec0] hover:text-[#1a202c] text-xs dark:text-white/30 dark:hover:text-white">×</button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {!upcoming.length ? (
              <p className="text-center py-6 text-sm text-[#a0aec0] dark:text-white/30">No upcoming meetings</p>
            ) : upcoming.map(m => {
              const startDt = parse(`${m.date} ${m.start_time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
              const diff = Math.round((startDt - new Date()) / 60000)
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#e2e8f0] last:border-0 hover:bg-[#f7fafc] dark:border-white/5 dark:hover:bg-white/3">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center shrink-0 dark:bg-amber-500/15">
                    <Bell size={13} className="text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1a202c] truncate dark:text-white">{m.title}</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">In {diff} min</p>
                  </div>
                  <button
                    onClick={() => setDismissed(p => [...p, m.id])}
                    className="text-[#a0aec0] hover:text-[#4a5568] text-xs transition-colors dark:text-white/20 dark:hover:text-white/60"
                  >
                    Dismiss
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}