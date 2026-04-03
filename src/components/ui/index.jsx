// Shared small UI primitives

export function Card({ children, style = {} }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      borderRadius: 12,
      padding: '24px',
      transition: 'box-shadow 0.2s',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function Badge({ color = 'accent', children }) {
  const colors = {
    accent:  { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E' },
    warning: { bg: 'rgba(245,158,11,0.12)', text: '#F59E0B' },
    danger:  { bg: 'rgba(244,63,94,0.12)',  text: '#F43F5E' },
    info:    { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' },
    muted:   { bg: 'rgba(107,107,114,0.12)',text: '#6B6B72' },
  }
  const c = colors[color] || colors.muted
  return (
    <span style={{
      background: c.bg, color: c.text,
      padding: '2px 8px', borderRadius: 99,
      fontSize: 12, fontWeight: 500, fontFamily: 'Outfit',
    }}>
      {children}
    </span>
  )
}

export function Button({ children, variant = 'accent', size = 'md', onClick, disabled, style = {}, loading }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6, justifyContent: 'center',
    borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'Syne', fontWeight: 600, border: 'none',
    transition: 'all 0.15s', opacity: disabled ? 0.6 : 1,
    fontSize: size === 'sm' ? 13 : 14,
    padding: size === 'sm' ? '8px 16px' : '12px 24px',
    boxShadow: variant === 'accent' ? '0 2px 8px var(--accent-glow)' : 'none',
    ...style,
  }
  const variants = {
    accent:  { background: 'var(--accent)',   color: '#FFFFFF' },
    ghost:   { background: 'transparent',     color: 'var(--text)', border: '1px solid var(--border)' },
    danger:  { background: 'var(--danger)',   color: '#fff' },
  }
  return (
    <button 
      onClick={onClick} 
      disabled={disabled || loading} 
      style={{ ...base, ...variants[variant] }}
      onMouseEnter={e => {
        if (!disabled && !loading) {
          if (variant === 'accent') e.currentTarget.style.background = 'var(--accent-dim)'
          if (variant === 'ghost') e.currentTarget.style.background = 'var(--surface2)'
        }
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) {
          if (variant === 'accent') e.currentTarget.style.background = 'var(--accent)'
          if (variant === 'ghost') e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {loading ? 'Wait...' : children}
    </button>
  )
}

export function Input({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          color: 'var(--text)',
          fontFamily: 'Outfit',
          fontSize: 14,
          outline: 'none',
          transition: 'border-color 0.15s',
          ...props.style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

export function Textarea({ label, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && (
        <label style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 500 }}>
          {label}
        </label>
      )}
      <textarea
        {...props}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '10px 14px',
          color: 'var(--text)',
          fontFamily: 'Outfit',
          fontSize: 14,
          outline: 'none',
          resize: 'vertical',
          minHeight: 100,
          transition: 'border-color 0.15s',
          ...props.style,
        }}
        onFocus={e => e.target.style.borderColor = 'var(--accent)'}
        onBlur={e => e.target.style.borderColor = 'var(--border)'}
      />
    </div>
  )
}

export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' }}>{title}</h1>
        {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function StatCard({ label, value, icon: Icon, color = 'accent', delta }) {
  const colors = {
    accent:  'var(--accent)',
    warning: 'var(--warning)',
    info:    'var(--info)',
    danger:  'var(--danger)',
  }
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow)',
      borderRadius: 12,
      padding: '24px 22px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 8 }}>{label}</div>
          <div style={{ fontSize: 28, fontFamily: 'Syne', fontWeight: 700 }}>{value}</div>
          {delta !== undefined && (
            <div style={{ fontSize: 12, color: delta >= 0 ? 'var(--accent)' : 'var(--danger)', marginTop: 4 }}>
              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}% this week
            </div>
          )}
        </div>
        {Icon && (
          <div style={{
            width: 40, height: 40, borderRadius: 10,
            background: `${colors[color]}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={18} color={colors[color]} strokeWidth={2} />
          </div>
        )}
      </div>
    </div>
  )
}
