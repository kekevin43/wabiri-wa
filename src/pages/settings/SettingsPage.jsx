import { useState } from 'react'
import { User, Users, Bell, Shield, PaintBucket, Monitor, LogOut, CheckCircle2 } from 'lucide-react'
import { Card, Button, Input, PageHeader } from '../../components/ui'
import { useAuth } from '../../lib/AuthContext'

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')
  const [profileName, setProfileName] = useState(user?.email?.split('@')[0] || 'Sales Agent')
  
  const TABS = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'team', icon: Users, label: 'Team Members' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'security', icon: Shield, label: 'Security' },
    { id: 'appearance', icon: PaintBucket, label: 'Appearance' },
  ]

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      {/* Settings Navigation */}
      <div style={{ 
        width: 320, borderRight: '1px solid var(--border)', background: 'var(--surface)',
        display: 'flex', flexDirection: 'column' 
      }}>
        <div style={{ padding: '24px 24px 12px' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Settings</h1>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', padding: '12px', gap: 4 }}>
          {TABS.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                borderRadius: 8, cursor: 'pointer', transition: 'background 0.2s',
                background: activeTab === tab.id ? 'var(--surface2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--text-muted)',
                fontWeight: activeTab === tab.id ? 600 : 500
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <tab.icon size={20} />
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      {/* Settings Content */}
      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        
        {activeTab === 'profile' && (
          <div style={{ maxWidth: 600 }} className="fade-up">
            <PageHeader title="Profile" subtitle="Manage your personal account details" />
            
            <Card style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ 
                    width: 80, height: 80, borderRadius: '50%', background: 'var(--accent)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 24, fontWeight: 700
                  }}>
                    {profileName.charAt(0).toUpperCase()}
                  </div>
                  <Button variant="ghost">Change Avatar</Button>
               </div>
               
               <div style={{ display: 'grid', gap: 16 }}>
                 <Input label="Display Name" value={profileName} onChange={(e) => setProfileName(e.target.value)} />
                 <Input label="Email Address" value={user?.email || ''} readOnly style={{ opacity: 0.7 }} />
                 <Input label="About / Bio" defaultValue="Real Estate Specialist at WaBiri" />
               </div>

               <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <Button>Save Changes</Button>
               </div>
            </Card>
          </div>
        )}

        {activeTab === 'team' && (
          <div style={{ maxWidth: 640 }} className="fade-up">
            <PageHeader title="Team Members" subtitle="Manage access for your sales agents" />
            
            <Card style={{ marginBottom: 24 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Workspace Users</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>You currently have 3 active seats.</p>
                  </div>
                  <Button size="sm">Invite Member</Button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                  {[
                    { name: 'You (Admin)', email: user?.email, role: 'Owner' },
                    { name: 'Sarah M.', email: 'sarah@example.com', role: 'Agent' },
                    { name: 'Dennis K.', email: 'dennis@example.com', role: 'Agent' }
                  ].map((member, i) => (
                    <div key={i} style={{ 
                      padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: i !== 2 ? '1px solid var(--border)' : 'none', background: 'var(--surface)'
                    }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                             <User size={18} color="var(--text-muted)" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name}</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                          </div>
                       </div>
                       <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 13, background: 'var(--surface2)', padding: '4px 10px', borderRadius: 6 }}>{member.role}</span>
                          <Button variant="ghost" size="sm" style={{ color: 'var(--danger)' }}>Remove</Button>
                       </div>
                    </div>
                  ))}
               </div>
            </Card>

            <div style={{ padding: '16px', background: 'rgba(59,130,246,0.05)', borderRadius: 8, border: '1px solid rgba(59,130,246,0.1)', display: 'flex', gap: 12 }}>
               <Monitor size={20} color="var(--info)" />
               <div style={{ fontSize: 14, color: 'var(--text)' }}>
                 <strong>Pro Tip:</strong> By default, agents can only see their own assigned chats in the Inbox. Owners can view all conversations across the workspace.
               </div>
            </div>
          </div>
        )}
        
        {activeTab === 'appearance' && (
          <div style={{ maxWidth: 600 }} className="fade-up">
             <PageHeader title="Appearance" subtitle="Customize the look of WaBiri Workspace" />
             <Card>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                   <div>
                     <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Theme Preference</h3>
                     <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 13 }}>Switch between Light and Dark mode.</p>
                   </div>
                   <div style={{ color: 'var(--text-muted)' }}>
                      Use the Moon icon in the bottom left sidebar to toggle globally.
                   </div>
                </div>
             </Card>
          </div>
        )}

        {(activeTab === 'notifications' || activeTab === 'security') && (
          <div style={{ maxWidth: 600 }} className="fade-up">
            <PageHeader title={TABS.find(t => t.id === activeTab).label} subtitle="Advanced configuration" />
            <Card>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <Shield size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
                  <p>These settings are secured and managed by your Supabase backend.</p>
               </div>
            </Card>
          </div>
        )}

      </div>
    </div>
  )
}
