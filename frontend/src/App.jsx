import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './hooks/useAuth.jsx'
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

const qc = new QueryClient()

function ProtectedLayout({ children, title, subtitle }) {
  const token = localStorage.getItem('token')
  if (!token) return <Navigate to="/login" replace />
  return (
    <div className="flex min-h-screen bg-navy-900">
      <Sidebar />
      <div className="flex-1 ml-56 min-h-screen flex flex-col">
        <TopBar title={title} subtitle={subtitle} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  )
}

const routes = [
  { path: '/', element: <Dashboard />, title: 'Dashboard', subtitle: 'Live room overview' },
  { path: '/book', element: <BookMeeting />, title: 'Book a Meeting', subtitle: 'Reserve the room' },
  { path: '/meetings', element: <MeetingList />, title: 'All Meetings', subtitle: 'Browse & filter' },
  { path: '/meetings/:id', element: <MeetingDetail />, title: 'Meeting Details', subtitle: 'Full details & actions' },
  { path: '/calendar', element: <Calendar />, title: 'Calendar', subtitle: 'Monthly view' },
  { path: '/analytics', element: <Analytics />, title: 'Analytics', subtitle: 'Usage insights' },
  { path: '/admin', element: <Admin />, title: 'Admin Panel', subtitle: 'Manage teams & users' },
]

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            {routes.map(({ path, element, title, subtitle }) => (
              <Route
                key={path}
                path={path}
                element={
                  <ProtectedLayout title={title} subtitle={subtitle}>
                    {element}
                  </ProtectedLayout>
                }
              />
            ))}
          </Routes>
            <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#111d35',
                border: '1px solid rgba(56,138,221,0.2)',
                color: '#e8f1fb',
                fontSize: '13px',
              },
            }}
          />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}