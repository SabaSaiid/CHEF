import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

const DEFAULT_SETTINGS = {
  // General
  unitPreference: 'metric', // 'metric' | 'imperial'
  defaultStartPage: '/',
  enableAnimations: true,
  toastAudio: false,

  // Dietary & Health
  defaultDiet: 'none',
  defaultAllergens: [], // e.g. ['nuts', 'dairy', 'gluten', 'shellfish', 'eggs', 'soy']
  strictDietMode: false,
  autoCorrectEnabled: true,

  // Planner & Targets
  waterGoalTarget: 2000, // in ml
  expiryWarningDays: 3,
  overflowAlertsEnabled: true,
  dragPlannerEnabled: true,

  // Appearance
  compactMode: false,
  accentColor: 'default', // 'default' | 'emerald' | 'violet' | 'amber'
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('chef_app_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('chef_app_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
    // Update root document data attributes for compact mode and accent color if present
    if (settings.compactMode) {
      document.documentElement.setAttribute('data-compact', 'true');
    } else {
      document.documentElement.removeAttribute('data-compact');
    }
    if (settings.accentColor && settings.accentColor !== 'default') {
      document.documentElement.setAttribute('data-accent', settings.accentColor);
    } else {
      document.documentElement.removeAttribute('data-accent');
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.setItem('chef_app_settings', JSON.stringify(DEFAULT_SETTINGS));
    } catch (e) {
      console.error(e);
    }
  };

  const exportUserData = () => {
    try {
      const exportObject = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        settings: settings,
        theme: localStorage.getItem('chef_theme') || 'light',
        guestLogs: JSON.parse(localStorage.getItem('chef_guest_logs') || '[]'),
        guestWater: parseInt(localStorage.getItem('chef_guest_water') || '0', 10),
        searchHistory: JSON.parse(localStorage.getItem('chef_search_history') || '[]'),
        plannerData: {}
      };

      // Collect planner checked and custom items from localStorage
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('chef_checked_') || key.startsWith('chef_custom_'))) {
          exportObject.plannerData[key] = localStorage.getItem(key);
        }
      }

      const jsonStr = JSON.stringify(exportObject, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `chef_backup_${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Export error:', e);
      throw e;
    }
  };

  const importUserData = (jsonString) => {
    try {
      const imported = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString;
      if (!imported || typeof imported !== 'object') {
        throw new Error('Invalid JSON backup file');
      }

      if (imported.settings) {
        const newSettings = { ...DEFAULT_SETTINGS, ...imported.settings };
        setSettings(newSettings);
        localStorage.setItem('chef_app_settings', JSON.stringify(newSettings));
      }

      if (imported.theme) {
        localStorage.setItem('chef_theme', imported.theme);
        document.documentElement.setAttribute('data-theme', imported.theme);
      }

      if (imported.guestLogs) {
        localStorage.setItem('chef_guest_logs', JSON.stringify(imported.guestLogs));
      }

      if (imported.guestWater !== undefined) {
        localStorage.setItem('chef_guest_water', imported.guestWater.toString());
      }

      if (imported.searchHistory) {
        localStorage.setItem('chef_search_history', JSON.stringify(imported.searchHistory));
      }

      if (imported.plannerData) {
        Object.entries(imported.plannerData).forEach(([key, val]) => {
          if (typeof val === 'string') {
            localStorage.setItem(key, val);
          }
        });
      }

      return true;
    } catch (e) {
      console.error('Import error:', e);
      throw e;
    }
  };

  const clearAppCache = () => {
    try {
      localStorage.removeItem('chef_search_history');
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const getStorageMetrics = () => {
    try {
      let totalBytes = 0;
      let chefKeysCount = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('chef_')) {
          chefKeysCount++;
          const val = localStorage.getItem(key) || '';
          totalBytes += (key.length + val.length) * 2; // approx 2 bytes per char
        }
      }
      const kbSize = (totalBytes / 1024).toFixed(1);
      const searchCount = JSON.parse(localStorage.getItem('chef_search_history') || '[]').length;
      const logsCount = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]').length;
      return { totalBytes, kbSize, chefKeysCount, searchCount, logsCount };
    } catch (e) {
      return { totalBytes: 0, kbSize: '0.0', chefKeysCount: 0, searchCount: 0, logsCount: 0 };
    }
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      updateSetting,
      resetSettings,
      exportUserData,
      importUserData,
      clearAppCache,
      getStorageMetrics,
      DEFAULT_SETTINGS
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;

