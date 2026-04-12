import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Send, FileText, X, AlertCircle, CheckCircle2, ChevronRight, Loader2, Users, User, Tag as TagIcon, Search, RefreshCw, Check } from 'lucide-react'
import { Card, Button, Textarea, PageHeader, Badge, Input } from '../../components/ui'
import { evolution } from '../../lib/evolution'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

const STEPS = ['Select Recipients', 'Compose Message', 'Review & Send']

export default function BulkSendPage() {
  const { user } = useAuth()
  const [step, setStep] = useState(0)
  const [method, setMethod] = useState('saved') // 'saved' | 'upload'
  const [contacts, setContacts] = useState([])
  const [selectedContacts, setSelectedContacts] = useState([])
  const [selectedTags, setSelectedTags] = useState([])
  const [allTags, setAllTags] = useState([])
  
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [instance, setInstance] = useState('')
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 })
  const [sent, setSent] = useState(false)
  const [search, setSearch] = useState('')
  const [syncing, setSyncing] = useState(false)
  const fileRef = useRef()

  // 1. Fetch Instances
  const fetchInstances = useCallback(async () => {
    try {
      const raw = await evolution.listInstances()
      const list = Array.isArray(raw) ? raw : (raw?.instances || [])
      const connected = list.map(i => i.instance || i).filter(i => ['open', 'CONNECTED'].includes(i.connectionStatus || i.state || i.status)).map(i => i.instanceName)
      setInstances(connected)
      if (connected.length === 1) setInstance(connected[0])
    } catch (_) {}
  }, [])

  // 2. Fetch Contacts & Tags
  const fetchSavedData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data } = await supabase.from('contacts').select('*').eq('user_id', user.id).order('full_name', { ascending: true }).limit(5000)
      if (data) {
        setContacts(data)
        const tags = new Set()
        data.forEach(c => (c.tags || []).forEach(t => tags.add(t)))
        setAllTags(Array.from(tags))
      }
    } finally { setLoading(false) }
  }, [user])

  const handleSync = async () => {
    if (!instance || syncing) return
    setSyncing(true)
    try {
      const data = await evolution.findChats(instance)
      const list = Array.isArray(data) ? data : (data?.data || data?.chats || [])
      const toUpsert = []
      list.forEach(chat => {
        const jid = chat.remoteJid || chat.id || ''
        const num = jid.split('@')[0]
        
        // Skip groups, broadcasts, newsletters, status
        if (
          jid.endsWith('@g.us') ||
          jid.endsWith('@broadcast') ||
          jid.endsWith('@newsletter') ||
          jid === 'status@broadcast' ||
          num.length > 15 // valid E.164 max is 15 digits
        ) return

        const full_name = chat.pushName || chat.name || null
        toUpsert.push({ 
          user_id: user.id, 
          full_name: full_name || num, // fallback to number if no name
          phone: num,
          source: 'WhatsApp Sync'
        })
      })
      if (toUpsert.length > 0) {
        await supabase.from('contacts').insert(toUpsert, { ignoreDuplicates: true })
        await fetchSavedData()
      }
    } catch (e) {
      alert('Sync failed: ' + e.message)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => { fetchInstances() }, [fetchInstances])

  useEffect(() => {
    if (user && method === 'saved') fetchSavedData()
  }, [user, method, fetchSavedData])

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split(/\r?\n/).filter(Boolean)
      const parsed = lines.slice(1).map((line, i) => {
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
        return { id: `up-${i}`, full_name: parts[1] || `Contact ${i + 1}`, phone: parts[0] || parts[1] }
      }).filter(c => c.phone)
      setSelectedContacts(parsed)
    }; reader.readAsText(file)
  }

  const getFinalRecipients = () => {
    if (method === 'upload') return selectedContacts
    let base = [...selectedContacts]
    if (selectedTags.length > 0) {
      const fromTags = contacts.filter(c => (c.tags || []).some(t => selectedTags.includes(t)))
      base = [...new Set([...base, ...fromTags])]
    }
    return base
  }

  const handleSend = async () => {
    const list = getFinalRecipients()
    setSending(true); setProgress({ current: 0, total: list.length, success: 0, fail: 0 })

    for (let i = 0; i < list.length; i++) {
        const contact = list[i]
        const msg = message.replace(/\{\{name\}\}/g, contact.full_name)
        try {
          await evolution.sendMessage(instance, contact.phone, msg)
          setProgress(p => ({ ...p, current: i + 1, success: p.success + 1 }))
        } catch (e) {
          setProgress(p => ({ ...p, current: i + 1, fail: p.fail + 1 }))
        }
        // Random safety delay: 3-6 seconds
        if (i < list.length - 1) await new Promise(r => setTimeout(r, 3000 + Math.random() * 3000))
    }
    setSending(false); setSent(true)
  }

  if (sent) return (
    <div className="fade-up" style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-glow)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
        <CheckCircle2 size={34} color="var(--accent)" />
      </div>
      <h2 style={{ fontSize: 24, marginBottom: 8 }}>Campaign Sent!</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 32 }}>Delivered {progress.success} messages successfully.</p>
      <Button onClick={() => { setSent(false); setStep(0); setSelectedContacts([]); setSelectedTags([]); setMessage('') }}>Start New Batch</Button>
    </div>
  )

  const finalCount = getFinalRecipients().length

  return (
    <div className="fade-up">
      <PageHeader title="Bulk Send" subtitle="Personalized WhatsApp broadcasts" />
      <div style={{ maxWidth: 720 }}>
        {/* Progress Tracker */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
          {STEPS.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ height: 4, borderRadius: 2, background: step >= i ? 'var(--accent)' : 'var(--border)' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: step >= i ? 'var(--text)' : 'var(--muted)', textTransform: 'uppercase' }}>{s}</span>
            </div>
          ))}
        </div>

        {/* STEP 0: Select Recipients */}
        {step === 0 && (
          <Card>
            <div style={{ display: 'flex', gap: 20, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
              <span onClick={() => setMethod('saved')} style={{ cursor: 'pointer', paddingBottom: 8, borderBottom: method === 'saved' ? '2px solid var(--accent)' : 'none', color: method === 'saved' ? 'var(--text)' : 'var(--muted)', fontSize: 14, fontWeight: 600 }}>Saved Contacts</span>
              <span onClick={() => setMethod('upload')} style={{ cursor: 'pointer', paddingBottom: 8, borderBottom: method === 'upload' ? '2px solid var(--accent)' : 'none', color: method === 'upload' ? 'var(--text)' : 'var(--muted)', fontSize: 14, fontWeight: 600 }}>CSV Upload</span>
            </div>

            {method === 'saved' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 {/* Tags */}
                 {allTags.length > 0 && (
                    <div>
                        <label style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: 10 }}>Target Tags</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                           {allTags.map(t => (
                              <Badge key={t} color={selectedTags.includes(t) ? 'accent' : 'muted'} style={{ cursor: 'pointer', padding: '6px 12px' }} onClick={() => setSelectedTags(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t])}>
                                 <TagIcon size={10} style={{ marginRight: 6 }} /> {t}
                              </Badge>
                           ))}
                        </div>
                    </div>
                 )}
                 {/* Search Contacts */}
                 <div>
                     <div style={{ position: 'relative', marginBottom: 12, display: 'flex', gap: 10 }}>
                        <div style={{ position: 'relative', flex: 1 }}>
                           <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
                           <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleSync} disabled={!instance || syncing}>
                           {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                           Sync
                        </Button>
                     </div>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, padding: '0 4px' }}>
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>Individual Selection</span>
                        <span 
                           onClick={() => {
                              const filtered = contacts.filter(c => !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search))
                              if (selectedContacts.length === filtered.length) setSelectedContacts([])
                              else setSelectedContacts(filtered)
                           }} 
                           style={{ fontSize: 11, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}
                        >
                           {selectedContacts.length === contacts.filter(c => !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)).length ? 'Deselect All' : 'Select All'}
                        </span>
                     </div>
                     <div style={{ maxHeight: 310, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                        {loading ? (
                          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>
                            <Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 10px' }} />
                            <div style={{ fontSize: 13 }}>Loading contacts...</div>
                          </div>
                        ) : contacts.length === 0 ? (
                          <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
                            No contacts yet. Import a CSV from the Contacts page or hit Sync.
                          </div>
                        ) : contacts.filter(c => !search || c.full_name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search)).map(c => (
                           <div key={c.id} onClick={() => setSelectedContacts(p => p.find(x => x.id === c.id) ? p.filter(x => x.id !== c.id) : [...p, c])} style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '10px 15px', borderBottom: '1px solid var(--wa-border)', cursor: 'pointer', background: selectedContacts.find(x => x.id === c.id) ? 'var(--wa-active)' : 'transparent', transition: 'background 0.1s' }}>
                              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--wa-active)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                 <User size={24} color="var(--wa-text-muted)" />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                 <div style={{ fontSize: 16, color: 'var(--wa-text)', fontWeight: 400 }}>{c.full_name}</div>
                                 <div style={{ fontSize: 13, color: 'var(--wa-text-muted)' }}>+{c.phone}</div>
                              </div>
                              <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--wa-accent)', background: selectedContacts.find(x => x.id === c.id) ? 'var(--wa-accent)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                 {selectedContacts.find(x => x.id === c.id) && <Check size={12} color="#000" strokeWidth={4} />}
                              </div>
                           </div>
                        ))}
                     </div>
                 </div>
              </div>
            ) : (
              <div onClick={() => fileRef.current.click()} style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '48px 20px', textAlign: 'center', cursor: 'pointer' }}>
                 <Upload size={32} color="var(--muted)" style={{ marginBottom: 12 }} />
                 {fileName ? <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{fileName} ({selectedContacts.length} contacts)</div> : <div style={{ fontSize: 14 }}>Click to upload CSV (phone,name)</div>}
                 <input type="file" ref={fileRef} onChange={handleFileUpload} style={{ display: 'none' }} />
              </div>
            )}
            
            <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
               <span style={{ fontSize: 13, color: 'var(--muted)' }}>{finalCount} recipients selected</span>
               <Button onClick={() => setStep(1)} disabled={finalCount === 0}>Next Step <ChevronRight size={15} /></Button>
            </div>
          </Card>
        )}

        {/* STEP 1: Compose */}
        {step === 1 && (
          <Card>
             <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, display: 'block', marginBottom: 10 }}>WhatsApp Account</label>
                <select value={instance} onChange={e => setInstance(e.target.value)} style={{ width: '100%', padding: '12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', outline: 'none' }}>
                   <option value="" disabled>Select device...</option>
                   {instances.map(i => <option key={i} value={i}>{i}</option>)}
                </select>
             </div>
             <Textarea label="Personalized Message" value={message} onChange={e => setMessage(e.target.value)} placeholder={`Hi {{name}}, checking in regarding...`} style={{ minHeight: 160 }} />
             <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>Tip: Use <code style={{ color: 'var(--accent)', fontWeight: 600 }}>{`{{name}}`}</code> to auto-insert their name.</p>
             
             <div style={{ marginTop: 32, display: 'flex', justifyContent: 'space-between' }}>
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={() => setStep(2)} disabled={!message.trim() || !instance}>Review & Send <ChevronRight size={15} /></Button>
             </div>
          </Card>
        )}

        {/* STEP 2: Review & Sending */}
        {step === 2 && (
          <Card>
             {!sending && (
                <>
                   <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Confirm Broadcast</h3>
                   <div style={{ padding: '20px', background: 'var(--surface2)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Recipients:</span><span style={{ fontWeight: 700 }}>{finalCount}</span></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Account:</span><span style={{ fontWeight: 700 }}>{instance}</span></div>
                      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                         <div style={{ color: 'var(--muted)', fontSize: 12, marginBottom: 6 }}>Message Preview:</div>
                         <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--accent)' }}>{message.replace(/\{\{name\}\}/g, '[Name]')}</div>
                      </div>
                   </div>
                   <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 32, padding: '12px', background: 'rgba(245,158,11,0.1)', border: '1px solid var(--warning)', borderRadius: 8, color: 'var(--warning)', fontSize: 13 }}>
                      <AlertCircle size={15} /> Safety: A random 3-6s delay will be added between messages.
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
                      <Button onClick={handleSend}><Send size={14} /> Send {finalCount} Messages</Button>
                   </div>
                </>
             )}
             {sending && (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                   <div style={{ fontSize: 42, fontWeight: 800, fontFamily: 'Syne', marginBottom: 4 }}>{Math.round((progress.current / progress.total) * 100)}%</div>
                   <div style={{ color: 'var(--muted)', fontSize: 13, marginBottom: 32 }}>Transferred {progress.current} of {progress.total} messages</div>
                   <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden', marginBottom: 24 }}>
                      <div style={{ height: '100%', background: 'var(--accent)', width: `${(progress.current / progress.total) * 100}%`, transition: 'width 0.4s' }} />
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'center', gap: 32 }}>
                      <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{progress.success}</div><div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Success</div></div>
                      <div><div style={{ fontSize: 20, fontWeight: 700, color: 'var(--danger)' }}>{progress.fail}</div><div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Failed</div></div>
                   </div>
                </div>
             )}
          </Card>
        )}
      </div>
    </div>
  )
}
