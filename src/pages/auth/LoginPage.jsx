import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { Zap, ArrowRight, ShieldCheck } from 'lucide-react'
import { Button, Input } from '../../components/ui'

export default function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    // For demo/trial, allow quick sign in or use actual auth
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) { setError(err.message); return }
    navigate('/dashboard')
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px'
    }}>
      {/* Decorative Elements */}
      <div style={{
        position: 'fixed', top: -100, right: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'var(--accent-glow)', filter: 'blur(80px)',
        pointerEvents: 'none', zIndex: 0
      }} />
      <div style={{
        position: 'fixed', bottom: -100, left: -100, width: 300, height: 300,
        borderRadius: '50%', background: 'rgba(59,130,246,0.05)', filter: 'blur(60px)',
        pointerEvents: 'none', zIndex: 0
      }} />

      <div className="fade-up" style={{
        width: '100%', maxWidth: 440,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 24,
        padding: '48px 40px',
        position: 'relative', zIndex: 1,
        boxShadow: '0 20px 40px rgba(0,0,0,0.04)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            boxShadow: '0 8px 16px var(--accent-glow)',
          }}>
            <Zap size={28} color="#FFF" strokeWidth={2.5} />
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--text)' }}>
            WaBiri
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 15, fontWeight: 500 }}>
            Premium Sales Lead Workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Input
            label="Work Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Password</label>
                <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, cursor: 'pointer' }}>Forgot?</span>
             </div>
             <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', background: 'var(--surface2)',
                  border: '1px solid var(--border)', borderRadius: 10,
                  padding: '12px 16px', color: 'var(--text)',
                  fontFamily: 'Outfit', fontSize: 15, outline: 'none',
                  transition: 'border-color 0.2s'
                }}
                onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 10, padding: '12px 16px', fontSize: 14, color: 'var(--danger)',
              fontWeight: 500, display: 'flex', gap: 8, alignItems: 'center'
            }}>
              <ShieldCheck size={16} /> {error}
            </div>
          )}

          <Button
            type="submit"
            loading={loading}
            style={{ width: '100%', marginTop: 8 }}
          >
            Sign Into Workspace <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>

          <div 
            onClick={() => navigate('/dashboard')}
            style={{ 
              marginTop: 12, textAlign: 'center', fontSize: 13, color: 'var(--muted)', 
              cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' 
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            Access for Client Demo (Bypass Auth)
          </div>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
           <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
             Secure enterprise access managed by <strong>WaBiri Cloud</strong>
           </p>
        </div>
      </div>
    </div>
  )
}
