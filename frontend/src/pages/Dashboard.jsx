// Dashboard.jsx - Fully Responsive with Theme Support
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/client'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import MeetingForm from '../components/MeetingForm'
import QuickBookPanel from '../components/QuickBookPanel'
import { format } from 'date-fns'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Clock, CheckCircle, AlertCircle, XCircle,
  Calendar, Building2, Users, TrendingUp, MapPin, ChevronRight
} from 'lucide-react'
import { useMeetingAction } from '../hooks/useMeetings'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

const PANEL_ALL = 'all'
const PANEL_INPROGRESS = 'inprogress'
const PANEL_UPCOMING = 'upcoming'

function StatCard({ label, value, color, icon: Icon, onClick, active }) {
  const styles = {
    blue: {
      card: active 
        ? 'border-blue-primary/50 bg-blue-primary/10 dark:bg-blue-primary/10' 
        : 'border-blue-primary/20 hover:border-blue-primary/40 hover:bg-blue-primary/5 dark:hover:bg-blue-primary/5',
      value: 'text-blue-primary dark:text-blue-light',
    },
    red: {
      card: active 
        ? 'border-red-500/50 bg-red-500/10 dark:bg-red-500/10' 
        : 'border-red-500/20 hover:border-red-500/40 hover:bg-red-500/5 dark:hover:bg-red-500/5',
      value: 'text-red-600 dark:text-red-400',
    },
    amber: {
      card: active 
        ? 'border-amber-400/50 bg-amber-400/10 dark:bg-amber-400/10' 
        : 'border-amber-400/20 hover:border-amber-400/40 hover:bg-amber-400/5 dark:hover:bg-amber-400/5',
      value: 'text-amber-600 dark:text-amber-400',
    },
    green: {
      card: active 
        ? 'border-green-500/50 bg-green-500/10 dark:bg-green-500/10' 
        : 'border-green-500/20 hover:border-green-500/40 hover:bg-green-500/5 dark:hover:bg-green-500/5',
      value: 'text-green-600 dark:text-green-400',
    },
    purple: {
      card: active 
        ? 'border-purple-500/50 bg-purple-500/10 dark:bg-purple-500/10' 
        : 'border-purple-500/20 hover:border-purple-500/40 hover:bg-purple-500/5 dark:hover:bg-purple-500/5',
      value: 'text-purple-600 dark:text-purple-400',
    },
  }
  const s = styles[color] || styles.blue

  return (
    <div
      onClick={onClick}
      className={`card border p-3 sm:p-4 transition-all duration-150 ${s.card} ${onClick ? 'cursor-pointer select-none' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        {Icon && <Icon size={16} className="text-[#a0aec0] dark:text-white/20" />}
        {active && <span className="text-xs text-blue-primary dark:text-blue-light/50">●</span>}
      </div>
      <p className={`text-xl sm:text-2xl font-bold tracking-tight ${s.value}`}>{value}</p>
      <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider mt-1 text-[#a0aec0] dark:text-white/40">{label}</p>
    </div>
  )
}

function MeetingRow({ m, showCancel, showEnd, onCancel, onEnd }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const isToday = m.date === format(new Date(), 'yyyy-MM-dd')

  return (
    <div className="border-b border-[#e2e8f0] last:border-0 dark:border-white/5">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 py-3">
        <div className="flex items-center justify-between sm:justify-start">
          <div className="text-left min-w-[48px] sm:min-w-[56px]">
            <p className="text-xs font-bold text-blue-primary font-mono dark:text-blue-light">
              {format(new Date(`2000-01-01T${m.start_time}`), 'HH:mm')}
            </p>
            <p className="text-xs text-[#a0aec0] dark:text-white/25">
              {m.end_time ? format(new Date(`2000-01-01T${m.end_time}`), 'HH:mm') : '∞'}
            </p>
            {/* Show date if not today */}
            {!isToday && (
              <p className="text-xs font-semibold text-amber-500 dark:text-amber-400 mt-0.5">
                {format(new Date(m.date), 'dd MMM')}
              </p>
            )}
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="sm:hidden text-[#a0aec0] hover:text-[#1a202c] p-1 dark:text-white/40 dark:hover:text-white"
          >
            <ChevronRight size={16} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#1a202c] truncate dark:text-white">{m.title}</p>
          <div className={`${expanded ? 'block' : 'hidden sm:block'}`}>
            <p className="text-xs text-[#a0aec0] mt-0.5 truncate dark:text-white/40">
              {m.conductor_detail
                ? `${m.conductor_detail.first_name || ''} ${m.conductor_detail.last_name || m.conductor_detail.username}`.trim()
                : `${m.organizer_detail?.first_name || ''} ${m.organizer_detail?.last_name || m.organizer_detail?.username || '—'}`.trim()
              }
              {m.room_detail ? ` · ${m.room_detail.name}` : ''}
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 shrink-0 ${expanded ? 'flex' : 'hidden sm:flex'}`}>
          <Badge status={m.status} pulse={m.status === 'in_progress'} />
          <Button size="sm" variant="ghost" onClick={() => navigate(`/meetings/${m.id}`)}>View</Button>
          {showEnd && (
            <Button size="sm" variant="danger" onClick={() => onEnd(m.id)}>End</Button>
          )}
          {showCancel && (
            <Button size="sm" variant="ghost" onClick={() => onCancel(m.id)} className="hidden sm:inline-flex">Cancel</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [bookOpen, setBookOpen] = useState(false)
  const [activePanel, setActivePanel] = useState(PANEL_ALL)
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { end, cancel } = useMeetingAction()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => usersApi.dashboard().then(r => r.data),
    refetchInterval: 10000,
    refetchIntervalInBackground: true,
  })

  const stats = dashboardData?.stats || {}
  const rooms = dashboardData?.rooms || []
  const todaySchedule = dashboardData?.today_schedule || []
  const upcomingSchedule = dashboardData?.upcoming_schedule || [] 
  const teams = dashboardData?.teams || []

  const inProgressMeetings = todaySchedule.filter(m => m.status === 'in_progress')
  const upcomingMeetings = upcomingSchedule 

  const panelConfig = {
    [PANEL_ALL]: { label: 'All Today', meetings: todaySchedule },
    [PANEL_INPROGRESS]: { label: 'In Progress', meetings: inProgressMeetings },
    [PANEL_UPCOMING]: { label: 'Upcoming', meetings: upcomingMeetings },
  }
  const currentPanel = panelConfig[activePanel]

  const handleStatClick = (type) => {
    if (type === 'total') { navigate('/meetings'); return }
    if (type === 'completed') { navigate('/meetings?status=completed'); return }
    if (type === 'cancelled') { navigate('/meetings?status=cancelled'); return }
    setActivePanel(prev => prev === type ? PANEL_ALL : type)
  }

  const handleEnd = (id) => {
    end.mutate(id, {
      onSuccess: () => {
        toast.success('Meeting ended')
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
    })
  }

  const handleCancel = (id) => {
    cancel.mutate(id, {
      onSuccess: () => {
        toast.success('Meeting cancelled')
        qc.invalidateQueries({ queryKey: ['dashboard'] })
      }
    })
  }

  const availableRooms = rooms.filter(r => r.status === 'available')
  const occupiedRooms = rooms.filter(r => r.status === 'occupied')

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] tracking-tight dark:text-white">Dashboard</h1>
          <p className="text-sm text-[#a0aec0] mt-1 dark:text-white/40">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setBookOpen(true)} className="w-full sm:w-auto">
          Book Room
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        <StatCard label="Total" value={stats.total_meetings || 0} color="blue" icon={Calendar}
          onClick={() => handleStatClick('total')} active={false} />
        <StatCard label="Today" value={stats.today_meetings || 0} color="purple" icon={Clock}
          onClick={() => handleStatClick(PANEL_ALL)} active={activePanel === PANEL_ALL} />
        <StatCard label="In Progress" value={stats.in_progress || 0} color="red" icon={AlertCircle}
          onClick={() => handleStatClick(PANEL_INPROGRESS)} active={activePanel === PANEL_INPROGRESS} />
        <StatCard label="Upcoming" value={stats.upcoming || 0} color="amber" icon={TrendingUp}
          onClick={() => handleStatClick(PANEL_UPCOMING)} active={activePanel === PANEL_UPCOMING} />
        <StatCard label="Completed" value={stats.completed || 0} color="green" icon={CheckCircle}
          onClick={() => handleStatClick('completed')} active={false} />
        <StatCard label="Cancelled" value={stats.cancelled || 0} color="red" icon={XCircle}
          onClick={() => handleStatClick('cancelled')} active={false} />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

        {/* Meetings panel — 2 cols */}
        <div className="lg:col-span-2 card border border-[#e2e8f0] flex flex-col dark:border-white/5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3 sm:py-3.5 border-b border-[#e2e8f0] dark:border-white/5">
            <div className="flex flex-wrap items-center gap-1 bg-[#f7fafc] rounded-lg p-1 w-full sm:w-auto dark:bg-navy-700">
              {[
                { key: PANEL_ALL, label: 'All Today' },
                { key: PANEL_INPROGRESS, label: 'In Progress' },
                { key: PANEL_UPCOMING, label: 'Upcoming' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActivePanel(tab.key)}
                  className={`flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activePanel === tab.key
                      ? 'bg-blue-primary text-white'
                      : 'text-[#a0aec0] hover:text-[#1a202c] dark:text-white/40 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                  {tab.key === PANEL_INPROGRESS && inProgressMeetings.length > 0 && (
                    <span className="ml-1.5 bg-red-500/30 text-red-300 text-xs px-1.5 rounded-full">
                      {inProgressMeetings.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <span className="text-xs text-[#a0aec0] shrink-0 dark:text-white/25">{currentPanel.meetings.length} meetings</span>
          </div>

          <div className="px-4 sm:px-5 py-2 overflow-y-auto max-h-[320px] sm:max-h-[400px]">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : currentPanel.meetings.length === 0 ? (
              <div className="text-center py-10 text-[#a0aec0] text-sm dark:text-white/25">No meetings</div>
            ) : (
              currentPanel.meetings.map(m => (
                <MeetingRow
                  key={m.id}
                  m={m}
                  showEnd={m.status === 'in_progress'}
                  showCancel={m.status === 'scheduled'}
                  onEnd={handleEnd}
                  onCancel={handleCancel}
                />
              ))
            )}
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">

          {/* Quick Book — sits at the top of sidebar */}
          <QuickBookPanel compact />

          {/* Rooms */}
          <div className="card border border-[#e2e8f0] p-4 dark:border-white/5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-2">
              <div className="flex items-center gap-2">
                <Building2 size={14} className="text-blue-primary shrink-0 dark:text-blue-light" />
                <h3 className="text-xs font-semibold text-[#1a202c] uppercase tracking-wider dark:text-white">Rooms</h3>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-green-600 font-semibold dark:text-green-400">{availableRooms.length} free</span>
                <span className="text-[#a0aec0] dark:text-white/20">·</span>
                <span className="text-red-600 font-semibold dark:text-red-400">{occupiedRooms.length} busy</span>
              </div>
            </div>
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className="text-xs text-[#a0aec0] text-center py-3 dark:text-white/25">No rooms configured</p>
              ) : rooms.map(room => (
                <div key={room.id} className={`rounded-lg p-3 border ${
                  room.status === 'occupied'
                    ? 'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/15'
                    : 'bg-green-50 border-green-200 dark:bg-green-500/5 dark:border-green-500/15'
                }`}>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        room.status === 'occupied' ? 'bg-red-500 animate-pulse dark:bg-red-400' : 'bg-green-500 dark:bg-green-400'
                      }`} />
                      <span className="text-xs font-medium text-[#1a202c] truncate dark:text-white">{room.name}</span>
                    </div>
                    <span className={`text-xs font-semibold shrink-0 ${
                      room.status === 'occupied' ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {room.status === 'occupied' ? 'Busy' : 'Free'}
                    </span>
                  </div>
                  {room.location && (
                    <p className="text-xs text-[#a0aec0] mt-1 flex items-center gap-1 dark:text-white/25">
                      <MapPin size={9} /> {room.location}
                    </p>
                  )}
                  {room.current_meeting && (
                    <p className="text-xs text-red-600/50 mt-1 truncate dark:text-red-300/50">
                      {room.current_meeting.title}
                      {room.current_meeting.end_time && ` · until ${room.current_meeting.end_time}`}
                    </p>
                  )}
                  {!room.current_meeting && room.next_meeting && (
                    <p className="text-xs text-[#a0aec0] mt-1 truncate dark:text-white/20">
                      Next: {room.next_meeting.title} @ {room.next_meeting.start_time}
                    </p>
                  )}
                  <p className="text-xs text-[#a0aec0] mt-1 dark:text-white/20">Cap. {room.capacity}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Teams */}
          <div className="card border border-[#e2e8f0] p-4 dark:border-white/5">
            <div className="flex items-center gap-2 mb-3">
              <Users size={14} className="text-blue-primary shrink-0 dark:text-blue-light" />
              <h3 className="text-xs font-semibold text-[#1a202c] uppercase tracking-wider dark:text-white">Teams</h3>
            </div>
            {teams.length === 0 ? (
              <p className="text-xs text-[#a0aec0] text-center py-3 dark:text-white/25">No teams assigned</p>
            ) : (
              <div className="divide-y divide-[#e2e8f0] dark:divide-white/5">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: team.color || '#378ADD' }} />
                      <span className="text-sm text-[#4a5568] truncate dark:text-white/70">{team.name}</span>
                    </div>
                    <span className="text-xs text-[#a0aec0] shrink-0 dark:text-white/30">{team.member_count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book Meeting Room">
        <MeetingForm onSuccess={() => { setBookOpen(false); qc.invalidateQueries({ queryKey: ['dashboard'] }) }} />
      </Modal>
    </div>
  )
}