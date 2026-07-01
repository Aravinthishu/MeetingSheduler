// BookMeeting.jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import MeetingForm from '../components/MeetingForm'
import Card from '../components/ui/Card'
import { useRoomStatus, useMeetings, useRooms } from '../hooks/useMeetings'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, Clock, Zap, MapPin, Users } from 'lucide-react'
import Modal from '../components/ui/Modal'
import Button from '../components/ui/Button'
import { meetingsApi } from '../api/client'
import toast from 'react-hot-toast'
import { useQueryClient } from '@tanstack/react-query'
import QuickBookPanel from '../components/QuickBookPanel'

function TodayTimeline() {
  const today = format(new Date(), 'yyyy-MM-dd')
  const { data } = useMeetings({ date: today })
  const meetings = data?.results || data || []
  const hours = Array.from({ length: 10 }, (_, i) => i + 8)

  return (
    <Card className="p-4 sm:p-5">
      <h3 className="text-[10px] sm:text-xs font-semibold text-[#a0aec0] uppercase tracking-wider mb-4 dark:text-white/40">Today's Timeline</h3>
      <div className="space-y-1 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1">
        {hours.map(h => {
          const meeting = meetings.find(m => {
            const mh = parseInt(m.start_time.split(':')[0])
            const eh = m.end_time ? parseInt(m.end_time.split(':')[0]) : mh + 1
            return h >= mh && h < eh
          })
          return (
            <div key={h} className="flex items-center gap-2 sm:gap-3">
              <span className="text-[10px] sm:text-xs text-[#a0aec0] w-10 sm:w-12 text-right font-mono dark:text-white/25">{h}:00</span>
              <div className={`flex-1 py-1.5 sm:py-2 rounded-lg flex items-center px-2 sm:px-3 text-[10px] sm:text-xs font-medium transition-all
                ${meeting
                  ? meeting.status === 'in_progress'
                    ? 'bg-red-50 border border-red-200 text-red-700 dark:bg-red-500/20 dark:border-red-500/30 dark:text-red-300'
                    : meeting.status === 'completed'
                      ? 'bg-green-50 border border-green-200 text-green-700 dark:bg-green-500/10 dark:border-green-500/20 dark:text-green-400'
                      : 'bg-blue-50 border border-blue-200 text-blue-700 dark:bg-blue-primary/15 dark:border-blue-primary/25 dark:text-blue-light'
                  : 'bg-[#f7fafc] border border-[#e2e8f0] text-[#a0aec0] dark:bg-navy-700 dark:border-white/5 dark:text-white/20'
                }`}
              >
                <span className="truncate">
                  {meeting
                    ? `${meeting.title}${meeting.room_detail ? ` · ${meeting.room_detail.name}` : ''}`
                    : 'Free'
                  }
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default function BookMeeting() {
  const { data: rooms = [] } = useRoomStatus()
  const navigate = useNavigate()

  const anyBusy = rooms.some(r => r.current_meeting)
  const busyCount = rooms.filter(r => r.current_meeting).length
  const freeCount = rooms.filter(r => !r.current_meeting).length

  return (
    <div className="p-3 sm:p-4 md:p-6 animate-fade-in max-w-full overflow-x-hidden">
      <div className="mb-4 sm:mb-6 px-1">
        <h1 className="text-lg sm:text-xl font-bold text-[#1a202c] tracking-tight dark:text-white">Book Meeting Room</h1>
        <p className="text-xs sm:text-sm text-[#a0aec0] mt-0.5 dark:text-white/40">Schedule or instantly grab the room</p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 sm:gap-5">
        <div className="lg:col-span-2 space-y-4">

          {/* Room Status Banner - Improved Colors */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className={`rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border ${freeCount > 0
                ? 'bg-emerald-50/80 border-emerald-200/60 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                : 'bg-[#f7fafc] border-[#e2e8f0] dark:bg-white/5 dark:border-white/10'
              }`}>
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 dark:bg-emerald-500/20">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-semibold text-[#1a202c] truncate dark:text-white">
                  {freeCount} Room{freeCount !== 1 ? 's' : ''} <span className="text-emerald-600 dark:text-emerald-400">Available</span>
                </p>
                <p className="text-[10px] sm:text-xs text-[#a0aec0] mt-0.5 dark:text-white/40">Ready to book</p>
              </div>
            </div>

            <div className={`rounded-xl px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-2 sm:gap-3 border ${busyCount > 0
                ? 'bg-rose-50/80 border-rose-200/60 dark:bg-rose-500/10 dark:border-rose-500/30'
                : 'bg-[#f7fafc] border-[#e2e8f0] dark:bg-white/5 dark:border-white/10'
              }`}>
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0 dark:bg-rose-500/20">
                <XCircle size={16} className={`${busyCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#a0aec0] dark:text-white/20'}`} />
              </div>
              <div className="min-w-0">
                <p className={`text-xs sm:text-sm font-semibold truncate ${busyCount > 0 ? 'text-[#1a202c] dark:text-white' : 'text-[#a0aec0] dark:text-white/30'}`}>
                  {busyCount} Room{busyCount !== 1 ? 's' : ''} <span className={busyCount > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-[#a0aec0] dark:text-white/20'}>In Use</span>
                </p>
                {busyCount > 0 && rooms.find(r => r.current_meeting) && (
                  <p className="text-[10px] sm:text-xs text-[#a0aec0] mt-0.5 truncate flex items-center gap-1 dark:text-white/40">
                    <Clock size={9} className="inline text-rose-400" />
                    <span className="truncate">{rooms.find(r => r.current_meeting)?.current_meeting?.title}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Per-room status strip - Improved Colors */}
          {rooms.length > 0 && (
            <div className="flex gap-1.5 sm:gap-2 flex-wrap max-h-20 sm:max-h-24 overflow-y-auto">
              {rooms.map(room => (
                <div key={room.id} className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg border text-[10px] sm:text-xs font-medium ${room.current_meeting
                    ? 'bg-rose-50/60 border-rose-200/40 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-300'
                    : 'bg-emerald-50/60 border-emerald-200/40 text-emerald-700 dark:bg-emerald-500/10 dark:border-emerald-500/20 dark:text-emerald-300'
                  }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${room.current_meeting ? 'bg-rose-500 animate-pulse dark:bg-rose-400' : 'bg-emerald-500 dark:bg-emerald-400'
                    }`} />
                  <span className="truncate">{room.name}</span>
                  {room.location && <span className="text-[#a0aec0] hidden sm:inline dark:text-white/30">· {room.location}</span>}
                </div>
              ))}
            </div>
          )}

          <Card className="p-4 sm:p-6">
            <h2 className="text-xs sm:text-sm font-semibold text-[#1a202c] mb-4 sm:mb-5 dark:text-white">Schedule a Meeting</h2>
            <MeetingForm onSuccess={() => navigate('/meetings')} />
          </Card>
        </div>

        <div className="space-y-4">
          <QuickBookPanel />
          <TodayTimeline />
        </div>
      </div>
    </div>
  )
}