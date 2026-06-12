import { useQuery } from '@tanstack/react-query'
import { meetingsApi } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts'
import Card from '../components/ui/Card'
import { TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react'

function StatBox({ label, value, color = 'blue', icon: Icon, trend }) {
  const colors = {
    blue: 'bg-blue-primary/10 text-blue-light border-blue-primary/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
    amber: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  return (
    <div className={`card border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold">{value ?? '—'}</p>
          <p className="text-xs font-medium uppercase tracking-wider text-white/70 mt-1">{label}</p>
          {trend && <p className="text-xs mt-1 text-white/50">{trend}</p>}
        </div>
        {Icon && <Icon size={20} className="opacity-50" />}
      </div>
    </div>
  )
}

export default function Analytics() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => meetingsApi.analytics().then(r => r.data),
  })

  const stats = data || {}
  
  // Prepare data for charts
  const teamData = stats.by_team 
    ? Object.entries(stats.by_team).map(([name, teamStats]) => ({
        name,
        total: teamStats.total,
        completed: teamStats.completed,
        cancelled: teamStats.cancelled,
      }))
    : []

  const peakData = stats.peak_hours
    ? stats.peak_hours.map(h => ({
        hour: `${h.start_time__hour}:00`,
        count: h.count,
      }))
    : []

  const statusData = [
    { name: 'Completed', value: stats.completed || 0, fill: '#22c55e' },
    { name: 'Cancelled', value: stats.cancelled || 0, fill: '#ef4444' },
    { name: 'Scheduled', value: stats.scheduled || 0, fill: '#f59e0b' },
    { name: 'In Progress', value: stats.in_progress || 0, fill: '#ef4444' },
  ].filter(d => d.value > 0)

  const TooltipStyle = {
    contentStyle: { background: '#111d35', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 },
    labelStyle: { color: 'rgba(255,255,255,0.6)' },
    itemStyle: { color: '#85B7EB' },
    cursor: { fill: 'rgba(255,255,255,0.1)' }
  }

  const completionRate = stats.total_meetings 
    ? Math.round((stats.completed / stats.total_meetings) * 100) 
    : 0

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        <p className="text-sm text-white/40 mt-1">Meeting insights and performance metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-6 gap-3">
        <StatBox label="Total Meetings" value={stats.total_meetings} color="blue" icon={Clock} />
        <StatBox label="Completed" value={stats.completed} color="green" icon={CheckCircle} />
        <StatBox label="Cancelled" value={stats.cancelled} color="red" icon={XCircle} />
        <StatBox label="Scheduled" value={stats.scheduled} color="amber" />
        <StatBox 
          label="Completion Rate" 
          value={`${completionRate}%`} 
          color="green" 
          trend={`${stats.completed} of ${stats.total_meetings}`}
        />
        <StatBox 
          label="Teams" 
          value={teamData.length} 
          color="blue" 
          icon={Users}
        />
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-3 gap-5">
        {/* Status Distribution */}
        <Card className="p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-5">Meeting Status Distribution</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip {...TooltipStyle} formatter={(value) => value} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/40">
              No data available
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            {statusData.map(item => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                  <span className="text-white/60">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Meetings by Team */}
        <Card className="col-span-2 p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-5">Meetings by Team</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : teamData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={teamData}>
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={false}
                />
                <Tooltip {...TooltipStyle} />
                <Legend />
                <Bar dataKey="total" fill="#378ADD" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
                <Bar dataKey="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-white/40">
              No team data available
            </div>
          )}
        </Card>
      </div>

      {/* Peak Hours */}
      <Card className="p-5 border border-white/5">
        <h3 className="text-sm font-semibold text-white mb-5">Peak Booking Hours</h3>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : peakData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={peakData}>
              <XAxis 
                dataKey="hour" 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 11 }} 
                axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                tickLine={false}
              />
              <Tooltip {...TooltipStyle} />
              <Line 
                type="monotone" 
                dataKey="count" 
                stroke="#378ADD" 
                dot={{ fill: '#378ADD', r: 4 }}
                activeDot={{ r: 6 }}
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-white/40">
            No peak hour data available
          </div>
        )}
      </Card>

      {/* Team Performance */}
      {teamData.length > 0 && (
        <Card className="p-5 border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-5">Team Performance Summary</h3>
          <div className="space-y-4">
            {teamData.map(team => {
              const rate = team.total > 0 ? Math.round((team.completed / team.total) * 100) : 0
              return (
                <div key={team.name} className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-white">{team.name}</h4>
                    <span className={`text-sm font-bold ${rate >= 80 ? 'text-green-400' : rate >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {rate}%
                    </span>
                  </div>
                  <div className="flex gap-2 mb-2 text-xs text-white/60">
                    <span>Total: {team.total}</span>
                    <span>•</span>
                    <span className="text-green-400">Completed: {team.completed}</span>
                    <span>•</span>
                    <span className="text-red-400">Cancelled: {team.cancelled}</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${rate >= 80 ? 'bg-green-400' : rate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                      style={{ width: `${rate}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}