import React, { useState } from 'react';
import NutriScoreBadge from './ChefScoreBadge';

/**
 * NutriScoreBreakdown — Expandable detailed scoring panel.
 *
 * Shows the full point breakdown with visual bars for each nutrient,
 * actionable upgrade recommendations, next-tier progression, and algorithm context.
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
    negative_total = 0,
    positive_total,
    category = 'general',
    description,
    next_tier,
    points_to_next_tier,
    upgrade_recommendations = [],
  } = scoreObj;

  // Defensive calculation for positive points if undefined
  const displayPositive = positive_total !== undefined && positive_total !== null
    ? positive_total
    : (negative_total !== undefined && numeric_score !== undefined
        ? Math.max(0, negative_total - numeric_score)
        : 0);

  const displayNegative = negative_total !== undefined && negative_total !== null
    ? negative_total
    : (displayPositive !== undefined && numeric_score !== undefined
        ? Math.max(0, numeric_score + displayPositive)
        : 0);

  // Extract active breakdown if provided via prop or attached to score object
  const activeBreakdown = breakdown || scoreObj.breakdown;
  const hasBreakdown = !!activeBreakdown;

  const negBar = (label, value = 0, max = 10) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 95, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
          height: '100%',
          borderRadius: 4,
          background: value > 5 ? '#E63E11' : value > 2 ? '#EE8100' : '#85BB2F',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      <span style={{ width: 38, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>
        {value} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>/{max}</span>
      </span>
    </div>
  );

  const posBar = (label, value = 0, max = 5) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span style={{ width: 95, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: 'rgba(255, 255, 255, 0.08)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          width: `${Math.min(100, Math.max(0, (value / max) * 100))}%`,
          height: '100%',
          borderRadius: 4,
          background: value > 3 ? '#038141' : value > 1 ? '#85BB2F' : '#FECB02',
          transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }} />
      </div>
      <span style={{ width: 38, fontSize: 12, fontWeight: 700, textAlign: 'right', color: 'var(--text-primary)' }}>
        {value} <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-muted)' }}>/{max}</span>
      </span>
    </div>
  );

  return (
    <div className="chef-score-breakdown-wrapper" style={{ marginTop: 14 }}>
      {/* Interactive Summary row Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          padding: '10px 14px',
          borderRadius: 12,
          background: 'var(--bg-hover)',
          border: '1px solid var(--border)',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        onClick={() => setExpanded(!expanded)}
        title="Click to view detailed 6-tier Nutri-Score point breakdown"
      >
        <NutriScoreBadge grade={grade} size="md" showTooltip={false} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Nutri-Score: {grade}</span>
            <span style={{ fontWeight: 500, fontSize: 12, color: 'var(--text-muted)' }}>
              (Score: {numeric_score})
            </span>
            {next_tier && points_to_next_tier > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10,
                background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                marginLeft: 'auto'
              }}>
                ⚡ {points_to_next_tier} {points_to_next_tier === 1 ? 'pt' : 'pts'} to Tier {next_tier}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {description}
          </div>
        </div>
        <span style={{
          fontSize: 18, color: 'var(--text-muted)',
          transform: expanded ? 'rotate(180deg)' : 'rotate(0)',
          transition: 'transform 0.25s ease',
        }}>
          ▾
        </span>
      </div>

      {/* Expanded breakdown Panel */}
      <div style={{
        maxHeight: expanded ? 950 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div style={{
          padding: '16px 14px 14px',
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
              {next_tier && points_to_next_tier > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: '#F59E0B' }}>
                  Target: Tier {next_tier} ({points_to_next_tier} {points_to_next_tier === 1 ? 'point' : 'points'} needed)
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4, height: 26, borderRadius: 8, padding: 3, background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>
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
                      transform: isActive ? 'scale(1.04)' : 'scale(1)',
                      boxShadow: isActive ? '0 2px 10px rgba(0,0,0,0.3)' : 'none',
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

          {/* Points summary Boxes */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 8px',
              borderRadius: 10, background: 'rgba(230, 62, 17, 0.08)',
              border: '1px solid rgba(230, 62, 17, 0.2)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#E63E11' }}>{displayNegative}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>Negative / 40</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.8 }}>(Energy, Sat. Fat, Sugar, Sodium)</div>
            </div>
            <div style={{
              flex: 1, textAlign: 'center', padding: '10px 8px',
              borderRadius: 10, background: 'rgba(3, 129, 65, 0.08)',
              border: '1px solid rgba(3, 129, 65, 0.2)',
            }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#038141' }}>{displayPositive}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginTop: 2 }}>Positive / 15</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', opacity: 0.8 }}>(Fiber, Protein, Fruit/Veg/Nut)</div>
            </div>
          </div>

          {/* Actionable Upgrade Recommendations */}
          {upgrade_recommendations && upgrade_recommendations.length > 0 && (
            <div style={{
              marginBottom: 16,
              padding: '12px 14px',
              borderRadius: 10,
              background: 'rgba(245, 158, 11, 0.08)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#D97706', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                💡 Actionable Recommendations to Elevate Nutri-Score
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {upgrade_recommendations.map((rec, idx) => (
                  <li key={idx} style={{ marginBottom: 4 }}>{rec}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Detailed component bars if breakdown is available */}
          {hasBreakdown && (
            <div style={{
              background: 'var(--bg-hover)',
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#E63E11', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Negative Nutrient Penalties (Max 40 pts)
              </div>
              {negBar('Calories / Energy', activeBreakdown.neg_energy, 10)}
              {negBar('Saturated Fat', activeBreakdown.neg_saturated_fat, 10)}
              {negBar('Total Sugars', activeBreakdown.neg_sugars, 10)}
              {negBar('Sodium (Salt)', activeBreakdown.neg_sodium, 10)}

              <div style={{ fontSize: 11, fontWeight: 700, color: '#038141', marginBottom: 10, marginTop: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Positive Nutrient Credits (Max 15 pts)
              </div>
              {posBar('Dietary Fiber', activeBreakdown.pos_fiber, 5)}
              {posBar('Protein Content', activeBreakdown.pos_protein, 5)}
              {posBar('Fruit / Veg / Nut %', activeBreakdown.pos_fvl, 5)}

              {activeBreakdown.protein_excluded && (
                <div style={{
                  fontSize: 11, color: '#EE8100', marginTop: 8,
                  padding: '6px 10px', borderRadius: 6,
                  background: 'rgba(238, 129, 0, 0.1)', border: '1px solid rgba(238, 129, 0, 0.25)',
                  display: 'flex', alignItems: 'center', gap: 6
                }}>
                  <span>⚠</span>
                  <span><strong>Conditional Protein Rule:</strong> Protein points excluded because negative penalties total ≥ 11 and FVL is &lt; 5 pts.</span>
                </div>
              )}

              {activeBreakdown.fvl_pct !== undefined && activeBreakdown.fvl_pct > 0 && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  🌱 Fruit, Vegetable, Legume &amp; Nut content: <strong>{activeBreakdown.fvl_pct}%</strong>
                </div>
              )}

              {activeBreakdown.nutrients_estimated && (
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 4 }}>
                  ℹ Micronutrient values were estimated from ingredients database
                </div>
              )}
            </div>
          )}

          {/* Category & Confidence badges */}
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Category:</span>
              <span style={{
                fontSize: 11, fontWeight: 600,
                padding: '3px 8px', borderRadius: 6,
                background: 'var(--bg-hover)', color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                textTransform: 'capitalize',
              }}>
                {category || 'general'}
              </span>
            </div>

            {(scoreObj.confidence || activeBreakdown?.confidence) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Confidence:</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 8px', borderRadius: 6,
                  textTransform: 'capitalize',
                  background: (scoreObj.confidence || activeBreakdown?.confidence) === 'high' ? 'rgba(16, 185, 129, 0.15)' : (scoreObj.confidence || activeBreakdown?.confidence) === 'medium' ? 'rgba(238, 129, 0, 0.15)' : 'rgba(230, 62, 17, 0.15)',
                  color: (scoreObj.confidence || activeBreakdown?.confidence) === 'high' ? '#038141' : (scoreObj.confidence || activeBreakdown?.confidence) === 'medium' ? '#EE8100' : '#E63E11',
                  border: `1px solid ${(scoreObj.confidence || activeBreakdown?.confidence) === 'high' ? 'rgba(16, 185, 129, 0.3)' : (scoreObj.confidence || activeBreakdown?.confidence) === 'medium' ? 'rgba(238, 129, 0, 0.3)' : 'rgba(230, 62, 17, 0.3)'}`,
                }}>
                  {scoreObj.confidence || activeBreakdown?.confidence}
                </span>
              </div>
            )}
          </div>

          {/* Explanation */}
          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 8,
            background: 'var(--bg-hover)',
            fontSize: 10.5, color: 'var(--text-muted)',
            lineHeight: 1.5,
            border: '1px solid var(--border)',
          }}>
            <strong>Nutri-Score Engine</strong> calculates overall nutritional density from ★ S (Superior) to E using the official FSA-NPS 2023 algorithm (Negative points − Positive points).
          </div>
        </div>
      </div>
    </div>
  );
}

export default NutriScoreBreakdown;
