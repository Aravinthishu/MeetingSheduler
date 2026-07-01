import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'
import { CalendarDays, Eye, EyeOff, Shield } from 'lucide-react'

export default function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  // Already logged in → go home
  if (user) return <Navigate to="/" replace />

  const handleLogin = async () => {
    if (!form.username.trim()) return toast.error('Enter your username')
    if (!form.password) return toast.error('Enter your password')

    setLoading(true)
    try {
      await login(form.username.trim(), form.password)
      toast.success('Welcome back!')
      navigate('/', { replace: true })
    } catch (err) {
      console.log("err", err)
      const msg = err.response?.data?.error
        || err.response?.data?.non_field_errors?.[0]
        || 'Invalid username or password'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center p-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 pointer-events-none opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(56,138,221,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,138,221,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow blob */}
      <div
        className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(56,138,221,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-blue-dark rounded-2xl flex items-center justify-center mb-4 ring-1 ring-blue-primary/30 shadow-xl shadow-blue-primary/10">
            <CalendarDays size={24} className="text-blue-light" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MeetEZ</h1>
          <p className="text-sm text-white/40 mt-1">Sign in to your workspace</p>
        </div>

        {/* Card */}
        <div className="card p-6 space-y-4">
          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Username
            </label>
            <input
              className="input-base"
              placeholder="Enter your username"
              autoComplete="username"
              autoFocus
              value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-white/50 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                className="input-base pr-10"
                type={showPw ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-dark hover:bg-blue-primary text-blue-lighter text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </div>

        <p className="text-center text-xs text-white/20 mt-6 flex items-center justify-center gap-1.5">
          <Shield size={11} />
          MeetEZ · Secure Room Booking
        </p>
      </div>
    </div>
  )
}