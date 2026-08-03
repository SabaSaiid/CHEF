import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import AuthModal from './AuthModal';
import { getLocalDateString, CHEF_EVENTS } from '../utils/dateUtils';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { token, username, logout, seedDemo, userProfile, activeProfile, refreshActiveProfile } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);

  const fetchTodayCalories = useCallback(() => {
    if (token) {
      const todayStr = getLocalDateString();
      api.get(`/nutrition/log?date=${todayStr}`)
        .then(data => {
          const total = Array.isArray(data) ? data.reduce((sum, log) => sum + (log.calories || 0), 0) : 0;
          setTodayCalories(total);
        })
        .catch(err => console.error("Failed to fetch today's logs:", err));
    } else {
      try {
        const todayStr = getLocalDateString();
        const storedLogs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const todayGuestLogs = storedLogs.filter(item => item.date === todayStr);
        const total = todayGuestLogs.reduce((sum, log) => sum + (log.calories || 0), 0);
        setTodayCalories(total);
      } catch {
        setTodayCalories(0);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchTodayCalories();

    const handleSync = () => {
      fetchTodayCalories();
      if (refreshActiveProfile) refreshActiveProfile();
    };

    window.addEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
    window.addEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
      window.removeEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchTodayCalories, refreshActiveProfile]);

  const handleDemoClick = async () => {
    setDemoLoading(true);
    try {
      await seedDemo();
      toast.success("Demo profile loaded successfully.");
      navigate('/');
    } catch (err) {
      toast.error("Failed to load demo data: " + err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  const handleNav = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  const getProfileSetupProgress = () => {
    if (!activeProfile) return 0;
    const fields = ['age', 'height_cm', 'weight_kg', 'gender', 'activity_level', 'goal'];
    const filled = fields.filter(f => activeProfile[f] !== null && activeProfile[f] !== undefined && activeProfile[f] !== '').length;
    return Math.round((filled / fields.length) * 100);
  };

  const setupProgress = getProfileSetupProgress();

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <h3 className="sidebar-title">Preferences</h3>
        </div>
        <button 
          className="sidebar-close-btn" 
          onClick={() => setIsOpen(false)}
          title="Close Panel"
          aria-label="Close sidebar"
        >
          ✕
        </button>
      </div>

      <div className="sidebar-body">
        {/* Profile / Auth Section */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Account Details</h4>
          
          {!token ? (
            <div className="sidebar-profile-card guest">
              <div className="guest-header">
                <div className="guest-info">
                  <div className="guest-title">Guest Profile</div>
                  <div className="guest-subtitle">Track macros & plan meals</div>
                </div>
              </div>
              <button className="btn-primary sidebar-login-btn" onClick={() => setAuthModalOpen(true)}>
                Log In / Sign Up
              </button>
            </div>
          ) : (
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-user">
                {activeProfile?.display_name || username}
              </div>
              {activeProfile?.diet_type && (
                <div className="sidebar-diet-badge">
                  {activeProfile.diet_type}
                </div>
              )}
              {activeProfile && activeProfile.age && (
                <div className="sidebar-profile-stats">
                  <div className="profile-details-grid">
                    <div className="profile-stat-box">
                      <span className="stat-label">Age</span>
                      <span className="stat-value">{activeProfile.age} <span className="stat-unit">yrs</span></span>
                    </div>
                    <div className="profile-stat-box">
                      <span className="stat-label">Height</span>
                      <span className="stat-value">{activeProfile.height_cm} <span className="stat-unit">cm</span></span>
                    </div>
                    <div className="profile-stat-box">
                      <span className="stat-label">Weight</span>
                      <span className="stat-value">{activeProfile.weight_kg} <span className="stat-unit">kg</span></span>
                    </div>
                  </div>
                  
                  {activeProfile.target_calories && (
                    <div className="profile-target-box">
                      <span className="target-label">Daily Target</span>
                      <span className="target-value">{activeProfile.target_calories} <span className="target-unit">kcal</span></span>
                    </div>
                  )}

                  {/* Circular Profile Setup Ring / Collapsible setup summary */}
                  {setupProgress < 100 ? (
                    <div className="profile-completion-section" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
                      <svg width="32" height="32" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="16" fill="none" stroke="var(--border-glass)" strokeWidth="3.5" />
                        <circle 
                          cx="18" cy="18" r="16" fill="none" stroke="var(--accent-2)" strokeWidth="3.5" 
                          strokeDasharray="100 100"
                          strokeDashoffset={100 - setupProgress}
                          strokeLinecap="round"
                          transform="rotate(-90 18 18)"
                          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                      </svg>
                      <div>
                        <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Profile Setup</span>
                        <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-muted)', fontWeight: 'bold' }}>{setupProgress}% Complete</span>
                      </div>
                    </div>
                  ) : (
                    <details style={{ marginTop: '16px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                      <summary style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', cursor: 'pointer', listStylePosition: 'inside' }}>
                        Setup Complete
                      </summary>
                      <div style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        All profile metrics (Age, Height, Weight, Activity, Goal) are fully configured.
                      </div>
                    </details>
                  )}
                </div>
              )}
              
              <button className="btn-auth btn-logout sidebar-logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Live Calories Progress Bar */}
        {token && activeProfile && activeProfile.target_calories && (() => {
          const calPct = Math.min(Math.round((todayCalories / activeProfile.target_calories) * 100), 100);
          return (
            <div className="sidebar-section">
              <h4 className="sidebar-section-title">Today's Progress</h4>
              <div className="sidebar-tracker-glimpse" style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div className="tracker-glimpse-info" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>Calories</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>{calPct}%</span>
                </div>
                <div className="tracker-glimpse-bar" style={{ height: '6px', background: 'rgba(0,0,0,0.05)', borderRadius: '3px', overflow: 'hidden', position: 'relative' }}>
                  <div 
                    className="tracker-glimpse-bar-fill" 
                    style={{ 
                      height: '100%',
                      width: `${calPct}%`, 
                      background: 'var(--accent-1)',
                      borderRadius: '3px',
                      transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)' 
                    }}
                  />
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{todayCalories} kcal</span>
                  <span>Target: {activeProfile.target_calories}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* CHEF Utility Tools */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">CHEF Tools</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/ingredients')}>
              Ingredients Directory
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/detection')}>
              Food Image Detector
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/nutrition')}>
              Nutrition Lookup
            </button>
          </div>
        </div>

        {/* Preferences & Demo Mode */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Preferences</h4>
          
          <div className="sidebar-item-column">
            <span className="sidebar-label">Theme Mode</span>
            <div className="theme-selector" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '2px', display: 'flex', gap: '2px' }}>
              <button 
                className={`theme-opt ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
                style={{ flex: 1, border: 'none', background: theme === 'light' ? 'var(--text-primary)' : 'transparent', color: theme === 'light' ? 'var(--bg-primary)' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s ease' }}
              >
                Light
              </button>
              <button 
                className={`theme-opt ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
                style={{ flex: 1, border: 'none', background: theme === 'dark' ? 'var(--text-primary)' : 'transparent', color: theme === 'dark' ? 'var(--bg-primary)' : 'var(--text-secondary)', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', transition: 'all 0.2s ease' }}
              >
                Dark
              </button>
            </div>
          </div>

          {!token && (
            <div className="sidebar-item-column" style={{ marginTop: '8px' }}>
              <span className="sidebar-label">Demo Mode</span>
              <button
                className={`btn-demo sidebar-btn-demo ${demoLoading ? 'loading' : ''}`}
                onClick={handleDemoClick}
                disabled={demoLoading}
                style={{ background: 'var(--text-primary)', color: 'var(--bg-primary)' }}
              >
                {demoLoading ? 'Loading...' : 'Load Demo Mode'}
              </button>
            </div>
          )}
        </div>

        {/* Legal & Governance */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Legal & Governance</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/terms?tab=terms')}>
              📜 Terms of Service
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/terms?tab=privacy')}>
              🔒 Privacy Policy
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/terms?tab=disclaimer')}>
              ⚠️ Medical Disclaimer
            </button>
          </div>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </aside>
  );
}
