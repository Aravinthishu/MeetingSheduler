import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teamsApi, roomsApi, usersApi } from '../api/client'
import api from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Users, MapPin } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

// ── Always fetch fresh /me to get real is_staff value ──────────
function useIsAdmin() {
  const { user } = useAuth()
  const { data } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/auth/me/').then(r => r.data),
    staleTime: 60_000,
  })
  return (data?.is_staff ?? user?.is_staff) === true
}

// ── Teams Section ──────────────────────────────────────────────
function TeamsSection() {
  const qc = useQueryClient()
  const isAdmin = useIsAdmin()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState(null)
  const [form, setForm] = useState({ name: '', color: '#378ADD' })

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll().then(r => r.data.results || r.data),
  })

  const create = useMutation({
    mutationFn: teamsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team created')
      setCreateOpen(false)
      setForm({ name: '', color: '#378ADD' })
    },
    onError: () => toast.error('Failed to create team'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/teams/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team updated')
      setEditTeam(null)
    },
    onError: () => toast.error('Failed to update team'),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}/`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['teams'] }); toast.success('Team deleted') },
  })

  const openEdit = (team) => {
    setEditTeam(team)
    setForm({ name: team.name, color: team.color })
  }

  const columns = [
    {
      key: 'color', label: '',
      render: (v) => <span className="w-3 h-3 rounded-full inline-block" style={{ background: v }} />
    },
    { key: 'name', label: 'Team Name', render: (v) => <span className="font-medium text-white text-sm">{v}</span> },
    { key: 'member_count', label: 'Members', render: (v) => <span className="text-sm text-white/60">{v ?? 0} members</span> },
    ...(isAdmin ? [{
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => del.mutate(v)}>Remove</Button>
        </div>
      )
    }] : []),
  ]

  const TeamForm = ({ loading, onSubmit, label }) => (
    <div className="space-y-4">
      <Input label="Team Name" placeholder="e.g. Backend Team"
        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Team Color</label>
        <div className="flex items-center gap-3">
          <input type="color" value={form.color}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            className="w-10 h-10 rounded-lg border border-white/10 bg-navy-700 cursor-pointer" />
          <span className="text-sm text-white/60 font-mono">{form.color}</span>
        </div>
      </div>
      <Button className="w-full justify-center" loading={loading} onClick={onSubmit}>{label}</Button>
    </div>
  )

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Users size={15} className="text-blue-light" />
          <h3 className="text-sm font-semibold text-white">Teams</h3>
          <span className="text-xs bg-blue-primary/10 text-blue-light border border-blue-primary/20 px-2 py-0.5 rounded-full">{teams.length}</span>
        </div>
        {isAdmin && <Button size="sm" icon={Plus} onClick={() => { setForm({ name: '', color: '#378ADD' }); setCreateOpen(true) }}>Add Team</Button>}
      </div>
      <Table columns={columns} data={teams} loading={isLoading} emptyText="No teams yet" />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Team" size="sm">
        <TeamForm loading={create.isPending} label="Create Team" onSubmit={() => create.mutate(form)} />
      </Modal>
      <Modal open={!!editTeam} onClose={() => setEditTeam(null)} title="Edit Team" size="sm">
        <TeamForm loading={update.isPending} label="Save Changes" onSubmit={() => update.mutate({ id: editTeam?.id, ...form })} />
      </Modal>
    </Card>
  )
}

// ── Rooms Section ──────────────────────────────────────────────
function RoomsSection() {
  const qc = useQueryClient()
  const isAdmin = useIsAdmin()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [form, setForm] = useState({ name: '', capacity: 10, location: '', description: '' })

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll().then(r => r.data.results || r.data),
  })

  const create = useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room created')
      setCreateOpen(false)
      setForm({ name: '', capacity: 10, location: '', description: '' })
    },
    onError: () => toast.error('Failed to create room'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }) => roomsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room updated')
      setEditRoom(null)
    },
    onError: () => toast.error('Failed to update room'),
  })

  const del = useMutation({
    mutationFn: (id) => roomsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['rooms'] }); toast.success('Room deleted') },
  })

  const toggle = useMutation({
    mutationFn: ({ id, is_active }) => roomsApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const openEdit = (room) => {
    setEditRoom(room)
    setForm({ name: room.name, capacity: room.capacity, location: room.location || '', description: room.description || '' })
  }

  const columns = [
    {
      key: 'name', label: 'Room',
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-white">{v}</p>
          {row.location && <p className="text-xs text-white/40">{row.location}</p>}
        </div>
      )
    },
    { key: 'capacity', label: 'Capacity', render: (v) => <span className="text-sm text-white/60">{v} people</span> },
    {
      key: 'is_active', label: 'Status',
      render: (v, row) => (
        <button
          onClick={() => isAdmin && toggle.mutate({ id: row.id, is_active: !v })}
          disabled={!isAdmin}
          className={`text-xs px-2 py-1 rounded-full border font-medium transition-all
            ${v ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-white/5 border-white/10 text-white/30'}
            ${!isAdmin ? 'cursor-default opacity-70' : 'cursor-pointer'}`}
        >
          {v ? 'Active' : 'Inactive'}
        </button>
      )
    },
    ...(isAdmin ? [{
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)}>Edit</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => del.mutate(v)}>Remove</Button>
        </div>
      )
    }] : []),
  ]

  const RoomForm = ({ loading, onSubmit, label }) => (
    <div className="space-y-4">
      <Input label="Room Name" placeholder="e.g. Conference Room A"
        value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
      <Input label="Location" placeholder="e.g. 2nd Floor"
        value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
      <Input label="Capacity" type="number" min={1}
        value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} />
      <div>
        <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Description</label>
        <textarea className="input-base resize-none min-h-[60px]"
          placeholder="Optional notes about this room..."
          value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
      </div>
      <Button className="w-full justify-center" loading={loading} onClick={onSubmit}>{label}</Button>
    </div>
  )

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <MapPin size={15} className="text-blue-light" />
          <h3 className="text-sm font-semibold text-white">Meeting Rooms</h3>
          <span className="text-xs bg-blue-primary/10 text-blue-light border border-blue-primary/20 px-2 py-0.5 rounded-full">{rooms.length}</span>
        </div>
        {isAdmin && <Button size="sm" icon={Plus} onClick={() => { setForm({ name: '', capacity: 10, location: '', description: '' }); setCreateOpen(true) }}>Add Room</Button>}
      </div>
      <Table columns={columns} data={rooms} loading={isLoading} emptyText="No rooms yet" />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Meeting Room" size="sm">
        <RoomForm loading={create.isPending} label="Create Room" onSubmit={() => create.mutate(form)} />
      </Modal>
      <Modal open={!!editRoom} onClose={() => setEditRoom(null)} title="Edit Room" size="sm">
        <RoomForm loading={update.isPending} label="Save Changes" onSubmit={() => update.mutate({ id: editRoom?.id, ...form })} />
      </Modal>
    </Card>
  )
}

// ── Users Section ──────────────────────────────────────────────
function UsersSection() {
  const qc = useQueryClient()
  const isAdmin = useIsAdmin()
  const [editUser, setEditUser] = useState(null)
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    is_staff: false, team_id: null, role: 'member', password: ''
  })

  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then(r => r.data.results || r.data),
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll().then(r => r.data.results || r.data),
  })

  const update = useMutation({
    mutationFn: async ({ id, team_id, role, password, ...data }) => {
      // 1. Update user fields
      await api.patch(`/users/${id}/`, { ...data, ...(password ? { password } : {}) })

      // 2. Update team membership
      const user = usersData.find(u => u.id === id)
      // Remove old memberships
      for (const m of user?.teams || []) {
        await api.delete(`/team-memberships/${m.id}/`)
      }
      // Add new membership if team selected
      if (team_id) {
        await api.post('/team-memberships/', { user: id, team: team_id, role: role || 'member' })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated')
      setEditUser(null)
    },
    onError: (e) => {
      console.error(e)
      toast.error('Failed to update user')
    },
  })

  const openEdit = (user) => {
    setEditUser(user)
    setForm({
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      is_staff: user.is_staff || false,
      team_id: user.team?.id || null,
      role: user.team?.role || user.role || 'member',
      password: '',
    })
  }

  const columns = [
    {
      key: 'username', label: 'User',
      render: (v, row) => {
        const initials = (row.first_name?.[0] || v[0] || '?').toUpperCase()
        return (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-darker flex items-center justify-center text-xs font-bold text-blue-light">
              {initials}
            </div>
            <div>
              <p className="text-sm font-medium text-white">
                {row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : v}
              </p>
              <p className="text-xs text-white/40">@{v}</p>
            </div>
          </div>
        )
      }
    },
    { key: 'email', label: 'Email', render: (v) => <span className="text-sm text-white/60">{v || '—'}</span> },
    {
      key: 'role', label: 'Role',
      render: (v) => (
        <Badge status={v === 'admin' ? 'in_progress' : 'scheduled'}>
          {v?.charAt(0).toUpperCase() + v?.slice(1) || 'Member'}
        </Badge>
      )
    },
    {
      key: 'team', label: 'Team',
      render: (v) => {
        if (!v) return <span className="text-xs text-white/40">—</span>
        return (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: v.color || '#378ADD' }} />
            <span className="text-sm text-white/80">{v.name}</span>
          </div>
        )
      }
    },
    ...(isAdmin ? [{
      key: 'id', label: 'Actions',
      render: (v, row) => (
        <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)}>Edit</Button>
      )
    }] : []),
  ]

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Users size={15} className="text-blue-light" />
          <h3 className="text-sm font-semibold text-white">Users</h3>
          <span className="text-xs bg-blue-primary/10 text-blue-light border border-blue-primary/20 px-2 py-0.5 rounded-full">
            {usersData.length}
          </span>
        </div>
        {!isAdmin && <Badge status="completed">Read-Only</Badge>}
      </div>
      <Table columns={columns} data={usersData} loading={usersLoading} emptyText="No users found" />

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.username}`} size="sm">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="First Name" value={form.first_name}
              onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))} />
            <Input label="Last Name" value={form.last_name}
              onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))} />
          </div>
          <Input label="Email" type="email" value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />

          {/* Team assignment */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Assign Team</label>
            <select
              className="input-base"
              value={form.team_id || ''}
              onChange={e => setForm(p => ({ ...p, team_id: e.target.value ? Number(e.target.value) : null }))}
            >
              <option value="">— No Team —</option>
              {teams.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Role */}
          <div>
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Team Role</label>
            <select
              className="input-base"
              value={form.role}
              onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            >
              <option value="member">Member</option>
              <option value="lead">Team Lead</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Staff toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
            <div>
              <p className="text-sm font-medium text-white">Staff / Admin Access</p>
              <p className="text-xs text-white/40 mt-0.5">Grants full admin privileges</p>
            </div>
            <button
              onClick={() => setForm(p => ({ ...p, is_staff: !p.is_staff }))}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                form.is_staff ? 'bg-blue-primary' : 'bg-white/20'
              }`}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                form.is_staff ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Optional password reset */}
          <Input label="New Password (optional)" type="password"
            placeholder="Leave blank to keep current"
            value={form.password}
            onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />

          <Button className="w-full justify-center" loading={update.isPending}
            onClick={() => update.mutate({ id: editUser?.id, ...form })}>
            Save Changes
          </Button>
        </div>
      </Modal>
    </Card>
  )
}

// ── Admin Page ─────────────────────────────────────────────────
export default function Admin() {
  return (
    <div className="p-6 space-y-5 animate-fade-in">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight">Admin Panel</h1>
        <p className="text-sm text-white/40 mt-0.5">Manage teams, rooms and users</p>
      </div>
      <TeamsSection />
      <RoomsSection />
      <UsersSection />
    </div>
  )
}