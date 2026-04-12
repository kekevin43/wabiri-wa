import { useState, useRef, useEffect, useCallback } from 'react'
import { User, Plus, Search, Filter, MoreVertical, Tag as TagIcon, Mail, Phone, Download, X, Trash2, Upload, CheckCircle2, Loader2, RefreshCw, Check, ChevronLeft, ChevronRight, Edit } from 'lucide-react'
import { Card, Button, Badge, PageHeader, Input } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { evolution } from '../../lib/evolution'
import { useAuth } from '../../lib/AuthContext'
import { parsePhoneNumber } from 'libphonenumber-js'

function AddContactModal({ onClose, onSave, editingContact }) {
  const [form, setForm] = useState({ 
    full_name: editingContact?.full_name || '', 
    phone: editingContact?.phone || '', 
    email: editingContact?.email || '',
    source: editingContact?.source || '',
    year_added: editingContact?.year_added || new Date().getFullYear(),
    product_interest: editingContact?.product_interest || '',
    remarks: editingContact?.remarks || '',
    tagInput: '', 
    tags: editingContact?.tags || [] 
  })
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
    if (!form.full_name.trim()) return setError('Name is required')
    if (!form.phone.trim()) return setError('Phone is required')
    
    setSaving(true)
    setError('')
    try {
      let parsedNumber;
      try {
        const parsed = parsePhoneNumber(form.phone, 'KE');
        if (!parsed.isValid()) {
          setSaving(false);
          return setError('Invalid phone number format');
        }
        parsedNumber = parsed.number.replace('+', '');
      } catch (e) {
        setSaving(false);
        return setError('Invalid phone number');
      }

      await onSave({ 
        full_name: form.full_name.trim(), 
        phone: parsedNumber, 
        email: form.email.trim(),
        source: form.source.trim(),
        year_added: Number(form.year_added) || new Date().getFullYear(),
        product_interest: form.product_interest.trim(),
        remarks: form.remarks.trim(),
        tags: form.tags 
      }, editingContact?.id)
      onClose()
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{editingContact ? 'Edit Contact' : 'Add Contact'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
          <div style={{ gridColumn: '1 / -1' }}><Input label="Full Name *" placeholder="e.g. John Doe" value={form.full_name} onChange={e => { setError(''); set('full_name', e.target.value) }} /></div>
          <div style={{ gridColumn: '1 / -1' }}><Input label="Phone Number * (E.164 without +)" placeholder="2547XXXXXXXX" value={form.phone} onChange={e => { setError(''); set('phone', e.target.value) }} /></div>
          
          <Input label="Email" placeholder="email@domain.com" type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          <Input label="Source" placeholder="e.g. Facebook, Cold Call" value={form.source} onChange={e => set('source', e.target.value)} />
          <Input label="Product Interest" placeholder="e.g. Ruiru Plots" value={form.product_interest} onChange={e => set('product_interest', e.target.value)} />
          <Input label="Year Added" type="number" placeholder="2024" value={form.year_added} onChange={e => set('year_added', e.target.value)} />
          
          <div style={{ gridColumn: '1 / -1' }}><Input label="Remarks" placeholder="Additional notes..." value={form.remarks} onChange={e => set('remarks', e.target.value)} /></div>

          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>Tags</label>
             {form.tags.length > 0 && (
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                 {form.tags.map(tag => (
                   <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--accent-glow)', color: 'var(--accent)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500 }}>
                     <TagIcon size={10} /> {tag} <X size={11} style={{ cursor: 'pointer', marginLeft: 2 }} onClick={() => removeTag(tag)} />
                   </span>
                 ))}
               </div>
             )}
             <div style={{ display: 'flex', gap: 8 }}>
               <input value={form.tagInput} onChange={e => set('tagInput', e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder="hot-lead (press Enter)" style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
               <Button variant="ghost" size="sm" onClick={addTag} disabled={!form.tagInput.trim()}>Add</Button>
             </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 28 }}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle2 size={14} />} {saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </div>
  )
}

function BulkTagModal({ onClose, onApply, count }) {
  const [tag, setTag] = useState('')
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, padding: '32px', width: 400 }}>
        <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Bulk Tag</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>Apply a tag to {count} selected contacts.</p>
        <Input label="Tag Name" placeholder="e.g. newsletter-2024" value={tag} onChange={e => setTag(e.target.value.toLowerCase().replace(/\s+/g, '-'))} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 24 }}>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onApply(tag); onClose() }} disabled={!tag.trim()}>Apply Tag</Button>
        </div>
      </div>
    </div>
  )
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(s => s.trim().toLowerCase().replace(/^"|"$/g, ''))
  
  const getCol = (possible) => {
    let index = -1;
    for (const name of possible) {
      index = headers.findIndex(h => h.includes(name))
      if(index !== -1) break;
    }
    return index;
  }
  
  const nameIdx = getCol(['name', 'full name', 'fullname'])
  const phoneIdx = getCol(['phone', 'number', 'mobile'])
  const emailIdx = getCol(['email'])
  const sourceIdx = getCol(['source'])
  const yearIdx = getCol(['year'])
  const productIdx = getCol(['product', 'interest'])
  const remarksIdx = getCol(['remark', 'note'])
  const tagIdx = getCol(['tag'])

  return lines.slice(1).map((line) => {
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(s => s.trim().replace(/^"|"$/g, ''))
    return {
      full_name: nameIdx >= 0 ? parts[nameIdx] : parts[0] || '',
      phone: phoneIdx >= 0 ? parts[phoneIdx].replace(/\D/g, '') : parts[1]?.replace(/\D/g, '') || '',
      email: emailIdx >= 0 ? parts[emailIdx] : '',
      source: sourceIdx >= 0 ? parts[sourceIdx] : '',
      year_added: yearIdx >= 0 ? parseInt(parts[yearIdx]) || new Date().getFullYear() : new Date().getFullYear(),
      product_interest: productIdx >= 0 ? parts[productIdx] : '',
      remarks: remarksIdx >= 0 ? parts[remarksIdx] : '',
      tags: tagIdx >= 0 && parts[tagIdx] ? parts[tagIdx].split(';').map(t => t.trim()).filter(Boolean) : [],
    }
  }).filter(c => c.full_name && c.phone)
}

const PAGE_SIZE = 40

export default function ContactsPage() {
  const { user } = useAuth()
  const [contacts, setContacts] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)
  
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchValue, setSearchValue] = useState('') // debounced
  
  const [filterTag, setFilterTag] = useState('')
  const [filterSource, setFilterSource] = useState('')
  
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [showBulkTag, setShowBulkTag] = useState(false)
  
  const [menuId, setMenuId] = useState(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef(null)

  // Fetch unique properties for filters
  const [uniqueTags, setUniqueTags] = useState([])
  const [uniqueSources, setUniqueSources] = useState([])

  const fetchFilters = useCallback(async () => {
    if (!user) return
    const [tagsRes, sourcesRes] = await Promise.all([
      supabase.rpc('get_distinct_tags', { uid: user.id }),
      supabase.rpc('get_distinct_sources', { uid: user.id })
    ])
    if (tagsRes.data) setUniqueTags(tagsRes.data)
    if (sourcesRes.data) setUniqueSources(sourcesRes.data.filter(Boolean))
  }, [user])

  const fetchContacts = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      let query = supabase.from('contacts').select('*', { count: 'exact' }).eq('user_id', user.id)
      
      if (searchValue) {
        query = query.or(`full_name.ilike.%${searchValue}%,phone.ilike.%${searchValue}%`)
      }
      if (filterTag) {
        query = query.contains('tags', [filterTag])
      }
      if (filterSource) {
         query = query.eq('source', filterSource)
      }

      const from = page * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      
      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      setContacts(data || [])
      setTotalCount(count || 0)
    } catch (e) {
      console.error('Failed to fetch contacts', e)
    } finally {
      setLoading(false)
    }
  }, [user, page, searchValue, filterTag, filterSource])

  useEffect(() => {
    const t = setTimeout(() => { setSearchValue(search); setPage(0) }, 400)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  useEffect(() => {
    fetchFilters()
  }, [fetchFilters])

  const toggleSelect = id => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === contacts.length && contacts.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(contacts.map(c => c.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.size} contacts? This cannot be undone.`)) return
    const ids = Array.from(selectedIds)
    
    // Batch delete
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500)
      await supabase.from('contacts').delete().in('id', chunk)
    }
    
    setPage(0)
    fetchContacts()
    setSelectedIds(new Set())
  }

  const handleBulkTag = async (tagName) => {
    const tag = tagName.toLowerCase().replace(/\s+/g, '-')
    const ids = Array.from(selectedIds)
    
    setLoading(true)
    const { error } = await supabase.rpc('add_tag_to_contacts', { contact_ids: ids, tag })
    if (error) alert('Failed to bulk tag: ' + error.message)
    
    await fetchContacts()
    setSelectedIds(new Set())
    setLoading(false)
  }

  const handleSaveContact = async (contactData, id) => {
    if (id) {
       const { error } = await supabase.from('contacts').update(contactData).eq('id', id)
       if (error) throw error
    } else {
       // Upsert logic for new creations
       const { error } = await supabase.from('contacts').upsert([{ ...contactData, user_id: user.id }], { onConflict: 'user_id,phone' })
       if (error) throw error
    }
    fetchContacts()
  }

  const handleDelete = async (id) => {
    if (!confirm('Remove this contact?')) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) return alert('Failed to delete contact: ' + error.message)
    fetchContacts()
    setMenuId(null)
  }

  const handleCSVImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const parsed = parseCSV(ev.target.result)
        if (parsed.length === 0) throw new Error('No valid contacts found.')
        
        const toUpsert = parsed.map(c => ({ 
          ...c, 
          user_id: user.id 
        }))

        // Batch upserts of 1000 items to not hit payload limits.
        const BATCH_SIZE = 1000
        for (let i = 0; i < toUpsert.length; i += BATCH_SIZE) {
            const chunk = toUpsert.slice(i, i + BATCH_SIZE)
            const { error } = await supabase.from('contacts').upsert(chunk, { onConflict: 'user_id,phone' })
            if (error) throw error
        }
        
        alert(`✅ Successfully imported/updated ${toUpsert.length} contacts`)
        setPage(0)
        fetchContacts()
        fetchFilters()
      } catch (err) {
        alert('Import failed: ' + err.message)
      } finally {
        setImporting(false)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleExport = () => {
    const listToExport = selectedIds.size > 0 ? contacts.filter(c => selectedIds.has(c.id)) : contacts
    if (listToExport.length === 0) return alert('No contacts to export on this page.')
    
    const headers = ['Full Name', 'Phone', 'Email', 'Source', 'Product Interest', 'Year Added', 'Tags', 'Remarks']
    const rows = listToExport.map(c => [
       c.full_name, c.phone, c.email || '', c.source || '', 
       c.product_interest || '', c.year_added || '', 
       (c.tags || []).join(';'), c.remarks || ''
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${(v || '').toString().replace(/"/g, '""')}"`).join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'wabiri_contacts_export.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div className="fade-up" onClick={() => menuId && setMenuId(null)} style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <PageHeader title="Contacts Manager" subtitle={`${totalCount} total contact${totalCount !== 1 ? 's' : ''}`} style={{ marginBottom: 0 }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleCSVImport} style={{ display: 'none' }} />
          <Button variant="ghost" size="sm" onClick={() => fileRef.current?.click()} disabled={loading || importing}>
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={handleExport} disabled={loading}>
            <Download size={15} /> Export Page
          </Button>
          <Button size="sm" onClick={() => { setEditingContact(null); setShowModal(true) }} disabled={loading}>
            <Plus size={15} /> Add Contact
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card style={{ marginBottom: 24, padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
             <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
             <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or phone..." style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', fontSize: 14, outline: 'none', color: 'var(--text)' }} />
             {search && <X size={14} onClick={() => setSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--muted)' }} />}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
             <select value={filterSource} onChange={e => {setFilterSource(e.target.value); setPage(0)}} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: filterSource ? 'var(--accent)' : 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                <option value="">All Sources</option>
                {uniqueSources.map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <select value={filterTag} onChange={e => {setFilterTag(e.target.value); setPage(0)}} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: filterTag ? 'var(--accent)' : 'var(--text)', outline: 'none', cursor: 'pointer' }}>
                <option value="">All Tags</option>
                {uniqueTags.map(t => <option key={t} value={t}>{t}</option>)}
             </select>
          </div>
          
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <Button variant="ghost" size="sm" onClick={toggleSelectAll} style={{ padding: '8px 12px' }}>
             {selectedIds.size === contacts.length && contacts.length > 0 ? 'Deselect Page' : 'Select Page'}
          </Button>
        </div>
      </Card>

      {/* Modern Table Layout for CRM */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: 800 }}>
              <thead>
                 <tr style={{ background: 'var(--surface2)', color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase' }}>
                    <th style={{ padding: '16px 20px', width: 40 }}>
                       <div style={{ width: 18, height: 18, border: '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.size === contacts.length && contacts.length > 0 ? 'var(--accent)' : 'transparent' }} onClick={toggleSelectAll}>
                          {selectedIds.size === contacts.length && contacts.length > 0 && <Check size={12} color="#fff" strokeWidth={4} />}
                       </div>
                    </th>
                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Contact Info</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Source / Interest</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600 }}>Tags</th>
                    <th style={{ padding: '16px 20px', fontWeight: 600, width: 80 }}>Actions</th>
                 </tr>
              </thead>
              <tbody>
                 {loading && contacts.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}><Loader2 className="animate-spin" size={24} style={{ margin: '0 auto 12px' }}/>Loading contacts...</td></tr>
                 ) : contacts.length === 0 ? (
                    <tr><td colSpan={5} style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>No contacts match your criteria.</td></tr>
                 ) : contacts.map(c => (
                    <tr key={c.id} style={{ borderTop: '1px solid var(--border)', transition: 'background 0.1s', background: selectedIds.has(c.id) ? 'var(--wa-active)' : 'transparent' }} onClick={() => toggleSelect(c.id)}>
                       <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ width: 18, height: 18, border: selectedIds.has(c.id) ? '1px solid var(--accent)' : '1px solid var(--border)', borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: selectedIds.has(c.id) ? 'var(--accent)' : 'transparent' }} onClick={() => toggleSelect(c.id)}>
                             {selectedIds.has(c.id) && <Check size={12} color="#fff" strokeWidth={4} />}
                          </div>
                       </td>
                       <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                             {c.full_name} {c.year_added && <span style={{ fontSize: 10, padding: '2px 6px', background: 'var(--surface2)', borderRadius: 4, color: 'var(--muted)' }}>{c.year_added}</span>}
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                             <Phone size={12}/> +{c.phone} {c.email && <><Mail size={12} style={{ marginLeft: 6 }}/> {c.email}</>}
                          </div>
                       </td>
                       <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--muted)' }}>
                          {c.source && <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}><span style={{ color: 'var(--text)' }}>{c.source}</span></div>}
                          {c.product_interest && <div>Interest: <span style={{ color: 'var(--accent)' }}>{c.product_interest}</span></div>}
                       </td>
                       <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                             {c.tags?.slice(0, 3).map(tag => <Badge key={tag} color="muted" style={{ fontSize: 11, padding: '2px 8px' }}>{tag}</Badge>)}
                             {c.tags?.length > 3 && <Badge color="muted" style={{ fontSize: 11, padding: '2px 8px' }}>+{c.tags.length - 3}</Badge>}
                          </div>
                       </td>
                       <td style={{ padding: '16px 20px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ position: 'relative' }}>
                             <button onClick={() => setMenuId(menuId === c.id ? null : c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, borderRadius: 6 }}><MoreVertical size={17} /></button>
                             {menuId === c.id && (
                                <div style={{ position: 'absolute', top: 28, right: 0, zIndex: 100, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '4px 0', minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                                   <div style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--text)' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => { setEditingContact(c); setShowModal(true); setMenuId(null) }}>
                                      <Edit size={14} /> Edit Contact
                                   </div>
                                   <div style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--danger)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={() => handleDelete(c.id)}>
                                      <Trash2 size={14} /> Delete
                                   </div>
                                </div>
                             )}
                          </div>
                       </td>
                    </tr>
                 ))}
              </tbody>
           </table>
        </div>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
           <div style={{ borderTop: '1px solid var(--border)', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                 <Button variant="ghost" size="sm" onClick={() => setPage(Math.max(0, page - 1))} disabled={page === 0}><ChevronLeft size={14} /> Prev</Button>
                 <Button variant="ghost" size="sm" onClick={() => setPage(Math.min(totalPages - 1, page + 1))} disabled={page >= totalPages - 1}>Next <ChevronRight size={14}/></Button>
              </div>
           </div>
        )}
      </Card>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="fade-up" style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24, boxShadow: '0 12px 40px rgba(0,0,0,0.2)', zIndex: 100, borderLeft: '4px solid var(--accent)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14 }}>{selectedIds.size}</div>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Selected</span>
          </div>
          <div style={{ width: 1, height: 24, background: 'var(--border)' }} />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>Cancel</Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBulkTag(true)}><TagIcon size={14} /> Bulk Tag</Button>
            <Button variant="danger" size="sm" onClick={handleBulkDelete}><Trash2 size={14} /> Delete</Button>
          </div>
        </div>
      )}

      {showModal && <AddContactModal editingContact={editingContact} onClose={() => setShowModal(false)} onSave={handleSaveContact} />}
      {showBulkTag && <BulkTagModal count={selectedIds.size} onClose={() => setShowBulkTag(false)} onApply={handleBulkTag} />}
    </div>
  )
}
