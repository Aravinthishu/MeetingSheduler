import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Clock, BarChart3,
  Users, LogOut, Zap
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/book', icon: Zap, label: 'Book Room' },
  { to: '/meetings', icon: Clock, label: 'Meetings' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/admin', icon: Users, label: 'Admin' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  // Get user initials
  const getInitials = (name) => {
    return name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-navy-800 border-r border-white/10 flex flex-col z-40">
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-dark rounded-lg flex items-center justify-center">
            <CalendarDays size={16} className="text-blue-light" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">MeetSync</h1>
            <p className="text-xs text-white/30">Room Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `
              flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
              transition-all duration-150 group
              ${isActive
                ? 'bg-blue-primary/10 text-blue-light border border-blue-primary/20'
                : 'text-white/50 hover:text-white hover:bg-white/5'
              }
            `}
          >
            {({ isActive }) => (
              <>
                <Icon size={16} className={isActive ? 'text-blue-light' : 'text-white/40 group-hover:text-white/70'} />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-navy-700 border border-white/5">
          <div className="w-7 h-7 rounded-full bg-blue-darker flex items-center justify-center text-xs font-bold text-blue-light">
            {getInitials(user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">
              {user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.username || 'User'}
            </p>
            <p className="text-xs text-white/30 truncate">{user?.team || 'Team'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="text-white/30 hover:text-red-400 transition-colors"
            title="Logout"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  )
}