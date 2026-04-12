import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import AppShell from './components/layout/AppShell'
import LoginPage from './pages/auth/LoginPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import InstancesPage from './pages/instances/InstancesPage'
import CampaignsPage from './pages/campaigns/CampaignsPage'
import BulkSendPage from './pages/send/BulkSendPage'
import InboxPage from './pages/inbox/InboxPage'
import ContactsPage from './pages/contacts/ContactsPage'
import SettingsPage from './pages/settings/SettingsPage'
import LandingPage from './pages/LandingPage'
import SignUpPage from './pages/auth/SignUpPage'
import { useState, useEffect } from 'react'

function GlobalToast() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const originalAlert = window.alert
    window.alert = (message) => {
      const id = Date.now() + Math.random()
      setToasts(p => [...p, { id, message: String(message) }])
      setTimeout(() => {
        setToasts(p => p.filter(t => t.id !== id))
      }, 4000)
    }
    return () => { window.alert = originalAlert }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px', boxShadow: '0 12px 40px rgba(0,0,0,0.3)', color: 'var(--text)', fontSize: 14, minWidth: 280, maxWidth: 400, animation: 'fade-down 0.3s ease-out' }}>
          {t.message}
        </div>
      ))}
    </div>
  )
}
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)' }}>
      Loading...
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<LoginPage />} />
      <Route path="/signup" element={<SignUpPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>} />
      <Route path="/instances" element={<ProtectedRoute><AppShell><InstancesPage /></AppShell></ProtectedRoute>} />
      <Route path="/campaigns" element={<ProtectedRoute><AppShell><CampaignsPage /></AppShell></ProtectedRoute>} />
      <Route path="/send" element={<ProtectedRoute><AppShell><BulkSendPage /></AppShell></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><AppShell><InboxPage /></AppShell></ProtectedRoute>} />
      <Route path="/contacts" element={<ProtectedRoute><AppShell><ContactsPage /></AppShell></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppShell><SettingsPage /></AppShell></ProtectedRoute>} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <GlobalToast />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
