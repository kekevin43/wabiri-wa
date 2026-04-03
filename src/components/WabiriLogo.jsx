import React from 'react';

const WabiriLogo = ({ size = 32, showText = false, className = "" }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '12px' }}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Stylized W - consistent with user's brand image */}
        <path 
          d="M10 30 L35 85 L50 50 L65 85 L90 30" 
          stroke="#3B82F6" 
          strokeWidth="12" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        />
        <path 
          d="M25 30 L50 75 L75 30" 
          stroke="#60A5FA" 
          strokeWidth="8" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ opacity: 0.7 }}
        />
      </svg>
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
          <span style={{ 
            fontSize: size * 0.6, 
            fontWeight: 800, 
            fontFamily: 'Syne, sans-serif', 
            letterSpacing: '-0.05em',
            color: 'var(--text)',
            textTransform: 'uppercase'
          }}>
            WABIRI
          </span>
          <span style={{ 
            fontSize: size * 0.22, 
            fontWeight: 500, 
            fontFamily: 'Inter, sans-serif', 
            letterSpacing: '0.2em',
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
