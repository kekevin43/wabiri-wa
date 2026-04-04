import { useState, useRef, useEffect } from 'react'
import { User, Plus, Search, Filter, MoreVertical, Tag as TagIcon, Mail, Phone, Download, X, Trash2, Upload, CheckCircle2, Loader2 } from 'lucide-react'
import { Card, Button, Badge, PageHeader, Input } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'

// ── Add Contact Modal ─────────────────────────────────────────────────────────
function AddContactModal({ onClose, onSave }) {
  const [form, setForm] = useState({ name: '', phone: '', tagInput: '', tags: [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const addTag = () => {
    const tag = form.tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || form.tags.includes(tag)) return
    set('tags', [...form.tags, tag])
    set('tagInput', '')
  }

  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t))

  const handleSave = async () => {
    if (!form.name.trim()) return setError('Name is required')
    if (!form.phone.trim()) return setError('Phone number is required')
    
    setSaving(true)
    setError('')
    try {
      await onSave({ 
        name: form.name.trim(), 
        phone: form.phone.trim(), 
        tags: form.tags 
      })
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 200,
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '32px', width: 460,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Add Contact</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input label="Full Name *" placeholder="e.g. John Doe" value={form.name} onChange={e => { setError(''); set('name', e.target.value) }} />
          <Input label="Phone Number *" placeholder="+254 7XX XXX XXX" value={form.phone} onChange={e => { setError(''); set('phone', e.target.value) }} />

          {/* Tags */}
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tags</label>
            {form.tags.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {form.tags.map(tag => (
                  <span key={tag} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'var(--accent-glow)', color: 'var(--accent)',
                    padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  }}>
                    <TagIcon size={10} /> {tag}
                    <X size={11} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => removeTag(tag)} />
                  </span>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={form.tagInput}
                onChange={e => set('tagInput', e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                placeholder="hot-lead, follow-up… (press Enter)"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none' }}
              />
              <Button variant="ghost" size="sm" onClick={addTag} disabled={!form.tagInput.trim()}>Add</Button>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} 
            {saving ? 'Saving...' : 'Save Contact'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── CSV Import  ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split('\n').filter(Boolean)
  if (lines.length < 2) return []
  return lines.slice(1).map((line) => {
    const [name, phone, tagsStr] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''))
    return {
      name: name || '',
      phone: phone || '',
      tags: tagsStr ? tagsStr.split(';').map(t => t.trim()).filter(Boolean) : [],
    }
  }).filter(c => c.name && c.phone)
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [menuId, setMenuId] = useState(null)
  const fileRef = useRef(null)

  const fetchContacts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setContacts(data || [])
    } catch (e) {
      console.error('Failed to fetch contacts', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) fetchContacts()
  }, [user])

  const filtered = contacts.filter(c =>
    !search ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.tags && c.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))
  )

  const handleAdd = async (newContact) => {
    const { data, error } = await supabase
      .from('contacts')
      .insert([{ ...newContact, user_id: user.id }])
      .select()
    
    if (error) throw error
    if (data) setContacts(prev => [data[0], ...prev])
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this contact?')) return
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id)
    
    if (error) return alert('Failed to delete contact: ' + error.message)
    setContacts(prev => prev.filter(c => c.id !== id))
    setMenuId(null)
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const parsed = parseCSV(ev.target.result)
      if (parsed.length === 0) return alert('No valid contacts found.')
      
      const toInsert = parsed.map(c => ({ ...c, user_id: user.id }))
      const { data, error } = await supabase.from('contacts').insert(toInsert).select()
      
      if (error) return alert('Failed to import contacts: ' + error.message)
      if (data) setContacts(prev => [...data, ...prev])
      alert(`✅ Imported ${data.length} contacts`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExport = () => {
    if (contacts.length === 0) return alert('No contacts to export.')
    const headers = ['Name', 'Phone', 'Tags', 'Last Active']
    const rows = contacts.map(c => [c.name, c.phone, (c.tags || []).join(';'), c.last_active])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'wabiri_contacts.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const initial = (name) => (name || '?').charAt(0).toUpperCase()

  return (
    <div className="fade-up" onClick={() => menuId && setMenuId(null)}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <PageHeader title="Contacts" subtitle={`${contacts.length} contact${contacts.length !== 1 ? 's' : ''}`} style={{ marginBottom: 0 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={loading}>
            <Upload size={15} /> Import CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={loading}>
            <Download size={15} /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setShowModal(true)} disabled={loading}>
            <Plus size={15} /> Add Contact
          </Button>
        </div>
      </div>

      {/* Search + Filter bar */}
      <Card style={{ marginBottom: 24, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, phone or tag…"
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: 'var(--text)' }}
            />
            {search && <X size={14} onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--muted)' }} />}
          </div>
          <Button variant="ghost" size="sm"><Filter size={14} /> Filter</Button>
        </div>
      </Card>

      {/* Contact Grid */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
          <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
          <p>Loading your contacts...</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.length === 0 ? (
            <div style={{
              gridColumn: '1 / -1', padding: '64px 20px', textAlign: 'center',
              color: 'var(--muted)', background: 'var(--surface)',
              borderRadius: 16, border: '1px dashed var(--border)',
            }}>
              <User size={36} style={{ margin: '0 auto 14px', display: 'block', opacity: 0.4 }} />
              {search
                ? <p style={{ margin: 0 }}>No contacts match "<strong>{search}</strong>"</p>
                : <> 
                    <p style={{ margin: '0 0 16px' }}>No contacts yet.</p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
                      <Button size="sm" onClick={() => setShowModal(true)}><Plus size={13} /> Add Contact</Button>
                      <Button size="sm" variant="ghost" onClick={() => fileRef.current?.click()}><Upload size={13} /> Import CSV</Button>
                    </div>
                  </>
              }
            </div>
          ) : filtered.map(contact => (
            <Card key={contact.id} style={{ display: 'flex', flexDirection: 'column', gap: 14, position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
                    background: 'var(--accent-glow)', color: 'var(--accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, fontWeight: 700, fontFamily: 'Syne',
                  }}>
                    {initial(contact.name)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{contact.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>{contact.phone}</div>
                  </div>
                </div>
                <div style={{ position: 'relative' }}>
                  <button
                    onClick={e => { e.stopPropagation(); setMenuId(menuId === contact.id ? null : contact.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 6 }}
                  >
                    <MoreVertical size={17} />
                  </button>
                  {menuId === contact.id && (
                    <div style={{
                      position: 'absolute', top: 28, right: 0, zIndex: 100,
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '4px 0', minWidth: 160,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    }}>
                      <div style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--danger)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => handleDelete(contact.id)}
                      >
                        <Trash2 size={14} /> Delete Contact
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {contact.tags && contact.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {contact.tags.map(tag => (
                    <Badge key={tag} color="muted">
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <TagIcon size={9} /> {tag}
                      </span>
                    </Badge>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--muted)' }}>
                <span>Last Active: {contact.last_active || 'just now'}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <a href={`https://wa.me/${contact.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', textDecoration: 'none' }}>
                    <Phone size={13} />
                  </a>
                  <a href={`mailto:${contact.email || ''}`}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textDecoration: 'none' }}>
                    <Mail size={13} />
                  </a>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && <AddContactModal onClose={() => setShowModal(false)} onSave={handleAdd} />}
    </div>
  )
}
