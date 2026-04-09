import { useState, useEffect, useRef } from 'react'
import { Plus, Megaphone, Play, Pause, Eye, Trash2, Calendar, Users, Paperclip, X, Image as ImageIcon, FileText, Loader2 } from 'lucide-react'
import { Card, Badge, Button, PageHeader, Input, Textarea } from '../../components/ui'
import { evolution } from '../../lib/evolution'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const STATUS_COLOR = { running: 'info', draft: 'muted', completed: 'accent', paused: 'warning', failed: 'danger' }

function CampaignModal({ onClose, onSave }) {
  const { user } = useAuth()
  const [form, setForm] = useState({ 
    name: '', message: '', instance: '', 
    scheduledAt: '', media: null,
    targetTag: '', // Empty means 'All Contacts'
  })
  const [instances, setInstances] = useState([])
  const [tags, setTags] = useState([])
  const [reach, setReach] = useState(0)
  const [loadingInst, setLoadingInst] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => {
    async function load() {
      setLoadingInst(true)
      try {
        // 1. Fetch Instances
        const res = await evolution.listInstances()
        const raw = Array.isArray(res) ? res : (res?.instances || [])
        const list = raw.map(i => {
          const info = i.instance || i
          return {
            name: info.instanceName || info.name || '',
            connected: ['open', 'CONNECTED', 'connected'].includes(info.connectionStatus || info.state || info.status || '')
          }
        }).filter(i => i.connected)
        setInstances(list)
        if (list.length > 0) setForm(p => ({ ...p, instance: list[0].name }))

        // 2. Fetch Unique Tags from Contacts
        const { data: contacts } = await supabase.from('contacts').select('tags').eq('user_id', user.id)
        const uniqueTags = Array.from(new Set(contacts?.flatMap(c => c.tags || []) || [])).sort()
        setTags(uniqueTags)
        
        // Initial Reach (All)
        setReach(contacts?.length || 0)
      } catch (_) {}
      finally { setLoadingInst(false) }
    }
    load()
  }, [user])

  // Update reach when targetTag changes
  useEffect(() => {
    async function updateReach() {
      if (!user) return
      let query = supabase.from('contacts').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if (form.targetTag) {
        query = query.contains('tags', [form.targetTag])
      }
      const { count } = await query
      setReach(count || 0)
    }
    updateReach()
  }, [form.targetTag, user])

  const handleMedia = (e) => {
    const file = e.target.files?.[0]
    if (file) setForm(p => ({ ...p, media: file }))
  }

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100,
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '32px', width: 560, boxSizing: 'border-box'
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 20 }}>New Campaign</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>Broadcast a message to your contacts</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          <Input label="Campaign Name" placeholder="e.g. Easter Holiday Promo"
            value={form.name} onChange={e => set('name', e.target.value)} />

          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>WhatsApp Instance</label>
            <select
              value={form.instance}
              onChange={e => set('instance', e.target.value)}
              style={{
                width: '100%', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 14px', color: 'var(--text)',
                fontFamily: 'Outfit', fontSize: 14, outline: 'none',
              }}
            >
              {loadingInst ? <option>Loading devices...</option> : instances.length === 0 ? <option>No connected devices found</option> : instances.map(i => <option key={i.name} value={i.name}>{i.name} (Live)</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Target Audience</label>
            <select
              value={form.targetTag}
              onChange={e => set('targetTag', e.target.value)}
              style={{
                width: '100%', background: 'var(--surface2)',
                border: '1px solid var(--border)', borderRadius: 8,
                padding: '12px 14px', color: 'var(--text)',
                fontFamily: 'Outfit', fontSize: 14, outline: 'none',
              }}
            >
              <option value="">All Contacts</option>
              {tags.map(t => <option key={t} value={t}>Tag: {t}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--accent-glow)', borderRadius: 12, padding: '0 16px' }}>
            <Users size={18} color="var(--accent)" />
            <div>
               <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)', fontFamily: 'Syne' }}>{reach}</div>
               <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Estimated Reach</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Textarea 
            label="Message (Supports {name}, {phone})" 
            placeholder="Example: Hello {name}, check out our new offer!"
            value={form.message} onChange={e => set('message', e.target.value)} style={{ minHeight: 120 }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Media Attachment */}
            <div>
               <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Attachment (Optional)</label>
               {form.media ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, border: '1px solid var(--accent)' }}>
                     {form.media.type.startsWith('image') ? <ImageIcon size={18} color="var(--accent)" /> : <FileText size={18} color="var(--accent)" />}
                     <span style={{ flex: 1, fontSize: 13, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{form.media.name}</span>
                     <button onClick={() => set('media', null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={16} /></button>
                  </div>
               ) : (
                  <div 
                    onClick={() => fileRef.current?.click()}
                    style={{ border: '1px dashed var(--border)', borderRadius: 8, padding: '12px', textAlign: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: 13, transition: 'all 0.2s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                  >
                     <Paperclip size={16} style={{ display: 'block', margin: '0 auto 4px' }} />
                     Click to attach file
                  </div>
               )}
               <input ref={fileRef} type="file" onChange={handleMedia} style={{ display: 'none' }} />
            </div>

            <Input label="Schedule (optional)" type="datetime-local"
              value={form.scheduledAt} onChange={e => set('scheduledAt', e.target.value)} />
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={() => { onSave(form); onClose() }} disabled={!form.name || !form.message || !form.instance || reach === 0}>
              Create Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  const { user } = useAuth()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  
  // Running state
  const [activeId, setActiveId] = useState(null)
  const [progress, setProgress] = useState(0) // 0 to 100

  const fetchCampaigns = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase.from('campaigns').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
      setCampaigns(data || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchCampaigns() }, [user])

  const startCampaign = async (campaign) => {
    if (activeId) return alert('Another campaign is already running.')
    
    // 0. Pre-flight Instance Check
    try {
      const status = await evolution.getStatus(campaign.instance)
      const state = status?.instance?.state || status?.state
      if (state !== 'open' && state !== 'connected') {
        throw new Error(`Instance "${campaign.instance}" is disconnected. Please reconnect it in the Instances page.`)
      }
    } catch (e) {
       return alert(e.message)
    }

    if (!confirm(`Start broadcast for "${campaign.name}" now?`)) return

    setActiveId(campaign.id)
    setProgress(1) // Start
    
    try {
      // 1. Set status to running in DB
      await supabase.from('campaigns').update({ status: 'running' }).eq('id', campaign.id)
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'running' } : c))

      // 2. Fetch targeted contacts
      let q = supabase.from('contacts').select('*').eq('user_id', user.id)
      if (campaign.target_tag) {
        q = q.contains('tags', [campaign.target_tag])
      }
      const { data: contacts } = await q
      if (!contacts || contacts.length === 0) throw new Error('No contacts found for target audience.')

      // 3. Execution Loop
      let sentCount = 0
      for (const contact of contacts) {
         // Personalize
         const nameVal = contact.name?.trim() || 'there'
         const personalized = campaign.message
            .replace(/{name}/gi, nameVal)
            .replace(/{phone}/gi, contact.phone || '')
         
         const num = contact.phone.replace(/\D/g, '')

         try {
            if (campaign.media_url) {
               await evolution.sendMedia(
                  campaign.instance, 
                  num, 
                  campaign.media_url, 
                  campaign.media_name || 'attachment', 
                  personalized, 
                  campaign.media_type || 'image'
               )
            } else {
               await evolution.sendMessage(campaign.instance, num, personalized)
            }
            
            sentCount++
            
            // Update Progress
            const p = Math.round((sentCount / contacts.length) * 100)
            setProgress(p)

            // Update stats incrementally (every 2-3 messages to save DB calls, or every message for UX if small)
            if (sentCount % 1 === 0 || sentCount === contacts.length) {
               await supabase.from('campaigns').update({ 
                  stats: { ...campaign.stats, sent: sentCount } 
               }).eq('id', campaign.id)
               setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, stats: { ...c.stats, sent: sentCount } } : c))
            }

            // Wait for human-like delay (4-9 seconds)
            const delay = 4000 + Math.random() * 5000
            if (sentCount < contacts.length) {
              await new Promise(r => setTimeout(r, delay))
            }
         } catch (err) {
            console.error(`Failed to send to ${contact.phone}`, err)
         }
      }

      // 4. Finish
      await supabase.from('campaigns').update({ status: 'completed' }).eq('id', campaign.id)
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, status: 'completed' } : c))
      alert('Campaign completed successfully!')
    } catch (e) {
      alert('Campaign failed: ' + e.message)
    } finally {
      setActiveId(null)
      setProgress(0)
    }
  }

  const handleCreate = async (form) => {
    let mediaUrl = ''
    let mediaName = ''
    let mediaType = ''

    setLoading(true)
    try {
      // 1. Upload Media if present
      if (form.media) {
        const file = form.media
        const fileExt = file.name.split('.').pop()
        const fileName = `${user.id}/${Date.now()}.${fileExt}`
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('campaigns') // User must create this bucket in Supabase
          .upload(fileName, file)

        if (uploadError) throw new Error('Failed to upload attachment: ' + uploadError.message)
        
        // Get Public URL
        const { data: { publicUrl } } = supabase.storage.from('campaigns').getPublicUrl(fileName)
        mediaUrl = publicUrl
        mediaName = file.name
        mediaType = file.type.split('/')[0] // image, video, document
      }

      // 2. Insert Campaign
      const { data, error } = await supabase.from('campaigns').insert([{
        user_id: user.id,
        name: form.name,
        message: form.message,
        instance: form.instance,
        status: 'draft',
        target_tag: form.targetTag || null,
        scheduled_at: form.scheduledAt || null,
        media_url: mediaUrl,
        media_name: mediaName,
        media_type: mediaType,
        stats: { sent: 0, delivered: 0, failed: 0 }
      }]).select()
      
      if (error) throw error
      setCampaigns(prev => [data[0], ...prev])
      alert('Campaign created successfully!')
    } catch (e) {
      alert('Failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteC = async (id) => {
    if (!confirm('Remove this campaign?')) return
    await supabase.from('campaigns').delete().eq('id', id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="Campaigns"
        subtitle="Manage your WhatsApp broadcasts"
        action={<Button onClick={() => setShowModal(true)}><Plus size={15} /> New Campaign</Button>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {loading ? (
           <div style={{ padding: 60, textAlign: 'center' }}><Loader2 className="animate-spin" size={32} /></div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--muted)', background: 'var(--surface)', borderRadius: 20, border: '1px dashed var(--border)' }}>
            <Megaphone size={48} strokeWidth={1} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p style={{ fontSize: 16, margin: '0 0 20px' }}>No campaigns found. Ready to reach your customers?</p>
            <Button onClick={() => setShowModal(true)}><Plus size={14} /> Create your first campaign</Button>
          </div>
        ) : campaigns.map(c => (
          <Card key={c.id} style={{ padding: '20px 24px', border: activeId === c.id ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={20} color="var(--accent)" />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <span style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 16 }}>{c.name}</span>
                  <Badge color={c.id === activeId ? 'info' : STATUS_COLOR[c.status]}>{c.id === activeId ? 'active' : c.status}</Badge>
                  {c.media_url && <Badge color="info"><ImageIcon size={10} style={{ marginRight: 4 }} /> Media Attached</Badge>}
                  {c.target_tag && <Badge color="muted"><TagIcon size={10} style={{ marginRight: 4 }} /> {c.target_tag}</Badge>}
                  {!c.target_tag && <Badge color="muted"><Users size={10} style={{ marginRight: 4 }} /> All Contacts</Badge>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 14 }}>
                   <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Smartphone size={12} /> {c.instance}</span>
                   {c.scheduled_at && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={12} /> {new Date(c.scheduled_at).toLocaleString()}</span>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 20, textAlign: 'center', minWidth: 150 }}>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.stats?.sent || 0}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Sent</div></div>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{c.stats?.delivered || 0}</div><div style={{ fontSize: 11, color: 'var(--muted)' }}>Delivered</div></div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                 {c.status === 'draft' && !activeId && <Button size="sm" onClick={() => startCampaign(c)}><Play size={13} /> Start</Button>}
                 {activeId === c.id && (
                    <div style={{ width: 100, display: 'flex', flexDirection: 'column', gap: 4 }}>
                       <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textAlign: 'center' }}>{progress}%</div>
                       <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: 'var(--accent)', width: `${progress}%`, transition: 'width 0.3s' }} />
                       </div>
                    </div>
                 )}
                 <IconBtn icon={Eye} />
                 <IconBtn icon={Trash2} color="var(--danger)" onClick={() => deleteC(c.id)} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && <CampaignModal onClose={() => setShowModal(false)} onSave={handleCreate} />}
    </div>
  )
}

function IconBtn({ icon: Icon, onClick, color = 'var(--muted)' }) {
  return (<button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color, padding: 8, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}><Icon size={18} /></button>)
}
