// Admin.jsx - Fixed Form Labels for Light Theme
import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../api/client'
import { useAuth } from '../hooks/useAuth'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Table from '../components/ui/Table'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Badge from '../components/ui/Badge'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit2, Users, MapPin, Shield, ChevronDown, Eye, EyeOff, X } from 'lucide-react'

// ── Shared mobile action menu ─────────────────────────────────────────────────
function MobileMenu({ id, open, setOpen, actions }) {
  return (
    <div className="relative sm:hidden">
      <button
        onClick={() => setOpen(open === id ? null : id)}
        className="p-2 hover:bg-[#f7fafc] rounded-lg transition-colors dark:hover:bg-white/10"
        aria-label="Actions menu"
      >
        <ChevronDown size={18} className="text-[#a0aec0] dark:text-white/60" />
      </button>
      {open === id && (
        <>
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setOpen(null)}
          />
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-20 min-w-[140px] overflow-hidden dark:bg-navy-700 dark:border-white/10">
            {actions.map((a, i) => (
              <button
                key={i}
                onClick={() => { a.onClick(); setOpen(null) }}
                className={`w-full px-4 py-3 text-left text-sm flex items-center gap-3 hover:bg-[#f7fafc] transition-colors dark:hover:bg-white/10 ${
                  a.danger ? 'text-red-600 dark:text-red-400' : 'text-[#1a202c] dark:text-white'
                }`}
              >
                {a.icon && <a.icon size={14} />}
                {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Team Form ─────────────────────────────────────────────────────────────
function TeamForm({ form, setForm, loading, onSubmit, label, onClose }) {
  return (
    <div className="space-y-5">
      <Input
        label="Team Name"
        placeholder="e.g. Backend Team"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        className="text-base"
      />
      <div>
        <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/50">
          Team Color
        </label>
        <div className="flex items-center gap-4">
          <input
            type="color"
            value={form.color}
            onChange={e => setForm(p => ({ ...p, color: e.target.value }))}
            className="w-12 h-12 rounded-xl border border-[#e2e8f0] bg-[#f7fafc] cursor-pointer hover:border-[#cbd5e0] transition-colors dark:border-white/10 dark:bg-navy-700 dark:hover:border-white/20"
          />
          <span className="text-sm text-[#4a5568] font-mono dark:text-white/60">{form.color}</span>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button 
          className="flex-1 justify-center text-base py-3.5" 
          loading={loading} 
          onClick={onSubmit}
        >
          {label}
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 justify-center text-base py-3.5" 
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Room Form ───────────────────────────────────────────────────────────────────
function RoomForm({ form, setForm, loading, onSubmit, label, onClose }) {
  return (
    <div className="space-y-5">
      <Input
        label="Room Name"
        placeholder="e.g. Conference Room A"
        value={form.name}
        onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
        className="text-base"
      />
      <Input
        label="Location"
        placeholder="e.g. 2nd Floor"
        value={form.location}
        onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
        className="text-base"
      />
      <Input
        label="Capacity"
        type="number"
        min={1}
        value={form.capacity}
        onChange={e => setForm(p => ({ ...p, capacity: Number(e.target.value) }))}
        className="text-base"
      />
      <div>
        <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/50">
          Description (optional)
        </label>
        <textarea
          className="input-base resize-none min-h-[80px] text-base"
          placeholder="Notes about this room..."
          value={form.description}
          onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
        />
      </div>
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button 
          className="flex-1 justify-center text-base py-3.5" 
          loading={loading} 
          onClick={onSubmit}
        >
          {label}
        </Button>
        <Button 
          variant="ghost" 
          className="flex-1 justify-center text-base py-3.5" 
          onClick={onClose}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ── Password Field ─────────────────────────────────────────────────────────────
function PasswordField({ form, setForm, showPw, setShowPw, isEdit }) {
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-[#4a5568] uppercase tracking-wider block dark:text-white/50">
        {isEdit ? 'New Password (optional)' : 'Password *'}
      </span>
      <div className="relative">
        <input
          type={showPw ? 'text' : 'password'}
          className="input-base pr-12 text-base"
          placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'}
          value={form.password}
          onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
        />
        <button
          type="button"
          onClick={() => setShowPw(p => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0aec0] hover:text-[#4a5568] transition-colors p-1 dark:text-white/30 dark:hover:text-white/60"
          aria-label="Toggle password visibility"
        >
          {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </div>
  )
}

// ── User Form Fields ───────────────────────────────────────────────────────────
function UserFormFields({ form, setForm, showPw, setShowPw, isEdit, teams, isCreate }) {
  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
      {isCreate && (
        <Input
          label="Username *"
          placeholder="e.g. john.doe"
          value={form.username}
          onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
          className="text-base"
        />
      )}
      <div className="grid grid-cols-1 gap-5">
        <Input
          label="First Name"
          placeholder="First name"
          value={form.first_name}
          onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
          className="text-base"
        />
        <Input
          label="Last Name"
          placeholder="Last name"
          value={form.last_name}
          onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
          className="text-base"
        />
      </div>
      <Input
        label="Email"
        type="email"
        placeholder="user@example.com"
        value={form.email}
        onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
        className="text-base"
      />

      <PasswordField
        form={form}
        setForm={setForm}
        showPw={showPw}
        setShowPw={setShowPw}
        isEdit={isEdit}
      />

      <div>
        <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/50">
          Assign to Team
        </label>
        <select
          className="input-base text-base"
          value={form.team_id || ''}
          onChange={e => setForm(p => ({ ...p, team_id: e.target.value ? Number(e.target.value) : null }))}
        >
          <option value="">— No Team —</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/50">
          Team Role
        </label>
        <select
          className="input-base text-base"
          value={form.role}
          onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
        >
          <option value="member">Member</option>
          <option value="lead">Team Lead</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="flex items-center justify-between p-4 rounded-xl border border-[#e2e8f0] bg-[#f7fafc] dark:border-white/10 dark:bg-white/10">
        <div>
          <p className="text-sm font-medium text-[#1a202c] dark:text-white">Staff / Admin Access</p>
          <p className="text-xs text-[#4a5568] mt-1 dark:text-white/40">Full admin privileges across MeetEZ</p>
        </div>
        <button
          type="button"
          onClick={() => setForm(p => ({ ...p, is_staff: !p.is_staff }))}
          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 ${
            form.is_staff ? 'bg-blue-primary' : 'bg-[#e2e8f0] dark:bg-white/20'
          }`}
          aria-label="Toggle staff access"
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-sm ${
            form.is_staff ? 'translate-x-6' : 'translate-x-1'
          }`} />
        </button>
      </div>
    </div>
  )
}

// ── Teams ─────────────────────────────────────────────────────────────────────
function TeamsSection() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(null)

  const defaultTeamForm = { name: '', color: '#378ADD' }
  const [form, setForm] = useState(defaultTeamForm)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data.results || r.data),
  })

  const create = useMutation({
    mutationFn: (data) => api.post('/teams/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team created!')
      setCreateOpen(false)
      setForm(defaultTeamForm)
    },
    onError: () => toast.error('Failed to create team'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/teams/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team updated!')
      setEditTeam(null)
    },
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/teams/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['teams'] })
      toast.success('Team removed')
    },
  })

  const openEdit = (team) => {
    setEditTeam(team)
    setForm({ name: team.name, color: team.color })
  }

  const columns = [
    {
      key: 'color', 
      label: '',
      render: (v) => <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: v }} />
    },
    {
      key: 'name', 
      label: 'Team Name',
      render: (v, row) => (
        <div>
          <span className="font-medium text-[#1a202c] text-sm block dark:text-white">{v}</span>
          <span className="text-xs text-[#a0aec0] block sm:hidden mt-1 dark:text-white/40">{row.member_count ?? 0} members</span>
        </div>
      )
    },
    {
      key: 'member_count', 
      label: 'Members',
      render: (v) => <span className="text-sm text-[#4a5568] hidden sm:inline dark:text-white/60">{v ?? 0} members</span>
    },
    {
      key: 'id', 
      label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)} className="hidden sm:inline-flex">Edit</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => del.mutate(v)} className="hidden sm:inline-flex">Remove</Button>
          <MobileMenu id={v} open={mobileMenu} setOpen={setMobileMenu} actions={[
            { label: 'Edit', icon: Edit2, onClick: () => openEdit(row) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => del.mutate(v) },
          ]} />
        </div>
      )
    },
  ]

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-4 border-b border-[#e2e8f0] dark:border-white/5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Users size={16} className="text-blue-primary shrink-0 dark:text-blue-light" />
            <h3 className="text-sm font-semibold text-[#1a202c] dark:text-white">Teams</h3>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20">
              {teams.length}
            </span>
          </div>
          <Button
            size="sm" 
            icon={Plus}
            onClick={() => { setForm(defaultTeamForm); setCreateOpen(true) }}
            className="w-full sm:w-auto justify-center text-sm py-2.5"
          >
            Add Team
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table columns={columns} data={teams} loading={isLoading} emptyText="No teams yet" />
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create Team" size="sm">
        <TeamForm
          form={form}
          setForm={setForm}
          loading={create.isPending}
          label="Create Team"
          onClose={() => setCreateOpen(false)}
          onSubmit={() => create.mutate(form)}
        />
      </Modal>
      
      <Modal open={!!editTeam} onClose={() => setEditTeam(null)} title="Edit Team" size="sm">
        <TeamForm
          form={form}
          setForm={setForm}
          loading={update.isPending}
          label="Save Changes"
          onClose={() => setEditTeam(null)}
          onSubmit={() => update.mutate({ id: editTeam?.id, ...form })}
        />
      </Modal>
    </>
  )
}

// ── Rooms ─────────────────────────────────────────────────────────────────────
function RoomsSection() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editRoom, setEditRoom] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(null)

  const defaultRoomForm = { name: '', capacity: 10, location: '', description: '' }
  const [form, setForm] = useState(defaultRoomForm)

  const { data: rooms = [], isLoading } = useQuery({
    queryKey: ['rooms'],
    queryFn: () => api.get('/rooms/').then(r => r.data.results || r.data),
  })

  const create = useMutation({
    mutationFn: (data) => api.post('/rooms/', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room created!')
      setCreateOpen(false)
      setForm(defaultRoomForm)
    },
    onError: () => toast.error('Failed to create room'),
  })

  const update = useMutation({
    mutationFn: ({ id, ...data }) => api.patch(`/rooms/${id}/`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room updated!')
      setEditRoom(null)
    },
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/rooms/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['rooms'] })
      toast.success('Room removed')
    },
  })

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => api.patch(`/rooms/${id}/`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rooms'] }),
  })

  const openEdit = (room) => {
    setEditRoom(room)
    setForm({
      name: room.name,
      capacity: room.capacity,
      location: room.location || '',
      description: room.description || '',
    })
  }

  const columns = [
    {
      key: 'name', 
      label: 'Room',
      render: (v, row) => (
        <div>
          <p className="text-sm font-medium text-[#1a202c] dark:text-white">{v}</p>
          {row.location && <p className="text-xs text-[#a0aec0] mt-0.5 dark:text-white/40">{row.location}</p>}
        </div>
      )
    },
    {
      key: 'capacity', 
      label: 'Capacity',
      render: (v) => <span className="text-sm text-[#4a5568] hidden sm:inline dark:text-white/60">{v} people</span>
    },
    {
      key: 'is_active', 
      label: 'Status',
      render: (v, row) => (
        <button
          onClick={() => toggleActive.mutate({ id: row.id, is_active: !v })}
          className={`text-xs px-2.5 py-1.5 rounded-full border font-semibold transition-all whitespace-nowrap ${
            v
              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400 dark:hover:bg-green-500/20'
              : 'bg-[#f7fafc] border-[#e2e8f0] text-[#a0aec0] hover:bg-[#edf2f7] dark:bg-white/5 dark:border-white/10 dark:text-white/30 dark:hover:bg-white/10'
          }`}
        >
          {v ? 'Active' : 'Inactive'}
        </button>
      )
    },
    {
      key: 'id', 
      label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)} className="hidden sm:inline-flex">Edit</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => del.mutate(v)} className="hidden sm:inline-flex">Remove</Button>
          <MobileMenu id={v} open={mobileMenu} setOpen={setMobileMenu} actions={[
            { label: 'Edit', icon: Edit2, onClick: () => openEdit(row) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => del.mutate(v) },
          ]} />
        </div>
      )
    },
  ]

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-4 border-b border-[#e2e8f0] dark:border-white/5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <MapPin size={16} className="text-blue-primary shrink-0 dark:text-blue-light" />
            <h3 className="text-sm font-semibold text-[#1a202c] dark:text-white">Meeting Rooms</h3>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20">
              {rooms.length}
            </span>
          </div>
          <Button
            size="sm" 
            icon={Plus}
            onClick={() => { setForm(defaultRoomForm); setCreateOpen(true) }}
            className="w-full sm:w-auto justify-center text-sm py-2.5"
          >
            Add Room
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table columns={columns} data={rooms} loading={isLoading} emptyText="No rooms yet" />
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Meeting Room" size="sm">
        <RoomForm
          form={form}
          setForm={setForm}
          loading={create.isPending}
          label="Create Room"
          onClose={() => setCreateOpen(false)}
          onSubmit={() => create.mutate(form)}
        />
      </Modal>
      
      <Modal open={!!editRoom} onClose={() => setEditRoom(null)} title="Edit Room" size="sm">
        <RoomForm
          form={form}
          setForm={setForm}
          loading={update.isPending}
          label="Save Changes"
          onClose={() => setEditRoom(null)}
          onSubmit={() => update.mutate({ id: editRoom?.id, ...form })}
        />
      </Modal>
    </>
  )
}

// ── Users ─────────────────────────────────────────────────────────────────────
function UsersSection() {
  const qc = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [mobileMenu, setMobileMenu] = useState(null)
  const [showPw, setShowPw] = useState(false)

  const emptyForm = {
    username: '', first_name: '', last_name: '',
    email: '', password: '', is_staff: false, team_id: null, role: 'member',
  }
  const [form, setForm] = useState(emptyForm)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => api.get('/users/').then(r => r.data.results || r.data),
  })

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => api.get('/teams/').then(r => r.data.results || r.data),
  })

  const create = useMutation({
    mutationFn: async ({ team_id, role, ...data }) => {
      const res = await api.post('/users/', data)
      if (team_id) {
        await api.post('/team-memberships/', { user: res.data.id, team: team_id, role: role || 'member' })
      }
      return res
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User created!')
      setCreateOpen(false)
      setForm(emptyForm)
    },
    onError: (e) => {
      const msg = e.response?.data?.username?.[0]
        || e.response?.data?.email?.[0]
        || e.response?.data?.password?.[0]
        || 'Failed to create user'
      toast.error(msg)
    },
  })

  const update = useMutation({
    mutationFn: async ({ id, team_id, role, password, ...data }) => {
      const payload = { ...data }
      if (password) payload.password = password
      await api.patch(`/users/${id}/`, payload)
      const existing = await api.get(`/team-memberships/?user=${id}`)
      const memberships = existing.data.results || existing.data
      for (const m of memberships) {
        await api.delete(`/team-memberships/${m.id}/`)
      }
      if (team_id) {
        await api.post('/team-memberships/', { user: id, team: team_id, role: role || 'member' })
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User updated!')
      setEditUser(null)
    },
    onError: () => toast.error('Failed to update user'),
  })

  const del = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deleted')
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
    setShowPw(false)
  }

  const columns = [
    {
      key: 'username', 
      label: 'User',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0 dark:bg-blue-darker dark:text-blue-light">
            {(row.first_name?.[0] || v[0] || '?').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-[#1a202c] truncate dark:text-white">
              {row.first_name && row.last_name ? `${row.first_name} ${row.last_name}` : v}
            </p>
            <p className="text-xs text-[#a0aec0] dark:text-white/40">@{v}</p>
          </div>
        </div>
      )
    },
    {
      key: 'email', 
      label: 'Email',
      render: (v) => <span className="text-sm text-[#4a5568] hidden sm:inline dark:text-white/60">{v || '—'}</span>
    },
    {
      key: 'is_staff', 
      label: 'Role',
      render: (v) => v
        ? <Badge status="in_progress">Admin</Badge>
        : <span className="text-xs text-[#a0aec0] font-medium dark:text-white/40">Member</span>
    },
    {
      key: 'team', 
      label: 'Team',
      render: (v) => v
        ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: v.color || '#378ADD' }} />
            <span className="text-sm text-[#4a5568] truncate hidden sm:inline dark:text-white/70">{v.name}</span>
          </div>
        )
        : <span className="text-xs text-[#a0aec0] dark:text-white/30">—</span>
    },
    {
      key: 'id', 
      label: 'Actions',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" icon={Edit2} onClick={() => openEdit(row)} className="hidden sm:inline-flex">Edit</Button>
          <Button size="sm" variant="danger" icon={Trash2} onClick={() => del.mutate(v)} className="hidden sm:inline-flex">Delete</Button>
          <MobileMenu id={v} open={mobileMenu} setOpen={setMobileMenu} actions={[
            { label: 'Edit', icon: Edit2, onClick: () => openEdit(row) },
            { label: 'Delete', icon: Trash2, danger: true, onClick: () => del.mutate(v) },
          ]} />
        </div>
      )
    },
  ]

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-4 border-b border-[#e2e8f0] dark:border-white/5">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <Shield size={16} className="text-blue-primary shrink-0 dark:text-blue-light" />
            <h3 className="text-sm font-semibold text-[#1a202c] dark:text-white">Users</h3>
            <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20">
              {users.length}
            </span>
          </div>
          <Button
            size="sm" 
            icon={Plus}
            onClick={() => { setForm(emptyForm); setShowPw(false); setCreateOpen(true) }}
            className="w-full sm:w-auto justify-center text-sm py-2.5"
          >
            Create User
          </Button>
        </div>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table columns={columns} data={users} loading={isLoading} emptyText="No users found" />
        </div>
      </Card>

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New User" size="sm">
        <UserFormFields
          form={form}
          setForm={setForm}
          showPw={showPw}
          setShowPw={setShowPw}
          isEdit={false}
          teams={teams}
          isCreate
        />
        <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-2">
          <Button
            className="flex-1 justify-center text-base py-3.5"
            loading={create.isPending}
            onClick={() => {
              if (!form.username.trim()) return toast.error('Username is required')
              if (!form.password || form.password.length < 6) return toast.error('Password must be at least 6 characters')
              create.mutate(form)
            }}
          >
            Create User
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 justify-center text-base py-3.5" 
            onClick={() => setCreateOpen(false)}
          >
            Cancel
          </Button>
        </div>
      </Modal>

      <Modal open={!!editUser} onClose={() => setEditUser(null)} title={`Edit — ${editUser?.username}`} size="sm">
        <UserFormFields
          form={form}
          setForm={setForm}
          showPw={showPw}
          setShowPw={setShowPw}
          isEdit={true}
          teams={teams}
          isCreate={false}
        />
        <div className="flex flex-col sm:flex-row gap-3 mt-5 pt-2">
          <Button
            className="flex-1 justify-center text-base py-3.5"
            loading={update.isPending}
            onClick={() => update.mutate({ id: editUser?.id, ...form })}
          >
            Save Changes
          </Button>
          <Button 
            variant="ghost" 
            className="flex-1 justify-center text-base py-3.5" 
            onClick={() => setEditUser(null)}
          >
            Cancel
          </Button>
        </div>
      </Modal>
    </>
  )
}

// ── Admin Page ────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user, isAdmin } = useAuth()

  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 animate-fade-in max-w-full">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-2">
        <div className="flex items-center gap-2.5">
          <Shield size={20} className="text-blue-primary shrink-0 dark:text-blue-light" />
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-[#1a202c] tracking-tight dark:text-white">Admin Panel</h1>
            <p className="text-xs sm:text-sm text-[#a0aec0] dark:text-white/40">Manage teams, rooms and users</p>
          </div>
        </div>
      </div>
      <TeamsSection />
      <RoomsSection />
      <UsersSection />
    </div>
  )
}