import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Smartphone, Megaphone,
  Send, LogOut, MessageSquare, Users, Moon, Sun, Settings
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import WabiriLogo from '../WabiriLogo'

const NAV = [
  { to: '/inbox',      icon: MessageSquare,    label: 'Chats' },
  { to: '/dashboard',  icon: LayoutDashboard,  label: 'Dashboard' },
  { to: '/contacts',   icon: Users,            label: 'Contacts' },
  { to: '/campaigns',  icon: Megaphone,        label: 'Campaigns'  },
  { to: '/send',       icon: Send,             label: 'Bulk Send'  },
  { to: '/instances',  icon: Smartphone,       label: 'Devices'  },
]

export default function Sidebar() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState(document.documentElement.getAttribute('data-theme') || 'light')

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
    document.documentElement.setAttribute('data-theme', newTheme)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/auth')
  }

  return (
    <aside style={{
      width: 64,
      height: '100vh',
      background: 'var(--surface2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '16px 0',
      flexShrink: 0,
      zIndex: 50
    }}>
      <div style={{ marginBottom: 20 }}>
         <WabiriLogo size={36} />
      </div>
      {/* Tops Items */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', position: 'relative' }} title={label}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 40, height: 40, borderRadius: '50%',
                background: isActive ? 'var(--surface)' : 'transparent',
                color: isActive ? 'var(--text)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
              >
                {isActive && (
                  <div style={{ position: 'absolute', left: -12, top: '50%', transform: 'translateY(-50%)', width: 4, height: 20, background: 'var(--accent)', borderTopRightRadius: 4, borderBottomRightRadius: 4 }} />
                )}
                <Icon size={22} fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={isActive ? 0 : 2} />
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
        <NavLink to="/settings" style={{ textDecoration: 'none' }} title="Settings">
          {({ isActive }) => (
            <div style={{ 
              width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: isActive ? 'var(--surface)' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' 
            }}
            onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text)' }}
            onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <Settings size={22} fill={isActive ? 'currentColor' : 'none'} stroke={isActive ? 'none' : 'currentColor'} strokeWidth={isActive ? 0 : 2} />
            </div>
          )}
        </NavLink>

        <div 
          onClick={toggleTheme}
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          title="Toggle Theme"
        >
          {theme === 'light' ? <Moon size={22} /> : <Sun size={22} />}
        </div>
        
        <div 
          onClick={handleSignOut}
          style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          title="Sign Out"
        >
          <LogOut size={22} />
        </div>
        
        {/* Profile Avatar placeholder */}
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>
           ME
        </div>
      </div>
    </aside>
  )
}
