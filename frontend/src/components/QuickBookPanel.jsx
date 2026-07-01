// QuickBookPanel.jsx
import { useState } from 'react'
import { Zap, MapPin, Users, Clock, Type } from 'lucide-react'
import Modal from './ui/Modal'
import Button from './ui/Button'
import { useRooms } from '../hooks/useMeetings'
import { meetingsApi } from '../api/client'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'

export default function QuickBookPanel({ compact = false }) {
  const [open, setOpen] = useState(false)
  const [duration, setDuration] = useState(30)
  const [room, setRoom] = useState('')
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: rooms = [] } = useRooms()
  const qc = useQueryClient()

  const activeRooms = rooms.filter(r => r.is_active !== false)
  const freeRooms = activeRooms.filter(r => !r.current_meeting)
  const busyRooms = activeRooms.filter(r => r.current_meeting)
  const selectedRoom = activeRooms.find(r => String(r.id) === String(room))

  const handleOpen = (mins) => {
    setDuration(mins)
    setTitle(`Quick Meeting (${mins}m)`)
    const firstFree = freeRooms[0]
    if (firstFree) setRoom(String(firstFree.id))
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
    setRoom('')
    setTitle('')
  }

  const handleConfirm = async () => {
    if (!room) {
      toast.error('Please select a room')
      return
    }
    setLoading(true)
    try {
      await meetingsApi.quickBook({
        duration,
        title: title.trim() || `Quick Meeting (${duration}m)`,
        room,
      })
      toast.success(`Booked ${selectedRoom?.name} for ${duration} minutes!`)
      qc.invalidateQueries({ queryKey: ['meetings'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      qc.invalidateQueries({ queryKey: ['rooms'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      handleClose()
    } catch (e) {
      const msg =
        e.response?.data?.non_field_errors?.[0] ||
        e.response?.data?.error ||
        e.response?.data?.detail ||
        'Booking failed'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  const triggerCard = compact ? (
    <div className="card border border-blue-primary/20 bg-gradient-to-br from-[#f7fafc] to-white p-4 dark:from-navy-700 dark:to-navy-800">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-blue-primary/20 flex items-center justify-center shrink-0">
          <Zap size={13} className="text-blue-primary dark:text-blue-light" />
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-semibold text-[#1a202c] dark:text-white">Quick Book</h3>
          <p className="text-xs text-[#a0aec0] truncate dark:text-white/35">
            {freeRooms.length > 0
              ? `${freeRooms.length} room${freeRooms.length > 1 ? 's' : ''} free`
              : 'All rooms busy'}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1.5">
        {[15, 30, 60, 90].map(m => (
          <button
            key={m}
            onClick={() => handleOpen(m)}
            disabled={freeRooms.length === 0}
            className="py-2 rounded-lg bg-[#f7fafc] hover:bg-blue-50 border border-[#e2e8f0] hover:border-blue-primary/30 text-xs font-semibold text-[#4a5568] hover:text-blue-700 transition-all disabled:opacity-30 disabled:cursor-not-allowed dark:bg-navy-600 dark:hover:bg-blue-dark dark:border-white/10 dark:hover:border-blue-primary/30 dark:text-white/60 dark:hover:text-white"
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  ) : (
    <div className="card p-5 border-blue-primary/20 bg-gradient-to-br from-[#f7fafc] to-white dark:from-navy-700 dark:to-navy-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-primary/20 flex items-center justify-center">
          <Zap size={16} className="text-blue-primary dark:text-blue-light" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#1a202c] dark:text-white">Quick Book</h3>
          <p className="text-xs text-[#a0aec0] dark:text-white/40">
            {freeRooms.length > 0
              ? `${freeRooms.length} room${freeRooms.length > 1 ? 's' : ''} available now`
              : 'All rooms currently busy'}
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        {[15, 30, 60, 90].map(m => (
          <button
            key={m}
            onClick={() => handleOpen(m)}
            disabled={freeRooms.length === 0}
            className="flex-1 py-2.5 rounded-lg bg-[#f7fafc] hover:bg-blue-50 border border-[#e2e8f0] hover:border-blue-primary/30 text-xs font-semibold text-[#4a5568] hover:text-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed dark:bg-navy-600 dark:hover:bg-blue-dark dark:border-white/10 dark:hover:border-blue-primary/30 dark:text-white/70 dark:hover:text-white"
          >
            {m}m
          </button>
        ))}
      </div>
    </div>
  )

  return (
    <>
      {triggerCard}

      <Modal open={open} onClose={handleClose} title="Quick Book" size="sm">
        <div className="space-y-4">

          {/* Meeting title */}
          <div>
            <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block flex items-center gap-1.5 dark:text-white/40">
              <Type size={11} className="text-blue-primary dark:text-blue-light" />
              Meeting Name
            </label>
            <input
              className="input-base w-full"
              placeholder={`Quick Meeting (${duration}m)`}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          {/* Duration */}
          <div>
            <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/40">Duration</label>
            <div className="grid grid-cols-4 gap-2">
              {[15, 30, 60, 90].map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setDuration(m)
                    if (!title || title.match(/^Quick Meeting \(\d+m\)$/)) {
                      setTitle(`Quick Meeting (${m}m)`)
                    }
                  }}
                  className={`py-2.5 rounded-lg text-sm font-bold border transition-all ${
                    duration === m
                      ? 'bg-blue-primary border-blue-primary text-white'
                      : 'bg-[#f7fafc] border-[#e2e8f0] text-[#4a5568] hover:text-[#1a202c] hover:border-blue-primary/30 dark:bg-navy-700 dark:border-white/10 dark:text-white/50 dark:hover:text-white dark:hover:border-white/20'
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Time display */}
          <div className="bg-[#f7fafc] rounded-xl p-4 border border-[#e2e8f0] flex items-center justify-between dark:bg-navy-700 dark:border-white/5">
            <div className="flex items-center gap-2 text-[#a0aec0] dark:text-white/40">
              <Clock size={14} />
              <span className="text-xs">Starting now</span>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-primary dark:text-blue-light">{duration} min</p>
              <p className="text-xs text-[#a0aec0] mt-0.5 dark:text-white/30">
                {(() => {
                  const now = new Date()
                  const endT = new Date(now.getTime() + duration * 60000)
                  const fmt = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                  return `${fmt(now)} → ${fmt(endT)}`
                })()}
              </p>
            </div>
          </div>

          {/* Room selector */}
          <div>
            <label className="text-xs font-medium text-[#4a5568] uppercase tracking-wider mb-2 block dark:text-white/40">Select Room</label>

            {freeRooms.length === 0 && busyRooms.length === 0 ? (
              <div className="text-center py-6 text-[#a0aec0] text-sm dark:text-white/30">No rooms configured</div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                {freeRooms.map(r => {
                  const isSelected = String(r.id) === String(room)
                  return (
                    <button
                      key={r.id}
                      onClick={() => setRoom(String(r.id))}
                      className={`w-full text-left rounded-xl p-3 border transition-all ${
                        isSelected
                          ? 'border-blue-primary/60 bg-blue-50 dark:border-blue-primary/60 dark:bg-blue-primary/10'
                          : 'border-[#e2e8f0] bg-[#f7fafc] hover:border-blue-primary/30 hover:bg-blue-50 dark:border-white/10 dark:bg-navy-700 dark:hover:border-blue-primary/30 dark:hover:bg-navy-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full bg-green-500 shrink-0 dark:bg-green-400" />
                          <span className="text-sm font-semibold text-[#1a202c] truncate dark:text-white">{r.name}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {isSelected && <span className="text-xs text-blue-primary dark:text-blue-light">✓</span>}
                          <span className="text-xs font-semibold text-green-600 dark:text-green-400">Free</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        {r.location && (
                          <p className="text-xs text-[#a0aec0] flex items-center gap-1 dark:text-white/30">
                            <MapPin size={9} /> {r.location}
                          </p>
                        )}
                        <p className="text-xs text-[#a0aec0] flex items-center gap-1 dark:text-white/25">
                          <Users size={9} /> {r.capacity} cap
                        </p>
                        {r.next_meeting && (
                          <p className="text-xs text-amber-600 dark:text-amber-400/60">Next @ {r.next_meeting.start_time}</p>
                        )}
                      </div>
                    </button>
                  )
                })}

                {busyRooms.map(r => (
                  <div
                    key={r.id}
                    className="rounded-xl p-3 border border-red-200 bg-red-50 opacity-50 cursor-not-allowed dark:border-red-500/15 dark:bg-red-500/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0 dark:bg-red-400" />
                        <span className="text-sm font-semibold text-[#1a202c] truncate dark:text-white">{r.name}</span>
                      </div>
                      <span className="text-xs font-semibold text-red-600 shrink-0 ml-2 dark:text-red-400">Busy</span>
                    </div>
                    {r.current_meeting && (
                      <p className="text-xs text-red-600/50 mt-1 truncate dark:text-red-300/50">
                        {r.current_meeting.title}
                        {r.current_meeting.end_time && ` · until ${r.current_meeting.end_time}`}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Confirm */}
          <Button
            className="w-full justify-center"
            loading={loading}
            onClick={handleConfirm}
            disabled={!room || freeRooms.length === 0}
          >
            {!room
              ? 'Select a room to continue'
              : `Book ${selectedRoom?.name} for ${duration} min`
            }
          </Button>

        </div>
      </Modal>
    </>
  )
}