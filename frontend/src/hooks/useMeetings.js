import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { meetingsApi, teamsApi, usersApi } from '../api/client'
import toast from 'react-hot-toast'

export const useMeetings = (params = {}) => {
  return useQuery({
    queryKey: ['meetings', params],
    queryFn: () => meetingsApi.getAll(params).then(r => r.data),
    refetchInterval: 30000,
  })
}

export const useRoomStatus = () => {
  return useQuery({
    queryKey: ['room-status'],
    queryFn: () => meetingsApi.roomStatus().then(r => r.data),
    refetchInterval: 15000,
  })
}

export const useTeams = () => {
  return useQuery({
    queryKey: ['teams'],
    queryFn: () => teamsApi.getAll().then(r => r.data.results || r.data),
  })
}

export const useUsers = () => {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll().then(r => r.data.results || r.data),
  })
}

export const useCreateMeeting = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: meetingsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
      qc.invalidateQueries({ queryKey: ['room-status'] })
      toast.success('Meeting booked!')
    },
    onError: (err) => {
      const msg = err.response?.data?.non_field_errors?.[0] || 'Booking failed'
      toast.error(msg)
    },
  })
}

export const useMeetingAction = () => {
  const qc = useQueryClient()

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['meetings'] })
    qc.invalidateQueries({ queryKey: ['room-status'] })
  }

  const start = useMutation({
    mutationFn: meetingsApi.start,
    onSuccess: () => {
      invalidate()
      toast.success('Meeting started!')
    },
    onError: () => toast.error('Failed to start meeting'),
  })

  const end = useMutation({
    mutationFn: meetingsApi.end,
    onSuccess: () => {
      invalidate()
      toast.success('Meeting ended')
    },
    onError: () => toast.error('Failed to end meeting'),
  })

  // ✅ Fixed: cancel now has proper loading state, success toast, and query invalidation
  const cancel = useMutation({
    mutationFn: meetingsApi.cancel,
    onSuccess: () => {
      invalidate()
      toast.success('Meeting cancelled')
    },
    onError: (err) => {
      const msg = err.response?.data?.detail || 'Failed to cancel meeting'
      toast.error(msg)
    },
  })

  const checkin = useMutation({
    mutationFn: meetingsApi.checkin,
    onSuccess: () => {
      invalidate()
      toast.success('Checked in!')
    },
    onError: () => toast.error('Check-in failed'),
  })

  return { start, end, cancel, checkin }
}

export const useRooms = () => {
  return useQuery({
    queryKey: ['rooms'],
    queryFn: () => roomsApi.getAll().then(r => r.data.results || r.data),
  })
}