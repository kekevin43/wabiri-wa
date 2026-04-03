import { useNavigate } from 'react-router-dom'
import { Zap, MessageSquare, Megaphone, Smartphone, ArrowRight, ShieldCheck, CheckCircle2, Globe, Users } from 'lucide-react'
import { Button } from '../components/ui'
import WabiriLogo from '../components/WabiriLogo'

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Outfit, sans-serif' }}>
      {/* Navigation */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: '24px 6%', position: 'sticky', top: 0, background: 'rgba(248, 250, 252, 0.8)',
        backdropFilter: 'blur(12px)', zIndex: 100 
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <WabiriLogo size={42} showText={true} />
        </div>
        
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
           {['Features', 'Pricing', 'API Docs'].map(item => (
             <span key={item} style={{ fontSize: 14, fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>{item}</span>
           ))}
           <Button variant="ghost" size="sm" onClick={() => navigate('/auth')}>Login</Button>
           <Button size="sm" onClick={() => navigate('/signup')}>Sign Up</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <header style={{ 
        padding: '100px 6% 140px', textAlign: 'center', 
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        position: 'relative', overflow: 'hidden' 
      }}>
        {/* Glow */}
        <div style={{ 
          position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
          width: 600, height: 600, background: 'var(--accent-glow)', 
          borderRadius: '50%', filter: 'blur(100px)', opacity: 0.5, zIndex: 0 
        }} />

        <Badge color="accent">WhatsApp for Real Estate v2.0</Badge>
        <h1 style={{ 
          fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 800, fontFamily: 'Syne', 
          maxWidth: 900, marginBottom: 24, lineHeight: 1.1, letterSpacing: '-1.5px',
          position: 'relative'
        }}>
          Close Properties 10x Faster with <span style={{ color: 'var(--accent)' }}>Wabiri Technologies.</span>
        </h1>
        <p style={{ 
          fontSize: 'clamp(16px, 2vw, 20px)', color: '#64748b', maxWidth: 640, 
          marginBottom: 40, lineHeight: 1.6, position: 'relative' 
        }}>
          The high-performance bulk messaging and shared team inbox designed specifically for sales agents. 
          Send 10,000+ messages at $0 per session.
        </p>
        
        <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
          <Button onClick={() => navigate('/signup')} style={{ padding: '16px 36px', fontSize: 16 }}>
             Start Your Free Trial <ArrowRight size={18} style={{ marginLeft: 8 }} />
          </Button>
          <Button variant="ghost" style={{ padding: '16px 36px', fontSize: 16, background: '#fff' }}>
             Watch Demo
          </Button>
        </div>

        {/* Mockup Preview */}
        <div style={{ 
          marginTop: 80, width: '100%', maxWidth: 1100, borderRadius: 20, 
          padding: 8, background: '#fff', boxShadow: '0 40px 100px rgba(0,0,0,0.1)',
          border: '1px solid #e2e8f0', position: 'relative'
        }}>
           <img 
             src="https://images.unsplash.com/photo-1551288049-bbbda536ad89?auto=format&fit=crop&q=80&w=2070" 
             alt="Dashboard Preview" 
             style={{ width: '100%', borderRadius: 14 }}
           />
        </div>
      </header>

      {/* Features Grid */}
      <section style={{ padding: '120px 6%', background: '#fff' }}>
        <div style={{ textAlign: 'center', marginBottom: 80 }}>
           <h2 style={{ fontSize: 36, fontWeight: 700, fontFamily: 'Syne', marginBottom: 16 }}>Built for Scale</h2>
           <p style={{ color: '#64748b' }}>Everything you need to outperform WATI and grow your property business.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 40 }}>
           {[
             { title: 'Shared Team Inbox', icon: MessageSquare, desc: 'Multiple agents, one number. Manage conversations like a pro.' },
             { title: 'Bulk Sales Engine', icon: Megaphone, desc: 'Send thousands of personalized property alerts with zero cost per message.' },
             { title: 'Smart CRM Leads', icon: Users, desc: 'Tag and segment your leads by location and property interest.' },
             { title: 'WhatsApp PWA', icon: Smartphone, desc: 'Install it as an app on your phone. Native performance, no App Store needed.' },
             { title: 'Evolution API v2', icon: Globe, desc: 'Built on high-performance message engines for 99.9% deliverability.' },
             { title: 'Enterprise Security', icon: ShieldCheck, desc: 'Secure encryption and Row-Level Security managed by Supabase.' }
           ].map(feat => (
             <div key={feat.title} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                 <div style={{ 
                   width: 48, height: 48, borderRadius: 14, background: 'var(--accent-glow)', 
                   display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' 
                 }}>
                   <feat.icon size={24} />
                 </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{feat.title}</h3>
                <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.6, margin: 0 }}>{feat.desc}</p>
             </div>
           ))}
        </div>
      </section>

      {/* Pricing Tease */}
      <section style={{ padding: '120px 6%', textAlign: 'center', background: 'var(--accent)', color: '#fff' }}>
         <h2 style={{ fontSize: 42, fontWeight: 800, fontFamily: 'Syne', marginBottom: 16 }}>Ready to take the lead?</h2>
         <p style={{ opacity: 0.9, marginBottom: 40, fontSize: 18 }}>Join 500+ agents already closing deals with Wabiri Technologies.</p>
         <Button onClick={() => navigate('/signup')} style={{ background: '#fff', color: '#000', padding: '16px 48px' }}>
            Get Your Access Now
         </Button>
      </section>

      {/* Footer */}
      <footer style={{ padding: '60px 6%', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: 14 }}>
         <div>© 2026 Wabiri Technologies. All rights reserved.</div>
         <div style={{ display: 'flex', gap: 24 }}>
           <span>Privacy Policy</span>
           <span>Terms of Service</span>
           <span>Contact Support</span>
         </div>
      </footer>
    </div>
  )
}

function Badge({ color, children }) {
  return (
    <span style={{ 
      background: 'rgba(0,168,132,0.1)', color: 'var(--accent)', 
      padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
      marginBottom: 24, display: 'inline-block'
    }}>
      {children}
    </span>
  )
}
