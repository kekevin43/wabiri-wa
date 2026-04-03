import { useState, useRef, useEffect } from 'react'
import { Upload, Send, FileText, X, AlertCircle, CheckCircle2, ChevronRight, Loader2 } from 'lucide-react'
import { Card, Button, Textarea, PageHeader, Badge } from '../../components/ui'
import { evolution } from '../../lib/evolution'

const STEPS = ['Upload Contacts', 'Compose Message', 'Review & Send']

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 28, gap: 0 }}>
      {STEPS.map((label, i) => {
        const done = i < current
        const active = i === current
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--accent)' : active ? 'var(--accent-glow)' : 'var(--surface2)',
                border: active ? '2px solid var(--accent)' : done ? 'none' : '2px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, fontFamily: 'Syne',
                color: done ? '#000' : active ? 'var(--accent)' : 'var(--muted)',
              }}>
                {done ? <CheckCircle2 size={14} /> : i + 1}
              </div>
              <span style={{
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--text)' : done ? 'var(--accent)' : 'var(--muted)',
              }}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div style={{ flex: 1, height: 1, background: done ? 'var(--accent)' : 'var(--border)', margin: '0 12px' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function BulkSendPage() {
  const [step, setStep] = useState(0)
  const [contacts, setContacts] = useState([])
  const [fileName, setFileName] = useState('')
  const [message, setMessage] = useState('')
  const [instance, setInstance] = useState('')
  const [instances, setInstances] = useState([])
  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, success: 0, fail: 0 })
  const [sent, setSent] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    evolution.listInstances().then(data => {
      setInstances(data.filter(i => i.instance.state === 'open').map(i => i.instance.instanceName))
    })
  }, [])

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(Boolean)
      // Expect CSV: phone,name or just phone
      const parsed = lines.slice(1).map((line, i) => {
        const parts = line.split(',').map(s => s.trim())
        return { id: i, name: parts[1] || `Contact ${i + 1}`, phone: parts[0] || parts[1] }
      }).filter(c => c.phone)
      setContacts(parsed)
    }
    reader.readAsText(file)
  }

  const charCount = message.length
  const msgCount = Math.ceil(charCount / 160) || 1

  const handleSend = async () => {
    setSending(true)
    setProgress({ current: 0, total: contacts.length, success: 0, fail: 0 })

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i]
      const personalizedMsg = message.replace('{{name}}', contact.name)
      
      try {
        await evolution.sendMessage(instance, contact.phone, personalizedMsg)
        setProgress(p => ({ ...p, current: i + 1, success: p.success + 1 }))
      } catch (err) {
        console.error('Failed to send to', contact.phone, err)
        setProgress(p => ({ ...p, current: i + 1, fail: p.fail + 1 }))
      }

      // Important: Add delay between messages to avoid bans
      if (i < contacts.length - 1) {
        await new Promise(r => setTimeout(r, 2000)) 
      }
    }

    setSending(false)
    setSent(true)
  }

  if (sent) return (
    <div className="fade-up" style={{ maxWidth: 500, margin: '80px auto', textAlign: 'center' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--accent-glow)', border: '2px solid var(--accent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px', boxShadow: '0 0 40px var(--accent-glow)',
      }}>
        <CheckCircle2 size={32} color="var(--accent)" />
      </div>
      <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Campaign Complete!</h2>
      <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
        Successfully sent {progress.success} of {progress.total} messages.
        {progress.fail > 0 && ` (${progress.fail} failed)`}
      </p>
      <Button onClick={() => { setSent(false); setStep(0); setContacts([]); setMessage(''); setFileName('') }}>
        Send Another Batch
      </Button>
    </div>
  )

  return (
    <div className="fade-up">
      <PageHeader
        title="Bulk Send"
        subtitle="Upload contacts and send personalized WhatsApp messages"
      />

      <div style={{ maxWidth: 680 }}>
        <StepIndicator current={step} />

        {/* Step 0: Upload */}
        {step === 0 && (
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Upload Contact List</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>
              CSV format: <span className="mono" style={{ color: 'var(--accent)' }}>phone,name</span> — one contact per row. Phone must include country code.
            </p>

            <input type="file" accept=".csv,.txt" ref={fileRef} onChange={handleFile} style={{ display: 'none' }} />

            {!fileName ? (
              <div
                onClick={() => fileRef.current.click()}
                style={{
                  border: '2px dashed var(--border)', borderRadius: 12,
                  padding: '48px 20px', textAlign: 'center', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <Upload size={32} color="var(--muted)" strokeWidth={1.5} style={{ marginBottom: 10 }} />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Drop CSV here or click to upload</div>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>Supports .csv and .txt</div>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 16px', background: 'var(--surface2)',
                border: '1px solid var(--accent)', borderRadius: 10,
              }}>
                <FileText size={20} color="var(--accent)" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{fileName}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {contacts.length} contacts loaded
                  </div>
                </div>
                <button
                  onClick={() => { setFileName(''); setContacts([]) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {contacts.length > 0 && (
              <div style={{ marginTop: 16, maxHeight: 160, overflowY: 'auto' }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>Preview (first 5):</div>
                {contacts.slice(0, 5).map(c => (
                  <div key={c.id} style={{
                    display: 'flex', gap: 12, padding: '6px 0',
                    borderBottom: '1px solid var(--border)', fontSize: 13,
                  }}>
                    <span className="mono" style={{ color: 'var(--accent)', minWidth: 140 }}>{c.phone}</span>
                    <span style={{ color: 'var(--muted)' }}>{c.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={() => setStep(1)} disabled={contacts.length === 0}>
                Next <ChevronRight size={15} />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 1: Compose */}
        {step === 1 && (
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Compose Message</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>
              Use <span className="mono" style={{ color: 'var(--accent)' }}>{'{{name}}'}</span> to personalize with contact name.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500, display: 'block', marginBottom: 6 }}>
                WhatsApp Instance
              </label>
              <select
                value={instance}
                onChange={e => setInstance(e.target.value)}
                style={{
                  width: '100%', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  padding: '10px 14px', color: instance ? 'var(--text)' : 'var(--muted)',
                  fontFamily: 'Outfit', fontSize: 14, outline: 'none',
                }}
              >
                <option value="" disabled>Select instance...</option>
                {instances.map(i => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              {instances.length === 0 && (
                <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>No connected instances found. Connect one first.</p>
              )}
            </div>

            <Textarea
              label="Message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hi {{name}}, we have an exciting property offer for you...`}
              style={{ minHeight: 140 }}
            />

            <div style={{
              display: 'flex', gap: 12, marginTop: 8, fontSize: 12, color: 'var(--muted)'
            }}>
              <span>{charCount} chars</span>
              <span>·</span>
              <span>{contacts.length} recipients</span>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button onClick={() => setStep(2)} disabled={!message.trim() || !instance}>
                Review <ChevronRight size={15} />
              </Button>
            </div>
          </Card>
        )}

        {/* Step 2: Review */}
        {step === 2 && (
          <Card>
            <h3 style={{ margin: '0 0 4px', fontSize: 16 }}>Review & Send</h3>
            <p style={{ margin: '0 0 20px', color: 'var(--muted)', fontSize: 13 }}>
              Double-check before sending. This action cannot be undone.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Contacts', value: `${contacts.length} recipients` },
                { label: 'Instance', value: instance },
                { label: 'Message length', value: `${charCount} characters` },
              ].map(({ label, value }) => (
                <div key={label} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '10px 14px', background: 'var(--surface2)',
                  borderRadius: 8, fontSize: 14,
                }}>
                  <span style={{ color: 'var(--muted)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>

            {sending && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                  <span style={{ color: 'var(--muted)' }}>Sending progress...</span>
                  <span>{progress.current} / {progress.total}</span>
                </div>
                <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', background: 'var(--accent)', 
                    width: `${(progress.current / progress.total) * 100}%`,
                    transition: 'width 0.3s'
                  }} />
                </div>
                <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 12 }}>
                   <span style={{ color: 'var(--accent)' }}>✓ {progress.success} sent</span>
                   {progress.fail > 0 && <span style={{ color: 'var(--danger)' }}>✗ {progress.fail} failed</span>}
                </div>
              </div>
            )}

            {!sending && (
              <div style={{
                display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20,
                padding: '10px 12px', background: 'rgba(245,158,11,0.08)',
                borderRadius: 8, fontSize: 13, color: 'var(--warning)',
              }}>
                <AlertCircle size={14} />
                Messages will be sent with a 2s delay to avoid blocking.
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button variant="ghost" onClick={() => setStep(1)} disabled={sending}>Back</Button>
              <Button onClick={handleSend} loading={sending}>
                {sending ? `Sending ${progress.current}/${progress.total}...` : <><Send size={14} /> Send {contacts.length} Messages</>}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
