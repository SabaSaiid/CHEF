import React, { useContext, useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Bell, Trash2, CheckCircle2, AlertCircle, AlertTriangle, Info, CheckCheck, PanelRightOpen, Settings as SettingsIcon, LogIn, X } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast, formatRelativeTime } from '../context/ToastContext';
import AuthModal from './AuthModal';
import SettingsModal from './SettingsModal';

export default function Navbar({ onToggleSidebar }) {
  const { token, username } = useContext(AuthContext);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isSettingsOpen, setSettingsOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'unread'
  const { history, unreadCount, markAllAsRead, markItemAsRead, removeHistoryItem, clearHistory } = useToast();
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

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isNotifOpen) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isNotifOpen]);

  const handleToggleNotif = () => {
    setIsNotifOpen(prev => !prev);
  };

  const getNotifIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle2 size={14} style={{ color: '#10b981' }} />;
      case 'error': return <AlertCircle size={14} style={{ color: '#ef4444' }} />;
      case 'warning': return <AlertTriangle size={14} style={{ color: '#f59e0b' }} />;
      default: return <Info size={14} style={{ color: '#3b82f6' }} />;
    }
  };

  const displayedHistory = filterTab === 'unread' ? history.filter(item => !item.read) : history;

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
              title={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'Notifications'}
              aria-label="Toggle notification center"
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="notif-badge-counter">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>

            {/* Notification Center Popover */}
            {isNotifOpen && (
              <div className="notif-popover" role="dialog" aria-label="Notification center">
                <div className="notif-popover-header">
                  <div className="notif-popover-title">
                    <Bell size={14} />
                    <span>Notifications</span>
                    {history.length > 0 && <span className="notif-count-tag">{history.length}</span>}
                  </div>
                  <div className="notif-header-actions">
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        className="notif-header-action-btn"
                        onClick={markAllAsRead}
                        title="Mark all as read"
                      >
                        <CheckCheck size={13} />
                        <span>Read all</span>
                      </button>
                    )}
                    {history.length > 0 && (
                      <button
                        type="button"
                        className="notif-header-action-btn notif-clear-btn"
                        onClick={clearHistory}
                        title="Clear notification history"
                      >
                        <Trash2 size={13} />
                        <span>Clear</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter Tabs */}
                {history.length > 0 && (
                  <div className="notif-filter-tabs">
                    <button
                      type="button"
                      className={`notif-filter-tab ${filterTab === 'all' ? 'active' : ''}`}
                      onClick={() => setFilterTab('all')}
                    >
                      All ({history.length})
                    </button>
                    <button
                      type="button"
                      className={`notif-filter-tab ${filterTab === 'unread' ? 'active' : ''}`}
                      onClick={() => setFilterTab('unread')}
                    >
                      Unread {unreadCount > 0 && <span className="notif-tab-badge">{unreadCount}</span>}
                    </button>
                  </div>
                )}

                <div className="notif-popover-body">
                  {displayedHistory.length === 0 ? (
                    <div className="notif-empty-state">
                      <CheckCheck size={24} className="empty-icon" />
                      <p>{filterTab === 'unread' ? 'No unread notifications' : 'No recent notifications'}</p>
                      <span className="notif-empty-subtext">Alerts & actions will appear here</span>
                    </div>
                  ) : (
                    <div className="notif-list">
                      {displayedHistory.map(item => (
                        <div
                          key={item.id}
                          className={`notif-item ${item.read ? 'is-read' : 'is-unread'}`}
                          onClick={() => markItemAsRead(item.id)}
                        >
                          <span className="notif-item-icon">{getNotifIcon(item.type)}</span>
                          <div className="notif-item-content">
                            <p className="notif-item-message">{item.message}</p>
                            <span className="notif-item-time">{formatRelativeTime(item.timestamp || item.createdAt || item.time)}</span>
                          </div>
                          <div className="notif-item-actions">
                            {!item.read && <span className="notif-unread-dot" title="Unread" />}
                            <button
                              type="button"
                              className="notif-item-delete-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeHistoryItem(item.id);
                              }}
                              title="Delete"
                              aria-label="Delete notification"
                            >
                              <X size={11} />
                            </button>
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
