// MeetingList.jsx - With Theme Support
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMeetings, useTeams, useMeetingAction } from '../hooks/useMeetings'
import Table from '../components/ui/Table'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { format } from 'date-fns'
import { Search, Eye, Filter, X, Trash2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/client'
import toast from 'react-hot-toast'

export default function MeetingList() {
  const location = useLocation()
  const navigate = useNavigate()

  const urlStatus = new URLSearchParams(location.search).get('status') || ''

  const [filters, setFilters] = useState({ team: '', status: urlStatus, date: '' })
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: '', // 'end' or 'cancel'
    meetingId: null,
    meetingTitle: ''
  })
  
  const { data, isLoading } = useMeetings(filters)
  const { data: teams = [] } = useTeams()
  const { cancel, end } = useMeetingAction()

  // ── Fetch current user to check permissions ──
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: () => usersApi.me().then(r => r.data),
  })
  const currentUserId = meData?.user?.id

  useEffect(() => {
    const s = new URLSearchParams(location.search).get('status') || ''
    setFilters(p => ({ ...p, status: s }))
  }, [location.search])

  const meetings = (data?.results || data || []).filter(m =>
    !search || m.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── NEW: Show confirmation modal for ending meeting ──
  const handleEndClick = (id, title) => {
    setConfirmModal({
      isOpen: true,
      type: 'end',
      meetingId: id,
      meetingTitle: title || 'Untitled Meeting'
    })
  }

  // ── NEW: Show confirmation modal for canceling meeting ──
  const handleCancelClick = (id, title) => {
    setConfirmModal({
      isOpen: true,
      type: 'cancel',
      meetingId: id,
      meetingTitle: title || 'Untitled Meeting'
    })
  }

  // ── NEW: Execute the confirmed action ──
  const handleConfirmAction = () => {
    const { type, meetingId } = confirmModal
    
    if (type === 'end') {
      end.mutate(meetingId, {
        onSuccess: () => {
          toast.success('Meeting ended successfully')
          setConfirmModal({ isOpen: false, type: '', meetingId: null, meetingTitle: '' })
        },
        onError: () => {
          toast.error('Failed to end meeting')
        }
      })
    } else if (type === 'cancel') {
      cancel.mutate(meetingId, {
        onSuccess: () => {
          toast.success('Meeting cancelled successfully')
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

  const columns = [
    {
      key: 'title', label: 'Meeting',
      render: (v, row) => (
        <div>
          <p className="font-medium text-[#1a202c] text-sm dark:text-white">{v}</p>
          <p className="text-xs text-[#a0aec0] mt-0.5 dark:text-white/40">
            {row.conductor_detail
              ? `${row.conductor_detail.first_name} ${row.conductor_detail.last_name}`
              : `${row.organizer_detail?.first_name || ""} ${row.organizer_detail?.last_name || ""}`}
          </p>
        </div>
      )
    },
    {
      key: 'date', label: 'Date',
      render: (v) => <span className="text-sm text-[#1a202c] dark:text-white">{format(new Date(v), 'dd MMM yyyy')}</span>
    },
    {
      key: 'start_time', label: 'Time',
      render: (v, row) => (
        <span className="text-sm font-mono text-blue-600 dark:text-blue-light">
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
      render: (v, row) => {
        // ── Check if current user is the organizer ──
        const isOrganizer = currentUserId && row.organizer_detail?.id === currentUserId
        
        return (
          <div className="flex flex-wrap gap-1.5">
            <Button size="sm" variant="ghost" icon={Eye} onClick={() => navigate(`/meetings/${v}`)}>
              <span className="hidden sm:inline">View</span>
            </Button>
            {/* ── Only show End button if user is organizer ── */}
            {row.status === 'in_progress' && isOrganizer && (
              <Button 
                size="sm" 
                variant="danger" 
                icon={Trash2} 
                onClick={() => handleEndClick(v, row.title)}
              >
                <span className="hidden sm:inline">End</span>
              </Button>
            )}
            {/* ── Only show Cancel button if user is organizer ── */}
            {row.status === 'scheduled' && isOrganizer && (
              <Button 
                size="sm" 
                variant="ghost" 
                icon={Trash2} 
                onClick={() => handleCancelClick(v, row.title)}
              >
                <span className="hidden sm:inline">Cancel</span>
              </Button>
            )}
          </div>
        )
      }
    },
  ]

  const hasActiveFilters = filters.team || filters.status || filters.date

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 animate-fade-in max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-bold text-[#1a202c] tracking-tight dark:text-white">Meetings</h1>
        <Button
          size="sm"
          variant="ghost"
          icon={Filter}
          onClick={() => setShowFilters(!showFilters)}
          className="sm:hidden"
        >
          Filters
        </Button>
      </div>

      {/* Filters - Desktop always visible, Mobile toggle */}
      <div className={`card p-3 sm:p-4 transition-all ${showFilters ? 'block' : 'hidden sm:block'}`}>
        <div className="flex flex-col gap-3">
          {/* Search - Always visible */}
          <div className="relative w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#a0aec0] dark:text-white/30" />
            <input
              className="input-base pl-9 w-full"
              placeholder="Search meetings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Filter row - responsive grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <select
              className="input-base w-full"
              value={filters.team}
              onChange={e => setFilters(p => ({ ...p, team: e.target.value }))}
            >
              <option value="">All Teams</option>
              {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            
            <select
              className="input-base w-full"
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
              className="input-base w-full"
              type="date"
              value={filters.date}
              onChange={e => setFilters(p => ({ ...p, date: e.target.value }))}
            />
            
            {hasActiveFilters && (
              <Button
                size="sm"
                variant="ghost"
                icon={X}
                onClick={() => { 
                  setFilters({ team: '', status: '', date: '' })
                  navigate('/meetings')
                }}
                className="justify-center"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-[#a0aec0] dark:text-white/40">
          Showing {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Table - responsive with horizontal scroll on table only */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <Table columns={columns} data={meetings} loading={isLoading} emptyText="No meetings found" />
          </div>
        </div>
      </div>

      {/* ── NEW: Confirmation Modal ── */}
      <Modal 
        open={confirmModal.isOpen} 
        onClose={handleCloseConfirmModal} 
        title={confirmModal.type === 'end' ? 'End Meeting' : 'Cancel Meeting'}
      >
        <div className="space-y-4">
          <p className="text-sm text-[#4a5568] dark:text-white/70">
            Are you sure you want to <span className="font-semibold">{confirmModal.type}</span> the meeting 
            <span className="font-semibold text-[#1a202c] dark:text-white"> "{confirmModal.meetingTitle}"</span>?
          </p>
          <p className="text-xs text-[#a0aec0] dark:text-white/40">
            {confirmModal.type === 'end' 
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
              variant={confirmModal.type === 'end' ? 'danger' : 'primary'} 
              onClick={handleConfirmAction}
              className="px-4 py-2"
            >
              Yes, {confirmModal.type === 'end' ? 'End' : 'Cancel'} Meeting
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}