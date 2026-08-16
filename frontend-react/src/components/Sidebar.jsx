import React, { useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import AuthModal from './AuthModal';
import { getLocalDateString, CHEF_EVENTS } from '../utils/dateUtils';
import {
  X, Sun, Moon, User,
  Home, UtensilsCrossed, CalendarDays, BarChart3, Bookmark, Users,
  Search, Camera, Apple,
  ChevronDown, HelpCircle, ScrollText, Lock, AlertTriangle, MessageSquare, Award,
  LogOut, SlidersHorizontal, Flame, Compass, Wrench, Palette, ShieldCheck, UserCheck
} from 'lucide-react';

const QUICK_NAV_ITEMS = [
  { path: '/',          label: 'Kitchen',   icon: Home,              end: true },
  { path: '/recipes',   label: 'Recipes',   icon: UtensilsCrossed },
  { path: '/planner',   label: 'Planner',   icon: CalendarDays },
  { path: '/tracker',   label: 'Tracker',   icon: BarChart3 },
  { path: '/saved',     label: 'Saved',     icon: Bookmark },
  { path: '/community', label: 'Community', icon: Users },
];

export default function Sidebar({ isOpen, setIsOpen, onOpenFeedback }) {
  const { token, username, logout, seedDemo, userProfile, activeProfile, refreshActiveProfile } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
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

  // Escape key closes sidebar
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, setIsOpen]);

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

  const isNavActive = (path, end) => {
    if (end) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  const setupProgress = getProfileSetupProgress();
  const displayName = activeProfile?.display_name || username || '';
  const userInitial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`} role="complementary" aria-label="Control panel and profile drawer">
      <div className="sidebar-header">
        <div className="sidebar-title-group">
          <div className="sidebar-header-icon-box">
            <SlidersHorizontal size={17} />
          </div>
          <div className="sidebar-title-text-group">
            <h3 className="sidebar-title">CHEF Hub</h3>
            <span className="sidebar-subtitle">Quick Actions & Profile</span>
          </div>
        </div>
        <button
          className="sidebar-close-btn"
          onClick={() => setIsOpen(false)}
          title="Close Drawer (Esc)"
          aria-label="Close sidebar drawer"
        >
          <X size={16} />
        </button>
      </div>

      <div className="sidebar-body">
        {/* ── Section 1: Profile / Auth ── */}
        <div className="sidebar-section sidebar-section-animated">
          <h4 className="sidebar-section-title">
            <User size={13} /> Account
          </h4>

          {!token ? (
            <div className="sidebar-profile-card guest">
              <div className="sidebar-profile-header">
                <div className="sidebar-avatar guest">
                  <User size={20} />
                </div>
                <div className="sidebar-profile-info">
                  <div className="sidebar-profile-name">Guest Profile</div>
                  <div className="sidebar-profile-subtitle">Track macros & plan meals</div>
                </div>
              </div>
              <div className="sidebar-guest-tagline">
                Sign in to unlock personalized meal plans, calorie tracking & community features
              </div>
              <button className="sidebar-login-btn-enhanced" onClick={() => setAuthModalOpen(true)}>
                Log In / Sign Up
              </button>
            </div>
          ) : (
            <div className="sidebar-profile-card">
              <div className="sidebar-profile-header">
                <div className="sidebar-avatar">
                  {userInitial}
                </div>
                <div className="sidebar-profile-info">
                  <div className="sidebar-profile-name">{displayName}</div>
                  {activeProfile?.diet_type && (
                    <div className="sidebar-diet-badge">{activeProfile.diet_type}</div>
                  )}
                </div>
              </div>

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

                  {/* Profile Setup Ring / Collapsible summary */}
                  {setupProgress < 100 ? (
                    <div className="profile-completion-row">
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
                        <span className="profile-completion-label">Profile Setup</span>
                        <span className="profile-completion-pct">{setupProgress}% Complete</span>
                      </div>
                    </div>
                  ) : (
                    <details className="sidebar-setup-details">
                      <summary className="sidebar-setup-summary">
                        Setup Complete
                      </summary>
                      <div className="sidebar-setup-text">
                        All profile metrics (Age, Height, Weight, Activity, Goal) are fully configured.
                      </div>
                    </details>
                  )}
                </div>
              )}

              <div className="sidebar-profile-actions">
                <button className="sidebar-profile-action-btn" onClick={() => handleNav('/tdee')}>
                  <UserCheck size={13} /> Edit Profile
                </button>
                <button className="sidebar-profile-action-btn" onClick={logout} style={{ color: '#ef4444' }}>
                  <LogOut size={13} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Section 2: Today's Progress (logged-in only) ── */}
        {token && activeProfile && activeProfile.target_calories && (() => {
          const actualCalPct = Math.round((todayCalories / activeProfile.target_calories) * 100);
          const barWidth = Math.min(100, actualCalPct);
          const isOverTarget = todayCalories > activeProfile.target_calories;
          const isNearTarget = actualCalPct >= 80 && actualCalPct <= 100;
          const overKcal = todayCalories - activeProfile.target_calories;

          const fillClass = isOverTarget ? 'over' : isNearTarget ? 'normal near-target' : 'normal';

          return (
            <div className="sidebar-section sidebar-section-animated">
              <h4 className="sidebar-section-title">
                <Flame size={13} /> Today's Progress
              </h4>
              <div className="sidebar-tracker-card">
                <div className="tracker-glimpse-header">
                  <span className="tracker-glimpse-label">Calories</span>
                  <span className={`tracker-glimpse-pct ${isOverTarget ? 'over' : 'normal'}`}>
                    {actualCalPct}% {isOverTarget && `(🔥 +${overKcal} kcal over)`}
                  </span>
                </div>
                <div className="tracker-bar-track">
                  <div
                    className={`tracker-bar-fill ${fillClass}`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                <div className="tracker-totals">
                  <span>{todayCalories} kcal</span>
                  <span>Target: {activeProfile.target_calories}</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Section 3: Quick Access Navigation ── */}
        <div className="sidebar-section sidebar-section-animated">
          <h4 className="sidebar-section-title">
            <Compass size={13} /> Quick Navigation
          </h4>
          <div className="sidebar-quick-nav">
            {QUICK_NAV_ITEMS.map(({ path, label, icon: Icon, end }) => (
              <button
                key={path}
                className={`quick-nav-item ${isNavActive(path, end) ? 'active' : ''}`}
                onClick={() => handleNav(path)}
                aria-current={isNavActive(path, end) ? 'page' : undefined}
              >
                <Icon className="quick-nav-icon" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Section 4: CHEF Tools (with icons & subtitles) ── */}
        <div className="sidebar-section sidebar-section-animated">
          <h4 className="sidebar-section-title">
            <Wrench size={13} /> Specialized Tools
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button className="sidebar-tool-btn-enhanced" onClick={() => handleNav('/ingredients')}>
              <div className="tool-icon-wrapper ingredients">
                <Search size={16} />
              </div>
              <div className="sidebar-tool-info">
                <span className="sidebar-tool-name">Ingredients Directory</span>
                <span className="sidebar-tool-subtitle">Browse & search 500+ ingredients</span>
              </div>
            </button>
            <button className="sidebar-tool-btn-enhanced" onClick={() => handleNav('/detection')}>
              <div className="tool-icon-wrapper detection">
                <Camera size={16} />
              </div>
              <div className="sidebar-tool-info">
                <span className="sidebar-tool-name">Food Image Detector</span>
                <span className="sidebar-tool-subtitle">Snap a photo, get nutrition info</span>
              </div>
            </button>
            <button className="sidebar-tool-btn-enhanced" onClick={() => handleNav('/nutrition')}>
              <div className="tool-icon-wrapper nutrition">
                <Apple size={16} />
              </div>
              <div className="sidebar-tool-info">
                <span className="sidebar-tool-name">Nutrition Lookup</span>
                <span className="sidebar-tool-subtitle">Detailed macro & micro data</span>
              </div>
            </button>
          </div>
        </div>

        {/* ── Section 5: Appearance & Mode ── */}
        <div className="sidebar-section sidebar-section-animated">
          <h4 className="sidebar-section-title">
            <Palette size={13} /> Appearance & Mode
          </h4>

          <div className="sidebar-item-column">
            <span className="sidebar-label">Theme Mode</span>
            <div className="sidebar-theme-selector">
              <button
                className={`sidebar-theme-opt ${theme === 'light' ? 'selected' : 'inactive'}`}
                onClick={() => { if (theme !== 'light') toggleTheme(); }}
              >
                <Sun size={13} /> Light
              </button>
              <button
                className={`sidebar-theme-opt ${theme === 'dark' ? 'selected' : 'inactive'}`}
                onClick={() => { if (theme !== 'dark') toggleTheme(); }}
              >
                <Moon size={13} /> Dark
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
                {demoLoading ? 'Loading...' : 'Load Demo Mode'}
              </button>
            </div>
          )}
        </div>

        {/* ── Section 6: Support & Legal (Accordion + Standalone Feedback) ── */}
        <div className="sidebar-section sidebar-section-animated">
          <h4 className="sidebar-section-title">
            <ShieldCheck size={13} /> Support & Privacy
          </h4>

          {onOpenFeedback && (
            <button className="sidebar-feedback-standalone" onClick={() => { setIsOpen(false); onOpenFeedback(); }}>
              <MessageSquare size={15} />
              Report Feedback
            </button>
          )}

          <details className="sidebar-legal-accordion">
            <summary>
              <ScrollText size={13} />
              Legal & Governance
              <ChevronDown className="legal-chevron" />
            </summary>
            <div className="sidebar-legal-links">
              <button className="sidebar-legal-link" onClick={() => handleNav('/help')}>
                <HelpCircle size={13} /> Help & FAQ
              </button>
              <button className="sidebar-legal-link" onClick={() => handleNav('/attributions')}>
                <Award size={13} /> Open Source Credits
              </button>
              <button className="sidebar-legal-link" onClick={() => handleNav('/terms?tab=terms')}>
                <ScrollText size={13} /> Terms of Service
              </button>
              <button className="sidebar-legal-link" onClick={() => handleNav('/terms?tab=privacy')}>
                <Lock size={13} /> Privacy Policy
              </button>
              <button className="sidebar-legal-link" onClick={() => handleNav('/terms?tab=disclaimer')}>
                <AlertTriangle size={13} /> Medical Disclaimer
              </button>
            </div>
          </details>
        </div>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </aside>
  );
}
