import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useMeetings } from '../hooks/useMeetings'
import { format, isToday, addMinutes, parse } from 'date-fns'

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
        className="relative w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/5 transition-all"
      >
        <Bell size={15} />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 flex items-center justify-center bg-red-500 rounded-full text-white text-xs font-bold leading-none">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-navy-800 border border-white/10 rounded-xl shadow-2xl shadow-black/60 z-50 overflow-hidden animate-slide-up">
          <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Upcoming Soon</h4>
            <button onClick={() => setOpen(false)} className="text-white/30 hover:text-white text-xs">×</button>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {!upcoming.length ? (
              <p className="text-center py-6 text-sm text-white/30">No upcoming meetings</p>
            ) : upcoming.map(m => {
              const startDt = parse(`${m.date} ${m.start_time}`, 'yyyy-MM-dd HH:mm:ss', new Date())
              const diff = Math.round((startDt - new Date()) / 60000)
              return (
                <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/5 last:border-0 hover:bg-white/3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Bell size={13} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{m.title}</p>
                    <p className="text-xs text-amber-400">In {diff} min</p>
                  </div>
                  <button
                    onClick={() => setDismissed(p => [...p, m.id])}
                    className="text-white/20 hover:text-white/60 text-xs transition-colors"
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