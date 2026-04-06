import { useState, useEffect, useRef } from 'react'
import { Smartphone, Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Card, Badge, Button, PageHeader, Input } from '../../components/ui'
import { evolution } from '../../lib/evolution'
import { useNavigate } from 'react-router-dom'

// ── QR Modal ─────────────────────────────────────────────────────────────────
function QRModal({ instanceName: existingName, onClose, onSuccess }) {
  const isReconnect = !!existingName
  const [step, setStep] = useState(isReconnect ? 'qr' : 'form')
  const [name, setName] = useState(existingName || '')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const pollRef = useRef(null)

  // If reconnecting, generate QR immediately
  useEffect(() => {
    if (isReconnect) generateQR(existingName)
    return () => clearInterval(pollRef.current)
  }, [])

  const generateQR = async (instName, retry = true) => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (isReconnect) {
        data = await evolution.getQrCode(instName)
      } else {
        try {
          await evolution.createInstance(instName)
        } catch (err) {
          const isConflict = err.message.includes('Bad Request') || err.message.toLowerCase().includes('already exists')
          if (isConflict && retry) {
            console.log('Duplicate name detected, cleaning up ghost instance...')
            try { await evolution.deleteInstance(instName) } catch (_) {}
            return generateQR(instName, false)
          }
          throw err
        }
        // Give the WebSocket a moment to initialize before fetching QR
        await new Promise(r => setTimeout(r, 2500))
        data = await evolution.getQrCode(instName)
      }
      // Evolution API v2 returns QR in several shapes — handle all of them
      const base64 = data?.qrcode?.base64 || data?.base64 || data?.qrcode?.code || data?.code
      if (base64) {
        setQrCode(base64)
        setStep('qr')
        startPolling(instName)
      } else {
        throw new Error('No QR code returned from server')
      }
    } catch (err) {
      console.error('QR Gen Error:', err)
      setError(err.message)
      setStep('form')
    } finally {
      if (!retry) setLoading(false)
      else if (step !== 'qr') setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!name.trim()) return
    await generateQR(name.trim())
  }

  const startPolling = (instName) => {
    clearInterval(pollRef.current)
    pollRef.current = setInterval(async () => {
      try {
        const status = await evolution.getStatus(instName)
        const state = status?.instance?.state || status?.state
        if (state === 'open' || state === 'connected') {
          clearInterval(pollRef.current)
          setStep('connected')
          onSuccess?.()
        }
      } catch (_) { /* silent */ }
    }, 4000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100,
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 20, padding: '36px', width: 420, textAlign: 'center',
      }}>
        {/* STEP: form */}
        {step === 'form' && (
          <>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Smartphone size={26} color="var(--accent)" />
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: 20 }}>Add WhatsApp Instance</h2>
            <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>Give this device a name so you can identify it</p>
            {error && <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 12, marginBottom: 16, textAlign: 'left' }}>{error}</div>}
            <Input label="Device Name" placeholder="e.g. Sales Team · Kevin's iPhone" value={name} onChange={e => setName(e.target.value)} style={{ marginBottom: 16, textAlign: 'left' }} />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreate} disabled={!name.trim() || loading}>
                {loading ? <Loader2 className="animate-spin" size={14} /> : <QrCode size={14} />} Generate QR
              </Button>
            </div>
          </>
        )}

        {/* STEP: qr */}
        {step === 'qr' && (
          <>
            <p style={{ margin: '0 0 6px', color: 'var(--muted)', fontSize: 13, fontWeight: 600 }}>Scan with WhatsApp</p>
            <h2 style={{ margin: '0 0 20px', fontSize: 18 }}>{name}</h2>
            <div style={{
              width: 220, height: 220, margin: '0 auto 16px',
              background: '#fff', border: '4px solid var(--accent)',
              borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {loading ? (
                <Loader2 className="animate-spin" size={36} color="var(--accent)" />
              ) : qrCode ? (
                <img src={qrCode} alt="QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Loader2 className="animate-spin" size={36} color="var(--accent)" />
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20, lineHeight: 1.5 }}>
              Open WhatsApp → <strong>Settings → Linked Devices → Link a Device</strong>
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center' }}>
              <Loader2 className="animate-spin" size={14} color="var(--accent)" />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Waiting for scan…</span>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            </div>
          </>
        )}

        {/* STEP: connected */}
        {step === 'connected' && (
          <>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'var(--accent-glow)', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={34} color="var(--accent)" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: 20 }}>Connected!</h2>
            <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 8 }}>
              <strong>{name}</strong> is now live and ready.
            </p>
            <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 24 }}>You can now send messages and campaigns through this instance.</p>
            <Button onClick={onClose}>Done</Button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InstancesPage() {
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [modal, setModal] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const pollRef = useRef(null)
  const navigate = useNavigate()

  const parseInstances = (rawData) => {
    const list = Array.isArray(rawData) ? rawData : (rawData?.instances || [])
    return list.map(inst => {
      const info = inst.instance || inst
      const name = info.instanceName || info.name || info.instance_name || '(unnamed)'
      const id = info.instanceId || info.id || name
      const rawStatus = info.connectionStatus || info.state || info.status || ''
      const isConnected = ['open', 'CONNECTED', 'connected'].includes(rawStatus)
      return {
        id,
        name,
        number: info.owner || info.ownerJid?.split('@')[0] || info.number || null,
        status: isConnected ? 'connected' : 'disconnected',
        rawStatus,
      }
    })
  }

  const fetchInstances = async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const rawData = await evolution.listInstances()
      const parsed = parseInstances(rawData)

      // Auto-clean disconnected instances that have no phone number yet
      // (these are ghost instances — created but never scanned)
      const ghosts = parsed.filter(i => i.status === 'disconnected' && !i.number)
      for (const ghost of ghosts) {
        try { await evolution.deleteInstance(ghost.name) } catch (_) {}
      }

      // Refetch after cleanup if any ghosts removed
      if (ghosts.length > 0) {
        const fresh = await evolution.listInstances()
        setInstances(parseInstances(fresh))
      } else {
        setInstances(parsed)
      }
    } catch (e) {
      console.error('Failed to fetch instances', e)
    } finally {
      setLoading(false)
    }
  }

  // Initial load + live polling every 5 seconds
  useEffect(() => {
    fetchInstances()
    pollRef.current = setInterval(() => fetchInstances(true), 5000)
    return () => clearInterval(pollRef.current)
  }, [])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchInstances(true)
    setRefreshing(false)
  }

  const handleDelete = async (inst) => {
    if (!inst?.name) return
    if (!confirm(`Are you sure you want to remove device "${inst.name}"?`)) return
    
    setDeletingId(inst.name)
    try {
      // 1. If connected, try to logout first (makes deletion smoother in Evolution API)
      if (inst.status === 'connected') {
        try { await evolution.logoutInstance(inst.name) } catch (e) { console.warn('Logout failed, moving to delete', e) }
      }
      
      // 2. Perform the actual deletion
      await evolution.deleteInstance(inst.name)
      
      // Refresh the list
      await fetchInstances(true)
    } catch (e) {
      alert(`Remove failed: ${e.message}`)
    } finally {
      setDeletingId(null)
    }
  }

  const connectedInstances = instances.filter(i => i.status === 'connected')
  const disconnectedInstances = instances.filter(i => i.status === 'disconnected')

  return (
    <div className="fade-up">
      <PageHeader
        title="Instances"
        subtitle="Your connected WhatsApp devices"
        action={<Button onClick={() => setModal({})}><Plus size={15} /> New Instance</Button>}
      />

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--muted)' }}>
          <Loader2 className="animate-spin" size={28} style={{ margin: '0 auto 12px', display: 'block' }} />
          Loading devices…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Connected */}
          {connectedInstances.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
                <span style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Connected · {connectedInstances.length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {connectedInstances.map(inst => (
                  <InstanceCard
                    key={inst.id}
                    inst={inst}
                    onDelete={() => handleDelete(inst)}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                    deleting={deletingId === inst.name}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Disconnected (but have a phone number — were once linked) */}
          {disconnectedInstances.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--muted)' }} />
                <span style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 13, color: 'var(--muted)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  Disconnected · {disconnectedInstances.length}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                {disconnectedInstances.map(inst => (
                  <InstanceCard
                    key={inst.id}
                    inst={inst}
                    onConnect={() => setModal({ instanceName: inst.name })}
                    onDelete={() => handleDelete(inst)}
                    deleting={deletingId === inst.name}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Empty state */}
          {instances.length === 0 && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
              <div style={{ width: 72, height: 72, borderRadius: 20, background: 'var(--surface)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Smartphone size={32} strokeWidth={1} />
              </div>
              <p style={{ margin: '0 0 20px', fontSize: 15 }}>No devices connected yet.</p>
              <Button onClick={() => setModal({})}><Plus size={14} /> Add your first device</Button>
            </div>
          )}

          {/* Add new tile */}
          {instances.length > 0 && (
            <div
              onClick={() => setModal({})}
              style={{
                border: '1px dashed var(--border)', borderRadius: 12,
                padding: '20px 24px', cursor: 'pointer', minHeight: 120,
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', gap: 8, color: 'var(--muted)',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
            >
              <Plus size={22} strokeWidth={1.5} />
              <span style={{ fontSize: 14 }}>Add another device</span>
            </div>
          )}
        </div>
      )}

      {modal !== null && (
        <QRModal
          instanceName={modal.instanceName}
          onClose={() => setModal(null)}
          onSuccess={() => {
            setModal(null)
            fetchInstances()
            // Auto-navigate to inbox after connecting — WhatsApp Web behaviour
            setTimeout(() => navigate('/inbox'), 800)
          }}
        />
      )}
    </div>
  )
}

// ── Instance Card ─────────────────────────────────────────────────────────────
function InstanceCard({ inst, onConnect, onDelete, onRefresh, deleting, refreshing }) {
  const connected = inst.status === 'connected'
  const initial = (inst.name || '?').charAt(0).toUpperCase()

  return (
    <Card style={{ position: 'relative', padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, flexShrink: 0,
            background: connected ? 'var(--accent-glow)' : 'rgba(107,107,114,0.08)',
            border: `2px solid ${connected ? 'var(--accent)' : 'var(--border)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 800, color: connected ? 'var(--accent)' : 'var(--muted)',
            fontFamily: 'Syne',
          }}>
            {initial}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontFamily: 'Syne', fontSize: 16, marginBottom: 2 }}>{inst.name}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono', display: 'flex', alignItems: 'center', gap: 5 }}>
              {connected
                ? <><Wifi size={10} color="var(--accent)" /> {inst.number || 'Fetching number…'}</>
                : <><WifiOff size={10} /> {inst.number || 'Not linked'}</>
              }
            </div>
          </div>
        </div>
        <Badge color={connected ? 'accent' : 'muted'}>{connected ? '● Live' : '○ Off'}</Badge>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        {!connected && onConnect && (
          <Button size="sm" onClick={onConnect}><QrCode size={13} /> Reconnect</Button>
        )}
        {connected && onRefresh && (
          <Button size="sm" variant="ghost" onClick={onRefresh} disabled={refreshing}>
            {refreshing
              ? <Loader2 className="animate-spin" size={13} />
              : <RefreshCw size={13} />
            }
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete} disabled={deleting}
          style={{ marginLeft: 'auto', color: 'var(--danger)' }}>
          {deleting ? <Loader2 className="animate-spin" size={13} /> : <Trash2 size={13} />}
          Remove
        </Button>
      </div>
    </Card>
  )
}
