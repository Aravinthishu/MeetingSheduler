import { format } from 'date-fns'
import NotificationBell from './NotificationBell'
import { useRoomStatus } from '../hooks/useMeetings'

export default function TopBar({ title, subtitle }) {
  const { data: rooms = [] } = useRoomStatus()

  const anyBusy = rooms.some(r => r.current_meeting)
  const busyRoom = rooms.find(r => r.current_meeting)

  return (
    <div className="sticky top-0 z-30 bg-navy-900/80 backdrop-blur-sm border-b border-white/5 px-6 py-3 flex items-center justify-between">
      <div>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/40">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${
          !anyBusy
            ? 'bg-green-500/8 border-green-500/20 text-green-400'
            : 'bg-red-500/8 border-red-500/20 text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${!anyBusy ? 'bg-green-400' : 'bg-red-400'} animate-pulse-slow`} />
          {!anyBusy
            ? 'All Rooms Free'
            : `${busyRoom?.name} Busy`}
        </div>
        <NotificationBell />
      </div>
    </div>
  )
}