import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMeetings, useTeams, useMeetingAction } from '../hooks/useMeetings'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import { format } from 'date-fns'
import { Search, Eye } from 'lucide-react'

export default function MeetingList() {
  const [filters, setFilters] = useState({ team: '', status: '', date: '' })
  const [search, setSearch] = useState('')
  const { data, isLoading } = useMeetings(filters)
  const { data: teams = [] } = useTeams()
  const { cancel, end } = useMeetingAction()
  const navigate = useNavigate()

  const meetings = (data?.results || data || []).filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  )

  const columns = [
    {
      key: 'title', label: 'Meeting',
      render: (v, row) => (
        <div>
          <p className="font-medium text-white text-sm">{v}</p>
          <p className="text-xs text-white/40 mt-0.5">{row.team_detail?.name}</p>
        </div>
      )
    },
    {
      key: 'date', label: 'Date',
      render: (v) => <span className="text-sm">{format(new Date(v), 'dd MMM yyyy')}</span>
    },
    {
      key: 'start_time', label: 'Time',
      render: (v, row) => (
        <span className="text-sm font-mono text-blue-light">
          {format(new Date(`2000-01-01T${v}`), 'HH:mm')}
          {row.end_time ? ` → ${format(new Date(`2000-01-01T${row.end_time}`), 'HH:mm')}` : ' → ∞'}
        </span>
      )
    },
    {
      key: 'status', label: 'Status',
      render: (v) => <Badge status={v} pulse={v === 'in_progress'} />
    },
    {
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex gap-1.5">
          <Button size="sm" variant="ghost" icon={Eye} onClick={() => navigate(`/meetings/${v}`)}>
            View
          </Button>
          {row.status === 'in_progress' && (
            <Button size="sm" variant="danger" onClick={() => end.mutate(v)}>End</Button>
          )}
          {row.status === 'scheduled' && (
            <Button size="sm" variant="ghost" onClick={() => cancel.mutate(v)}>Cancel</Button>
          )}
        </div>
      )
    },
  ]

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Meetings</h1>
      </div>

      <div className="card p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              className="input-base pl-9"
              placeholder="Search meetings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input-base w-40"
            value={filters.team}
            onChange={e => setFilters(p => ({ ...p, team: e.target.value }))}
          >
            <option value="">All Teams</option>
            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <select
            className="input-base w-40"
            value={filters.status}
            onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            className="input-base w-44"
            type="date"
            value={filters.date}
            onChange={e => setFilters(p => ({ ...p, date: e.target.value }))}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table columns={columns} data={meetings} loading={isLoading} emptyText="No meetings found" />
      </div>
    </div>
  )
}