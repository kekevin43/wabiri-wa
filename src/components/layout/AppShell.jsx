import { useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  const location = useLocation()
  const isWhatsAppLayout = location.pathname === '/inbox'

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--bg)', overflow: 'hidden' }}>
      <Sidebar />
      <main style={{ 
        flex: 1, display: 'flex', flexDirection: 'column', 
        overflowY: isWhatsAppLayout ? 'hidden' : 'auto', 
        background: 'var(--bg)',
        padding: isWhatsAppLayout ? 0 : '32px 36px'
      }}>
        {children}
      </main>
    </div>
  )
}
