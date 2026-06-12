import { useQuery } from '@tanstack/react-query'
import { usersApi, meetingsApi } from '../api/client'
import RoomStatusCard from '../components/RoomStatusCard'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import MeetingForm from '../components/MeetingForm'
import { format } from 'date-fns'
import { useState } from 'react'
import { Zap, Plus, TrendingUp, Clock, CheckCircle, AlertCircle, Users, Building2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

function StatCard({ label, value, color = 'blue', icon: Icon, subtext }) {
  const colors = {
    blue: 'bg-blue-primary/10 text-blue-light border-blue-primary/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  }
  return (
    <div className={`card border p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <p className="text-xs font-medium uppercase tracking-wider mt-1">{label}</p>
          {subtext && <p className="text-xs text-white/40 mt-1">{subtext}</p>}
        </div>
        {Icon && <Icon size={20} className="opacity-60" />}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [bookOpen, setBookOpen] = useState(false)
  const qc = useQueryClient()

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => usersApi.dashboard().then(r => r.data),
  })

  const stats = dashboardData?.stats || {}
  const rooms = dashboardData?.rooms || []
  const todaySchedule = dashboardData?.today_schedule || []
  const teams = dashboardData?.teams || []

  const quickBook = async (mins) => {
    try {
      const team = teams[0]?.id
      if (!team) {
        toast.error('No team assigned')
        return
      }
      await meetingsApi.quickBook({ duration: mins, title: `Quick Meeting (${mins}m)`, team })
      toast.success(`Room booked for ${mins} minutes!`)
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['meetings'] })
    } catch (e) {
      toast.error(e.response?.data?.non_field_errors?.[0] || 'Room unavailable')
    }
  }

  const occupiedRooms = rooms.filter(r => r.status === 'occupied').length
  const availableRooms = rooms.filter(r => r.status === 'available').length

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/40 mt-1">{format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon={Zap} onClick={() => quickBook(30)}>30 min</Button>
          <Button variant="ghost" size="sm" icon={Zap} onClick={() => quickBook(60)}>60 min</Button>
          <Button size="sm" icon={Plus} onClick={() => setBookOpen(true)}>Book Room</Button>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="Total Meetings" value={stats.total_meetings || 0} color="blue" icon={Clock} />
        <StatCard label="Today" value={stats.today_meetings || 0} color="purple" />
        <StatCard label="In Progress" value={stats.in_progress || 0} color="red" icon={AlertCircle} />
        <StatCard label="Upcoming" value={stats.upcoming || 0} color="amber" />
        <StatCard label="Completed" value={stats.completed || 0} color="green" icon={CheckCircle} />
        <StatCard label="Cancelled" value={stats.cancelled || 0} color="red" />
      </div>

      {/* Rooms & Schedule */}
      <div className="grid grid-cols-3 gap-5">
        {/* Rooms Overview */}
        <div className="card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Room Status</h3>
            <Building2 size={16} className="text-blue-light" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-white/60">Available</span>
              <span className="text-lg font-bold text-green-400">{availableRooms}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-white/60">Occupied</span>
              <span className="text-lg font-bold text-red-400">{occupiedRooms}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <span className="text-sm text-white/60">Total Rooms</span>
              <span className="text-lg font-bold text-blue-light">{rooms.length}</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-white/10">
            <p className="text-xs text-white/40 mb-3">Active Rooms</p>
            <div className="space-y-2">
              {rooms.slice(0, 3).map(room => (
                <div key={room.id} className="flex items-center gap-2 text-xs">
                  <div className={`w-2 h-2 rounded-full ${room.status === 'occupied' ? 'bg-red-400' : 'bg-green-400'}`} />
                  <span className="text-white/60">{room.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="col-span-2 card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Today's Schedule</h3>
            <Clock size={16} className="text-blue-light" />
          </div>
          <div className="space-y-0">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : !todaySchedule.length ? (
              <div className="text-center py-8 text-white/30 text-sm">No meetings scheduled for today</div>
            ) : todaySchedule.slice(0, 5).map(m => (
              <div key={m.id} className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0">
                <div className="text-center min-w-[48px]">
                  <p className="text-xs font-bold text-blue-light">
                    {format(new Date(`2000-01-01T${m.start_time}`), 'HH:mm')}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{m.title}</p>
                  <p className="text-xs text-white/40">{m.team_detail?.name}</p>
                </div>
                <Badge status={m.status} pulse={m.status === 'in_progress'} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Teams & Analytics */}
      <div className="grid grid-cols-2 gap-5">
        {/* Teams */}
        <div className="card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Your Teams</h3>
            <Users size={16} className="text-blue-light" />
          </div>
          <div className="space-y-2">
            {teams.length > 0 ? (
              teams.map(team => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.color || '#378ADD' }}
                    />
                    <span className="text-sm text-white/80">{team.name}</span>
                  </div>
                  <span className="text-xs text-white/40 bg-white/10 px-2 py-1 rounded">
                    {team.member_count} members
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-white/40 text-center py-4">No teams assigned</div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card p-5 border border-white/5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-semibold text-white">Quick Stats</h3>
            <TrendingUp size={16} className="text-blue-light" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between p-2">
              <span className="text-xs text-white/60">Completion Rate</span>
              <span className="text-xs font-bold text-green-400">
                {stats.total_meetings > 0 
                  ? Math.round((stats.completed / stats.total_meetings) * 100) 
                  : 0}%
              </span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400"
                style={{
                  width: `${stats.total_meetings > 0 
                    ? (stats.completed / stats.total_meetings) * 100 
                    : 0}%`
                }}
              />
            </div>
            <div className="text-xs text-white/40 mt-4 pt-3 border-t border-white/5">
              <p>Meetings this period</p>
              <p className="text-sm font-bold text-white mt-1">{stats.completed} Completed • {stats.cancelled} Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Room Details */}
      <div className="card p-5 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-5">All Rooms</h3>
        <div className="grid grid-cols-5 gap-3">
          {rooms.map(room => (
            <div key={room.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-white truncate">{room.name}</span>
                <div className={`w-2 h-2 rounded-full ${room.status === 'occupied' ? 'bg-red-400' : 'bg-green-400'}`} />
              </div>
              <p className="text-xs text-white/60 mb-2">{room.capacity} capacity</p>
              {room.current_meeting && (
                <div className="text-xs bg-red-500/20 text-red-200 p-2 rounded border border-red-500/20 mb-2">
                  <p className="font-medium">{room.current_meeting.title}</p>
                  <p className="text-red-300/60">until {room.current_meeting.end_time}</p>
                </div>
              )}
              {room.next_meeting && (
                <div className="text-xs bg-amber-500/20 text-amber-200 p-2 rounded border border-amber-500/20">
                  <p className="font-medium">Next: {room.next_meeting.title}</p>
                  <p className="text-amber-300/60">@{room.next_meeting.start_time}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <Modal open={bookOpen} onClose={() => setBookOpen(false)} title="Book Meeting Room">
        <MeetingForm onSuccess={() => setBookOpen(false)} />
      </Modal>
    </div>
  )
}