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
        maxHeight: expanded ? 750 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.35s ease',
      }}>
        <div style={{
          padding: '16px 12px 12px',
          borderRadius: '0 0 12px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderTop: 'none',
          marginTop: -2,
        }}>
          {/* Grade Spectrum Bar */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                6-Tier Rating Spectrum
              </span>
              {scoreObj.next_tier && scoreObj.points_to_next_tier > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
                  ⚡ {scoreObj.points_to_next_tier} {scoreObj.points_to_next_tier === 1 ? 'pt' : 'pts'} to Tier {scoreObj.next_tier}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, height: 24, borderRadius: 8, padding: 3, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
              {[
                { g: 'S', bg: 'linear-gradient(135deg, #DAA520, #FFD700)', label: '★ S' },
                { g: 'A', bg: '#038141', label: 'A' },
                { g: 'B', bg: '#85BB2F', label: 'B' },
                { g: 'C', bg: '#FECB02', label: 'C' },
                { g: 'D', bg: '#EE8100', label: 'D' },
                { g: 'E', bg: '#E63E11', label: 'E' },
              ].map(t => {
                const isActive = t.g === grade;
                return (
                  <div
                    key={t.g}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 6,
                      background: t.bg,
                      color: t.g === 'A' || t.g === 'D' || t.g === 'E' ? '#fff' : '#1a1a1a',
                      fontWeight: 800,
                      fontSize: 11,
                      position: 'relative',
                      opacity: isActive ? 1 : 0.45,
                      transform: isActive ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: isActive ? '0 0 10px rgba(0,0,0,0.3)' : 'none',
                      border: isActive ? '2px solid #fff' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {t.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upgrade Recommendations Card */}
          {scoreObj.upgrade_recommendations && scoreObj.upgrade_recommendations.length > 0 && (
            <div style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 10,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                💡 Actionable Recommendations to Elevate Nutri-Score
              </div>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                {scoreObj.upgrade_recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: 3 }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

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

          {/* Category & Confidence badges */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category:</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 6,
                background: 'var(--bg-hover)', color: 'var(--text-primary)',
              }}>
                {category || 'general'}
              </span>
            </div>

            {(scoreObj.confidence || breakdown?.confidence) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence:</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 6,
                  textTransform: 'capitalize',
                  background: (scoreObj.confidence || breakdown?.confidence) === 'high' ? 'rgba(16, 185, 129, 0.15)' : (scoreObj.confidence || breakdown?.confidence) === 'medium' ? 'rgba(238, 129, 0, 0.15)' : 'rgba(230, 62, 17, 0.15)',
                  color: (scoreObj.confidence || breakdown?.confidence) === 'high' ? '#038141' : (scoreObj.confidence || breakdown?.confidence) === 'medium' ? '#EE8100' : '#E63E11',
                }}>
                  {scoreObj.confidence || breakdown?.confidence}
                </span>
              </div>
            )}
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
