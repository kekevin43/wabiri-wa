import { useState, useEffect } from 'react'
import { Smartphone, Plus, Wifi, WifiOff, QrCode, Trash2, RefreshCw, Loader2 } from 'lucide-react'
import { Card, Badge, Button, PageHeader, Input } from '../../components/ui'
import { evolution } from '../../lib/evolution'

function QRModal({ onClose, onSuccess }) {
  const [step, setStep] = useState('form') // form | qr | connected
  const [name, setName] = useState('')
  const [qrCode, setQrCode] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await evolution.createInstance(name);
      if (data.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setStep('qr');
        startPolling(name);
      } else {
        throw new Error('No QR code returned');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const startPolling = (instanceName) => {
    const interval = setInterval(async () => {
      try {
        const status = await evolution.getStatus(instanceName)
        if (status.instance?.state === 'open') {
          setStep('connected')
          clearInterval(interval)
          onSuccess?.()
        }
      } catch (e) {
        // Silent fail on polling errors
      }
    }, 3000)
    return () => clearInterval(interval)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 100,
    }}>
      <div className="fade-up" style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 16, padding: '32px', width: 400,
      }}>
        <h2 style={{ margin: '0 0 4px', fontSize: 18 }}>Connect Instance</h2>
        <p style={{ margin: '0 0 24px', color: 'var(--muted)', fontSize: 13 }}>
          Link a WhatsApp number to your account
        </p>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {step === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input
              label="Instance Name"
              placeholder="e.g. Sales Team"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleCreate} loading={loading} disabled={!name.trim()}>
                Generate QR
              </Button>
            </div>
          </div>
        )}

        {step === 'qr' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 200, height: 200, margin: '0 auto 16px',
              background: '#fff', border: '1px solid var(--border)',
              borderRadius: 12, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
            }}>
              {qrCode ? (
                <img src={qrCode} alt="QR Code" style={{ width: '100%', height: '100%' }} />
              ) : (
                <Loader2 className="animate-spin" size={32} color="var(--accent)" />
              )}
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
              Open WhatsApp → Linked Devices → Link a Device
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            </div>
          </div>
        )}

        {step === 'connected' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--accent-glow)', border: '2px solid var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              <Wifi size={28} color="var(--accent)" />
            </div>
            <h3 style={{ margin: '0 0 6px' }}>Instance connected!</h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              Your WhatsApp instance is ready to send messages.
            </p>
            <Button onClick={onClose}>Done</Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InstancesPage() {
  const [instances, setInstances] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  const fetchInstances = async () => {
    try {
      const rawData = await evolution.listInstances()
      const list = Array.isArray(rawData) ? rawData : (rawData?.instances || [])
      
      setInstances(list.map(inst => {
        // Handle different API version response shapes
        const info = inst.instance || inst;
        return {
          id: info.instanceId || info.instanceName,
          name: info.instanceName,
          number: info.owner || info.number || null,
          status: (info.state === 'open' || info.status === 'CONNECTED') ? 'connected' : 'disconnected',
          msgs: 0
        }
      }))
    } catch (e) {
      console.error('Failed to fetch instances', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInstances()
  }, [])

  const handleDelete = async (name) => {
    if (!confirm(`Delete instance ${name}?`)) return
    try {
      await evolution.logoutInstance?.(name).catch(() => {}); // Optional: Safely logout before delete just in case
      await evolution.deleteInstance(name)
      fetchInstances()
    } catch (e) {
      alert(`Delete failed: ${e.message}`)
    }
  }

  return (
    <div className="fade-up">
      <PageHeader
        title="Instances"
        subtitle="Manage connected WhatsApp numbers"
        action={<Button onClick={() => setShowModal(true)}><Plus size={15} /> New Instance</Button>}
      />

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)' }}>
          <Loader2 className="animate-spin" style={{ margin: '0 auto 12px' }} />
          Loading instances...
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {instances.map(inst => (
            <Card key={inst.id} style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10,
                    background: inst.status === 'connected' ? 'var(--accent-glow)' : 'rgba(107,107,114,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Smartphone size={18} color={inst.status === 'connected' ? 'var(--accent)' : 'var(--muted)'} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontFamily: 'Syne', fontSize: 15 }}>{inst.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'JetBrains Mono' }}>
                      {inst.number || 'Not linked'}
                    </div>
                  </div>
                </div>
                <Badge color={inst.status === 'connected' ? 'accent' : 'muted'}>
                  {inst.status}
                </Badge>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {inst.status === 'disconnected' ? (
                  <Button size="sm" onClick={() => setShowModal(true)}>
                    <QrCode size={13} /> Connect
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" onClick={fetchInstances}>
                    <RefreshCw size={13} /> Refresh
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => handleDelete(inst.name)}
                  style={{ marginLeft: 'auto', color: 'var(--danger)' }}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </Card>
          ))}

          <div
            onClick={() => setShowModal(true)}
            style={{
              border: '1px dashed var(--border)', borderRadius: 12,
              padding: '20px 24px', cursor: 'pointer', minHeight: 140,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8, color: 'var(--muted)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
          >
            <Plus size={22} strokeWidth={1.5} />
            <span style={{ fontSize: 14 }}>Add Instance</span>
          </div>
        </div>
      )}

      {showModal && <QRModal onClose={() => setShowModal(false)} onSuccess={fetchInstances} />}
    </div>
  )
}
