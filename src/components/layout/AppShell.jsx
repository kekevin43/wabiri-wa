import Sidebar from './Sidebar'

export default function AppShell({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        {children}
      </main>
    </div>
  )
}
