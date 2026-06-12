import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../api/client'
import toast from 'react-hot-toast'
import { CalendarDays, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!form.username || !form.password) return toast.error('Fill in all fields')
    setLoading(true)
    try {
      const res = await authApi.login(form)
      localStorage.setItem('token', res.data.token)
      toast.success('Welcome back!')
      navigate('/')
    } catch {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      {/* Background grid decoration */}
      <div className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(56,138,221,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(56,138,221,0.03) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />

      <div className="w-full max-w-sm animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-dark rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-primary/30 shadow-lg shadow-blue-primary/10">
            <CalendarDays size={24} className="text-blue-light" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MeetSync</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to your workspace</p>
        </div>

        {/* Form card */}
        <div className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Username</label>
            <input
              className="input-base"
              placeholder="Enter your username"
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">Password</label>
            <div className="relative">
              <input
                className="input-base pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-dark hover:bg-blue-primary text-blue-lighter text-sm font-semibold transition-all duration-200 active:scale-98 disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
          >
            {loading && <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />}
            Sign In
          </button>
        </div>

        <p className="text-center text-xs text-white/20 mt-6">
          MeetSync · Room Booking System
        </p>
      </div>
    </div>
  )
}