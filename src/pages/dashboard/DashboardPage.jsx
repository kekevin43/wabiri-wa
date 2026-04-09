import { Send, Smartphone, Megaphone, CheckCircle, Clock, TrendingUp, MessageSquare, ShieldCheck, Download, Users, Loader2 } from 'lucide-react'
import { StatCard, Card, Badge, PageHeader, Button } from '../../components/ui'
import { useAuth } from '../../lib/AuthContext'
import { evolution } from '../../lib/evolution'
import { supabase } from '../../lib/supabase'
import { useState, useEffect, useCallback } from 'react'

const STATUS_COLOR = { completed: 'accent', running: 'info', draft: 'muted', failed: 'danger' }

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    contacts: 0,
    instances: 0,
    campaigns: [],
    totalSent: 0,
    totalDelivered: 0,
    loading: true
  })

  const loadStats = useCallback(async () => {
    if (!user) return
    setStats(prev => ({ ...prev, loading: true }))
    try {
      // 1. Fetch Instances
      const instRes = await evolution.listInstances()
      const instRaw = Array.isArray(instRes) ? instRes : (instRes?.instances || [])
      const liveCount = instRaw.filter(i => {
        const info = i.instance || i
        return ['open', 'CONNECTED', 'connected'].includes(info.connectionStatus || info.state || info.status || '')
      }).length

      // 2. Fetch Contacts
      const { count: contactCount } = await supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)

      // 3. Fetch Recent Campaigns
      const { data: camps } = await supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      
      // 4. Calculate Aggregate Stats
      let sent = 0; let delivered = 0
      const { data: allCamps } = await supabase.from('campaigns').select('stats').eq('user_id', user.id)
      allCamps?.forEach(c => {
         sent += (c.stats?.sent || 0)
         delivered += (c.stats?.delivered || 0)
      })

      setStats({
        contacts: contactCount || 0,
        instances: liveCount,
        campaigns: camps || [],
        totalSent: sent,
        totalDelivered: delivered,
        loading: false
      })
    } catch (e) {
      console.error('Dash error', e)
      setStats(p => ({ ...p, loading: false }))
    }
  }, [user])

  useEffect(() => { loadStats() }, [loadStats])

  const deliverability = stats.totalSent > 0 ? Math.round((stats.totalDelivered / stats.totalSent) * 100) : 0

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <PageHeader title="Overview" subtitle={`Welcome back, ${user?.email?.split('@')[0] || 'Member'}`} style={{ marginBottom: 0 }} />
        <div style={{ display: 'flex', gap: 12 }}>
           <Button variant="ghost" size="sm" onClick={loadStats} disabled={stats.loading}>{stats.loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />} Refresh Stats</Button>
           <Button size="sm" onClick={() => window.location.href='/campaigns'}>Launch Campaign</Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <StatCard label="Total Sent" value={stats.totalSent.toLocaleString()} icon={Send} color="accent" delta={stats.totalSent > 0 ? 12 : 0} />
        <StatCard label="Live Devices" value={stats.instances.toString().padStart(2, '0')} icon={Smartphone} color="info" />
        <StatCard label="Total Contacts" value={stats.contacts.toLocaleString()} icon={Users} color="accent" />
        <StatCard label="Deliverability" value={`${deliverability}%`} icon={ShieldCheck} color="accent" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <div style={{ fontSize: 16, fontFamily: 'Syne', fontWeight: 700 }}>Recent Campaigns</div>
               <Badge color="info">Last Activities</Badge>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>{['Campaign', 'Status', 'Sent', 'Delivered', 'Progress'].map(h => (<th key={h} style={{ textAlign: 'left', padding: '12px', color: 'var(--muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>{h}</th>))}</tr>
              </thead>
              <tbody>
                {stats.campaigns.length > 0 ? stats.campaigns.map(c => (
                  <tr key={c.id}>
                    <td style={{ padding: '16px 12px', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '16px 12px' }}><Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge></td>
                    <td style={{ padding: '16px 12px', fontFamily: 'JetBrains Mono', fontSize: 13 }}>{c.stats?.sent || 0}</td>
                    <td style={{ padding: '16px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent)' }}>{c.stats?.delivered || 0}</td>
                    <td style={{ padding: '16px 12px' }}>
                       <div style={{ width: 60, height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--accent)', width: `${c.stats?.sent > 0 ? (c.stats?.delivered / c.stats?.sent) * 100 : 0}%` }} />
                       </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No campaigns yet.</td></tr>)}
              </tbody>
            </table>
          </Card>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
             <Card style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>Growth Tip</div>
                <div style={{ fontSize: 18, fontFamily: 'Syne', fontWeight: 700, marginBottom: 16 }}>Use tags to target specialized segments.</div>
                <Button variant="ghost" onClick={() => window.location.href='/contacts'} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>Tag Contacts</Button>
             </Card>
             <Card>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                   <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><MessageSquare size={20} color="var(--accent)" /></div>
                   <div><div style={{ fontSize: 13, color: 'var(--muted)' }}>Quick Access</div><div style={{ fontWeight: 700, fontSize: 16 }}>Check Messages</div></div>
                </div>
             </Card>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ fontSize: 15, fontFamily: 'Syne', fontWeight: 700, marginBottom: 20 }}>Shortcuts</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ label: 'New Campaign', icon: Megaphone, href: '/campaigns' }, { label: 'Bulk Send', icon: Send, href: '/send' }, { label: 'Audit Contacts', icon: Users, href: '/contacts' }].map(({ label, icon: Icon, href }) => (
                <a key={label} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: 'var(--surface2)', color: 'var(--text)', fontSize: 14, fontWeight: 500, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                    <Icon size={16} color="var(--accent)" /> {label}
                  </div>
                </a>
              ))}
            </div>
          </Card>
          <Card>
            <div style={{ fontSize: 15, fontFamily: 'Syne', fontWeight: 700, marginBottom: 18 }}>System Health</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>WhatsApp Proxy</span>
               <span style={{ color: stats.loading ? 'var(--muted)' : 'var(--accent)', fontWeight: 700 }}>
                 {stats.loading ? <Loader2 size={12} className="animate-spin" /> : 'Active'}
               </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14, fontSize: 13 }}>
              <span style={{ color: 'var(--muted)' }}>Database Link</span>
               <span style={{ color: stats.loading ? 'var(--muted)' : 'var(--accent)', fontWeight: 700 }}>
                 {stats.loading ? <Loader2 size={12} className="animate-spin" /> : 'Active'}
               </span>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
