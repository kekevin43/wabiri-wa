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

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--muted)' }}>
      Loading...
    </div>
  )
  // Auth guard — uncomment when Supabase is wired:
  // if (!user) return <Navigate to="/auth" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<LoginPage />} />
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
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
