// MeetingDetail.jsx - With Theme Support
import { useParams, useNavigate } from "react-router-dom"
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useQuery } from "@tanstack/react-query"
import { meetingsApi } from "../api/client"
import { format } from "date-fns"
import Badge from "../components/ui/Badge"
import Button from "../components/ui/Button"
import Card from "../components/ui/Card"
import Modal from "../components/ui/Modal"
import { useMeetingAction } from "../hooks/useMeetings"
import {
  ArrowLeft, Clock, Users, Calendar,
  StopCircle, XCircle, RefreshCw, UserCheck, MapPin, FileText,
} from "lucide-react"
import toast from "react-hot-toast"

function ExtendButton({ meetingId }) {
  const [open, setOpen] = useState(false)
  const [minutes, setMinutes] = useState(30)
  const qc = useQueryClient()

  const extend = useMutation({
    mutationFn: () => meetingsApi.extend(meetingId, minutes),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['meeting', String(meetingId)] })
      qc.invalidateQueries({ queryKey: ['meetings'] })
      toast.success(`Extended to ${data.data.new_end_time}`)
      if (data.data.postponed?.length) {
        toast(`⚠️ ${data.data.postponed.length} meeting(s) postponed`, { icon: '📧' })
      }
      setOpen(false)
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Extension failed'),
  })

  if (!open) return (
    <Button icon={Clock} variant="ghost" onClick={() => setOpen(true)}>
      <span className="hidden sm:inline">Extend Time</span>
      <span className="sm:hidden">Extend</span>
    </Button>
  )

  return (
    <div className="flex flex-wrap items-center gap-2">
      {[15, 30, 45, 60].map(m => (
        <button
          key={m}
          onClick={() => setMinutes(m)}
          className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
            ${minutes === m
              ? 'bg-blue-primary border-blue-primary text-white'
              : 'bg-[#f7fafc] border-[#e2e8f0] text-[#4a5568] hover:border-blue-primary/40 dark:bg-navy-700 dark:border-white/10 dark:text-white/60 dark:hover:border-blue-primary/40'
            }`}
        >
          +{m}m
        </button>
      ))}
      <Button size="sm" loading={extend.isPending} onClick={() => extend.mutate()}>Confirm</Button>
      <button onClick={() => setOpen(false)} className="text-[#a0aec0] hover:text-[#1a202c] text-xs dark:text-white/30 dark:hover:text-white">✕</button>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start sm:items-center gap-3 py-3 border-b border-[#e2e8f0] last:border-0 dark:border-white/5">
      <div className="w-7 h-7 rounded-lg bg-[#f7fafc] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 dark:bg-navy-700">
        <Icon size={13} className="text-blue-600 dark:text-blue-light" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] sm:text-xs text-[#a0aec0] uppercase tracking-wider dark:text-white/40">{label}</p>
        <p className="text-xs sm:text-sm font-medium text-[#1a202c] mt-0.5 break-words dark:text-white">{value}</p>
      </div>
    </div>
  )
}

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { start, end, cancel } = useMeetingAction()
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'start', 'end', or 'cancel'
    meetingId: null,
    meetingTitle: ''
  })

  const { data: m, isLoading } = useQuery({
    queryKey: ["meeting", id],
    queryFn: () => meetingsApi.get(id).then(r => r.data),
  })

  // ── Fetch current user to check permissions ──
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then(r => r.data),
  })
  const currentUserId = meData?.user?.id

  // ── Check if current user is the organizer ──
  const isOrganizer = currentUserId && m?.organizer_detail?.id === currentUserId

  // ── NEW: Show confirmation modal for starting meeting ──
  const handleStartClick = () => {
    setConfirmModal({
      isOpen: true,
      type: 'start',
      meetingId: m.id,
      meetingTitle: m.title
    })
  }

  // ── NEW: Show confirmation modal for ending meeting ──
  const handleEndClick = () => {
    setConfirmModal({
      isOpen: true,
      type: 'end',
      meetingId: m.id,
      meetingTitle: m.title
    })
  }

  // ── NEW: Show confirmation modal for canceling meeting ──
  const handleCancelClick = () => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel',
      meetingId: m.id,
      meetingTitle: m.title
    })
  }

  // ── NEW: Execute the confirmed action ──
  const handleConfirmAction = () => {
    const { type, meetingId } = confirmModal
    
    if (type === 'start') {
      start.mutate(meetingId, {
        onSuccess: () => {
          toast.success('Meeting started!')
          setConfirmModal({ isOpen: false, type: '', meetingId: null, meetingTitle: '' })
        },
        onError: () => {
          toast.error('Failed to start meeting')
        }
      })
    } else if (type === 'end') {
      end.mutate(meetingId, {
        onSuccess: () => {
          toast.success('Meeting ended')
          setConfirmModal({ isOpen: false, type: '', meetingId: null, meetingTitle: '' })
        },
        onError: () => {
          toast.error('Failed to end meeting')
        }
      })
    } else if (type === 'cancel') {
      cancel.mutate(meetingId, {
        onSuccess: () => {
          toast.success('Meeting cancelled')
          navigate('/meetings')
          setConfirmModal({ isOpen: false, type: '', meetingId: null, meetingTitle: '' })
        },
        onError: () => {
          toast.error('Failed to cancel meeting')
        }
      })
    }
  }

  // ── NEW: Close confirmation modal ──
  const handleCloseConfirmModal = () => {
    setConfirmModal({ isOpen: false, type: '', meetingId: null, meetingTitle: '' })
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!m) return <div className="p-6 text-[#a0aec0] dark:text-white/40">Meeting not found</div>

  const createdBy = m.organizer_detail
    ? (
      m.organizer_detail.first_name || m.organizer_detail.last_name
        ? `${m.organizer_detail.first_name || ''} ${m.organizer_detail.last_name || ''}`.trim()
        : m.organizer_detail.username
    )
    : '—';

  const conductor = m.conductor_detail
    ? (
      m.conductor_detail.first_name || m.conductor_detail.last_name
        ? `${m.conductor_detail.first_name || ''} ${m.conductor_detail.last_name || ''}`.trim()
        : m.conductor_detail.username
    )
    : createdBy;

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-full md:max-w-2xl lg:max-w-4xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-xs sm:text-sm text-[#a0aec0] hover:text-[#1a202c] mb-4 sm:mb-6 transition-colors dark:text-white/40 dark:hover:text-white"
      >
        <ArrowLeft size={14} /> Back
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4 sm:mb-6">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1a202c] tracking-tight break-words dark:text-white">{m.title}</h1>
          {m.team_detail && (
            <p className="text-xs sm:text-sm text-[#a0aec0] mt-1 dark:text-white/40">
              {`${`${m.organizer_detail?.first_name || ""} ${m.organizer_detail?.last_name || ""}`.trim() ||
                m.organizer_detail?.username ||
                "—"
                }`}
            </p>
          )}
        </div>
        <div className="self-start">
          <Badge status={m.status} pulse={m.status === 'in_progress'} />
        </div>
      </div>

      {/* Room banner */}
      {m.room_detail && (
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 dark:bg-blue-500/20">
              <MapPin size={14} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-[#a0aec0] dark:text-white/40">Room</p>
              <p className="text-sm font-semibold text-[#1a202c] dark:text-white">{m.room_detail.name}</p>
              {m.room_detail.location && (
                <p className="text-xs text-[#a0aec0] dark:text-white/30">{m.room_detail.location}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Schedule */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#a0aec0] uppercase tracking-wider mb-3 dark:text-white/40">Schedule</h3>
          <InfoRow
            icon={Calendar}
            label="Date"
            value={format(new Date(m.date), 'EEEE, dd MMMM yyyy')}
          />
          <InfoRow
            icon={Clock}
            label="Time"
            value={`${format(new Date(`2000-01-01T${m.start_time}`), 'h:mm a')} → ${m.end_time
              ? format(new Date(`2000-01-01T${m.end_time}`), 'h:mm a')
              : 'Open-ended'
              }`}
          />
          {m.recurrence !== 'none' && (
            <InfoRow
              icon={RefreshCw}
              label="Recurrence"
              value={m.recurrence.charAt(0).toUpperCase() + m.recurrence.slice(1)}
            />
          )}
          <InfoRow
            icon={Calendar}
            label="Created"
            value={m.created_at ? format(new Date(m.created_at), 'dd MMM yyyy, h:mm a') : null}
          />
        </Card>

        {/* People */}
        <Card className="p-4">
          <h3 className="text-xs font-semibold text-[#a0aec0] uppercase tracking-wider mb-3 dark:text-white/40">People</h3>
          <InfoRow
            icon={Users}
            label="Created By"
            value={createdBy}
          />
          {conductor && (
            <InfoRow
              icon={UserCheck}
              label="Organizer"
              value={conductor}
            />
          )}
        </Card>
      </div>

      {/* Description */}
      {m.description && (
        <Card className="mb-4 p-4">
          <div className="flex items-start gap-3">
            <FileText size={14} className="text-[#a0aec0] mt-0.5 shrink-0 dark:text-white/40" />
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-[#a0aec0] uppercase tracking-wider mb-2 dark:text-white/40">Description</h3>
              <p className="text-xs sm:text-sm text-[#4a5568] leading-relaxed break-words dark:text-white/70">{m.description}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Participants */}
      {m.participants?.length > 0 && (
        <Card className="mb-4 p-4">
          <div className="flex items-center gap-3 mb-3">
            <Users size={14} className="text-[#a0aec0] dark:text-white/40" />
            <h3 className="text-xs font-semibold text-[#a0aec0] uppercase tracking-wider dark:text-white/40">
              Participants ({m.participants.length})
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {m.participants.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] dark:bg-navy-800/50 dark:border-white/5">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0 dark:bg-blue-darker dark:text-blue-light">
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#1a202c] truncate dark:text-white">{p.name}</p>
                  <p className="text-xs text-[#a0aec0] truncate dark:text-white/40">{p.email}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Actions - Only show if user is organizer */}
      {isOrganizer && (
        <div className="flex flex-wrap gap-2">
          {m.status === 'scheduled' && (
            <>
              <Button
                icon={StopCircle}
                onClick={handleStartClick}
              >
                Start Meeting
              </Button>
              <Button
                icon={XCircle}
                variant="danger"
                onClick={handleCancelClick}
              >
                Cancel
              </Button>
            </>
          )}
          {m.status === 'in_progress' && m.end_time && (
            <>
              <Button
                icon={StopCircle}
                variant="danger"
                onClick={handleEndClick}
              >
                <span className="hidden sm:inline">End Meeting Early</span>
                <span className="sm:hidden">End</span>
              </Button>
              <ExtendButton meetingId={m.id} />
            </>
          )}
        </div>
      )}

      {/* ── NEW: Confirmation Modal ── */}
      <Modal 
        open={confirmModal.isOpen} 
        onClose={handleCloseConfirmModal} 
        title={
          confirmModal.type === 'start' ? 'Start Meeting' :
          confirmModal.type === 'end' ? 'End Meeting' : 
          'Cancel Meeting'
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4a5568] dark:text-white/70">
            Are you sure you want to <span className="font-semibold">{confirmModal.type}</span> the meeting 
            <span className="font-semibold text-[#1a202c] dark:text-white"> "{confirmModal.meetingTitle}"</span>?
          </p>
          <p className="text-xs text-[#a0aec0] dark:text-white/40">
            {confirmModal.type === 'start' 
              ? 'This action will start the meeting and change its status to "In Progress".' 
              : confirmModal.type === 'end'
              ? 'This action will end the meeting and free up the room.'
              : 'This action will cancel the meeting and notify all participants.'}
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <Button 
              variant="ghost" 
              onClick={handleCloseConfirmModal}
              className="px-4 py-2"
            >
              No, Keep it
            </Button>
            <Button 
              variant={
                confirmModal.type === 'end' || confirmModal.type === 'cancel' 
                  ? 'danger' 
                  : 'primary'
              } 
              onClick={handleConfirmAction}
              className="px-4 py-2"
            >
              Yes, {confirmModal.type === 'start' ? 'Start' : 
                     confirmModal.type === 'end' ? 'End' : 
                     'Cancel'} Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}