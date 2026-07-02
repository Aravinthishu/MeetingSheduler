// Calendar.jsx - With Theme Support
import { useState, useRef, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'  // ── ADDED
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, isToday, startOfWeek, endOfWeek,
  addMonths, subMonths, addDays, addWeeks, subWeeks,
  parseISO, getHours, getMinutes
} from 'date-fns'
import { useMeetings, useTeams, useRooms } from '../hooks/useMeetings'
import { useCreateMeeting } from '../hooks/useMeetings'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { ChevronLeft, ChevronRight, Plus, Clock, X, Calendar as CalIcon, Users, MapPin, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // 8am to 10pm
const HOUR_HEIGHT = 60

const STATUS_COLORS = {
  scheduled: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-500/20 dark:border-blue-400 dark:text-blue-100',
  in_progress: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-500/20 dark:border-amber-400 dark:text-amber-100',
  completed: 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-500/20 dark:border-emerald-400 dark:text-emerald-100',
  cancelled: 'bg-[#f7fafc] border-[#e2e8f0] text-[#a0aec0] line-through dark:bg-white/5 dark:border-white/15 dark:text-white/30',
}

const STATUS_DOT = {
  scheduled: 'bg-blue-500 dark:bg-blue-400',
  in_progress: 'bg-amber-500 dark:bg-amber-400',
  completed: 'bg-emerald-500 dark:bg-emerald-400',
  cancelled: 'bg-[#a0aec0] dark:bg-white/30',
}

// ── ADDED: filter options config ────────────────────────────────
const FILTER_OPTIONS = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
]

// ── Overlap layout engine ────────────────────────────────────
function computeOverlapColumns(meetings) {
  const sorted = [...meetings].sort((a, b) => {
    const [ah, am] = a.start_time.split(':').map(Number)
    const [bh, bm] = b.start_time.split(':').map(Number)
    return (ah * 60 + am) - (bh * 60 + bm)
  })

  const columns = []
  const eventColumns = {}

  for (const m of sorted) {
    const [sh, sm] = m.start_time.split(':').map(Number)
    const startMins = sh * 60 + sm
    let endMins = startMins + 60
    if (m.end_time) {
      const [eh, em] = m.end_time.split(':').map(Number)
      endMins = eh * 60 + em
    }

    let placed = false
    for (let col = 0; col < columns.length; col++) {
      const lastEnd = columns[col]
      if (startMins >= lastEnd) {
        columns[col] = endMins
        eventColumns[m.id] = col
        placed = true
        break
      }
    }
    if (!placed) {
      columns.push(endMins)
      eventColumns[m.id] = columns.length - 1
    }
  }

  return { eventColumns, totalColumns: columns.length }
}

function getEventStyle(meeting, col, totalCols) {
  const [sh, sm] = meeting.start_time.split(':').map(Number)
  const startMins = sh * 60 + sm
  const startOffset = startMins - 8 * 60

  let durationMins = 60
  if (meeting.end_time) {
    const [eh, em] = meeting.end_time.split(':').map(Number)
    durationMins = (eh * 60 + em) - startMins
  }

  const top = (startOffset / 60) * HOUR_HEIGHT
  const height = Math.max((durationMins / 60) * HOUR_HEIGHT, 22)
  const colW = 100 / totalCols
  const left = col * colW
  const width = colW

  return { top, height, left: `${left + 0.5}%`, width: `${width - 1}%` }
}

// ── Day Meetings Popup ─────────────────────────────────────────
function DayMeetingsPopup({ date, meetings, onClose }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up dark:bg-navy-800 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0] dark:border-white/8">
          <div>
            <p className="text-xs text-[#a0aec0] uppercase tracking-wider font-medium dark:text-white/40">{format(date, 'EEEE')}</p>
            <p className="text-lg font-bold text-[#1a202c] mt-0.5 dark:text-white">{format(date, 'dd MMMM yyyy')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/8">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 space-y-1.5 max-h-96 overflow-y-auto">
          {meetings.map(m => (
            <button
              key={m.id}
              onClick={() => navigate(`/meetings/${m.id}`)}
              className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#f7fafc] transition-all text-left group dark:hover:bg-white/5"
            >
              <div className={`w-1 self-stretch rounded-full mt-0.5 ${STATUS_DOT[m.status] || STATUS_DOT.scheduled}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a202c] group-hover:text-blue-600 transition-colors truncate dark:text-white dark:group-hover:text-blue-200">{m.title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                    <Clock size={10} />
                    {m.start_time.slice(0, 5)}{m.end_time ? ` – ${m.end_time.slice(0, 5)}` : ''}
                  </span>
                  {m.room_detail && (
                    <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                      <MapPin size={10} />
                      {m.room_detail.name}
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-xs px-2 py-0.5 rounded-full border capitalize shrink-0 ${STATUS_COLORS[m.status] || STATUS_COLORS.scheduled}`}>
                {m.status.replace('_', ' ')}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Timeslot Meetings Popup ─────────────────────────────────────
function TimeslotMeetingsPopup({ date, time, meetings, onClose, onBook }) {
  const navigate = useNavigate()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-white border border-[#e2e8f0] rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up dark:bg-navy-800 dark:border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0] dark:border-white/8">
          <div>
            <p className="text-xs text-[#a0aec0] uppercase tracking-wider font-medium dark:text-white/40">{format(date, 'EEE, d MMM')}</p>
            <p className="text-lg font-bold text-[#1a202c] mt-0.5 flex items-center gap-2 dark:text-white">
              <Clock size={16} className="text-[#a0aec0] dark:text-white/40" />
              {time}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/8">
            <X size={16} />
          </button>
        </div>
        <div className="p-3 space-y-1.5 max-h-80 overflow-y-auto">
          {meetings.map(m => (
            <button
              key={m.id}
              onClick={() => { onClose(); navigate(`/meetings/${m.id}`) }}
              className="w-full flex items-start gap-3 p-3 rounded-xl hover:bg-[#f7fafc] transition-all text-left group dark:hover:bg-white/5"
            >
              <div className={`w-1 self-stretch rounded-full mt-0.5 shrink-0 ${STATUS_DOT[m.status] || STATUS_DOT.scheduled}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1a202c] group-hover:text-blue-600 transition-colors truncate dark:text-white dark:group-hover:text-blue-200">{m.title}</p>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                    <Clock size={9} />
                    {m.start_time.slice(0, 5)}{m.end_time ? ` – ${m.end_time.slice(0, 5)}` : ''}
                  </span>
                  {m.room_detail && (
                    <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                      <MapPin size={9} />
                      {m.room_detail.name}
                    </span>
                  )}
                </div>
              </div>
              <div className={`text-[10px] px-2 py-0.5 rounded-full border capitalize shrink-0 ${STATUS_COLORS[m.status] || STATUS_COLORS.scheduled}`}>
                {m.status.replace('_', ' ')}
              </div>
            </button>
          ))}
        </div>
        <div className="px-3 pb-3">
          <button
            onClick={() => { onClose(); onBook() }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#e2e8f0] text-xs font-semibold text-[#4a5568] hover:text-[#1a202c] hover:border-[#cbd5e0] hover:bg-[#f7fafc] transition-all dark:border-white/10 dark:text-white/50 dark:hover:text-white dark:hover:border-white/20 dark:hover:bg-white/5"
          >
            <Plus size={13} />
            Book new meeting at {time}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Day Grid Component ──────────────────────────────────────────
function DayGrid({ date, meetings, onSlotClick, isMobile = false }) {
  const navigate = useNavigate()
  const gridRef = useRef(null)
  const [timeslotPopup, setTimeslotPopup] = useState(null)

  const dayMeetings = meetings.filter(m => isSameDay(parseISO(m.date), date))
  const meetingIds = dayMeetings.map(m => m.id).join(',')
  const { eventColumns, totalColumns } = useMemo(
    () => computeOverlapColumns(dayMeetings),
    [meetingIds]
  )

  const getMeetingsAtTime = (clickMins) => {
    return dayMeetings.filter(m => {
      const [sh, sm] = m.start_time.split(':').map(Number)
      const startMins = sh * 60 + sm
      let endMins = startMins + 60
      if (m.end_time) {
        const [eh, em] = m.end_time.split(':').map(Number)
        endMins = eh * 60 + em
      }
      return clickMins >= startMins && clickMins < endMins
    })
  }

  const handleGridClick = (e) => {
    if (e.target !== gridRef.current && !e.target.classList.contains('time-slot')) return
    const rect = gridRef.current.getBoundingClientRect()
    const y = e.clientY - rect.top
    const totalMins = Math.floor(y / HOUR_HEIGHT * 60) + 8 * 60
    const h = Math.floor(totalMins / 60)
    const snapM = Math.round((totalMins % 60) / 30) * 30
    const timeStr = `${String(h).padStart(2, '0')}:${String(snapM % 60).padStart(2, '0')}`

    const atTime = getMeetingsAtTime(totalMins)
    if (atTime.length > 0) {
      setTimeslotPopup({ time: timeStr, meetings: atTime })
    } else {
      onSlotClick(date, timeStr)
    }
  }

  if (isMobile) {
    return (
      <div className="space-y-2">
        {dayMeetings.length === 0 ? (
          <div className="text-center py-8 text-[#a0aec0] dark:text-white/30">
            <p className="text-sm">No meetings scheduled</p>
            <button
              onClick={() => onSlotClick(date, '09:00')}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              + Book a meeting
            </button>
          </div>
        ) : (
          dayMeetings.map(meeting => (
            <button
              key={meeting.id}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              className="w-full p-3 rounded-xl border border-[#e2e8f0] bg-white/40 hover:bg-[#f7fafc] transition-all text-left dark:border-white/10 dark:bg-navy-800/40 dark:hover:bg-navy-700/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#1a202c] truncate dark:text-white">{meeting.title}</p>
                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                      <Clock size={10} />
                      {meeting.start_time.slice(0, 5)}
                      {meeting.end_time && ` - ${meeting.end_time.slice(0, 5)}`}
                    </span>
                    {meeting.room_detail && (
                      <span className="flex items-center gap-1 text-xs text-[#a0aec0] dark:text-white/40">
                        <MapPin size={10} />
                        {meeting.room_detail.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className={`text-xs px-2 py-1 rounded-full capitalize ${STATUS_COLORS[meeting.status] || STATUS_COLORS.scheduled}`}>
                  {meeting.status.replace('_', ' ')}
                </div>
              </div>
            </button>
          ))
        )}
        {timeslotPopup && (
          <TimeslotMeetingsPopup
            date={date}
            time={timeslotPopup.time}
            meetings={timeslotPopup.meetings}
            onClose={() => setTimeslotPopup(null)}
            onBook={() => onSlotClick(date, timeslotPopup.time)}
          />
        )}
      </div>
    )
  }

  // Desktop: Grid view
  return (
    <div className="relative">
      <div
        ref={gridRef}
        className="relative cursor-pointer group/grid"
        style={{ height: HOURS.length * HOUR_HEIGHT }}
        onClick={handleGridClick}
      >
        {timeslotPopup && (
          <TimeslotMeetingsPopup
            date={date}
            time={timeslotPopup.time}
            meetings={timeslotPopup.meetings}
            onClose={() => setTimeslotPopup(null)}
            onBook={() => onSlotClick(date, timeslotPopup.time)}
          />
        )}

        {HOURS.map(h => (
          <div key={h} className="time-slot absolute left-0 right-0 border-t border-[#e2e8f0] dark:border-white/[0.05]"
            style={{ top: (h - 8) * HOUR_HEIGHT, height: HOUR_HEIGHT }} />
        ))}
        {HOURS.map(h => (
          <div key={`half-${h}`} className="time-slot absolute left-0 right-0 border-t border-[#e8ecf2] dark:border-white/[0.025]"
            style={{ top: (h - 8) * HOUR_HEIGHT + HOUR_HEIGHT / 2 }} />
        ))}

        {isToday(date) && (() => {
          const now = new Date()
          const mins = getHours(now) * 60 + getMinutes(now)
          const top = ((mins - 8 * 60) / 60) * HOUR_HEIGHT
          return top >= 0 && top <= HOURS.length * HOUR_HEIGHT ? (
            <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top }}>
              <div className="flex items-center">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 -ml-1.5 shrink-0 shadow-sm shadow-rose-500/50 dark:bg-rose-400 dark:shadow-rose-400/50" />
                <div className="flex-1 h-px bg-rose-500/70 dark:bg-rose-400/70" />
              </div>
            </div>
          ) : null
        })()}

        {dayMeetings.map(m => {
          const col = eventColumns[m.id] ?? 0
          const { top, height, left, width } = getEventStyle(m, col, totalColumns)
          if (top < 0 || top > HOURS.length * HOUR_HEIGHT) return null

          const statusClass = STATUS_COLORS[m.status] || STATUS_COLORS.scheduled
          return (
            <div
              key={m.id}
              onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${m.id}`) }}
              className={`
              absolute rounded-lg border-l-2 px-2 py-1.5 cursor-pointer
              overflow-hidden z-20 transition-all hover:scale-[1.01] hover:z-30 hover:shadow-lg
              backdrop-blur-sm ${statusClass}
            `}
              style={{ top: top + 1, height: height - 2, left, width }}
            >
              <p className="text-[11px] font-semibold leading-tight truncate">{m.title}</p>
              {height > 36 && (
                <p className="text-[10px] opacity-60 leading-tight mt-0.5 truncate">
                  {m.start_time.slice(0, 5)}{m.end_time ? `–${m.end_time.slice(0, 5)}` : ''}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ───────────────────────────────────────────────────
function WeekView({ weekStart, meetings, onSlotClick, isMobile = false }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const [selectedDay, setSelectedDay] = useState(null)

  if (isMobile) {
    if (selectedDay) {
      return (
        <div className="animate-slide-in-right">
          <button
            onClick={() => setSelectedDay(null)}
            className="flex items-center gap-2 mb-4 text-[#a0aec0] hover:text-[#1a202c] transition-colors dark:text-white/60 dark:hover:text-white"
          >
            <ChevronLeft size={18} />
            <span className="text-sm">Back to week</span>
          </button>
          <div className="border border-[#e2e8f0] rounded-xl p-4 dark:border-white/10">
            <div className="mb-3 pb-2 border-b border-[#e2e8f0] dark:border-white/10">
              <h3 className="text-lg font-semibold text-[#1a202c] dark:text-white">{format(selectedDay, 'EEEE, MMMM d')}</h3>
            </div>
            <DayGrid
              date={selectedDay}
              meetings={meetings}
              onSlotClick={onSlotClick}
              isMobile={true}
            />
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {days.map(day => {
          const dayMeetings = meetings.filter(m => isSameDay(parseISO(m.date), day))
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDay(day)}
              className={`w-full p-4 rounded-xl border border-[#e2e8f0] text-left transition-all hover:bg-[#f7fafc] dark:border-white/10 dark:hover:bg-navy-700/50
                ${isToday(day) ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-white/40 dark:bg-navy-800/30'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm font-semibold text-[#1a202c] dark:text-white">{format(day, 'EEEE')}</p>
                  <p className="text-xs text-[#a0aec0] dark:text-white/40">{format(day, 'MMM d, yyyy')}</p>
                </div>
                {isToday(day) && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">Today</span>
                )}
              </div>
              {dayMeetings.length > 0 ? (
                <div className="space-y-1 mt-2 pt-2 border-t border-[#e2e8f0] dark:border-white/5">
                  <p className="text-xs text-[#a0aec0] dark:text-white/60">
                    {dayMeetings.length} meeting{dayMeetings.length !== 1 ? 's' : ''}
                  </p>
                  {dayMeetings.slice(0, 2).map(m => (
                    <div key={m.id} className="text-xs text-[#a0aec0] truncate dark:text-white/40">
                      {m.start_time.slice(0, 5)} - {m.title}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-[#a0aec0] mt-2 pt-2 border-t border-[#e2e8f0] dark:text-white/30 dark:border-white/5">No meetings</p>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="border border-[#e2e8f0] rounded-xl overflow-hidden dark:border-white/10">
      <div className="overflow-x-auto">
        <div style={{ minWidth: '700px' }}>
          <div className="grid grid-cols-8 border-b border-[#e2e8f0] bg-white/50 dark:border-white/10 dark:bg-navy-800/50">
            <div className="p-3 border-r border-[#e2e8f0] dark:border-white/10">
              <div className="text-xs font-semibold text-[#a0aec0] dark:text-white/40">Time</div>
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className={`p-3 text-center ${isToday(day) ? 'bg-blue-50 dark:bg-blue-500/10' : ''}`}>
                <div className="text-xs font-semibold text-[#a0aec0] dark:text-white/60">{format(day, 'EEE')}</div>
                <div className={`text-lg font-bold mt-1 ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-[#1a202c] dark:text-white'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-8">
            <div className="border-r border-[#e2e8f0] dark:border-white/10">
              {HOURS.map(hour => (
                <div key={hour} className="h-[60px] px-2 flex items-center justify-end text-xs text-[#a0aec0] border-b border-[#e2e8f0] dark:text-white/40 dark:border-white/5">
                  {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                </div>
              ))}
            </div>
            {days.map(day => (
              <div key={day.toISOString()} className="relative">
                <DayGrid date={day} meetings={meetings} onSlotClick={onSlotClick} isMobile={false} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Month View ──────────────────────────────────────────────────
function MonthView({ current, meetings, onDayClick, isMobile = false }) {
  const navigate = useNavigate()
  const [popup, setPopup] = useState(null)
  const start = startOfMonth(current)
  const end = endOfMonth(current)
  const calStart = startOfWeek(start, { weekStartsOn: 1 })
  const calEnd = endOfWeek(end, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  if (isMobile) {
    return (
      <div className="space-y-2">
        {days.map((day, i) => {
          const dayMeetings = meetings.filter(m => isSameDay(parseISO(m.date), day))
          const outOfMonth = !isSameMonth(day, current)
          if (outOfMonth) return null

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`w-full p-3 rounded-xl border border-[#e2e8f0] text-left transition-all
                ${isToday(day) ? 'bg-blue-50 border-blue-200 dark:bg-blue-500/10 dark:border-blue-500/30' : 'bg-white/40 hover:bg-[#f7fafc] dark:bg-navy-800/30 dark:hover:bg-navy-700/50'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-[#1a202c] dark:text-white'}`}>
                    {format(day, 'd')}
                  </span>
                  <span className="text-xs text-[#a0aec0] dark:text-white/40">{format(day, 'EEEE')}</span>
                </div>
                {dayMeetings.length > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
                    {dayMeetings.length}
                  </span>
                )}
              </div>
              {dayMeetings.length > 0 && (
                <div className="space-y-1">
                  {dayMeetings.slice(0, 2).map(m => (
                    <div key={m.id} className="text-xs text-[#a0aec0] truncate dark:text-white/60">
                      {m.start_time.slice(0, 5)} - {m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 2 && (
                    <div className="text-xs text-blue-600/70 dark:text-blue-400/70">+{dayMeetings.length - 2} more</div>
                  )}
                </div>
              )}
            </button>
          )
        })}
        {popup && (
          <DayMeetingsPopup
            date={popup.date}
            meetings={popup.meetings}
            onClose={() => setPopup(null)}
          />
        )}
      </div>
    )
  }

  return (
    <>
      <div className="border border-[#e2e8f0] rounded-xl overflow-hidden dark:border-white/10">
        <div className="grid grid-cols-7 border-b border-[#e2e8f0] bg-white/50 dark:border-white/10 dark:bg-navy-800/50">
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => (
            <div key={d} className="p-3 text-center text-xs font-semibold text-[#a0aec0] dark:text-white/40">
              {d.slice(0, 3)}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day, i) => {
            const dayMeetings = meetings.filter(m => isSameDay(parseISO(m.date), day))
            const outOfMonth = !isSameMonth(day, current)

            return (
              <div
                key={i}
                onClick={() => onDayClick(day)}
                className={`
                  min-h-[100px] p-2 border-b border-r border-[#e8ecf2] cursor-pointer
                  transition-all hover:bg-[#f7fafc]
                  ${outOfMonth ? 'opacity-30' : ''}
                  ${isToday(day) ? 'bg-blue-50/50 dark:bg-blue-500/5' : ''}
                  dark:border-white/5 dark:hover:bg-white/5
                `}
              >
                <div className={`text-sm font-semibold mb-2 ${isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-[#a0aec0] dark:text-white/60'}`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayMeetings.slice(0, 3).map(m => (
                    <div
                      key={m.id}
                      onClick={(e) => { e.stopPropagation(); navigate(`/meetings/${m.id}`) }}
                      className="text-xs truncate px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                    >
                      {m.start_time.slice(0, 5)} {m.title}
                    </div>
                  ))}
                  {dayMeetings.length > 3 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setPopup({ date: day, meetings: dayMeetings }) }}
                      className="text-xs text-blue-600/70 hover:text-blue-600 ml-1 dark:text-blue-400/70 dark:hover:text-blue-400"
                    >
                      +{dayMeetings.length - 3} more
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {popup && (
        <DayMeetingsPopup
          date={popup.date}
          meetings={popup.meetings}
          onClose={() => setPopup(null)}
        />
      )}
    </>
  )
}

// ── Mini Calendar ───────────────────────────────────────────────
function MiniCalendar({ current, selected, onSelect, onMonthChange, meetings }) {
  const start = startOfMonth(current)
  const end = endOfMonth(current)
  const calStart = startOfWeek(start, { weekStartsOn: 1 })
  const calEnd = endOfWeek(end, { weekStartsOn: 1 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-[#1a202c] tracking-wide dark:text-white">{format(current, 'MMM yyyy')}</span>
        <div className="flex gap-0.5">
          <button onClick={() => onMonthChange(subMonths(current, 1))}
            className="w-6 h-6 flex items-center justify-center text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] rounded-md transition-all dark:text-white/30 dark:hover:text-white dark:hover:bg-white/8">
            <ChevronLeft size={13} />
          </button>
          <button onClick={() => onMonthChange(addMonths(current, 1))}
            className="w-6 h-6 flex items-center justify-center text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] rounded-md transition-all dark:text-white/30 dark:hover:text-white dark:hover:bg-white/8">
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 mb-1.5">
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-bold text-[#a0aec0] py-0.5 tracking-wider dark:text-white/20">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {days.map((day, i) => {
          const meetingCount = meetings.filter(m => isSameDay(parseISO(m.date), day)).length
          const isSelected = isSameDay(day, selected)
          const outOfMonth = !isSameMonth(day, current)
          return (
            <button
              key={i}
              onClick={() => onSelect(day)}
              className={`
                relative w-7 h-7 mx-auto flex flex-col items-center justify-center rounded-lg text-[11px] font-medium transition-all
                ${outOfMonth ? 'text-[#e2e8f0] pointer-events-none dark:text-white/12' : 'text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] dark:text-white/55 dark:hover:text-white dark:hover:bg-white/8'}
                ${isSelected ? '!bg-blue-500 !text-white shadow-lg shadow-blue-500/30' : ''}
                ${isToday(day) && !isSelected ? '!text-blue-600 font-bold dark:!text-blue-300' : ''}
              `}
            >
              {format(day, 'd')}
              {meetingCount > 0 && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-px">
                  {Array.from({ length: Math.min(meetingCount, 3) }).map((_, idx) => (
                    <span key={idx} className="w-0.5 h-0.5 rounded-full bg-blue-400/70" />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Quick Book Modal ────────────────────────────────────────────
function QuickBookModal({ open, onClose, defaultDate, defaultTime }) {
  const { data: teams = [] } = useTeams()
  const { data: rooms = [] } = useRooms()
  const createMeeting = useCreateMeeting()
  const [form, setForm] = useState({
    title: '', team: '', room: '', date: '', start_time: '', end_time: '', description: ''
  })

  useEffect(() => {
    if (defaultDate && open) {
      setForm(p => ({
        ...p,
        date: format(defaultDate, 'yyyy-MM-dd'),
        start_time: defaultTime || '',
        end_time: defaultTime ? (() => {
          const [h, m] = defaultTime.split(':').map(Number)
          const end = h * 60 + m + 60
          return `${String(Math.floor(end / 60)).padStart(2, '0')}:${String(end % 60).padStart(2, '0')}`
        })() : ''
      }))
    }
  }, [defaultDate, defaultTime, open])

  const handleSubmit = async () => {
    if (!form.title || !form.team || !form.date || !form.start_time) return
    const payload = { ...form }
    if (!payload.end_time) delete payload.end_time
    if (!payload.room) delete payload.room
    await createMeeting.mutateAsync(payload)
    onClose()
    setForm({ title: '', team: '', room: '', date: '', start_time: '', end_time: '', description: '' })
  }

  return (
    <Modal open={open} onClose={onClose} title="Book Meeting" size="sm">
      <div className="space-y-3">
        <input
          className="input-base"
          placeholder="Meeting title"
          value={form.title}
          onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          autoFocus
        />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#a0aec0] mb-1.5 block font-medium dark:text-white/35">Date</label>
            <input type="date" className="input-base" value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[#a0aec0] mb-1.5 block font-medium dark:text-white/35">Team</label>
            <select className="input-base" value={form.team}
              onChange={e => setForm(p => ({ ...p, team: e.target.value }))}>
              <option value="">Select team</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#a0aec0] mb-1.5 block font-medium dark:text-white/35">Start</label>
            <input type="time" className="input-base" value={form.start_time}
              onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-[#a0aec0] mb-1.5 block font-medium dark:text-white/35">End</label>
            <input type="time" className="input-base" value={form.end_time}
              onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="text-xs text-[#a0aec0] mb-1.5 block font-medium dark:text-white/35">Room <span className="text-[#cbd5e0] font-normal dark:text-white/20">(optional)</span></label>
          <select className="input-base" value={form.room}
            onChange={e => setForm(p => ({ ...p, room: e.target.value }))}>
            <option value="">Any room</option>
            {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        <textarea
          className="input-base resize-none min-h-[64px]"
          placeholder="Description (optional)"
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        />
        <Button
          className="w-full justify-center"
          loading={createMeeting.isPending}
          onClick={handleSubmit}
          disabled={!form.title || !form.team || !form.date || !form.start_time}
        >
          Book Meeting
        </Button>
      </div>
    </Modal>
  )
}

// ── Main Calendar Component ─────────────────────────────────────
export default function Calendar() {
  const [viewMode, setViewMode] = useState('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [miniMonth, setMiniMonth] = useState(new Date())
  const [bookModal, setBookModal] = useState({ open: false, date: null, time: null })
  const [showSidebar, setShowSidebar] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // ── ADDED: read ?filter from URL (e.g. from Dashboard "Upcoming" click) ──
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterStatus, setFilterStatus] = useState(
    () => searchParams.get('filter') || 'all'
  )

  // Keep filter in sync if URL param changes externally
  useEffect(() => {
    const param = searchParams.get('filter')
    if (param && FILTER_OPTIONS.some(f => f.key === param)) {
      setFilterStatus(param)
    }
  }, [searchParams])

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const monthStart = startOfMonth(currentDate)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const calEnd = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 })

  const fetchStart = viewMode === 'day'
    ? format(currentDate, 'yyyy-MM-dd')
    : viewMode === 'week'
      ? format(weekStart, 'yyyy-MM-dd')
      : format(calStart, 'yyyy-MM-dd')

  const fetchEnd = viewMode === 'day'
    ? format(currentDate, 'yyyy-MM-dd')
    : viewMode === 'week'
      ? format(addDays(weekStart, 6), 'yyyy-MM-dd')
      : format(calEnd, 'yyyy-MM-dd')

  const { data } = useMeetings({ start_date: fetchStart, end_date: fetchEnd })
  const allMeetings = data?.results || data || []

  // ── ADDED: apply status filter client-side ──
  const today = format(new Date(), 'yyyy-MM-dd')
  const meetings = useMemo(() => {
    if (filterStatus === 'all') return allMeetings
    if (filterStatus === 'upcoming') {
      // upcoming = scheduled AND date >= today
      return allMeetings.filter(m => m.status === 'scheduled' && m.date >= today)
    }
    return allMeetings.filter(m => m.status === filterStatus)
  }, [allMeetings, filterStatus, today])

  const nav = (dir) => {
    if (viewMode === 'day') setCurrentDate(d => addDays(d, dir))
    else if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1))
    else setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1))
  }

  const headerLabel = () => {
    if (viewMode === 'day') return format(currentDate, 'EEEE, d MMMM yyyy')
    if (viewMode === 'week') {
      const ws = weekStart
      const we = addDays(ws, 6)
      return isSameMonth(ws, we)
        ? `${format(ws, 'd')} – ${format(we, 'd MMM yyyy')}`
        : `${format(ws, 'd MMM')} – ${format(we, 'd MMM yyyy')}`
    }
    return format(currentDate, 'MMMM yyyy')
  }

  // ── ADDED: handle filter change, update URL param too ──
  const handleFilterChange = (key) => {
    setFilterStatus(key)
    if (key === 'all') {
      setSearchParams({})
    } else {
      setSearchParams({ filter: key })
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb] dark:bg-navy-900">
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[#1a202c] tracking-tight dark:text-white">Calendar</h1>
            <p className="text-xs md:text-sm text-[#a0aec0] mt-0.5 dark:text-white/40">Schedule and manage meetings</p>
          </div>
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                onClick={() => setShowSidebar(true)}
                className="p-2 rounded-lg bg-white border border-[#e2e8f0] text-[#a0aec0] hover:text-[#1a202c] transition-all dark:bg-navy-800 dark:border-white/10 dark:text-white/60 dark:hover:text-white"
              >
                <CalIcon size={18} />
              </button>
            )}
            <Button
              icon={Plus}
              onClick={() => setBookModal({ open: true, date: currentDate, time: null })}
              className="shadow-lg"
              size="sm"
            >
              New Meeting
            </Button>
          </div>
        </div>

        <div className="flex gap-5">
          {/* Sidebar */}
          {!isMobile && (
            <div className="w-64 shrink-0 space-y-4 animate-slide-in-left">
              <div className="rounded-2xl border border-[#e2e8f0] bg-white overflow-hidden dark:border-white/10 dark:bg-navy-800/60">
                <MiniCalendar
                  current={miniMonth}
                  selected={currentDate}
                  onSelect={(day) => { setCurrentDate(day); setMiniMonth(day) }}
                  onMonthChange={setMiniMonth}
                  meetings={allMeetings}
                />
              </div>

              <div className="rounded-2xl border border-[#e2e8f0] bg-white p-4 dark:border-white/10 dark:bg-navy-800/60">
                <p className="text-xs font-bold text-[#a0aec0] uppercase tracking-widest mb-3 dark:text-white/40">Status</p>
                <div className="space-y-2.5">
                  {[
                    { status: 'scheduled', label: 'Scheduled', dot: 'bg-blue-500 dark:bg-blue-400' },
                    { status: 'in_progress', label: 'In Progress', dot: 'bg-amber-500 dark:bg-amber-400' },
                    { status: 'completed', label: 'Completed', dot: 'bg-emerald-500 dark:bg-emerald-400' },
                    { status: 'cancelled', label: 'Cancelled', dot: 'bg-[#a0aec0] dark:bg-white/25' },
                  ].map(({ label, dot }) => (
                    <div key={label} className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-xs text-[#4a5568] font-medium dark:text-white/45">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile Sidebar Drawer */}
          {isMobile && showSidebar && (
            <>
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSidebar(false)} />
              <div className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-white border-r border-[#e2e8f0] shadow-2xl animate-slide-in-left overflow-y-auto dark:bg-navy-800 dark:border-white/10">
                <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between dark:border-white/10">
                  <h3 className="text-sm font-semibold text-[#1a202c] dark:text-white">Menu</h3>
                  <button onClick={() => setShowSidebar(false)} className="p-1 rounded-lg text-[#a0aec0] hover:text-[#1a202c] dark:text-white/40 dark:hover:text-white">
                    <X size={18} />
                  </button>
                </div>
                <div className="p-4">
                  <MiniCalendar
                    current={miniMonth}
                    selected={currentDate}
                    onSelect={(day) => { setCurrentDate(day); setMiniMonth(day); setShowSidebar(false) }}
                    onMonthChange={setMiniMonth}
                    meetings={allMeetings}
                  />
                  <div className="mt-4 pt-4 border-t border-[#e2e8f0] dark:border-white/10">
                    <p className="text-xs font-bold text-[#a0aec0] uppercase tracking-widest mb-3 dark:text-white/40">Status</p>
                    <div className="space-y-2.5">
                      {[
                        { status: 'scheduled', label: 'Scheduled', dot: 'bg-blue-500 dark:bg-blue-400' },
                        { status: 'in_progress', label: 'In Progress', dot: 'bg-amber-500 dark:bg-amber-400' },
                        { status: 'completed', label: 'Completed', dot: 'bg-emerald-500 dark:bg-emerald-400' },
                        { status: 'cancelled', label: 'Cancelled', dot: 'bg-[#a0aec0] dark:bg-white/25' },
                      ].map(({ label, dot }) => (
                        <div key={label} className="flex items-center gap-2.5">
                          <div className={`w-2 h-2 rounded-full ${dot}`} />
                          <span className="text-xs text-[#4a5568] font-medium dark:text-white/45">{label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-[#e2e8f0] dark:bg-navy-800/80 dark:border-white/10">
                  <button onClick={() => nav(-1)} className="w-8 h-8 flex items-center justify-center text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] rounded-lg transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10">
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1 text-xs font-semibold text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] rounded-lg transition-all dark:text-white/60 dark:hover:text-white dark:hover:bg-white/10">
                    Today
                  </button>
                  <button onClick={() => nav(1)} className="w-8 h-8 flex items-center justify-center text-[#a0aec0] hover:text-[#1a202c] hover:bg-[#f7fafc] rounded-lg transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10">
                    <ChevronRight size={16} />
                  </button>
                </div>
                <h2 className="text-base font-bold text-[#1a202c] dark:text-white">{headerLabel()}</h2>
              </div>

              {/* ── ADDED: right side — filter pills + view mode buttons ── */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap self-start sm:self-auto">

                {/* View mode buttons */}
                <div className="flex items-center gap-1.5 bg-white rounded-xl p-1 border border-[#e2e8f0] dark:bg-navy-800/80 dark:border-white/10">
                  {['month', 'week', 'day'].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize ${viewMode === mode
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30'
                        : 'text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10'
                        }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Mobile Dropdown */}
            <div className="block sm:hidden w-full">
              <select
                value={filterStatus}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#e2e8f0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:bg-navy-800/80 dark:border-white/10 dark:text-white"
              >
                {FILTER_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Desktop Filter Pills */}
            <div className="hidden sm:flex items-center gap-1 bg-white rounded-xl p-1 border border-[#e2e8f0] dark:bg-navy-800/80 dark:border-white/10 mx-auto sm:mx-0">
              {FILTER_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => handleFilterChange(opt.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filterStatus === opt.key
                      ? 'bg-amber-400 text-white shadow-md shadow-amber-400/30'
                      : 'text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] dark:text-white/40 dark:hover:text-white dark:hover:bg-white/10'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Views — unchanged, just receive filtered `meetings` now */}
            {viewMode === 'day' && (
              isMobile ? (
                <div className="border border-[#e2e8f0] rounded-xl p-4 bg-white/40 dark:border-white/10 dark:bg-navy-800/30">
                  <div className="mb-3 pb-2 border-b border-[#e2e8f0] dark:border-white/10">
                    <h3 className="text-lg font-semibold text-[#1a202c] dark:text-white">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
                  </div>
                  <DayGrid
                    date={currentDate}
                    meetings={meetings}
                    onSlotClick={(date, time) => setBookModal({ open: true, date, time })}
                    isMobile={true}
                  />
                </div>
              ) : (
                <div className="border border-[#e2e8f0] rounded-xl overflow-hidden dark:border-white/10">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: '700px' }}>
                      <div className="grid grid-cols-[80px_1fr] border-b border-[#e2e8f0] bg-white/50 dark:border-white/10 dark:bg-navy-800/50">
                        <div className="p-3 border-r border-[#e2e8f0] dark:border-white/10">
                          <div className="text-xs font-semibold text-[#a0aec0] dark:text-white/40">Time</div>
                        </div>
                        <div className="p-3 text-center">
                          <div className="text-xs font-semibold text-[#a0aec0] dark:text-white/60">{format(currentDate, 'EEE')}</div>
                          <div className={`text-lg font-bold mt-1 ${isToday(currentDate) ? 'text-blue-600 dark:text-blue-400' : 'text-[#1a202c] dark:text-white'}`}>
                            {format(currentDate, 'd')}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-[80px_1fr]">
                        <div className="border-r border-[#e2e8f0] dark:border-white/10">
                          {HOURS.map(hour => (
                            <div key={hour} className="h-[60px] px-2 flex items-center justify-end text-xs text-[#a0aec0] border-b border-[#e2e8f0] dark:text-white/40 dark:border-white/5">
                              {hour === 12 ? '12pm' : hour > 12 ? `${hour - 12}pm` : `${hour}am`}
                            </div>
                          ))}
                        </div>
                        <div className="relative">
                          <DayGrid
                            date={currentDate}
                            meetings={meetings}
                            onSlotClick={(date, time) => setBookModal({ open: true, date, time })}
                            isMobile={false}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            )}

            {viewMode === 'week' && (
              <WeekView
                weekStart={weekStart}
                meetings={meetings}
                onSlotClick={(date, time) => setBookModal({ open: true, date, time })}
                isMobile={isMobile}
              />
            )}

            {viewMode === 'month' && (
              <MonthView
                current={currentDate}
                meetings={meetings}
                onDayClick={(day) => {
                  setCurrentDate(day)
                  setViewMode('day')
                }}
                isMobile={isMobile}
              />
            )}
          </div>
        </div>

        <QuickBookModal
          open={bookModal.open}
          onClose={() => setBookModal({ open: false, date: null, time: null })}
          defaultDate={bookModal.date}
          defaultTime={bookModal.time}
        />
      </div>

      <style jsx>{`
        @keyframes slide-up {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes slide-in-left {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.3s ease-out; }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  )
}