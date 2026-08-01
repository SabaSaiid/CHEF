import React, { useState, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';
import { 
  Settings as SettingsIcon, 
  ShieldAlert, 
  PieChart, 
  Palette, 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RotateCcw, 
  Check, 
  Sliders, 
  Sparkles,
  Volume2,
  VolumeX,
  Gauge,
  Droplets,
  CalendarDays,
  AlertTriangle
} from 'lucide-react';

const ALLERGEN_LIST = [
  { id: 'nuts', label: '🥜 Peanuts & Tree Nuts' },
  { id: 'dairy', label: '🥛 Dairy / Lactose' },
  { id: 'gluten', label: '🌾 Gluten' },
  { id: 'shellfish', label: '🦞 Shellfish & Seafood' },
  { id: 'eggs', label: '🥚 Eggs' },
  { id: 'soy', label: '🫘 Soy' }
];

export default function SettingsModal({ onClose }) {
  const { 
    settings, 
    updateSetting, 
    resetSettings, 
    exportUserData, 
    importUserData, 
    clearAppCache 
  } = useSettings();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('general');
  const fileInputRef = useRef(null);

  const handleExport = () => {
    try {
      exportUserData();
      addToast('Backup exported successfully! 📥', 'success');
    } catch (e) {
      addToast('Failed to export backup.', 'error');
    }
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        importUserData(event.target.result);
        addToast('Backup restored successfully! 🚀', 'success');
      } catch (err) {
        addToast('Invalid backup file. Import failed.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // reset file input
  };

  const handleClearCache = () => {
    if (window.confirm('Clear local search history & temporary draft cache?')) {
      clearAppCache();
      addToast('Local cache cleared! 🧹', 'success');
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all app settings to default parameters?')) {
      resetSettings();
      addToast('Settings reset to factory defaults! 🔄', 'info');
    }
  };

  const toggleAllergen = (id) => {
    const current = settings.defaultAllergens || [];
    const next = current.includes(id) 
      ? current.filter(item => item !== id)
      : [...current, id];
    updateSetting('defaultAllergens', next);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div 
        className="modal-content glass" 
        style={{ 
          maxWidth: '720px', 
          width: '95%', 
          borderRadius: '24px', 
          padding: '0', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px', 
          borderBottom: '1px solid var(--border-glass)',
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '12px', 
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-color, #10b981)'
            }}>
              <SettingsIcon size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                Preferences & Settings
              </h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Customize your smart chef environment & workspace
              </span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose} style={{ position: 'relative', top: 0, right: 0 }}>×</button>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '420px' }}>
          {/* Navigation Sidebar */}
          <div style={{ 
            width: '200px', 
            borderRight: '1px solid var(--border-glass)', 
            padding: '16px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'var(--bg-secondary, rgba(0,0,0,0.02))'
          }}>
            <button 
              className={`tab-nav-btn ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
              style={tabBtnStyle(activeTab === 'general')}
            >
              <Sliders size={16} /> General & Units
            </button>

            <button 
              className={`tab-nav-btn ${activeTab === 'dietary' ? 'active' : ''}`}
              onClick={() => setActiveTab('dietary')}
              style={tabBtnStyle(activeTab === 'dietary')}
            >
              <ShieldAlert size={16} /> Dietary Defaults
            </button>

            <button 
              className={`tab-nav-btn ${activeTab === 'planner' ? 'active' : ''}`}
              onClick={() => setActiveTab('planner')}
              style={tabBtnStyle(activeTab === 'planner')}
            >
              <PieChart size={16} /> Targets & Limits
            </button>

            <button 
              className={`tab-nav-btn ${activeTab === 'appearance' ? 'active' : ''}`}
              onClick={() => setActiveTab('appearance')}
              style={tabBtnStyle(activeTab === 'appearance')}
            >
              <Palette size={16} /> Theme & Style
            </button>

            <button 
              className={`tab-nav-btn ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
              style={tabBtnStyle(activeTab === 'data')}
            >
              <Database size={16} /> Data & Backup
            </button>
          </div>

          {/* Tab Content Panel */}
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <>
                <h3 style={sectionHeadingStyle}>General Preferences</h3>
                
                {/* Measurement Units */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Measurement Units</div>
                    <div style={settingDescStyle}>System used for weights, volumes, and distances</div>
                  </div>
                  <select
                    value={settings.unitPreference || 'metric'}
                    onChange={(e) => updateSetting('unitPreference', e.target.value)}
                    style={selectInputStyle}
                  >
                    <option value="metric">Metric (kg, g, ml)</option>
                    <option value="imperial">Imperial (lbs, oz, fl oz)</option>
                  </select>
                </div>

                {/* Default Start Page */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Default Start View</div>
                    <div style={settingDescStyle}>Primary dashboard view on application launch</div>
                  </div>
                  <select
                    value={settings.defaultStartPage || '/'}
                    onChange={(e) => updateSetting('defaultStartPage', e.target.value)}
                    style={selectInputStyle}
                  >
                    <option value="/">🍳 Kitchen</option>
                    <option value="/recipes">📖 Recipes</option>
                    <option value="/planner">📅 Planner</option>
                    <option value="/tracker">📊 Tracker</option>
                    <option value="/pantry">🥫 Pantry</option>
                  </select>
                </div>

                {/* Animations Toggle */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>UI Micro-Animations</div>
                    <div style={settingDescStyle}>Enable smooth transitions and interactive keyframe animations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.enableAnimations ?? true}
                    onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>

                {/* Toast Sound */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Audio Notification Alerts</div>
                    <div style={settingDescStyle}>Play subtle audio chimes on successful operations</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.toastAudio ?? false}
                    onChange={(e) => updateSetting('toastAudio', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>
              </>
            )}

            {/* DIETARY TAB */}
            {activeTab === 'dietary' && (
              <>
                <h3 style={sectionHeadingStyle}>Dietary Profile & Safety Filters</h3>
                
                {/* Default Diet Preference */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Default Diet Preference</div>
                    <div style={settingDescStyle}>Automatically pre-filters recipe searches & meal plans</div>
                  </div>
                  <select
                    value={settings.defaultDiet || 'none'}
                    onChange={(e) => updateSetting('defaultDiet', e.target.value)}
                    style={selectInputStyle}
                  >
                    <option value="none">Standard (No Preference)</option>
                    <option value="vegetarian">🥬 Vegetarian</option>
                    <option value="vegan">🌱 Vegan</option>
                    <option value="keto">🥑 Keto</option>
                    <option value="gluten-free">🌾 Gluten-Free</option>
                    <option value="high-protein">💪 High-Protein</option>
                  </select>
                </div>

                {/* Allergen Avoidance Checklist */}
                <div style={{ ...settingRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div>
                    <div style={settingTitleStyle}>Allergen Exclusion Restrictions</div>
                    <div style={settingDescStyle}>Flag recipes containing checked ingredients</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {ALLERGEN_LIST.map(alg => (
                      <label 
                        key={alg.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: (settings.defaultAllergens || []).includes(alg.id)
                            ? 'rgba(239, 68, 68, 0.12)' 
                            : 'rgba(255, 255, 255, 0.04)',
                          border: `1px solid ${(settings.defaultAllergens || []).includes(alg.id) ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-glass)'}`,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          color: 'var(--text-primary)'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={(settings.defaultAllergens || []).includes(alg.id)}
                          onChange={() => toggleAllergen(alg.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        {alg.label}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Strict Diet Mode */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Strict Diet Enforcement</div>
                    <div style={settingDescStyle}>Strictly hide recipes violating allergen or diet rules</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.strictDietMode ?? false}
                    onChange={(e) => updateSetting('strictDietMode', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>

                {/* Auto-Correct */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Ingredient Typos Auto-Correct</div>
                    <div style={settingDescStyle}>Automatically offer spelling fixes (e.g. chaiken → chicken)</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoCorrectEnabled ?? true}
                    onChange={(e) => updateSetting('autoCorrectEnabled', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>
              </>
            )}

            {/* PLANNER & TARGETS TAB */}
            {activeTab === 'planner' && (
              <>
                <h3 style={sectionHeadingStyle}>Planner & Nutrition Targets</h3>

                {/* Daily Water Target */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Daily Hydration Target (ml)</div>
                    <div style={settingDescStyle}>Target daily water intake threshold for tracking</div>
                  </div>
                  <input
                    type="number"
                    min="500"
                    max="6000"
                    step="100"
                    value={settings.waterGoalTarget || 2000}
                    onChange={(e) => updateSetting('waterGoalTarget', parseInt(e.target.value, 10) || 2000)}
                    style={{ ...selectInputStyle, width: '110px', textAlign: 'right' }}
                  />
                </div>

                {/* Expiry Warning Threshold */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Pantry Expiry Alert Threshold (Days)</div>
                    <div style={settingDescStyle}>Highlight pantry items expiring within N days</div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    value={settings.expiryWarningDays || 3}
                    onChange={(e) => updateSetting('expiryWarningDays', parseInt(e.target.value, 10) || 3)}
                    style={{ ...selectInputStyle, width: '90px', textAlign: 'right' }}
                  />
                </div>

                {/* Macro Overflow */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Macro Overflow Warnings (&gt;100%)</div>
                    <div style={settingDescStyle}>Highlight excess caloric & macro intake above daily target</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.overflowAlertsEnabled ?? true}
                    onChange={(e) => updateSetting('overflowAlertsEnabled', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>

                {/* Draggable Planner */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Interactive Drag Meal Planner</div>
                    <div style={settingDescStyle}>Enable touch & mouse drag-to-pan in weekly charts</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.dragPlannerEnabled ?? true}
                    onChange={(e) => updateSetting('dragPlannerEnabled', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>
              </>
            )}

            {/* APPEARANCE TAB */}
            {activeTab === 'appearance' && (
              <>
                <h3 style={sectionHeadingStyle}>Appearance & Theme Settings</h3>

                {/* Accent Theme Color */}
                <div style={{ ...settingRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                  <div>
                    <div style={settingTitleStyle}>Accent Color Scheme</div>
                    <div style={settingDescStyle}>Select primary highlight theme color across elements</div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    {[
                      { id: 'default', label: 'Cyan / Emerald', color: '#10b981' },
                      { id: 'emerald', label: 'Forest Emerald', color: '#059669' },
                      { id: 'violet', label: 'Cyber Violet', color: '#8b5cf6' },
                      { id: 'amber', label: 'Sunset Amber', color: '#f59e0b' }
                    ].map(accent => (
                      <button
                        key={accent.id}
                        type="button"
                        onClick={() => updateSetting('accentColor', accent.id)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '14px',
                          border: settings.accentColor === accent.id ? `2px solid ${accent.color}` : '1px solid var(--border-glass)',
                          background: settings.accentColor === accent.id ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-secondary)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: accent.color }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)', fontWeight: 600 }}>{accent.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Compact Mode */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Compact UI Density</div>
                    <div style={settingDescStyle}>Reduce element padding for higher information density</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.compactMode ?? false}
                    onChange={(e) => updateSetting('compactMode', e.target.checked)}
                    style={checkboxStyle}
                  />
                </div>
              </>
            )}

            {/* DATA & BACKUP TAB */}
            {activeTab === 'data' && (
              <>
                <h3 style={sectionHeadingStyle}>Data Management & Cloud Backup</h3>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>
                  Manage your offline local storage data, export your configuration, or perform system maintenance.
                </div>

                {/* Export Backup */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Export Full Backup (JSON)</div>
                    <div style={settingDescStyle}>Download all settings, saved recipes, and nutrition logs</div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleExport}
                    style={{ ...actionBtnStyle, background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff' }}
                  >
                    <Download size={15} /> Export
                  </button>
                </div>

                {/* Import Backup */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Restore Backup (JSON)</div>
                    <div style={settingDescStyle}>Upload a previously exported backup configuration file</div>
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    accept=".json" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }} 
                  />
                  <button 
                    type="button"
                    onClick={handleImportClick}
                    style={{ ...actionBtnStyle, background: 'var(--card-bg)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)' }}
                  >
                    <Upload size={15} /> Import
                  </button>
                </div>

                {/* Clear Cache */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Clear Search Cache</div>
                    <div style={settingDescStyle}>Wipe saved ingredient search queries & draft cache</div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleClearCache}
                    style={{ ...actionBtnStyle, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                  >
                    <Trash2 size={15} /> Clear Cache
                  </button>
                </div>

                {/* Reset Defaults */}
                <div style={settingRowStyle}>
                  <div>
                    <div style={settingTitleStyle}>Factory Reset Settings</div>
                    <div style={settingDescStyle}>Reset preferences to original application default parameters</div>
                  </div>
                  <button 
                    type="button"
                    onClick={handleResetSettings}
                    style={{ ...actionBtnStyle, background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}
                  >
                    <RotateCcw size={15} /> Reset Defaults
                  </button>
                </div>
              </>
            )}

          </div>
        </div>

        {/* Footer */}
        <div style={{ 
          padding: '16px 24px', 
          borderTop: '1px solid var(--border-glass)',
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.02)'
        }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            CHEF v2.4 • Client Preferences Persisted Locally
          </span>
          <button 
            className="btn-primary" 
            onClick={onClose} 
            style={{ padding: '8px 24px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Check size={16} /> Save & Close
          </button>
        </div>
      </div>
    </div>
  );
}

// Inline Helper Styles
const tabBtnStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: 'none',
  background: isActive ? 'var(--accent-color, rgba(16, 185, 129, 0.15))' : 'transparent',
  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
  fontWeight: isActive ? 600 : 500,
  fontSize: '0.88rem',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s ease'
});

const sectionHeadingStyle = {
  fontSize: '1rem',
  fontWeight: 700,
  color: 'var(--text-primary)',
  margin: '0 0 4px 0'
};

const settingRowStyle = {
  display: 'flex',
  justify: 'space-between',
  alignItems: 'center',
  background: 'var(--bg-secondary)',
  padding: '14px 18px',
  borderRadius: '16px',
  border: '1px solid var(--border-glass)'
};

const settingTitleStyle = {
  fontWeight: 600,
  fontSize: '0.92rem',
  color: 'var(--text-primary)'
};

const settingDescStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-muted)',
  marginTop: '2px'
};

const selectInputStyle = {
  padding: '8px 14px',
  borderRadius: '10px',
  border: '1px solid var(--border-glass)',
  background: 'var(--card-bg)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '0.88rem',
  fontWeight: 500
};

const checkboxStyle = {
  width: '20px',
  height: '20px',
  cursor: 'pointer',
  accentColor: 'var(--accent-color, #10b981)'
};

const actionBtnStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '10px',
  border: 'none',
  fontWeight: 600,
  fontSize: '0.85rem',
  cursor: 'pointer',
  transition: 'transform 0.15s ease'
};

