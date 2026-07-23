import React from 'react';
import { useSettings } from '../context/SettingsContext';

export default function SettingsModal({ onClose }) {
  const { settings, updateSetting } = useSettings();

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content glass" style={{ maxWidth: '460px', width: '90%', borderRadius: '24px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.5rem' }}>⚙️</span>
            <h2 style={{ fontSize: '1.4rem', margin: 0, fontWeight: 700 }}>App Settings</h2>
          </div>
          <button className="modal-close" onClick={onClose} style={{ position: 'relative', top: 0, right: 0 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Auto-Correct Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Ingredient Auto-Correct</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Suggest fixes for typos (e.g. chaiken → chicken)</div>
            </div>
            <input
              type="checkbox"
              checked={settings.autoCorrectEnabled}
              onChange={(e) => updateSetting('autoCorrectEnabled', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          {/* Strict Diet Mode */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Strict Diet Mode</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Strictly hide or warn against allergen & diet conflicts</div>
            </div>
            <input
              type="checkbox"
              checked={settings.strictDietMode}
              onChange={(e) => updateSetting('strictDietMode', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          {/* Overflow Alerts (>100%) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Macro Overflow Warning</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Highlight excess macro & hydration intake above 100%</div>
            </div>
            <input
              type="checkbox"
              checked={settings.overflowAlertsEnabled}
              onChange={(e) => updateSetting('overflowAlertsEnabled', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          {/* Draggable Planner Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Draggable Meal Planner</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enable touch/mouse drag-to-pan in meal charts</div>
            </div>
            <input
              type="checkbox"
              checked={settings.dragPlannerEnabled}
              onChange={(e) => updateSetting('dragPlannerEnabled', e.target.checked)}
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
          </div>

          {/* Unit System Preference */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '0.95rem', color: 'var(--text-primary)' }}>Measurement Units</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Preferred system for weights & volumes</div>
            </div>
            <select
              value={settings.unitPreference}
              onChange={(e) => updateSetting('unitPreference', e.target.value)}
              style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--card-bg)', color: 'var(--text-primary)', cursor: 'pointer' }}
            >
              <option value="metric">Metric (kg, g, ml)</option>
              <option value="imperial">Imperial (lbs, oz, fl oz)</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'right' }}>
          <button className="btn-primary" onClick={onClose} style={{ padding: '10px 24px', borderRadius: '12px' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
