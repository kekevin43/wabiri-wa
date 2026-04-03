import { useState } from 'react'
import { Plus, Megaphone, Play, Pause, Eye, Trash2, Calendar, Users } from 'lucide-react'
import { Card, Badge, Button, PageHeader, Input, Textarea } from '../../components/ui'

const MOCK_CAMPAIGNS = [
  {
    id: 'c1', name: 'Ruaka Plots — April Promo', status: 'running',
    contacts: 850, sent: 430, delivered: 421, failed: 9,
    scheduled: null, created: 'Apr 1',
  },
  {
    id: 'c2', name: 'Syokimau Townhouses Launch', status: 'draft',
    contacts: 1200, sent: 0, delivered: 0, failed: 0,
    scheduled: 'Apr 5, 9:00 AM', created: 'Apr 2',
  },
  {
    id: 'c3', name: 'Q1 End — Listings Clearance', status: 'completed',
    contacts: 1240, sent: 1240, delivered: 1198, failed: 42,
    scheduled: null, created: 'Mar 28',
  },
]

const STATUS_COLOR = { running: 'info', draft: 'muted', completed: 'accent', paused: 'warning', failed: 'danger' }

function CampaignModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', message: '', instance: '', scheduledAt: '' })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100,
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px', width: 480,
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>New Campaign</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>
          Configure your bulk WhatsApp campaign
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Campaign Name" placeholder="e.g. April Ruaka Plots Promo"
            value={form.name} onChange={e => set('name', e.target.value)} />

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
              WhatsApp Instance
            </label>
            <select
              value={form.instance}
              onChange={e => set('instance', e.target.value)}
              style={{
                width: '100%', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '10px 14px', color: form.instance ? 'var(--text)' : 'var(--muted)',
                fontFamily: 'Outfit', fontSize: 14, outline: 'none',
              }}
            >
              <option value="" disabled>Select instance...</option>
              <option value="inst_1">Main Office (+254 712 345 678)</option>
              <option value="inst_2">Sales Team (+254 722 987 654)</option>
            </select>
          </div>

          <Textarea label="Message" placeholder="Write your WhatsApp message here. Use {{name}} for personalization."
            value={form.message} onChange={e => set('message', e.target.value)} style={{ minHeight: 120 }} />

          <Input label="Schedule (optional)" type="datetime-local"
            value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSave(form); onClose() }} disabled={!form.name || !form.message}>
              Create Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(MOCK_CAMPAIGNS)
  const [showModal, setShowModal] = useState(false)

  const handleSave = (form) => {
    setCampaigns(prev => [{
      id: `c${Date.now()}`, name: form.name, status: form.scheduledAt ? 'draft' : 'draft',
      contacts: 0, sent: 0, delivered: 0, failed: 0,
      scheduled: form.scheduledAt || null, created: 'Now',
    }, ...prev])
  }

  const deleteC = id => setCampaigns(prev => prev.filter(c => c.id !== id))

  return (
    <div className="fade-up">
      <PageHeader
        title="Campaigns"
        subtitle="Schedule and track your WhatsApp campaigns"
        action={<Button onClick={() => setShowModal(true)}><Plus size={15} /> New Campaign</Button>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campaigns.map(c => (
          <Card key={c.id} style={{ padding: '18px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 10, flexShrink: 0,
                background: 'rgba(34,197,94,0.08)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Megaphone size={18} color="var(--accent)" strokeWidth={2} />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontFamily: 'Syne', fontSize: 15 }}>{c.name}</span>
                  <Badge color={STATUS_COLOR[c.status]}>{c.status}</Badge>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 14 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Users size={11} /> {c.contacts.toLocaleString()} contacts
                  </span>
                  {c.scheduled && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={11} /> {c.scheduled}
                    </span>
                  )}
                  <span>Created {c.created}</span>
                </div>
              </div>

              {/* Progress */}
              {c.contacts > 0 && (
                <div style={{ textAlign: 'center', minWidth: 80 }}>
                  <div style={{ fontSize: 18, fontFamily: 'Syne', fontWeight: 700 }}>
                    {c.contacts > 0 ? Math.round(c.delivered / c.contacts * 100) : 0}%
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>delivered</div>
                </div>
              )}

              {/* Mini stats */}
              <div style={{ display: 'flex', gap: 20, fontSize: 13, minWidth: 180 }}>
                {[
                  { label: 'Sent', val: c.sent },
                  { label: 'Delivered', val: c.delivered },
                  { label: 'Failed', val: c.failed },
                ].map(({ label, val }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontFamily: 'JetBrains Mono', fontWeight: 500 }}>{val.toLocaleString()}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                {c.status === 'draft' && (
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', padding: 4 }}>
                    <Play size={16} />
                  </button>
                )}
                {c.status === 'running' && (
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--warning)', padding: 4 }}>
                    <Pause size={16} />
                  </button>
                )}
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
                  <Eye size={16} />
                </button>
                <button
                  onClick={() => deleteC(c.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </Card>
        ))}

        {campaigns.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
            <Megaphone size={40} strokeWidth={1} style={{ marginBottom: 12 }} />
            <p>No campaigns yet. Create one to get started.</p>
          </div>
        )}
      </div>

      {showModal && <CampaignModal onClose={() => setShowModal(false)} onSave={handleSave} />}
    </div>
  )
}
