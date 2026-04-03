import React from 'react';

const WabiriLogo = ({ size = 32, showText = false, className = "", color = "#60A5FA" }) => {
  return (
    <div className={`flex items-center gap-4 ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '16px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Actual Interlocking Geometric W from source image */}
        <path 
          d="M15 35 L40 85 L65 35" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinejoin="miter"
        />
        <path 
          d="M35 35 L60 85 L85 35" 
          stroke={color} 
          strokeWidth="8" 
          strokeLinejoin="miter"
        />
      </svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
          <span style={{ 
            fontSize: size * 0.72, 
            fontWeight: 800, 
            fontFamily: 'Outfit, sans-serif', 
            letterSpacing: '0.02em',
            color: 'var(--text)',
            textTransform: 'uppercase'
          }}>
            WABIRI
          </span>
          <span style={{ 
            fontSize: size * 0.18, 
            fontWeight: 500, 
            fontFamily: 'Inter, sans-serif', 
            letterSpacing: '0.42em',
            color: 'var(--muted)',
            textTransform: 'uppercase',
            marginTop: '2px'
          }}>
            TECHNOLOGIES
          </span>
        </div>
      )}
    </div>
  );
};

export default WabiriLogo;
