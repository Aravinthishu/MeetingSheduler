import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { waitlistApi } from '../api/client'
import { useTeams } from '../hooks/useMeetings'
import Button from './ui/Button'
import Input from './ui/Input'
import { useState } from 'react'
import { format } from 'date-fns'
import { Clock, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api/client'

export default function WaitlistPanel() {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ title: '', team: '', date: '', start_time: '', end_time: '' })
  const { data: teams = [] } = useTeams()

  const { data, isLoading } = useQuery({
    queryKey: ['waitlist'],
    queryFn: () => waitlistApi.getAll().then(r => r.data.results || r.data),
  })
  const items = data || []

  const join = useMutation({
    mutationFn: waitlistApi.join,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['waitlist'] }); toast.success("You're on the waitlist!"); setOpen(false) },
    onError: () => toast.error('Could not join waitlist'),
  })

  const remove = useMutation({
    mutationFn: (id) => api.delete(`/waitlist/${id}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['waitlist'] }),
  })

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <Clock size={15} className="text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Waitlist</h3>
          {items.length > 0 && (
            <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full">{items.length}</span>
          )}
        </div>
        <Button size="sm" variant="amber" icon={Plus} onClick={() => setOpen(p => !p)}>
          Join Queue
        </Button>
      </div>

      {open && (
        <div className="p-5 border-b border-white/5 bg-navy-700/50 space-y-3 animate-fade-in">
          <Input label="Meeting Title" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="What's the meeting for?" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1.5 block">Team</label>
              <select className="input-base" value={form.team} onChange={e => setForm(p => ({ ...p, team: e.target.value }))}>
                <option value="">Select team</option>
                {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <Input label="Date" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" value={form.start_time} onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))} />
            <Input label="End Time (opt)" type="time" value={form.end_time} onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))} />
          </div>
          <Button size="sm" loading={join.isPending} onClick={() => join.mutate(form)}>
            Add to Waitlist
          </Button>
        </div>
      )}

      <div className="divide-y divide-white/5">
        {isLoading ? (
          <div className="text-center py-8 text-white/30 text-sm">Loading...</div>
        ) : !items.length ? (
          <div className="text-center py-8 text-white/30 text-sm">Waitlist is empty</div>
        ) : items.map((item, i) => (
          <div key={item.id} className="flex items-center gap-3 px-5 py-3 hover:bg-white/2 transition-colors">
            <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400 shrink-0">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.title}</p>
              <p className="text-xs text-white/40">
                {item.date && format(new Date(item.date), 'dd MMM')}
                {item.start_time && ` · ${format(new Date(`2000-01-01T${item.start_time}`), 'h:mm a')}`}
              </p>
            </div>
            {item.notified && (
              <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">Notified</span>
            )}
            <button onClick={() => remove.mutate(item.id)} className="text-white/20 hover:text-red-400 transition-colors">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}