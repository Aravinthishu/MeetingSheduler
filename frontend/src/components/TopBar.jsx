// src/components/TopBar.jsx
import { format } from 'date-fns'
import { Menu, Sun, Moon } from 'lucide-react'
import NotificationBell from './NotificationBell'
import { useRoomStatus } from '../hooks/useMeetings'
import { useTheme } from '../context/ThemeContext'

export default function TopBar({ title, subtitle, onMenuClick }) {
  const { data: rooms = [] } = useRoomStatus()
  const { theme, toggleTheme } = useTheme()

  const anyBusy = rooms.some(r => r.current_meeting)
  const busyRoom = rooms.find(r => r.current_meeting)

  return (
    <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-sm border-b border-[#e2e8f0] px-4 sm:px-6 py-3 flex items-center justify-between gap-3 dark:bg-navy-900/80 dark:border-white/5">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden text-[#4a5568] hover:text-[#1a202c] transition-colors shrink-0 dark:text-white/50 dark:hover:text-white"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-[#1a202c] truncate dark:text-white">{title}</h2>
          {subtitle && <p className="text-xs text-[#a0aec0] hidden sm:block dark:text-white/40">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Status indicator */}
        <div className={`hidden sm:flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ${
          !anyBusy
            ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-500/8 dark:border-green-500/20 dark:text-green-400'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-500/8 dark:border-red-500/20 dark:text-red-400'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${!anyBusy ? 'bg-green-500' : 'bg-red-500'} animate-pulse-slow`} />
          {!anyBusy ? 'All Rooms Free' : `${busyRoom?.name} Busy`}
        </div>

        {/* Mobile: just the dot indicator */}
        <div className={`sm:hidden w-2 h-2 rounded-full ${!anyBusy ? 'bg-green-500' : 'bg-red-500'} animate-pulse-slow`} />

        {/* Theme toggle - UNCOMMENTED */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-[#4a5568] hover:text-[#1a202c] hover:bg-[#edf2f7] transition-all dark:text-white/40 dark:hover:text-white dark:hover:bg-white/5"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>

        <NotificationBell />
      </div>
    </div>
  )
}