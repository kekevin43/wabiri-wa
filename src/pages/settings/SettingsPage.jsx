import { useState, useEffect, useCallback } from 'react'
import { User, Users, Bell, Shield, PaintBucket, Monitor, Loader2, CheckCircle2, UserPlus, Trash2, Mail, RefreshCw } from 'lucide-react'
import { Card, Button, Input, PageHeader, Badge } from '../../components/ui'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabase'
import { evolution } from '../../lib/evolution'

const TABS = [
  { id: 'profile',       icon: User,        label: 'Profile' },
  { id: 'team',          icon: Users,       label: 'Team Members' },
  { id: 'notifications', icon: Bell,        label: 'Notifications' },
  { id: 'security',      icon: Shield,      label: 'Security' },
  { id: 'appearance',    icon: PaintBucket, label: 'Appearance' },
]

export default function SettingsPage() {
  const { user, signOut } = useAuth()
  const [activeTab, setActiveTab] = useState('profile')

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%' }}>
      <div style={{ width: 280, borderRight: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '28px 24px 12px' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Settings</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', padding: '8px 12px', gap: 2 }}>
          {TABS.map(tab => (
            <div
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
                borderRadius: 8, cursor: 'pointer', transition: 'background 0.15s',
                background: activeTab === tab.id ? 'var(--surface2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: activeTab === tab.id ? 600 : 400, fontSize: 14,
              }}
              onMouseEnter={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'var(--surface2)' }}
              onMouseLeave={e => { if (activeTab !== tab.id) e.currentTarget.style.background = 'transparent' }}
            >
              <tab.icon size={18} />
              {tab.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        {activeTab === 'profile'       && <ProfileSection user={user} />}
        {activeTab === 'team'          && <TeamSection user={user} />}
        {activeTab === 'notifications' && <PlaceholderSection title="Notifications" icon={Bell} msg="Notification preferences will be available soon." />}
        {activeTab === 'security'      && <SecuritySection user={user} signOut={signOut} />}
        {activeTab === 'appearance'    && <AppearanceSection />}
      </div>
    </div>
  )
}

// ── Profile ──────────────────────────────────────────────────────────────────
function ProfileSection({ user }) {
  const meta = user?.user_metadata || {}
  const [displayName, setDisplayName] = useState(meta.full_name || meta.name || user?.email?.split('@')[0] || '')
  const [bio, setBio] = useState(meta.bio || '')
  const [avatarUrl, setAvatarUrl] = useState(meta.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(null)

  const fetchWhatsAppProfile = useCallback(async () => {
    setSyncing(true)
    try {
      const res = await evolution.listInstances()
      const list = Array.isArray(res) ? res : (res?.instances || [])
      const connected = list.find(i => {
        const info = i.instance || i
        const s = info.connectionStatus || info.state || info.status || ''
        return ['open', 'CONNECTED', 'connected'].includes(s)
      })
      
      if (!connected) throw new Error('No connected WhatsApp device found to sync from.')
      
      const info = connected.instance || connected
      const myNumber = info.owner || info.ownerJid?.split('@')[0] || info.number
      if (!myNumber) throw new Error('Could not identify your WhatsApp number.')
      
      const picRes = await evolution.fetchProfilePicture(info.instanceName || info.name, myNumber)
      const url = picRes?.profilePictureUrl || picRes?.url
      if (url) {
        setAvatarUrl(url)
        // Auto-save to Supabase
        await supabase.auth.updateUser({ data: { avatar_url: url } })
      } else {
        alert('No profile picture found on WhatsApp.')
      }
    } catch (e) {
      alert(e.message)
    } finally {
      setSyncing(false)
    }
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { error: err } = await supabase.auth.updateUser({
        data: { full_name: displayName, bio, avatar_url: avatarUrl },
      })
      if (err) throw err
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const initial = (displayName || user?.email || '?').charAt(0).toUpperCase()

  return (
    <div style={{ maxWidth: 560 }} className="fade-up">
      <PageHeader title="Profile" subtitle="Your account identity across Wabiri" />

      <Card style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%', overflow: 'hidden',
              background: 'var(--accent)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 800, fontFamily: 'Syne', flexShrink: 0,
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)', border: '3px solid var(--surface2)'
            }}>
              {avatarUrl ? <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
            </div>
            <button 
              onClick={fetchWhatsAppProfile}
              disabled={syncing}
              title="Sync from WhatsApp"
              style={{ 
                position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, 
                borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                color: 'var(--accent)', boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
              }}
            >
              {syncing ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />}
            </button>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{displayName || '(unnamed)'}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{user?.email}</div>
            <div style={{ marginTop: 10 }}>
               <Badge color="accent">Active Account</Badge>
            </div>
          </div>
        </div>

        {error && <div style={{ padding: 12, background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 13 }}>{error}</div>}

        <div style={{ display: 'grid', gap: 16 }}>
          <Input label="Display Name" value={displayName} onChange={e => setDisplayName(e.target.value)} />
          <Input label="Email Address" value={user?.email || ''} readOnly style={{ opacity: 0.6, cursor: 'not-allowed' }} />
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>About / Bio</label>
            <textarea
              value={bio} onChange={e => setBio(e.target.value)}
              placeholder="Tell your team about yourself…" rows={3}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)',
                color: 'var(--text)', fontSize: 14, resize: 'vertical', outline: 'none', fontFamily: 'Outfit', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
          {saved && <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)' }}><CheckCircle2 size={15} /> Saved!</span>}
          <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="animate-spin" size={14} />} Save Changes</Button>
        </div>
      </Card>
    </div>
  )
}

function TeamSection({ user }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [showInvite, setShowInvite] = useState(false)

  useEffect(() => {
    if (user) {
      const meta = user.user_metadata || {}
      setMembers([{
        id: user.id,
        name: meta.full_name || meta.name || user.email?.split('@')[0] || 'You',
        email: user.email,
        role: 'Owner',
        isYou: true,
        avatar: meta.avatar_url
      }])
    }
    setLoading(false)
  }, [user])

  const handleRemove = (id) => {
    if (!confirm('Remove this team member?')) return
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return
    setInviting(true)
    setTimeout(() => {
      alert(`Invite sent to ${inviteEmail}.`)
      setInviteEmail(''); setShowInvite(false); setInviting(false)
    }, 800)
  }

  return (
    <div style={{ maxWidth: 600 }} className="fade-up">
      <PageHeader title="Team Members" subtitle="Manage who has access to this workspace" />
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Workspace Users</h3>
            <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>{members.length} active seat</p>
          </div>
          <Button size="sm" onClick={() => setShowInvite(v => !v)}><UserPlus size={14} /> Invite Member</Button>
        </div>
        {showInvite && (
          <div style={{ padding: 16, background: 'var(--surface2)', borderRadius: 10, marginBottom: 18, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><Input label="Email address" placeholder="colleague@company.com" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} /></div>
            <Button onClick={handleInvite} disabled={inviting || !inviteEmail.trim()}>{inviting ? <Loader2 className="animate-spin" size={13} /> : <Mail size={13} />} Send Invite</Button>
            <Button variant="ghost" onClick={() => setShowInvite(false)}>Cancel</Button>
          </div>
        )}
        {loading ? <div style={{ padding: 24, textAlign: 'center' }}><Loader2 className="animate-spin" size={20} /></div> : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
            {members.map((member, i) => (
              <div key={member.id} style={{ padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: i !== members.length - 1 ? '1px solid var(--border)' : 'none', background: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', overflow: 'hidden', background: 'var(--accent-glow)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700 }}>
                    {member.avatar ? <img src={member.avatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{member.name} {member.isYou && <span style={{ fontSize: 11, color: 'var(--muted)' }}>(you)</span>}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{member.email}</div>
                  </div>
                </div>
                <Badge color={member.role === 'Owner' ? 'accent' : 'muted'}>{member.role}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function SecuritySection({ user, signOut }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const handlePasswordReset = async () => {
    setSending(true)
    try {
      await supabase.auth.resetPasswordForEmail(user?.email, { redirectTo: window.location.origin + '/reset-password' })
      setSent(true)
    } catch (e) { alert(e.message) }
    finally { setSending(false) }
  }
  return (
    <div style={{ maxWidth: 560 }} className="fade-up">
      <PageHeader title="Security" subtitle="Manage your account security" />
      <Card style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontWeight: 600 }}>Change Password</div><div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>We'll email a reset link to {user?.email}</div></div>
          {sent ? <span style={{ color: 'var(--accent)', fontSize: 13 }}>Reset email sent!</span> : <Button variant="ghost" onClick={handlePasswordReset} disabled={sending}>{sending && <Loader2 className="animate-spin" size={13} />} Send Reset Email</Button>}
        </div>
        <div style={{ height: 1, background: 'var(--border)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div><div style={{ fontWeight: 600, color: 'var(--danger)' }}>Sign Out</div><div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>Sign out of this browser session</div></div>
          <Button variant="ghost" onClick={signOut} style={{ color: 'var(--danger)' }}>Sign Out</Button>
        </div>
      </Card>
    </div>
  )
}

function AppearanceSection() {
  return (
    <div style={{ maxWidth: 560 }} className="fade-up">
      <PageHeader title="Appearance" subtitle="Customize WaBiri's look" />
      <Card><div><h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Theme</h3><p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Use the Moon / Sun icon in the sidebar to toggle Dark / Light mode.</p></div></Card>
    </div>
  )
}

function PlaceholderSection({ title, icon: Icon, msg }) {
  return (
    <div style={{ maxWidth: 560 }} className="fade-up">
      <PageHeader title={title} subtitle="Advanced configuration" />
      <Card><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', color: 'var(--muted)', gap: 12 }}><Icon size={40} strokeWidth={1} /><p style={{ margin: 0, fontSize: 14 }}>{msg}</p></div></Card>
    </div>
  )
}
