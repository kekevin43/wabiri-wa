import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, Megaphone,
  Send, LogOut, Zap, MessageSquare, Users
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'

const NAV = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inbox',     icon: MessageSquare,    label: 'Shared Inbox' },
  { to: '/contacts',  icon: Users,           label: 'Contact List' },
  { to: '/instances',  icon: Smartphone,      label: 'Instances'  },
  { to: '/campaigns',  icon: Megaphone,        label: 'Campaigns'  },
  { to: '/send',       icon: Send,             label: 'Bulk Send'  },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <aside style={{
      width: 260,
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '24px 0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '0 24px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'var(--accent)', display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} color="#FFF" strokeWidth={2.5} />
          </div>
          <span style={{
            fontFamily: 'Syne', fontWeight: 800, fontSize: 20,
            letterSpacing: '-0.5px', color: 'var(--text)'
          }}>
            WaBiri
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px', borderRadius: 10,
                background: isActive ? 'var(--accent-glow)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: 15,
                fontFamily: 'Outfit',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--text)'; e.currentTarget.style.background = 'var(--surface2)' } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' } }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '0 16px' }}>
        <div
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
            color: 'var(--muted)', fontSize: 15, fontFamily: 'Outfit', fontWeight: 500,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(244,63,94,0.1)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={18} strokeWidth={2} />
          Sign Out
        </div>
      </div>
    </aside>
  )
}
