// src/components/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarDays, Clock,
  BarChart3, Users, LogOut, Zap, X, Shield, Sun, Moon
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useTheme } from '../context/ThemeContext'

const BASE_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/book', icon: Zap, label: 'Book Room' },
  // { to: '/meetings', icon: Clock, label: 'Meetings' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendar' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
]

const ADMIN_NAV = [
  { to: '/admin', icon: Shield, label: 'Admin Panel' },
]

export default function Sidebar({ open, onClose }) {
  const { user, logout, isAdmin } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const getInitials = (u) => {
    if (u?.first_name && u?.last_name)
      return `${u.first_name[0]}${u.last_name[0]}`.toUpperCase()
    return (u?.username?.[0] || 'U').toUpperCase()
  }

  const displayName = user?.first_name && user?.last_name
    ? `${user.first_name} ${user.last_name}`
    : user?.username || 'User'

  const navItems = isAdmin ? [...BASE_NAV, ...ADMIN_NAV] : BASE_NAV

  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={`
        fixed left-0 top-0 h-full w-56 bg-white border-r border-[#e2e8f0]
        flex flex-col z-40 transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0
        dark:bg-navy-800 dark:border-white/10
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-[#e2e8f0] flex items-center justify-between dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#388add] rounded-lg flex items-center justify-center">
              <CalendarDays size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#1a202c] tracking-tight dark:text-white">MeetEZ</h1>
              <p className="text-xs text-[#a0aec0] dark:text-white/30">Room Manager</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-[#4a5568] hover:text-[#1a202c] transition-colors dark:text-white/40 dark:hover:text-white">
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Base nav items */}
          <div className="space-y-0.5">
            {BASE_NAV.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-all duration-150 group
                  ${isActive
                    ? 'bg-[#388add]/10 text-[#388add] border border-[#388add]/30 dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20'
                    : 'text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5'
                  }
                `}
              >
                {({ isActive }) => (
                  <>
                    <Icon size={16} className={isActive ? 'text-[#388add] dark:text-blue-light' : 'text-[#a0aec0] group-hover:text-[#4a5568] dark:text-white/40 dark:group-hover:text-white/70'} />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Admin section — only visible to staff */}
          {isAdmin && (
            <div className="pt-3 mt-3 border-t border-[#e2e8f0] dark:border-white/5">
              <p className="text-xs text-[#a0aec0] uppercase tracking-widest px-3 mb-2 font-semibold dark:text-white/20">
                Admin
              </p>
              {ADMIN_NAV.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) => `
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                    transition-all duration-150 group
                    ${isActive
                      ? 'bg-[#388add]/10 text-[#388add] border border-[#388add]/30 dark:bg-blue-primary/10 dark:text-blue-light dark:border-blue-primary/20'
                      : 'text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5'
                    }
                  `}
                >
                  {({ isActive }) => (
                    <>
                      <Icon size={16} className={isActive ? 'text-[#388add] dark:text-blue-light' : 'text-[#a0aec0] group-hover:text-[#4a5568] dark:text-white/40 dark:group-hover:text-white/70'} />
                      {label}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        {/* User footer */}
        <div className="p-3 border-t border-[#e2e8f0] dark:border-white/10">
          {isAdmin && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 mb-2 rounded-lg bg-[#388add]/8 border border-[#388add]/15 dark:bg-blue-primary/8 dark:border-blue-primary/15">
              <Shield size={11} className="text-[#388add] shrink-0 dark:text-blue-light" />
              <span className="text-xs text-[#388add] font-medium dark:text-blue-light">Admin Access</span>
            </div>
          )}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#f7fafc] border border-[#e2e8f0] dark:bg-navy-700 dark:border-white/5">
            <div className="w-7 h-7 rounded-full bg-[#388add]/20 flex items-center justify-center text-xs font-bold text-[#388add] shrink-0 dark:bg-blue-darker dark:text-blue-light">
              {getInitials(user)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#1a202c] truncate dark:text-white">{displayName}</p>
              <p className="text-xs text-[#a0aec0] truncate dark:text-white/30">
                {isAdmin ? 'Administrator' : 'Member'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-[#a0aec0] hover:text-red-500 transition-colors shrink-0 dark:text-white/30 dark:hover:text-red-400"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Theme toggle in sidebar (mobile) */}
          <button
            onClick={toggleTheme}
            className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-[#4a5568] hover:text-[#1a202c] hover:bg-[#f7fafc] transition-colors dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5 lg:hidden"
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </aside>
    </>
  )
}