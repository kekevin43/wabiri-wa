import { Send, Smartphone, Megaphone, CheckCircle, Clock, TrendingUp, MessageSquare, ShieldCheck, Download } from 'lucide-react'
import { StatCard, Card, Badge, PageHeader, Button } from '../../components/ui'
import { useAuth } from '../../lib/AuthContext'
import { evolution } from '../../lib/evolution'
import { useState, useEffect } from 'react'

const RECENT_CAMPAIGNS = []

const STATUS_COLOR = { completed: 'accent', running: 'info', draft: 'muted', failed: 'danger' }

export default function DashboardPage() {
  const { user } = useAuth()
  const [instances, setInstances] = useState(0)
  const [simMsgCount, setSimMsgCount] = useState(0)

  useEffect(() => {
    // Real Data: Fetch instance count
    evolution.listInstances().then(data => {
      setInstances(data?.length || 0)
    }).catch(() => setInstances(0))
  }, [])

  const downloadReport = () => {
    const reportData = "Wabiri Technologies Analytics Report\n" + 
      "Date: " + new Date().toLocaleDateString() + "\n" +
      "Total Messages: " + simMsgCount.toLocaleString() + "\n" +
      "Active Instances: " + instances + "\n" +
      "System Status: ONLINE";
    const blob = new Blob([reportData], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Wabiri_System_Report.txt';
    link.direction = 'ltr';
    link.click();
  }

  return (
    <div className="fade-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <PageHeader
          title="Overview"
          subtitle={`Control center for ${user?.email || 'sales workspace'}`}
          style={{ marginBottom: 0 }}
        />
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={downloadReport}><Download size={14} /> Download Report</Button>
          <Button size="sm" onClick={() => window.location.href='/campaigns'}>Launch Campaign</Button>
        </div>
      </div>

      {/* Hero Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
        <StatCard label="Total Messages"      value={simMsgCount.toLocaleString()} icon={Send}        color="accent"   delta={0}  />
        <StatCard label="Live Instances"      value={instances.toString().padStart(2, '0')}    icon={Smartphone}  color="info"                />
        <StatCard label="Avg. Deliverability" value="0%"  icon={ShieldCheck} color="accent"   delta={0} />
        <StatCard label="Avg. Response Time"  value="0m"   icon={Clock}       color="warning"  delta={0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
        {/* Main Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
               <div style={{ fontSize: 16, fontFamily: 'Syne', fontWeight: 700 }}>Recent Campaigns</div>
               <Badge color="info">Last 30 days</Badge>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr>
                  {['Campaign', 'Status', 'Sent', 'Delivered', 'Date'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', padding: '12px',
                      color: 'var(--muted)', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em',
                      borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECENT_CAMPAIGNS.length > 0 ? RECENT_CAMPAIGNS.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)' }}>
                    <td style={{ padding: '16px 12px', fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                    <td style={{ padding: '16px 12px' }}>
                      <Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge>
                    </td>
                    <td style={{ padding: '16px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--muted)' }}>{c.sent.toLocaleString()}</td>
                    <td style={{ padding: '16px 12px', fontFamily: 'JetBrains Mono', fontSize: 13, color: 'var(--accent)' }}>{c.delivered.toLocaleString()}</td>
                    <td style={{ padding: '16px 12px', color: 'var(--muted)', fontSize: 13 }}>{c.date}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                      No recent campaigns
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
             <Card style={{ background: 'var(--accent)', color: '#fff', border: 'none' }}>
                <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 8 }}>Ready to scale?</div>
                <div style={{ fontSize: 20, fontFamily: 'Syne', fontWeight: 700, marginBottom: 16 }}>Automate your land sales outreach.</div>
                <Button variant="ghost" onClick={() => window.location.href='/campaigns'} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff' }}>Explore Templates</Button>
             </Card>
             <Card>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                   <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <MessageSquare size={20} color="var(--accent)" />
                   </div>
                   <div>
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>Inbox Activity</div>
                      <div style={{ fontWeight: 700, fontSize: 18 }}>0 New Messages</div>
                   </div>
                </div>
             </Card>
          </div>
        </div>

        {/* Sidebar Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Card>
            <div style={{ fontSize: 15, fontFamily: 'Syne', fontWeight: 700, marginBottom: 20 }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'New Campaign',     icon: Megaphone,   href: '/campaigns' },
                { label: 'Bulk Send',        icon: Send,        href: '/send'      },
                { label: 'Check Inbox',      icon: MessageSquare, href: '/inbox'      },
              ].map(({ label, icon: Icon, href }) => (
                <a key={label} href={href} style={{ textDecoration: 'none' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 16px', borderRadius: 12,
                    background: 'var(--surface2)', color: 'var(--text)',
                    fontSize: 14, fontWeight: 500, transition: 'all 0.2s',
                    border: '1px solid transparent'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--surface)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'var(--surface2)' }}
                  >
                    <Icon size={16} color="var(--accent)" strokeWidth={2} />
                    {label}
                  </div>
                </a>
              ))}
            </div>
          </Card>

          <Card>
            <div style={{ fontSize: 15, fontFamily: 'Syne', fontWeight: 700, marginBottom: 18 }}>Engine Status</div>
            {[
              { label: 'WhatsApp Bridge',  ok: true },
              { label: 'Contact Workers',  ok: true },
            ].map(({ label, ok }) => (
              <div key={label} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14, fontSize: 13,
              }}>
                <span style={{ color: 'var(--muted)', fontWeight: 500 }}>{label}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: ok ? 'var(--accent)' : 'var(--danger)', fontWeight: 600 }}>
                  <span className={ok ? 'pulse-dot' : ''} style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: ok ? 'var(--accent)' : 'var(--danger)', display: 'inline-block'
                  }} />
                  {ok ? 'Active' : 'Offline'}
                </span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
