import React, { createContext, useState, useEffect, useContext } from 'react';

const SettingsContext = createContext();

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('chef_app_settings');
      return saved ? JSON.parse(saved) : {
        autoCorrectEnabled: true,
        strictDietMode: false,
        overflowAlertsEnabled: true,
        dragPlannerEnabled: true,
        unitPreference: 'metric', // 'metric' | 'imperial'
      };
    } catch (e) {
      return {
        autoCorrectEnabled: true,
        strictDietMode: false,
        overflowAlertsEnabled: true,
        dragPlannerEnabled: true,
        unitPreference: 'metric',
      };
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('chef_app_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings to localStorage', e);
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
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
