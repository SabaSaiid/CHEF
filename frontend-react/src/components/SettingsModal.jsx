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
  Search,
  Sparkles,
  Volume2,
  VolumeX,
  Gauge,
  Droplets,
  CalendarDays,
  AlertTriangle,
  HardDrive,
  Info,
  Layers
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
    clearAppCache,
    getStorageMetrics
  } = useSettings();
  const { addToast } = useToast();
  
  const [activeTab, setActiveTab] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileInputRef = useRef(null);

  const storageMetrics = getStorageMetrics ? getStorageMetrics() : { kbSize: '0.0', chefKeysCount: 0, searchCount: 0, logsCount: 0 };

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
    e.target.value = '';
  };

  const handleClearCache = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      setTimeout(() => setConfirmingClear(false), 4000);
      return;
    }
    clearAppCache();
    setConfirmingClear(false);
    addToast('Local cache cleared! 🧹', 'success');
  };

  const handleResetSettings = () => {
    if (!confirmingReset) {
      setConfirmingReset(true);
      setTimeout(() => setConfirmingReset(false), 4000);
      return;
    }
    resetSettings();
    setConfirmingReset(false);
    addToast('Settings reset to factory defaults! 🔄', 'info');
  };

  const toggleAllergen = (id) => {
    const current = settings.defaultAllergens || [];
    const next = current.includes(id) 
      ? current.filter(item => item !== id)
      : [...current, id];
    updateSetting('defaultAllergens', next);
  };

  const isMatch = (text) => {
    if (!searchQuery.trim()) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase().trim());
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div 
        className="modal-content glass" 
        style={{ 
          maxWidth: '740px', 
          width: '95%', 
          borderRadius: '24px', 
          padding: '0', 
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)'
        }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px 16px 24px', 
          borderBottom: '1px solid var(--border-glass)',
          background: 'rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '42px', 
                height: '42px', 
                borderRadius: '14px', 
                background: 'linear-gradient(135deg, var(--accent-primary, #10b981), #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 4px 12px var(--accent-glow, rgba(16,185,129,0.3))'
              }}>
                <SettingsIcon size={22} />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Control Center & Settings
                </h2>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Personalize workspace, safety rules, and local backups
                </span>
              </div>
            </div>
            <button className="modal-close" onClick={onClose} style={{ position: 'relative', top: 0, right: 0 }}>×</button>
          </div>

          {/* Quick Filter Search Bar */}
          <div className="settings-search-wrapper" style={{ margin: 0 }}>
            <Search size={16} className="settings-search-icon" />
            <input
              type="text"
              className="settings-search-input"
              placeholder="Filter settings parameters (e.g. water, units, theme, export)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Modal Body with Sidebar Tabs */}
        <div className="settings-modal-wrapper" style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: '430px' }}>
          {/* Navigation Sidebar */}
          <div className="settings-sidebar-tabs" style={{ 
            width: '210px', 
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
              {(settings.defaultAllergens || []).length > 0 && (
                <span style={badgeStyle}>{(settings.defaultAllergens || []).length}</span>
              )}
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
            {(activeTab === 'general' || searchQuery.trim() !== '') && (
              <>
                {activeTab === 'general' && <h3 style={sectionHeadingStyle}>General Preferences</h3>}
                
                {/* Measurement Units */}
                {isMatch('measurement units metric imperial weight volume') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Measurement Units</div>
                      <div style={settingDescStyle}>Preferred unit system for weights and liquids</div>
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
                )}

                {/* Default Start Page */}
                {isMatch('default start view landing page kitchen recipes planner tracker pantry') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Default Start View</div>
                      <div style={settingDescStyle}>Primary dashboard view loaded on startup</div>
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
                )}

                {/* Animations Toggle */}
                {isMatch('animations transitions UI interactive keyframe') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>UI Micro-Animations</div>
                      <div style={settingDescStyle}>Enable smooth transitions & keyframe effects</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.enableAnimations ?? true}
                        onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}

                {/* Toast Sound */}
                {isMatch('audio sound chime notification alerts') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Audio Notification Alerts</div>
                      <div style={settingDescStyle}>Play subtle audio chimes on key actions</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.toastAudio ?? false}
                        onChange={(e) => updateSetting('toastAudio', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* DIETARY TAB */}
            {(activeTab === 'dietary' || searchQuery.trim() !== '') && (
              <>
                {activeTab === 'dietary' && <h3 style={sectionHeadingStyle}>Dietary Profile & Safety Filters</h3>}
                
                {/* Default Diet Preference */}
                {isMatch('diet preference vegetarian vegan keto gluten free high protein') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Default Diet Preference</div>
                      <div style={settingDescStyle}>Pre-filters recipe searches & meal recommendations</div>
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
                )}

                {/* Allergen Avoidance Checklist */}
                {isMatch('allergen exclusion nuts dairy lactose gluten shellfish eggs soy') && (
                  <div style={{ ...settingRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '12px' }}>
                    <div>
                      <div style={settingTitleStyle}>Allergen Exclusion Restrictions</div>
                      <div style={settingDescStyle}>Flag recipes containing any selected allergen</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                      {ALLERGEN_LIST.map(alg => (
                        <label 
                          key={alg.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '10px 14px',
                            borderRadius: '12px',
                            background: (settings.defaultAllergens || []).includes(alg.id)
                              ? 'rgba(239, 68, 68, 0.12)' 
                              : 'var(--card-bg, rgba(255, 255, 255, 0.04))',
                            border: `1px solid ${(settings.defaultAllergens || []).includes(alg.id) ? 'rgba(239, 68, 68, 0.35)' : 'var(--border-glass)'}`,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            color: 'var(--text-primary)',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={(settings.defaultAllergens || []).includes(alg.id)}
                            onChange={() => toggleAllergen(alg.id)}
                            style={{ cursor: 'pointer', accentColor: '#ef4444' }}
                          />
                          {alg.label}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strict Diet Mode */}
                {isMatch('strict diet enforcement hide warn conflict') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Strict Diet Enforcement</div>
                      <div style={settingDescStyle}>Strictly hide or block recipes violating dietary rules</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.strictDietMode ?? false}
                        onChange={(e) => updateSetting('strictDietMode', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}

                {/* Auto-Correct */}
                {isMatch('ingredient typo auto correct spell fix') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Ingredient Typos Auto-Correct</div>
                      <div style={settingDescStyle}>Offer instant spelling fixes (e.g. chaiken → chicken)</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.autoCorrectEnabled ?? true}
                        onChange={(e) => updateSetting('autoCorrectEnabled', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* PLANNER & TARGETS TAB */}
            {(activeTab === 'planner' || searchQuery.trim() !== '') && (
              <>
                {activeTab === 'planner' && <h3 style={sectionHeadingStyle}>Planner & Nutrition Targets</h3>}

                {/* Daily Water Target */}
                {isMatch('hydration water goal target intake ml') && (
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
                )}

                {/* Expiry Warning Threshold */}
                {isMatch('pantry expiry alert threshold days expiring') && (
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
                )}

                {/* Macro Overflow */}
                {isMatch('macro overflow warning calorie 100 excess') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Macro Overflow Warnings (&gt;100%)</div>
                      <div style={settingDescStyle}>Highlight excess caloric & macro intake above daily target</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.overflowAlertsEnabled ?? true}
                        onChange={(e) => updateSetting('overflowAlertsEnabled', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}

                {/* Draggable Planner */}
                {isMatch('draggable interactive drag planner mouse pan') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Interactive Drag Meal Planner</div>
                      <div style={settingDescStyle}>Enable touch & mouse drag-to-pan in weekly charts</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.dragPlannerEnabled ?? true}
                        onChange={(e) => updateSetting('dragPlannerEnabled', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* APPEARANCE TAB */}
            {(activeTab === 'appearance' || searchQuery.trim() !== '') && (
              <>
                {activeTab === 'appearance' && <h3 style={sectionHeadingStyle}>Appearance & Theme Settings</h3>}

                {/* Accent Theme Color */}
                {isMatch('accent color scheme emerald violet amber cyan theme') && (
                  <div style={{ ...settingRowStyle, flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}>
                    <div>
                      <div style={settingTitleStyle}>Accent Color Scheme</div>
                      <div style={settingDescStyle}>Select primary highlight accent color across dashboard</div>
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
                            padding: '14px 10px',
                            borderRadius: '16px',
                            border: (settings.accentColor || 'default') === accent.id ? `2px solid ${accent.color}` : '1px solid var(--border-glass)',
                            background: (settings.accentColor || 'default') === accent.id ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-secondary)',
                            boxShadow: (settings.accentColor || 'default') === accent.id ? `0 0 12px ${accent.color}40` : 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: accent.color, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }} />
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', fontWeight: 600 }}>{accent.label}</span>
                        </button>
                      ))}
                    </div>

                    {/* Live Preview Card */}
                    <div style={{
                      padding: '14px 16px',
                      borderRadius: '14px',
                      background: 'var(--card-bg, rgba(255,255,255,0.03))',
                      border: '1px dashed var(--border-glass)',
                      display: 'flex',
                      alignItems: 'center',
                      justify: 'space-between'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Sparkles size={16} style={{ color: 'var(--accent-primary, #10b981)' }} />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                          Accent Theme Preview
                        </span>
                      </div>
                      <button 
                        type="button" 
                        style={{ 
                          padding: '6px 14px', 
                          borderRadius: '10px', 
                          background: 'var(--accent-primary, #10b981)', 
                          color: '#fff', 
                          border: 'none', 
                          fontWeight: 600, 
                          fontSize: '0.8rem',
                          boxShadow: '0 2px 8px var(--accent-glow)' 
                        }}
                      >
                        Sample Action
                      </button>
                    </div>
                  </div>
                )}

                {/* Compact Mode */}
                {isMatch('compact ui density padding spacing') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Compact UI Density</div>
                      <div style={settingDescStyle}>Reduce padding for higher information density</div>
                    </div>
                    <label className="chef-switch">
                      <input
                        type="checkbox"
                        className="chef-switch-input"
                        checked={settings.compactMode ?? false}
                        onChange={(e) => updateSetting('compactMode', e.target.checked)}
                      />
                      <span className="chef-switch-slider"></span>
                    </label>
                  </div>
                )}
              </>
            )}

            {/* DATA & BACKUP TAB */}
            {(activeTab === 'data' || searchQuery.trim() !== '') && (
              <>
                {activeTab === 'data' && <h3 style={sectionHeadingStyle}>Data Management & Cloud Backup</h3>}
                
                {/* Local Storage Footprint Bar */}
                <div style={{
                  background: 'var(--bg-secondary)',
                  padding: '16px 18px',
                  borderRadius: '16px',
                  border: '1px solid var(--border-glass)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <HardDrive size={16} style={{ color: 'var(--accent-primary, #10b981)' }} />
                      <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        Local Data Footprint
                      </span>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      {storageMetrics.kbSize} KB ({storageMetrics.chefKeysCount} keys)
                    </span>
                  </div>

                  <div className="storage-meter">
                    <div 
                      className="storage-meter-fill" 
                      style={{ width: `${Math.min(100, Math.max(5, (storageMetrics.totalBytes / 50000) * 100))}%` }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>🔍 {storageMetrics.searchCount} search history items</span>
                    <span>📊 {storageMetrics.logsCount} guest logs</span>
                  </div>
                </div>

                {/* Export Backup */}
                {isMatch('export backup json download save') && (
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
                )}

                {/* Import Backup */}
                {isMatch('import restore backup json upload') && (
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
                )}

                {/* Clear Cache */}
                {isMatch('clear search cache history wipe') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Clear Search Cache</div>
                      <div style={settingDescStyle}>Wipe saved ingredient search queries & draft cache</div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleClearCache}
                      style={{ 
                        ...actionBtnStyle, 
                        background: confirmingClear ? '#ef4444' : 'rgba(239, 68, 68, 0.1)', 
                        color: confirmingClear ? '#ffffff' : '#ef4444', 
                        border: '1px solid rgba(239, 68, 68, 0.3)' 
                      }}
                    >
                      <Trash2 size={15} /> {confirmingClear ? 'Confirm Clear?' : 'Clear Cache'}
                    </button>
                  </div>
                )}

                {/* Reset Defaults */}
                {isMatch('factory reset settings default parameters') && (
                  <div style={settingRowStyle}>
                    <div>
                      <div style={settingTitleStyle}>Factory Reset Settings</div>
                      <div style={settingDescStyle}>Reset preferences to original application default parameters</div>
                    </div>
                    <button 
                      type="button"
                      onClick={handleResetSettings}
                      style={{ 
                        ...actionBtnStyle, 
                        background: confirmingReset ? '#f59e0b' : 'rgba(245, 158, 11, 0.1)', 
                        color: confirmingReset ? '#ffffff' : '#f59e0b', 
                        border: '1px solid rgba(245, 158, 11, 0.3)' 
                      }}
                    >
                      <RotateCcw size={15} /> {confirmingReset ? 'Confirm Reset?' : 'Reset Defaults'}
                    </button>
                  </div>
                )}
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
  justifyContent: 'space-between',
  gap: '10px',
  width: '100%',
  padding: '10px 14px',
  borderRadius: '12px',
  border: 'none',
  background: isActive ? 'var(--accent-subtle, rgba(16, 185, 129, 0.15))' : 'transparent',
  color: isActive ? 'var(--accent-primary, #10b981)' : 'var(--text-muted)',
  fontWeight: isActive ? 600 : 500,
  fontSize: '0.88rem',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'all 0.2s ease'
});

const badgeStyle = {
  background: '#ef4444',
  color: '#ffffff',
  fontSize: '0.7rem',
  fontWeight: 700,
  padding: '2px 6px',
  borderRadius: '10px'
};

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
  border: '1px solid var(--border-glass)',
  transition: 'all 0.2s ease'
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
  transition: 'all 0.2s ease'
};


