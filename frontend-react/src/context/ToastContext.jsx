import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';
import { playAddSound, playWarningSound, playClickSound } from '../utils/soundEffects';

const ToastContext = createContext();

const NOTIF_HISTORY_STORAGE_KEY = 'chef_notification_history';
let toastIdCounter = Date.now();

function isAudioEnabled() {
  try {
    const saved = localStorage.getItem('chef_app_settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      return Boolean(parsed.toastAudio);
    }
  } catch (e) {}
  return false;
}

function loadInitialHistory() {
  try {
    const saved = localStorage.getItem(NOTIF_HISTORY_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed.slice(0, 30);
    }
  } catch (e) {}
  return [];
}

export function formatRelativeTime(dateInput) {
  if (!dateInput) return 'Just now';
  const timestamp = typeof dateInput === 'number' ? dateInput : new Date(dateInput).getTime();
  if (isNaN(timestamp)) return String(dateInput);

  const diffMs = Date.now() - timestamp;
  if (diffMs < 45000) return 'Just now';
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState(() => loadInitialHistory());
  const [unreadCount, setUnreadCount] = useState(() => {
    const init = loadInitialHistory();
    return init.filter(h => !h.read).length;
  });

  const timersRef = useRef({});
  const remainingTimeRef = useRef({});
  const startTimeRef = useRef({});

  // Sync notification history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(NOTIF_HISTORY_STORAGE_KEY, JSON.stringify(history));
    } catch (e) {}
    setUnreadCount(history.filter(h => !h.read).length);
  }, [history]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
        delete remainingTimeRef.current[id];
        delete startTimeRef.current[id];
      }
    }, 220);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3400, options = {}) => {
    const cleanMsg = typeof message === 'string' ? message.replace(/\s*✓$/, '').trim() : message;
    const isPersistent = type === 'loading' || duration === 0;

    // Check for existing active toast with exact same message and type for deduplication
    let existingId = null;
    setToasts(prev => {
      const match = prev.find(t => !t.exiting && t.message === cleanMsg && t.type === type);
      if (match) {
        existingId = match.id;
        return prev.map(t => t.id === match.id ? { ...t, count: (t.count || 1) + 1, bumping: true } : t);
      }
      return prev;
    });

    if (existingId) {
      // Reset timer on existing toast
      if (!isPersistent) {
        if (timersRef.current[existingId]) clearTimeout(timersRef.current[existingId]);
        remainingTimeRef.current[existingId] = duration;
        startTimeRef.current[existingId] = Date.now();
        timersRef.current[existingId] = setTimeout(() => removeToast(existingId), duration);
      }
      // Remove bump animation class after 250ms
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === existingId ? { ...t, bumping: false } : t));
      }, 250);

      if (isAudioEnabled()) {
        if (type === 'error' || type === 'warning') playWarningSound();
        else if (type === 'success') playAddSound();
        else playClickSound();
      }
      return existingId;
    }

    const id = ++toastIdCounter;
    const nowIso = new Date().toISOString();

    const newToast = {
      id,
      message: cleanMsg,
      type,
      exiting: false,
      bumping: false,
      count: 1,
      duration: isPersistent ? 0 : duration,
      paused: false,
      action: options.action || null,
      timestamp: Date.now()
    };

    // Keep active toasts capped at max 3
    setToasts(prev => [newToast, ...prev.filter(t => !t.exiting)].slice(0, 3));

    if (isAudioEnabled()) {
      if (type === 'error' || type === 'warning') {
        playWarningSound();
      } else if (type === 'success') {
        playAddSound();
      } else {
        playClickSound();
      }
    }

    // Log to Notification Center history
    setHistory(prev => [{
      id,
      message: cleanMsg,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: nowIso,
      timestamp: Date.now(),
      read: false
    }, ...prev.filter(h => h.id !== id)].slice(0, 30));

    if (!isPersistent) {
      remainingTimeRef.current[id] = duration;
      startTimeRef.current[id] = Date.now();
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, [removeToast]);

  const pauseToast = useCallback((id) => {
    if (!timersRef.current[id]) return;
    clearTimeout(timersRef.current[id]);
    const elapsed = Date.now() - (startTimeRef.current[id] || Date.now());
    remainingTimeRef.current[id] = Math.max(0, (remainingTimeRef.current[id] || 0) - elapsed);
    setToasts(prev => prev.map(t => t.id === id ? { ...t, paused: true } : t));
  }, []);

  const resumeToast = useCallback((id) => {
    const remaining = remainingTimeRef.current[id];
    if (remaining === undefined || remaining <= 0) {
      removeToast(id);
      return;
    }
    startTimeRef.current[id] = Date.now();
    timersRef.current[id] = setTimeout(() => removeToast(id), remaining);
    setToasts(prev => prev.map(t => t.id === id ? { ...t, paused: false } : t));
  }, [removeToast]);

  const dismiss = useCallback((id) => {
    if (id) removeToast(id);
    else setToasts(prev => prev.map(t => ({ ...t, exiting: true })));
  }, [removeToast]);

  const success = useCallback((msg, duration, opts) => addToast(msg, 'success', duration || 3200, opts), [addToast]);
  const error = useCallback((msg, duration, opts) => addToast(msg, 'error', duration || 4500, opts), [addToast]);
  const info = useCallback((msg, duration, opts) => addToast(msg, 'info', duration || 3200, opts), [addToast]);
  const warning = useCallback((msg, duration, opts) => addToast(msg, 'warning', duration || 3800, opts), [addToast]);
  const loading = useCallback((msg, opts) => addToast(msg, 'loading', 0, opts), [addToast]);

  const promise = useCallback(async (promiseOrFn, { loading: loadingMsg, success: successMsg, error: errorMsg }) => {
    const id = loading(loadingMsg || 'Processing...');
    try {
      const result = typeof promiseOrFn === 'function' ? await promiseOrFn() : await promiseOrFn;
      removeToast(id);
      success(typeof successMsg === 'function' ? successMsg(result) : successMsg || 'Completed successfully!');
      return result;
    } catch (err) {
      removeToast(id);
      error(typeof errorMsg === 'function' ? errorMsg(err) : errorMsg || err.message || 'Action failed');
      throw err;
    }
  }, [loading, success, error, removeToast]);

  const markAllAsRead = useCallback(() => {
    setHistory(prev => prev.map(h => ({ ...h, read: true })));
  }, []);

  const markItemAsRead = useCallback((id) => {
    setHistory(prev => prev.map(h => h.id === id ? { ...h, read: true } : h));
  }, []);

  const removeHistoryItem = useCallback((id) => {
    setHistory(prev => prev.filter(h => h.id !== id));
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(NOTIF_HISTORY_STORAGE_KEY);
    } catch (e) {}
  }, []);

  const toastApi = {
    addToast,
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss,
    removeToast,
    history,
    unreadCount,
    markAllAsRead,
    markItemAsRead,
    removeHistoryItem,
    clearHistory,
    // Aliases for legacy callers
    showSuccess: success,
    showError: error,
    showInfo: info,
    showWarning: warning,
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="toast-type-icon" size={15} />;
      case 'error':
        return <AlertCircle className="toast-type-icon" size={15} />;
      case 'warning':
        return <AlertTriangle className="toast-type-icon" size={15} />;
      case 'loading':
        return <Loader2 className="toast-type-icon toast-spin-icon" size={15} />;
      case 'info':
      default:
        return <Info className="toast-type-icon" size={15} />;
    }
  };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      {createPortal(
        <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'} ${t.paused ? 'toast-paused' : ''} ${t.bumping ? 'toast-bump' : ''}`}
              onMouseEnter={() => t.duration > 0 && pauseToast(t.id)}
              onMouseLeave={() => t.duration > 0 && resumeToast(t.id)}
              onClick={() => removeToast(t.id)}
            >
              <div className="toast-accent-strip" />
              <div className="toast-icon-wrapper">
                {renderIcon(t.type)}
              </div>
              <div className="toast-content">
                <div className="toast-message-row">
                  <span className="toast-message">{t.message}</span>
                  {t.count > 1 && (
                    <span className="toast-count-badge" title={`${t.count} occurrences`}>
                      ×{t.count}
                    </span>
                  )}
                </div>
                {t.action && (
                  <button
                    type="button"
                    className="toast-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      t.action.onClick?.();
                      removeToast(t.id);
                    }}
                  >
                    {t.action.label}
                  </button>
                )}
              </div>
              <button 
                type="button"
                className="toast-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeToast(t.id);
                }}
                aria-label="Dismiss notification"
              >
                <X size={12} />
              </button>
              {t.duration > 0 && (
                <div 
                  className="toast-progress" 
                  style={{ 
                    animationDuration: `${t.duration}ms`,
                    animationPlayState: t.paused ? 'paused' : 'running'
                  }} 
                />
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}



