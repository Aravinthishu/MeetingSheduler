// Analytics.jsx - With Theme Support
import { useQuery } from '@tanstack/react-query'
import { meetingsApi } from '../api/client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart, Line, PieChart, Pie, Legend } from 'recharts'
import Card from '../components/ui/Card'
import { TrendingUp, Users, Clock, CheckCircle, XCircle } from 'lucide-react'

function StatBox({ label, value, color = 'blue', icon: Icon, trend }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-primary/10 dark:border-blue-primary/20 dark:text-blue-light',
    green: 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400',
    amber: 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-400/10 dark:border-amber-400/20 dark:text-amber-400',
    red: 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400',
  }
  return (
    <div className={`card border p-3 sm:p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xl sm:text-2xl font-bold truncate">{value ?? '—'}</p>
          <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-[#4a5568] mt-1 dark:text-white/70">{label}</p>
          {trend && <p className="text-[10px] sm:text-xs mt-1 text-[#a0aec0] truncate dark:text-white/50">{trend}</p>}
        </div>
        {Icon && <Icon size={18} className="sm:w-5 sm:h-5 opacity-50 flex-shrink-0 ml-2 text-[#4a5568] dark:text-white/70" />}
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
    contentStyle: { 
      background: '#ffffff', 
      border: '1px solid #e2e8f0', 
      borderRadius: 8, 
      fontSize: 12,
      color: '#1a202c'
    },
    labelStyle: { color: '#4a5568' },
    itemStyle: { color: '#378ADD' },
    cursor: { fill: 'rgba(55, 138, 221, 0.1)' }
  }

  const TooltipStyleDark = {
    contentStyle: { 
      background: '#111d35', 
      border: '1px solid rgba(255,255,255,0.1)', 
      borderRadius: 8, 
      fontSize: 12 
    },
    labelStyle: { color: 'rgba(255,255,255,0.6)' },
    itemStyle: { color: '#85B7EB' },
    cursor: { fill: 'rgba(255,255,255,0.1)' }
  }

  // Detect dark mode for tooltip
  const isDarkMode = typeof window !== 'undefined' 
    ? document.documentElement.classList.contains('dark') 
    : false

  const currentTooltip = isDarkMode ? TooltipStyleDark : TooltipStyle

  const completionRate = stats.total_meetings 
    ? Math.round((stats.completed / stats.total_meetings) * 100) 
    : 0

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 animate-fade-in max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="px-1">
        <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] tracking-tight dark:text-white">Analytics</h1>
        <p className="text-xs sm:text-sm text-[#a0aec0] mt-1 dark:text-white/40">Meeting insights and performance metrics</p>
      </div>

      {/* Key Metrics - Responsive Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
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

      {/* Main Charts - Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {/* Status Distribution */}
        <Card className="p-4 sm:p-5 border border-[#e2e8f0] dark:border-white/5">
          <h3 className="text-sm font-semibold text-[#1a202c] mb-4 sm:mb-5 dark:text-white">Meeting Status Distribution</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : statusData.length > 0 ? (
            <div className="w-full">
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
                  <Tooltip {...currentTooltip} formatter={(value) => value} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 pt-4 border-t border-[#e2e8f0] space-y-2 dark:border-white/10">
                {statusData.map(item => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                      <span className="text-[#4a5568] dark:text-white/60">{item.name}</span>
                    </div>
                    <span className="font-bold text-[#1a202c] dark:text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#a0aec0] dark:text-white/40">
              No data available
            </div>
          )}
        </Card>

        {/* Meetings by Team */}
        <Card className="lg:col-span-2 p-4 sm:p-5 border border-[#e2e8f0] dark:border-white/5">
          <h3 className="text-sm font-semibold text-[#1a202c] mb-4 sm:mb-5 dark:text-white">Meetings by Team</h3>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : teamData.length > 0 ? (
            <div className="w-full overflow-x-auto">
              <div className="min-w-[300px]">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={teamData}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.4)' : '#a0aec0', fontSize: 11 }} 
                      axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis 
                      tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.4)' : '#a0aec0', fontSize: 11 }} 
                      axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                      tickLine={false}
                    />
                    <Tooltip {...currentTooltip} />
                    <Legend 
                      wrapperStyle={{ fontSize: 11, color: isDarkMode ? 'rgba(255,255,255,0.6)' : '#4a5568' }} 
                    />
                    <Bar dataKey="total" fill="#378ADD" radius={[4, 4, 0, 0]} name="Total" />
                    <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} name="Completed" />
                    <Bar dataKey="cancelled" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[#a0aec0] dark:text-white/40">
              No team data available
            </div>
          )}
        </Card>
      </div>

      {/* Peak Hours */}
      <Card className="p-4 sm:p-5 border border-[#e2e8f0] dark:border-white/5">
        <h3 className="text-sm font-semibold text-[#1a202c] mb-4 sm:mb-5 dark:text-white">Peak Booking Hours</h3>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : peakData.length > 0 ? (
          <div className="w-full overflow-x-auto">
            <div className="min-w-[300px]">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={peakData}>
                  <XAxis 
                    dataKey="hour" 
                    tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.4)' : '#a0aec0', fontSize: 11 }} 
                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                    tickLine={false}
                    interval={Math.floor(peakData.length / 8)}
                  />
                  <YAxis 
                    tick={{ fill: isDarkMode ? 'rgba(255,255,255,0.4)' : '#a0aec0', fontSize: 11 }} 
                    axisLine={{ stroke: isDarkMode ? 'rgba(255,255,255,0.1)' : '#e2e8f0' }}
                    tickLine={false}
                  />
                  <Tooltip {...currentTooltip} />
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
            </div>
          </div>
        ) : (
          <div className="h-40 flex items-center justify-center text-[#a0aec0] dark:text-white/40">
            No peak hour data available
          </div>
        )}
      </Card>

      {/* Team Performance */}
      {teamData.length > 0 && (
        <Card className="p-4 sm:p-5 border border-[#e2e8f0] dark:border-white/5">
          <h3 className="text-sm font-semibold text-[#1a202c] mb-4 sm:mb-5 dark:text-white">Team Performance Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {teamData.map(team => {
              const rate = team.total > 0 ? Math.round((team.completed / team.total) * 100) : 0
              return (
                <div key={team.name} className="p-3 sm:p-4 bg-[#f7fafc] rounded-lg dark:bg-white/5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                    <h4 className="font-medium text-[#1a202c] text-sm sm:text-base break-words dark:text-white">{team.name}</h4>
                    <span className={`text-sm font-bold self-start sm:self-auto ${
                      rate >= 80 ? 'text-green-600 dark:text-green-400' : 
                      rate >= 50 ? 'text-amber-600 dark:text-amber-400' : 
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {rate}%
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2 text-[10px] sm:text-xs text-[#4a5568] dark:text-white/60">
                    <span>Total: {team.total}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-green-600 dark:text-green-400">Completed: {team.completed}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="text-red-600 dark:text-red-400">Cancelled: {team.cancelled}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden dark:bg-white/10">
                    <div 
                      className={`h-full ${
                        rate >= 80 ? 'bg-green-500 dark:bg-green-400' : 
                        rate >= 50 ? 'bg-amber-500 dark:bg-amber-400' : 
                        'bg-red-500 dark:bg-red-400'
                      }`}
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