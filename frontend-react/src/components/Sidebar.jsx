import React, { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import AuthModal from './AuthModal';

export default function Sidebar({ isOpen, setIsOpen }) {
  const { token, username, logout, seedDemo, userProfile, activeProfile } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [demoLoading, setDemoLoading] = useState(false);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [todayCalories, setTodayCalories] = useState(0);

  useEffect(() => {
    if (token) {
      const todayStr = new Date().toISOString().split('T')[0];
      api.get(`/nutrition/log?date=${todayStr}`)
        .then(data => {
          const total = Array.isArray(data) ? data.reduce((sum, log) => sum + (log.calories || 0), 0) : 0;
          setTodayCalories(total);
        })
        .catch(err => console.error("Failed to fetch today's logs:", err));
    } else {
      setTodayCalories(0);
    }
  }, [token, userProfile]);

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
          <span className="sidebar-icon">⚙️</span>
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
                <span className="guest-avatar">👤</span>
                <div className="guest-info">
                  <div className="guest-title">Guest Profile</div>
                  <div className="guest-subtitle">Track macros & plan meals</div>
                </div>
              </div>
              <button className="btn-primary sidebar-login-btn" onClick={() => setAuthModalOpen(true)}>
                🔐 Log In / Sign Up
              </button>
            </div>
          ) : (
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-user">
                👤 {activeProfile?.display_name || username}
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
                      <span className="target-value">🔥 {activeProfile.target_calories} <span className="target-unit">kcal</span></span>
                    </div>
                  )}

                  {/* Profile Completion setupProgress */}
                  <div className="profile-completion-section">
                    <div className="completion-header">
                      <span>Profile Setup</span>
                      <span>{setupProgress}%</span>
                    </div>
                    <div className="completion-bar">
                      <div className="completion-bar-fill" style={{ width: `${setupProgress}%` }} />
                    </div>
                  </div>
                </div>
              )}
              
              <button className="btn-auth btn-logout sidebar-logout-btn" onClick={logout}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>

        {/* Live Calories Progress Bar */}
        {token && activeProfile && activeProfile.target_calories && (
          <div className="sidebar-section">
            <h4 className="sidebar-section-title">Today's Progress</h4>
            <div className="sidebar-tracker-glimpse">
              <div className="tracker-glimpse-info">
                <span>Calories</span>
                <strong>{todayCalories} / {activeProfile.target_calories} kcal</strong>
              </div>
              <div className="tracker-glimpse-bar">
                <div 
                  className="tracker-glimpse-bar-fill" 
                  style={{ width: `${Math.min((todayCalories / activeProfile.target_calories) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* CHEF Utility Tools */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">CHEF Tools</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/ingredients')}>
              <span>🥦</span> Ingredients Directory
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/detection')}>
              <span>📷</span> Food Image Detector
            </button>
            <button className="sidebar-tool-btn" onClick={() => handleNav('/nutrition')}>
              <span>🔍</span> Nutrition Lookup
            </button>
          </div>
        </div>

        {/* Preferences & Demo Mode */}
        <div className="sidebar-section">
          <h4 className="sidebar-section-title">Preferences</h4>
          
          <div className="sidebar-item-column">
            <span className="sidebar-label">Theme Mode</span>
            <div className="theme-selector">
              <button 
                className={`theme-opt ${theme === 'light' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
              >
                ☀️ Light
              </button>
              <button 
                className={`theme-opt ${theme === 'dark' ? 'active' : ''}`}
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
              >
                🌙 Dark
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
              >
                ✨ {demoLoading ? 'Loading...' : 'Load Demo Mode'}
              </button>
            </div>
          )}
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </aside>
  );
}
