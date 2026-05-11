import { useState, useRef } from 'react'
import { Upload, X, ChevronRight, CheckCircle2, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button, Badge } from './ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// The fields WaBiri wants to store
const TARGET_FIELDS = [
  { key: 'full_name',        label: 'Full Name',        required: true },
  { key: 'phone',            label: 'Phone Number',     required: true },
  { key: 'email',            label: 'Email',            required: false },
  { key: 'source',           label: 'Source / Group',   required: false },
  { key: 'product_interest', label: 'Product Interest', required: false },
  { key: 'year_added',       label: 'Year Added',       required: false },
  { key: 'tags',             label: 'Tags (;-separated)',required: false },
  { key: 'remarks',          label: 'Remarks / Notes',  required: false },
  { key: 'status',           label: 'Status / Lead Stage', required: false },
]

// Try to auto-guess mapping based on column header
function autoGuess(headers) {
  const map = {}
  const lower = headers.map(h => h.toLowerCase().trim())

  const rules = {
    full_name:        ['name', 'full name', 'fullname', 'contact name', 'client name'],
    phone:            ['phone', 'mobile', 'number', 'tel', 'whatsapp', 'cell'],
    email:            ['email', 'mail', 'e-mail'],
    source:           ['source', 'group', 'channel', 'category', 'origin'],
    product_interest: ['product', 'interest', 'property', 'item'],
    year_added:       ['year', 'date added', 'year added'],
    tags:             ['tag', 'tags', 'label'],
    remarks:          ['remark', 'remarks', 'note', 'notes', 'comment'],
    status:           ['status', 'stage', 'lead', 'lead stage', 'pipeline'],
  }

  for (const [field, hints] of Object.entries(rules)) {
    for (let i = 0; i < lower.length; i++) {
      if (hints.some(h => lower[i].includes(h))) {
        if (!Object.values(map).includes(i)) {
          map[field] = i
          break
        }
      }
    }
  }
  return map
}

function parseRaw(text) {
  // Detect delimiter: tab or comma
  const firstLine = text.split(/\r?\n/)[0]
  const delimiter = firstLine.includes('\t') ? '\t' : ','

  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return { headers: [], rows: [] }

  const splitLine = (line) => {
    if (delimiter === '\t') return line.split('\t').map(s => s.trim().replace(/^"|"$/g, ''))
    // CSV: handle quoted fields
    const result = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQ = !inQ }
      else if (ch === ',' && !inQ) { result.push(cur.trim()); cur = '' }
      else { cur += ch }
    }
    result.push(cur.trim())
    return result
  }

  const headers = splitLine(lines[0])
  const rows = lines.slice(1).map(l => splitLine(l))
  return { headers, rows }
}

function normalizePhone(raw) {
  // Strip everything except digits
  let digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return null
  // Kenya: if starts with 07 or 01 -> prefix 254
  if (digits.startsWith('07') || digits.startsWith('01')) digits = '254' + digits.slice(1)
  // If starts with 7 and 9 digits total -> 254 prefix
  if (digits.startsWith('7') && digits.length === 9) digits = '254' + digits
  // If starts with 0 and 10 digits -> strip leading 0 add 254
  if (digits.startsWith('0') && digits.length === 10) digits = '254' + digits.slice(1)
  if (digits.length < 7) return null
  return digits
}

// Steps: 0=upload, 1=map columns, 2=importing, 3=done
export default function SmartImporter({ onClose, onDone }) {
  const { user } = useAuth()
  const fileRef = useRef()

  const [step, setStep] = useState(0)
  const [fileName, setFileName] = useState('')
  const [headers, setHeaders] = useState([])
  const [rows, setRows] = useState([])
  const [mapping, setMapping] = useState({}) // field -> colIndex
  const [defaultTag, setDefaultTag] = useState('')
  const [progress, setProgress] = useState({ done: 0, total: 0, skipped: 0, errors: 0 })
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const { headers: h, rows: r } = parseRaw(ev.target.result)
      if (h.length === 0) { setError('Could not parse file. Make sure it is a CSV or TSV.'); return }
      setHeaders(h)
      setRows(r)
      setMapping(autoGuess(h))
      setStep(1)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const setMap = (field, colIndex) => {
    setMapping(prev => {
      const next = { ...prev }
      if (colIndex === '') { delete next[field]; return next }
      // Remove if another field had this col
      for (const k of Object.keys(next)) { if (next[k] === Number(colIndex) && k !== field) delete next[k] }
      next[field] = Number(colIndex)
      return next
    })
  }

  const handleImport = async () => {
    if (!mapping.full_name && !mapping.phone) {
      setError('You must map at least Phone Number.')
      return
    }
    setImporting(true)
    setStep(2)
    setError('')

    const get = (row, field) => {
      const idx = mapping[field]
      if (idx === undefined || idx === null) return ''
      return (row[idx] || '').toString().trim()
    }

    // Build records
    const records = []
    let skipped = 0
    for (const row of rows) {
      const phone = normalizePhone(get(row, 'phone'))
      if (!phone) { skipped++; continue }

      const name = get(row, 'full_name') || phone
      const rawTags = get(row, 'tags')
      const tagsFromCol = rawTags ? rawTags.split(/[;,|]/).map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean) : []
      const extraTags = defaultTag ? [defaultTag.trim().toLowerCase().replace(/\s+/g, '-')] : []

      // Map status -> tag (e.g. "Hot Lead" -> "hot-lead")
      const statusVal = get(row, 'status')
      const statusTag = statusVal ? [statusVal.toLowerCase().replace(/\s+/g, '-')] : []

      const allTags = [...new Set([...tagsFromCol, ...extraTags, ...statusTag])]

      records.push({
        user_id: user.id,
        full_name: name,
        phone,
        email: get(row, 'email') || null,
        source: get(row, 'source') || null,
        product_interest: get(row, 'product_interest') || null,
        year_added: parseInt(get(row, 'year_added')) || null,
        remarks: get(row, 'remarks') || null,
        tags: allTags,
      })
    }

    setProgress({ done: 0, total: records.length, skipped, errors: 0 })

    // Batch upsert 500 at a time
    const BATCH = 500
    let errors = 0
    for (let i = 0; i < records.length; i += BATCH) {
      const chunk = records.slice(i, i + BATCH)
      const { error: err } = await supabase
        .from('contacts')
        .upsert(chunk, { onConflict: 'user_id,phone' })
      if (err) { errors += chunk.length }
      setProgress(p => ({ ...p, done: Math.min(i + BATCH, records.length), errors }))
    }

    setImporting(false)
    setStep(3)
    setProgress(p => ({ ...p, skipped }))
  }

  const previewRows = rows.slice(0, 3)
  const mappedCount = Object.keys(mapping).length
  const canImport = mapping.phone !== undefined

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 20 }}>
      <div className="fade-up" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', padding: 32 }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Smart Contact Importer</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--muted)' }}>
              {step === 0 && 'Upload any CSV or Excel export'}
              {step === 1 && `${rows.length} rows detected — map your columns`}
              {step === 2 && 'Importing to Supabase...'}
              {step === 3 && 'Import complete!'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}><X size={20} /></button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {['Upload', 'Map Columns', 'Import', 'Done'].map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ height: 3, borderRadius: 2, background: step >= i ? 'var(--accent)' : 'var(--border)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: step >= i ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'center' }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}

        {/* STEP 0: Upload */}
        {step === 0 && (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed var(--border)', borderRadius: 16, padding: '64px 20px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <Upload size={36} color="var(--muted)" style={{ marginBottom: 16 }} />
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Drop her spreadsheet here</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>Supports CSV or TSV (Excel "Save As CSV")</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Any column order — you'll map them next</div>
            <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} style={{ display: 'none' }} />
          </div>
        )}

        {/* STEP 1: Column Mapping */}
        {step === 1 && (
          <div>
            {/* Preview */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>File Preview — {fileName}</div>
              <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border)' }}>
                <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: '100%' }}>
                  <thead>
                    <tr style={{ background: 'var(--surface2)' }}>
                      {headers.map((h, i) => <th key={i} style={{ padding: '8px 12px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', borderRight: '1px solid var(--border)' }}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, ri) => (
                      <tr key={ri} style={{ borderTop: '1px solid var(--border)' }}>
                        {headers.map((_, ci) => <td key={ci} style={{ padding: '7px 12px', color: 'var(--text)', whiteSpace: 'nowrap', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: '1px solid var(--border)' }}>{row[ci] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mapping UI */}
            <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 12 }}>
              Map Columns → WaBiri Fields
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {TARGET_FIELDS.map(field => (
                <div key={field.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--surface2)', borderRadius: 10, border: mapping[field.key] !== undefined ? '1px solid var(--accent)' : '1px solid var(--border)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'flex', gap: 6, alignItems: 'center' }}>
                      {field.label}
                      {field.required && <span style={{ color: 'var(--danger)', fontSize: 10 }}>*</span>}
                    </div>
                  </div>
                  <ArrowRight size={12} color="var(--muted)" />
                  <select
                    value={mapping[field.key] !== undefined ? mapping[field.key] : ''}
                    onChange={e => setMap(field.key, e.target.value)}
                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, color: 'var(--text)', outline: 'none', maxWidth: 150 }}
                  >
                    <option value="">— skip —</option>
                    {headers.map((h, i) => <option key={i} value={i}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            {/* Default tag */}
            <div style={{ marginBottom: 24, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Apply a tag to ALL imported contacts (optional)</div>
              <input
                value={defaultTag}
                onChange={e => setDefaultTag(e.target.value)}
                placeholder="e.g. imported-may-2025, real-estate-client"
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>Status column values will also auto-become tags (e.g. "Hot Lead" → "hot-lead")</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {mappedCount} column{mappedCount !== 1 ? 's' : ''} mapped · {rows.length} rows to import
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
                <Button onClick={handleImport} disabled={!canImport}>
                  Import {rows.length} Contacts <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Importing */}
        {step === 2 && (
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Loader2 size={40} className="animate-spin" color="var(--accent)" style={{ margin: '0 auto 20px' }} />
            <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
              {progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0}%
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 24 }}>
              Uploading {progress.done} of {progress.total} contacts...
            </div>
            <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden', maxWidth: 400, margin: '0 auto' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${progress.total > 0 ? (progress.done / progress.total) * 100 : 0}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* STEP 3: Done */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(34,197,94,0.1)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={34} color="var(--accent)" />
            </div>
            <h3 style={{ fontSize: 22, margin: '0 0 8px', fontWeight: 700 }}>Import Complete!</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '20px 0 32px' }}>
              <div>
                <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)' }}>{progress.done - progress.errors}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Imported</div>
              </div>
              {progress.skipped > 0 && (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--warning)' }}>{progress.skipped}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Skipped (no phone)</div>
                </div>
              )}
              {progress.errors > 0 && (
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--danger)' }}>{progress.errors}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase' }}>Errors</div>
                </div>
              )}
            </div>
            <Button onClick={() => { onDone(); onClose() }}>View Contacts</Button>
          </div>
        )}
      </div>
    </div>
  )
}
