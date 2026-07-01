// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { ThemeProvider, useTheme } from './context/ThemeContext.jsx'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Dashboard from './pages/Dashboard'
import BookMeeting from './pages/BookMeeting'
import MeetingList from './pages/MeetingList'
import MeetingDetail from './pages/MeetingDetail'
import Calendar from './pages/Calendar'
import Analytics from './pages/Analytics'
import Admin from './pages/Admin'
import Login from './pages/Login'

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      // Don't retry 401s — they won't succeed without re-login
      retry: (failureCount, error) => {
        if (error?.response?.status === 401) return false
        if (error?.response?.status === 403) return false
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
      // Don't keep refetching if unauthorized
      refetchOnReconnect: (query) => query.state.status !== 'error',
    },
  },
})

// Must be inside <AuthProvider> to use useAuth()
function ProtectedLayout({ children, title, subtitle }) {
  const { user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] dark:bg-navy-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col min-h-screen lg:ml-56">
        <TopBar
          title={title}
          subtitle={subtitle}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}

function AdminRoute({ children }) {
  const { user, isAdmin } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

// All routes that need auth context live here — inside AuthProvider
function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route path="/" element={
        <ProtectedLayout title="Dashboard" subtitle="Live room overview">
          <Dashboard />
        </ProtectedLayout>
      } />
      <Route path="/book" element={
        <ProtectedLayout title="Book a Meeting" subtitle="Reserve the room">
          <BookMeeting />
        </ProtectedLayout>
      } />
      <Route path="/meetings" element={
        <ProtectedLayout title="All Meetings" subtitle="Browse & filter">
          <MeetingList />
        </ProtectedLayout>
      } />
      <Route path="/meetings/:id" element={
        <ProtectedLayout title="Meeting Details" subtitle="Full details & actions">
          <MeetingDetail />
        </ProtectedLayout>
      } />
      <Route path="/calendar" element={
        <ProtectedLayout title="Calendar" subtitle="Monthly view">
          <Calendar />
        </ProtectedLayout>
      } />
      <Route path="/analytics" element={
        <ProtectedLayout title="Analytics" subtitle="Usage insights">
          <Analytics />
        </ProtectedLayout>
      } />

      {/* Admin only */}
      <Route path="/admin" element={
        <AdminRoute>
          <ProtectedLayout title="Admin Panel" subtitle="Manage teams, rooms & users">
            <Admin />
          </ProtectedLayout>
        </AdminRoute>
      } />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <AppRoutes />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#1a202c',
                  fontSize: '13px',
                },
                success: {
                  style: {
                    background: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                  },
                },
                error: {
                  style: {
                    background: '#fef2f2',
                    border: '1px solid #fca5a5',
                    color: '#991b1b',
                  },
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}