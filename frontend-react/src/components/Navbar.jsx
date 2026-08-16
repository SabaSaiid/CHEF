import React, { useContext, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Trash2, CheckCircle2, AlertCircle, AlertTriangle, Info, CheckCheck, PanelRightOpen, Settings as SettingsIcon, LogIn } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';

export default function Navbar({ onToggleSidebar }) {
  const { token, username } = useContext(AuthContext);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const { history, unreadCount, markAllAsRead, clearHistory } = useToast();
  const notifRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotif = () => {
    if (!isNotifOpen && unreadCount > 0) {
      markAllAsRead();
    }
    setIsNotifOpen(!isNotifOpen);
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={15} style={{ color: '#10b981' }} />;
      case 'error': return <AlertCircle size={15} style={{ color: '#ef4444' }} />;
      case 'warning': return <AlertTriangle size={15} style={{ color: '#f59e0b' }} />;
      default: return <Info size={15} style={{ color: '#3b82f6' }} />;
    }
  };

  return (
    <>
      <nav id="main-nav">
        <div className="nav-brand">
          <span className="nav-logo">👨‍🍳</span>
          <div className="nav-brand-text">
            <span className="nav-title">CHEF</span>
          </div>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Kitchen</NavLink>
          <NavLink to="/recipes" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Recipes</NavLink>
          <NavLink to="/pantry" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Pantry</NavLink>
          <NavLink to="/tdee" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Profile</NavLink>
          <NavLink to="/planner" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Planner</NavLink>
          <NavLink to="/tracker" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Tracker</NavLink>
          <NavLink to="/saved" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Saved</NavLink>
          <NavLink to="/community" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Community</NavLink>
          <NavLink to="/help" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Help</NavLink>
        </div>

        <div className="nav-auth">
          {/* Notification Center Trigger */}
          <div className="notif-center-wrapper" ref={notifRef}>
            <button
              type="button"
              className={`nav-icon-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
              onClick={handleToggleNotif}
              title="Notifications"
              aria-label="Toggle notification center"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="notif-badge-counter">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {/* Notification Center Popover */}
            {isNotifOpen && (
              <div className="notif-popover">
                <div className="notif-popover-header">
                  <div className="notif-popover-title">
                    <Bell size={15} />
                    <span>Notifications</span>
                    {history.length > 0 && <span className="notif-count-tag">{history.length}</span>}
                  </div>
                  {history.length > 0 && (
                    <button
                      type="button"
                      className="notif-clear-btn"
                      onClick={clearHistory}
                      title="Clear notification history"
                    >
                      <Trash2 size={13} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>

                <div className="notif-popover-body">
                  {history.length === 0 ? (
                    <div className="notif-empty-state">
                      <CheckCheck size={28} className="empty-icon" />
                      <p>No recent notifications</p>
                    </div>
                  ) : (
                    <div className="notif-list">
                      {history.map(item => (
                        <div key={item.id} className="notif-item">
                          <span className="notif-item-icon">{getNotifIcon(item.type)}</span>
                          <div className="notif-item-content">
                            <p className="notif-item-message">{item.message}</p>
                            <span className="notif-item-time">{item.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!token ? (
            <button className="btn-auth" onClick={() => setAuthModalOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <LogIn size={15} />
              <span>Login</span>
            </button>
          ) : (
            <div className="user-greeting" onClick={onToggleSidebar} style={{ cursor: 'pointer' }} title="Toggle Profile & Quick Tools Drawer">
              <span>👤 {username}</span>
            </div>
          )}

          {/* Toggle Sidebar / Quick Panel Drawer Button */}
          <button
            type="button"
            className="nav-icon-btn"
            onClick={onToggleSidebar}
            title="Quick Tools & Profile Drawer"
            aria-label="Toggle Quick Tools & Profile Drawer"
            style={{ margin: 0 }}
          >
            <PanelRightOpen size={18} />
          </button>

          {/* App Settings Modal Button */}
          <button
            type="button"
            className="nav-icon-btn"
            onClick={() => setSettingsOpen(true)}
            title="App Configuration & Settings"
            aria-label="Open App Configuration & Settings"
            style={{ margin: 0 }}
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      {isSettingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </>
  );
}
