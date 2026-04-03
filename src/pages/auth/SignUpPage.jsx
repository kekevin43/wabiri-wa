import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'
import { Zap, ArrowRight, ShieldCheck, Building2 } from 'lucide-react'
import { Button, Input } from '../../components/ui'
import WabiriLogo from '../../components/WabiriLogo'

export default function SignUpPage() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [company, setCompany] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signUp(email, password, { company })
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
      {/* Decorative Glow */}
      <div style={{
        position: 'fixed', top: -100, right: -100, width: 400, height: 400,
        borderRadius: '50%', background: 'var(--accent-glow)', filter: 'blur(80px)',
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
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <WabiriLogo size={56} />
          </div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, letterSpacing: '-0.8px', color: 'var(--text)' }}>
            Join Wabiri Technologies
          </h1>
          <p style={{ margin: '8px 0 0', color: 'var(--muted)', fontSize: 13, fontWeight: 500 }}>
            Start your professional sales workspace
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Input
            label="Company Name"
            value={company}
            onChange={e => setCompany(e.target.value)}
            placeholder="e.g. Wabiri Technologies"
            required
            icon={Building2}
          />

          <Input
            label="Work Email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@company.com"
            required
          />
          
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
          />

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
            Create Workspace <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>


          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 20 }}>
            Already have an account? <Link to="/auth" style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>Log In</Link>
          </p>
        </form>

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
           <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
             Managed by <strong>Wabiri Technologies</strong>
           </p>
        </div>
      </div>
    </div>
  )
}
