import { useState, useEffect, useCallback, useRef } from 'react'
import { Search, Plus, X, Tag as TagIcon, Trash2, Edit, Upload, Download, Check, Loader2, CheckCircle2, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../lib/AuthContext'
import { parsePhoneNumber } from 'libphonenumber-js'
import SmartImporter from '../../components/SmartImporter'

function Avatar({ name, size = 46 }) {
  const colors = ['#00a884','#0078d4','#e67e22','#9b59b6','#e74c3c','#1abc9c','#f39c12','#2980b9']
  const idx = (name?.charCodeAt(0) || 0) % colors.length
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', flexShrink: 0, background: colors[idx], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700, color: '#fff', userSelect: 'none' }}>
      {initials}
    </div>
  )
}

function ContactModal({ onClose, onSave, editingContact }) {
  const [form, setForm] = useState({ full_name: editingContact?.full_name || '', phone: editingContact?.phone || '', email: editingContact?.email || '', source: editingContact?.source || '', year_added: editingContact?.year_added || new Date().getFullYear(), product_interest: editingContact?.product_interest || '', remarks: editingContact?.remarks || '', tagInput: '', tags: editingContact?.tags || [] })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const addTag = () => { const tag = form.tagInput.trim().toLowerCase().replace(/\s+/g, '-'); if (!tag || form.tags.includes(tag)) return; set('tags', [...form.tags, tag]); set('tagInput', '') }
  const handleSave = async () => {
    if (!form.full_name.trim()) return setError('Name is required')
    if (!form.phone.trim()) return setError('Phone is required')
    setSaving(true); setError('')
    try {
      let parsedNumber
      try { const parsed = parsePhoneNumber(form.phone, 'KE'); if (!parsed.isValid()) { setSaving(false); return setError('Invalid phone number') } parsedNumber = parsed.number.replace('+', '') } catch { setSaving(false); return setError('Invalid phone number') }
      await onSave({ full_name: form.full_name.trim(), phone: parsedNumber, email: form.email.trim(), source: form.source.trim(), year_added: Number(form.year_added) || new Date().getFullYear(), product_interest: form.product_interest.trim(), remarks: form.remarks.trim(), tags: form.tags }, editingContact?.id)
      onClose()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}><h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{editingContact ? 'Edit Contact' : 'New Contact'}</h2><button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button></div>
        {error && <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', borderRadius: 8, fontSize: 13, marginBottom: 14 }}>{error}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Full Name *" value={form.full_name} onChange={e => { setError(''); set('full_name', e.target.value) }} placeholder="Jane Doe" />
          <Input label="Phone * (e.g. 0712345678)" value={form.phone} onChange={e => { setError(''); set('phone', e.target.value) }} placeholder="0712345678" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@domain.com" />
            <Input label="Source / Group" value={form.source} onChange={e => set('source', e.target.value)} placeholder="Facebook 2019" />
            <Input label="Product Interest" value={form.product_interest} onChange={e => set('product_interest', e.target.value)} placeholder="Ruiru Plots" />
            <Input label="Year Added" type="number" value={form.year_added} onChange={e => set('year_added', e.target.value)} />
          </div>
          <Input label="Remarks" value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Notes..." />
          <div>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tags</label>
            {form.tags.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>{form.tags.map(t => <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,168,132,0.12)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t} <X size={11} style={{ cursor: 'pointer' }} onClick={() => set('tags', form.tags.filter(x => x !== t))} /></span>)}</div>}
            <div style={{ display: 'flex', gap: 8 }}><input value={form.tagInput} onChange={e => set('tagInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="hot-lead (press Enter)" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} /><Button variant="ghost" size="sm" onClick={addTag} disabled={!form.tagInput.trim()}>Add</Button></div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </div>
  )
}

function BulkTagModal({ onClose, onApply, count }) {
  const [tag, setTag] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: 360 }}>
        <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Bulk Tag</h2>
        <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>Tag {count} selected contacts</p>
        <Input label="Tag Name" placeholder="e.g. hot-lead" value={tag} onChange={e => setTag(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={() => { onApply(tag); onClose() }} disabled={!tag.trim()}>Apply</Button></div>
      </div>
    </div>
  )
}

function ContactDetail({ contact, onClose, onEdit, onDelete }) {
  if (!contact) return null
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 150, padding: 20 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 400, overflow: 'hidden' }}>
        <div style={{ background: 'var(--surface2)', padding: '28px 24px', textAlign: 'center', position: 'relative' }}>
          <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
          <Avatar name={contact.full_name} size={72} />
          <h2 style={{ margin: '14px 0 4px', fontSize: 20, fontWeight: 700 }}>{contact.full_name}</h2>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>+{contact.phone}</div>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {contact.email && <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}><Mail size={15} color="var(--muted)" /><span>{contact.email}</span></div>}
          {contact.source && <div style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--muted)', minWidth: 80 }}>Source</span><span>{contact.source}</span></div>}
          {contact.product_interest && <div style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--muted)', minWidth: 80 }}>Interest</span><span style={{ color: 'var(--accent)' }}>{contact.product_interest}</span></div>}
          {contact.year_added && <div style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--muted)', minWidth: 80 }}>Year</span><span>{contact.year_added}</span></div>}
          {contact.remarks && <div style={{ display: 'flex', gap: 10, fontSize: 14 }}><span style={{ color: 'var(--muted)', minWidth: 80 }}>Notes</span><span style={{ color: 'var(--muted)' }}>{contact.remarks}</span></div>}
          {contact.tags?.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>{contact.tags.map(t => <span key={t} style={{ background: 'rgba(0,168,132,0.12)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{t}</span>)}</div>}
        </div>
        <div style={{ padding: '0 24px 24px', display: 'flex', gap: 10 }}>
          <Button variant="ghost" style={{ flex: 1 }} onClick={() => { onEdit(contact); onClose() }}><Edit size={14} /> Edit</Button>
          <Button variant="danger" style={{ flex: 1 }} onClick={() => { onDelete(contact.id); onClose() }}><Trash2 size={14} /> Delete</Button>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 50

export default function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchValue, setSearchValue] = useState('')
  const [filterTag, setFilterTag] = useState('')
  const [filterSource, setFilterSource] = useState('')
  const [uniqueTags, setUniqueTags] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [showBulkTag, setShowBulkTag] = useState(false)
  const [showImporter, setShowImporter] = useState(false)
  const [detailContact, setDetailContact] = useState(null)

  const fetchFilters = useCallback(async () => {
    if (!user) return
    const [tagsRes] = await Promise.all([supabase.rpc('get_distinct_tags', { uid: user.id })])
    if (tagsRes.data) setUniqueTags(tagsRes.data)
  }, [user])

  const fetchContacts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase.from('contacts').select('*', { count: 'exact' }).eq('user_id', user.id)
      if (searchValue) query = query.or(`full_name.ilike.%${searchValue}%,phone.ilike.%${searchValue}%`)
      if (filterTag) query = query.contains('tags', [filterTag])
      if (filterSource) query = query.eq('source', filterSource)
      const from = page * PAGE_SIZE
      const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1)
      if (error) throw error
      setContacts(data || []); setTotalCount(count || 0)
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }, [user, page, searchValue, filterTag, filterSource])

  useEffect(() => { const t = setTimeout(() => { setSearchValue(search); setPage(0) }, 350); return () => clearTimeout(t) }, [search])
  useEffect(() => { fetchContacts() }, [fetchContacts])
  useEffect(() => { fetchFilters() }, [fetchFilters])

  const toggleSelect = (id, e) => { e.stopPropagation(); const next = new Set(selectedIds); next.has(id) ? next.delete(id) : next.add(id); setSelectedIds(next) }

  const handleSaveContact = async (data, id) => {
    if (id) { const { error } = await supabase.from('contacts').update(data).eq('id', id); if (error) throw error }
    else { const { error } = await supabase.from('contacts').upsert([{ ...data, user_id: user.id }], { onConflict: 'user_id,phone' }); if (error) throw error }
    fetchContacts(); fetchFilters()
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return
    await supabase.from('contacts').delete().eq('id', id)
    fetchContacts()
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} contacts?`)) return
    const ids = Array.from(selectedIds)
    for (let i = 0; i < ids.length; i += 500) await supabase.from('contacts').delete().in('id', ids.slice(i, i + 500))
    setSelectedIds(new Set()); fetchContacts()
  }

  const handleBulkTag = async (tag) => {
    await supabase.rpc('add_tag_to_contacts', { contact_ids: Array.from(selectedIds), tag: tag.toLowerCase().replace(/\s+/g, '-') })
    fetchContacts(); setSelectedIds(new Set())
  }

  const handleExport = () => {
    const list = selectedIds.size > 0 ? contacts.filter(c => selectedIds.has(c.id)) : contacts
    if (!list.length) return
    const csv = [['Full Name','Phone','Email','Source','Product Interest','Year Added','Tags','Remarks'], ...list.map(c => [c.full_name, c.phone, c.email||'', c.source||'', c.product_interest||'', c.year_added||'', (c.tags||[]).join(';'), c.remarks||''])].map(r => r.map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(',')).join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' })); a.download = 'contacts.csv'; a.click()
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const allSelected = selectedIds.size === contacts.length && contacts.length > 0

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--wa-bg)', marginLeft: -24, marginTop: -24, marginRight: -24 }}>

      {/* Left panel */}
      <div style={{ width: 420, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100%', flexShrink: 0 }}>

        {/* Header */}
        <div style={{ padding: '16px 16px 0', background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Contacts</h1>
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => setShowImporter(true)} title="Import Spreadsheet" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 7, borderRadius: 8, display: 'flex' }}><Upload size={17} /></button>
              <button onClick={handleExport} title="Export CSV" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 7, borderRadius: 8, display: 'flex' }}><Download size={17} /></button>
              <button onClick={() => { setEditingContact(null); setShowModal(true) }} style={{ background: 'var(--accent)', border: 'none', cursor: 'pointer', color: '#fff', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}><Plus size={14} /> New</button>
            </div>
          </div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts..." style={{ width: '100%', padding: '9px 36px', borderRadius: 8, border: 'none', background: 'var(--wa-search-bg)', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
            {search && <X size={14} onClick={() => setSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--muted)' }} />}
          </div>
          {uniqueTags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 10, scrollbarWidth: 'none' }}>
              <button onClick={() => setFilterTag('')} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: !filterTag ? 'var(--accent)' : 'var(--surface)', color: !filterTag ? '#fff' : 'var(--muted)' }}>All</button>
              {uniqueTags.map(t => <button key={t} onClick={() => setFilterTag(filterTag === t ? '' : t)} style={{ flexShrink: 0, padding: '4px 12px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, background: filterTag === t ? 'var(--accent)' : 'var(--surface)', color: filterTag === t ? '#fff' : 'var(--muted)' }}>{t}</button>)}
            </div>
          )}
        </div>

        {/* Count */}
        <div style={{ padding: '7px 16px', fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{totalCount.toLocaleString()} contact{totalCount !== 1 ? 's' : ''}{filterTag ? ` · ${filterTag}` : ''}</span>
          {contacts.length > 0 && <button onClick={() => setSelectedIds(allSelected ? new Set() : new Set(contacts.map(c => c.id)))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontSize: 12, fontWeight: 600 }}>{allSelected ? 'Deselect all' : 'Select all'}</button>}
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading && contacts.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}><Loader2 size={28} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block' }} />Loading...</div>
          ) : contacts.length === 0 ? (
            <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>No contacts yet</div>
              <div style={{ fontSize: 13, marginBottom: 20 }}>Import her spreadsheet to get started</div>
              <button onClick={() => setShowImporter(true)} style={{ background: 'var(--accent)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 20, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>Import Spreadsheet</button>
            </div>
          ) : contacts.map(c => (
            <div key={c.id} onClick={() => setDetailContact(c)}
              style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: selectedIds.has(c.id) ? 'var(--wa-active)' : 'transparent', transition: 'background 0.1s' }}
              onMouseEnter={e => { if (!selectedIds.has(c.id)) e.currentTarget.style.background = 'var(--wa-hover)' }}
              onMouseLeave={e => { if (!selectedIds.has(c.id)) e.currentTarget.style.background = 'transparent' }}
            >
              <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => toggleSelect(c.id, e)}>
                <Avatar name={c.full_name} size={46} />
                {selectedIds.has(c.id) && <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check size={20} color="#fff" strokeWidth={3} /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 }}>
                  <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.full_name}</span>
                  {c.year_added && <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>{c.year_added}</span>}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', gap: 6, alignItems: 'center', overflow: 'hidden' }}>
                  <span style={{ flexShrink: 0 }}>+{c.phone}</span>
                  {c.source && <><span style={{ opacity: 0.4 }}>·</span><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.source}</span></>}
                </div>
                {c.tags?.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                    {c.tags.slice(0, 3).map(t => <span key={t} style={{ background: 'rgba(0,168,132,0.12)', color: 'var(--accent)', padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 500 }}>{t}</span>)}
                    {c.tags.length > 3 && <span style={{ color: 'var(--muted)', fontSize: 11 }}>+{c.tags.length - 3}</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface2)' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}><ChevronLeft size={14} /></button>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 10px', cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer', opacity: page >= totalPages - 1 ? 0.4 : 1 }}><ChevronRight size={14} /></button>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — detail or empty */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: 'var(--muted)' }}>
        <div style={{ fontSize: 56, opacity: 0.2 }}>👤</div>
        <div style={{ fontSize: 14, opacity: 0.4 }}>Click a contact to view details</div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 100, borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{selectedIds.size}</div><span style={{ fontWeight: 600, fontSize: 14 }}>selected</span></div>
          <div style={{ width: 1, height: 20, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBulkTag(true)}><TagIcon size={13} /> Tag</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={13} /> Delete</Button>
          </div>
        </div>
      )}

      {detailContact && <ContactDetail contact={detailContact} onClose={() => setDetailContact(null)} onEdit={(c) => { setEditingContact(c); setShowModal(true) }} onDelete={async (id) => { await handleDelete(id); fetchContacts() }} />}
      {showModal && <ContactModal editingContact={editingContact} onClose={() => setShowModal(false)} onSave={handleSaveContact} />}
      {showBulkTag && <BulkTagModal count={selectedIds.size} onClose={() => setShowBulkTag(false)} onApply={handleBulkTag} />}
      {showImporter && <SmartImporter onClose={() => setShowImporter(false)} onDone={() => { fetchContacts(); fetchFilters() }} />}
    </div>
  )
}
