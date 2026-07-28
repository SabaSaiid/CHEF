import React, { useState } from 'react';

const TIER_DATA = {
  S: { bg: '#DAA520', text: '#1a1a1a', label: '★ S', desc: 'Exceptionally clean' },
  A: { bg: '#038141', text: '#ffffff', label: 'A', desc: 'Excellent nutritional quality' },
  B: { bg: '#85BB2F', text: '#1a1a1a', label: 'B', desc: 'Good nutritional quality' },
  C: { bg: '#FECB02', text: '#1a1a1a', label: 'C', desc: 'Average nutritional quality' },
  D: { bg: '#EE8100', text: '#ffffff', label: 'D', desc: 'Poor nutritional quality' },
  E: { bg: '#E63E11', text: '#ffffff', label: 'E', desc: 'Very poor nutritional quality' },
};

/**
 * NutriScoreBadge — Reusable 6-tier nutritional rating badge.
 *
 * Props:
 *   grade    – "S" | "A" | "B" | "C" | "D" | "E"
 *   size     – "sm" (28px, for cards) | "md" (36px) | "lg" (44px, for modals)
 *   showTooltip – whether to show description on hover (default true)
 *   onClick  – optional click handler
 *   style    – additional inline styles
 */
export function NutriScoreBadge({ grade, size = 'sm', showTooltip = true, onClick, style = {} }) {
  const [hovered, setHovered] = useState(false);
  
  if (!grade || !TIER_DATA[grade]) return null;

  const tier = TIER_DATA[grade];
  const isS = grade === 'S';

  const sizeMap = {
    sm: { badge: 28, font: 11, border: 2 },
    md: { badge: 36, font: 14, border: 2 },
    lg: { badge: 44, font: 17, border: 3 },
  };
  const s = sizeMap[size] || sizeMap.sm;

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: s.badge,
    height: s.badge,
    borderRadius: '8px',
    backgroundColor: tier.bg,
    color: tier.text,
    fontWeight: 800,
    fontSize: s.font,
    fontFamily: "'Inter', 'system-ui', sans-serif",
    lineHeight: 1,
    border: `${s.border}px solid rgba(255,255,255,0.25)`,
    cursor: onClick ? 'pointer' : (showTooltip ? 'help' : 'default'),
    position: 'relative',
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    transform: hovered ? 'scale(1.12)' : 'scale(1)',
    boxShadow: hovered
      ? `0 4px 14px ${tier.bg}80`
      : `0 2px 6px ${tier.bg}40`,
    letterSpacing: isS ? '0.5px' : '0',
    flexShrink: 0,
    ...(isS ? {
      background: `linear-gradient(135deg, #DAA520 0%, #FFD700 40%, #B8860B 70%, #DAA520 100%)`,
      backgroundSize: '200% 200%',
      animation: 'chefScoreShimmer 3s ease infinite',
    } : {}),
    ...style,
  };

  const tooltipStyle = {
    position: 'absolute',
    bottom: '110%',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'rgba(20, 20, 20, 0.95)',
    color: '#fff',
    padding: '6px 10px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    zIndex: 100,
    opacity: hovered ? 1 : 0,
    transition: 'opacity 0.15s ease',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255,255,255,0.1)',
    lineHeight: 1.4,
  };

  return (
    <div
      className={`chef-score-badge chef-score-${grade}`}
      style={badgeStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title=""
      aria-label={`Nutri-Score: ${grade} — ${tier.desc}`}
    >
      {tier.label}
      {showTooltip && (
        <div style={tooltipStyle}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>Nutri-Score: {grade}</div>
          <div style={{ opacity: 0.85 }}>{tier.desc}</div>
        </div>
      )}
    </div>
  );
}

export default NutriScoreBadge;
