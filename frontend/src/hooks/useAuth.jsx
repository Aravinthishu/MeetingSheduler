import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('user')
      const token = localStorage.getItem('token')
      // Only restore user if token also exists
      if (stored && token) return JSON.parse(stored)
      return null
    } catch {
      return null
    }
  })

  // On mount, verify the stored token is still valid with the server
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      return
    }
    // Quietly verify — if 401, clear everything
    api.get('/auth/me/')
      .then(res => {
        // Update user data from server in case is_staff changed etc.
        const freshUser = res.data
        localStorage.setItem('user', JSON.stringify(freshUser))
        setUser(freshUser)
      })
      .catch(err => {
        if (err.response?.status === 401) {
          console.warn('[Auth] Token invalid on mount — clearing session')
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          setUser(null)
        }
        // Network error — keep existing user state, don't force logout
      })
  }, [])

  const login = useCallback(async (username, password) => {
    const res = await api.post('/auth/login/', { username, password })
    const { token, user: userData } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }, [])

  const logout = useCallback(async () => {
    try { await api.post('/auth/logout/') } catch {}
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{
      user,
      isAdmin: user?.is_staff === true,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}