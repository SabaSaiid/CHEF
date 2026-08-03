import React, { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Download, 
  Trash2, 
  ShieldCheck, 
  Check, 
  AlertTriangle, 
  FileSpreadsheet, 
  RefreshCw,
  Sliders,
  Database,
  Lock
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/ToastContext';

export default function DataPrivacyPortal() {
  const { exportUserData, importUserData, getStorageMetrics } = useSettings();
  const toast = useToast();

  const [metrics, setMetrics] = useState({ kbSize: '0.0', chefKeysCount: 0, searchCount: 0, logsCount: 0 });
  const [consentMode, setConsentMode] = useState(() => {
    return localStorage.getItem('chef_cookie_consent') || 'all';
  });
  const [confirmingClear, setConfirmingClear] = useState(false);

  const refreshMetrics = () => {
    if (getStorageMetrics) {
      setMetrics(getStorageMetrics());
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  const handleConsentChange = (mode) => {
    setConsentMode(mode);
    localStorage.setItem('chef_cookie_consent', mode);
    localStorage.setItem('chef_consent_timestamp', new Date().toISOString());
    toast.success(`Storage consent updated to: ${mode.toUpperCase()}`);
  };

  const handleExportJSON = () => {
    try {
      exportUserData();
      toast.success('Full JSON data backup downloaded!');
    } catch (e) {
      toast.error('Failed to generate backup export.');
    }
  };

  const handleExportCSV = () => {
    try {
      const logs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
      if (logs.length === 0) {
        toast.info('No logged meals found to export.');
        return;
      }

      const headers = ['Date', 'Meal Name', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)'];
      const rows = logs.map(log => [
        `"${log.date || ''}"`,
        `"${(log.name || log.food_name || 'Meal').replace(/"/g, '""')}"`,
        log.calories || 0,
        log.protein || 0,
        log.carbs || 0,
        log.fat || 0
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `chef_meal_history_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Meal History CSV exported!');
    } catch (err) {
      toast.error('Failed to export CSV: ' + err.message);
    }
  };

  const handleWipeCache = () => {
    if (!confirmingClear) {
      setConfirmingClear(true);
      return;
    }

    try {
      const keysToKeep = ['chef_theme'];
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chef_') && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(k => localStorage.removeItem(k));
      setConfirmingClear(false);
      refreshMetrics();
      toast.success('Local cache and guest logs purged successfully!');
    } catch (e) {
      toast.error('Failed to clear cache.');
    }
  };

  return (
    <div className="privacy-portal-wrapper">
      <div className="privacy-portal-header">
        <div className="portal-title-group">
          <ShieldCheck className="portal-icon" size={24} />
          <div>
            <h3 className="portal-title">Data Control & Privacy Portal</h3>
            <p className="portal-subtitle">GDPR data portability, browser storage metrics, and right to erasure.</p>
          </div>
        </div>
        <button className="portal-refresh-btn" onClick={refreshMetrics} title="Refresh metrics">
          <RefreshCw size={15} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Storage Meter Gauge */}
      <div className="privacy-card storage-meter-card">
        <div className="meter-header">
          <div className="meter-label">
            <HardDrive size={18} />
            <span>Browser Local Storage Gauge</span>
          </div>
          <span className="meter-value">{metrics.kbSize} KB Used</span>
        </div>

        <div className="meter-track">
          <div 
            className="meter-fill" 
            style={{ width: `${Math.min(100, Math.max(5, (parseFloat(metrics.kbSize) / 500) * 100))}%` }}
          />
        </div>

        <div className="meter-stats-grid">
          <div className="stat-item">
            <span className="stat-label">Stored Entries</span>
            <span className="stat-num">{metrics.chefKeysCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Logged Meals</span>
            <span className="stat-num">{metrics.logsCount}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Privacy Policy</span>
            <span className="stat-num text-green">GDPR Ready</span>
          </div>
        </div>
      </div>

      {/* Storage Consent Manager */}
      <div className="privacy-card consent-manager-card">
        <h4 className="card-heading">
          <Sliders size={16} /> Storage Category Consent
        </h4>
        
        <div className="consent-options-list">
          <div 
            className={`consent-opt-box ${consentMode === 'all' ? 'active' : ''}`}
            onClick={() => handleConsentChange('all')}
          >
            <div className="opt-radio">
              {consentMode === 'all' && <Check size={14} />}
            </div>
            <div className="opt-text">
              <strong>Full Local Persistence (Recommended)</strong>
              <span>Save dietary profile, TDEE targets, guest logs, and pantry items in local browser cache.</span>
            </div>
          </div>

          <div 
            className={`consent-opt-box ${consentMode === 'essential' ? 'active' : ''}`}
            onClick={() => handleConsentChange('essential')}
          >
            <div className="opt-radio">
              {consentMode === 'essential' && <Check size={14} />}
            </div>
            <div className="opt-text">
              <strong>Essential Storage Only</strong>
              <span>Store only core session tokens and active theme preferences. Disables local offline history.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Data Suite */}
      <div className="privacy-card export-suite-card">
        <h4 className="card-heading">
          <Download size={16} /> Data Export Suite (Portability)
        </h4>
        <p className="card-desc">Download a copy of your personal data history anytime in standard open formats.</p>

        <div className="export-btn-group">
          <button className="export-action-btn" onClick={handleExportJSON}>
            <Download size={16} />
            <div className="btn-text">
              <span className="btn-title">Export Full Backup (JSON)</span>
              <span className="btn-sub">Complete profile, pantry, & logs</span>
            </div>
          </button>

          <button className="export-action-btn csv" onClick={handleExportCSV}>
            <FileSpreadsheet size={16} />
            <div className="btn-text">
              <span className="btn-title">Export Meal History (CSV)</span>
              <span className="btn-sub">Open in Excel or Google Sheets</span>
            </div>
          </button>
        </div>
      </div>

      {/* GDPR Erasure & Purge Zone */}
      <div className="privacy-card erasure-danger-card">
        <h4 className="card-heading danger">
          <AlertTriangle size={16} /> Right to Erasure & Data Purge
        </h4>
        <p className="card-desc">Permanently remove local cached data and reset guest sessions.</p>

        <div className="erasure-action-row">
          <div>
            <strong style={{ fontSize: '0.9rem' }}>Clear Guest Cache & Meal History</strong>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Removes all locally saved guest logs and pantry data</div>
          </div>

          <button 
            className={`erasure-btn ${confirmingClear ? 'confirming' : ''}`}
            onClick={handleWipeCache}
          >
            <Trash2 size={15} />
            <span>{confirmingClear ? 'Confirm Purge Data?' : 'Purge Local Cache'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
