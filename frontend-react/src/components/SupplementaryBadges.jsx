import React from 'react';

/**
 * Supplementary Badges Component
 * Displays Na/K ratio, NOVA processing level, and Glycemic Load indicators.
 */
export default function SupplementaryBadges({ badges, nutrition, ingredients }) {
  if (!badges) return null;

  const { nak_ratio, nova_upf, glycemic_load } = badges;

  return (
    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
        Supplementary Health Indicators
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {/* Na/K Ratio Badge */}
        {nak_ratio && nak_ratio.status !== 'unknown' && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: nak_ratio.status === 'optimal' ? 'rgba(16, 185, 129, 0.12)' : nak_ratio.status === 'moderate' ? 'rgba(238, 129, 0, 0.12)' : 'rgba(230, 62, 17, 0.12)',
            color: nak_ratio.status === 'optimal' ? '#038141' : nak_ratio.status === 'moderate' ? '#EE8100' : '#E63E11',
            border: `1px solid ${nak_ratio.status === 'optimal' ? 'rgba(16, 185, 129, 0.3)' : nak_ratio.status === 'moderate' ? 'rgba(238, 129, 0, 0.3)' : 'rgba(230, 62, 17, 0.3)'}`,
          }} title={nak_ratio.description}>
            <span>⚖️</span>
            <span>{nak_ratio.label}</span>
          </div>
        )}

        {/* NOVA UPF Badge */}
        {nova_upf && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: nova_upf.status === 'minimal_processing' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(230, 62, 17, 0.12)',
            color: nova_upf.status === 'minimal_processing' ? '#038141' : '#E63E11',
            border: `1px solid ${nova_upf.status === 'minimal_processing' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(230, 62, 17, 0.3)'}`,
          }} title={nova_upf.detected_markers?.length ? `Detected: ${nova_upf.detected_markers.join(', ')}` : 'Minimal processing / whole ingredients'}>
            <span>{nova_upf.status === 'minimal_processing' ? '🌱' : '⚠️'}</span>
            <span>{nova_upf.label}</span>
          </div>
        )}

        {/* Glycemic Load Badge */}
        {glycemic_load && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 600,
            background: glycemic_load.status === 'low' ? 'rgba(16, 185, 129, 0.12)' : glycemic_load.status === 'medium' ? 'rgba(238, 129, 0, 0.12)' : 'rgba(230, 62, 17, 0.12)',
            color: glycemic_load.status === 'low' ? '#038141' : glycemic_load.status === 'medium' ? '#EE8100' : '#E63E11',
            border: `1px solid ${glycemic_load.status === 'low' ? 'rgba(16, 185, 129, 0.3)' : glycemic_load.status === 'medium' ? 'rgba(238, 129, 0, 0.3)' : 'rgba(230, 62, 17, 0.3)'}`,
          }} title="Estimated Glycemic Load (preliminary estimate)">
            <span>📊</span>
            <span>{glycemic_load.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}
