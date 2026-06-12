import { useRoomStatus } from '../hooks/useMeetings'
import { Clock, Users, MapPin } from 'lucide-react'

export default function RoomStatusCard() {
  const { data: rooms = [] } = useRoomStatus()

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-white/40 uppercase tracking-wider">Room Status</h3>
      {rooms.map(room => (
        <div
          key={room.id}
          className={`card p-4 border ${
            room.current_meeting
              ? 'border-red-500/20 bg-red-500/5'
              : 'border-green-500/20 bg-green-500/5'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold text-white">{room.name}</p>
              {room.location && (
                <p className="text-xs text-white/40 flex items-center gap-1 mt-0.5">
                  <MapPin size={10} /> {room.location}
                </p>
              )}
            </div>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold ${
              room.current_meeting
                ? 'bg-red-500/15 text-red-400'
                : 'bg-green-500/15 text-green-400'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                room.current_meeting ? 'bg-red-400 animate-pulse' : 'bg-green-400'
              }`} />
              {room.current_meeting ? 'In Use' : 'Available'}
            </div>
          </div>

          {room.current_meeting && (
            <p className="text-xs text-white/50 truncate">
              {room.current_meeting.title}
              {room.current_meeting.end_time && ` · until ${room.current_meeting.end_time}`}
            </p>
          )}
          {!room.current_meeting && room.next_meeting && (
            <p className="text-xs text-white/30 flex items-center gap-1">
              <Clock size={10} />
              Next: {room.next_meeting.title} at {room.next_meeting.start_time}
            </p>
          )}
          <p className="text-xs text-white/20 mt-1.5 flex items-center gap-1">
            <Users size={10} /> Capacity: {room.capacity}
          </p>
        </div>
      ))}
      {rooms.length === 0 && (
        <div className="card p-4 text-center text-white/30 text-sm">No rooms configured</div>
      )}
    </div>
  )
}