import React, { useState } from 'react';
import NutriScoreBadge from './ChefScoreBadge';

/**
 * NutriScoreBreakdown — Expandable detailed scoring panel.
 *
 * Shows the full point breakdown with visual bars for each nutrient,
 * and explanation of the Nutri-Score algorithm.
 *
 * Props:
 *   nutriScore – Full nutri_score object from the API (or chefScore as fallback)
 *   breakdown – Optional breakdown object (from detailed endpoint)
 */
export function NutriScoreBreakdown({ nutriScore, chefScore, breakdown }) {
  const [expanded, setExpanded] = useState(false);

  const scoreObj = nutriScore || chefScore;
  if (!scoreObj) return null;

  const {
    grade,
    numeric_score,
    negative_total,
    positive_total,
    category,
    description,
  } = scoreObj;

  // If we have a detailed breakdown from the API, use it; otherwise show summary
  const hasBreakdown = !!breakdown;

  const negBar = (label, value, max = 10) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'var(--bg-hover)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${(value / max) * 100}%`,
          height: '100%',
          borderRadius: 4,
          background: value > 5 ? '#E63E11' : value > 2 ? '#EE8100' : '#85BB2F',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ width: 24, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  const posBar = (label, value, max = 5) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 80, fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'var(--bg-hover)',
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${(value / max) * 100}%`,
          height: '100%',
          borderRadius: 4,
          background: value > 3 ? '#038141' : value > 1 ? '#85BB2F' : '#FECB02',
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{ width: 24, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  return (
    <div className="chef-score-breakdown-wrapper" style={{ marginTop: 12 }}>
      {/* Summary row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: 12,
          background: 'var(--bg-hover)',
          transition: 'background 0.2s',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <NutriScoreBadge grade={grade} size="md" showTooltip={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Nutri-Score: {grade}
            <span style={{ fontWeight: 400, fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>
              (Score: {numeric_score})
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {description}
          </div>
        </div>
        <span style={{ fontSize: 18, color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          ▾
        </span>
      </div>

      {/* Expanded breakdown */}
      <div style={{
        maxHeight: expanded ? 400 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease',
      }}>
        <div style={{
          padding: '16px 12px 12px',
          borderRadius: '0 0 12px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          marginTop: -2,
        }}>
          {/* Points summary */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              borderRadius: 8, background: 'rgba(230, 62, 17, 0.08)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#E63E11' }}>{negative_total}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Negative / 40</div>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '8px 0',
              borderRadius: 8, background: 'rgba(3, 129, 65, 0.08)',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#038141' }}>{positive_total}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Positive / 15</div>
            </div>
          </div>

          {/* Detailed bars if breakdown is available */}
          {hasBreakdown && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Negative Points
              </div>
              {negBar('Energy', breakdown.neg_energy)}
              {negBar('Sat. Fat', breakdown.neg_saturated_fat)}
              {negBar('Sugars', breakdown.neg_sugars)}
              {negBar('Sodium', breakdown.neg_sodium)}

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, marginTop: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Positive Points
              </div>
              {posBar('Fiber', breakdown.pos_fiber)}
              {posBar('Protein', breakdown.pos_protein)}
              {posBar('Fruit/Veg', breakdown.pos_fvl)}

              {breakdown.protein_excluded && (
                <div style={{ fontSize: 11, color: '#EE8100', fontStyle: 'italic', marginTop: 4 }}>
                  ⚠ Protein points excluded (high negative + low FVL%)
                </div>
              )}

              {breakdown.nutrients_estimated && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                  ℹ Some nutrient values were estimated from ingredients
                </div>
              )}
            </>
          )}

          {/* Category badge */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category:</span>
            <span style={{
              fontSize: 11, fontWeight: 600,
              padding: '2px 8px', borderRadius: 6,
              background: 'var(--bg-hover)', color: 'var(--text-primary)',
            }}>
              {category || 'general'}
            </span>
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: 12, padding: '8px 10px', borderRadius: 8,
            background: 'var(--bg-hover)',
            fontSize: 10, color: 'var(--text-muted)',
            lineHeight: 1.5,
          }}>
            <strong>Nutri-Score</strong> rates overall nutritional quality from S (best) to E using the
            FSA-NPS algorithm extended with a 6th S-tier for superior nutrient density.
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutriScoreBreakdown;
