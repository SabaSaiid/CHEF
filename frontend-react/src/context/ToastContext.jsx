import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

const ToastContext = createContext();

let toastIdCounter = 0;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const timersRef = useRef({});
  const remainingTimeRef = useRef({});
  const startTimeRef = useRef({});

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
    }, 280);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3800, options = {}) => {
    const id = ++toastIdCounter;
    const cleanMsg = typeof message === 'string' ? message.replace(/\s*✓$/, '') : message;
    const isPersistent = type === 'loading' || duration === 0;

    const newToast = {
      id,
      message: cleanMsg,
      type,
      exiting: false,
      duration: isPersistent ? 0 : duration,
      paused: false,
      action: options.action || null,
      timestamp: new Date()
    };

    setToasts(prev => [newToast, ...prev].slice(0, 5));

    // Log to Notification Center history
    setHistory(prev => [{
      id,
      message: cleanMsg,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    }, ...prev].slice(0, 30));

    setUnreadCount(c => c + 1);

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

  const success = useCallback((msg, duration, opts) => addToast(msg, 'success', duration || 3500, opts), [addToast]);
  const error = useCallback((msg, duration, opts) => addToast(msg, 'error', duration || 4800, opts), [addToast]);
  const info = useCallback((msg, duration, opts) => addToast(msg, 'info', duration || 3500, opts), [addToast]);
  const warning = useCallback((msg, duration, opts) => addToast(msg, 'warning', duration || 4000, opts), [addToast]);
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
    setUnreadCount(0);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    setUnreadCount(0);
  }, []);

  const toastApi = {
    success,
    error,
    info,
    warning,
    loading,
    promise,
    dismiss,
    history,
    unreadCount,
    markAllAsRead,
    clearHistory
  };

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="toast-type-icon" size={18} />;
      case 'error':
        return <AlertCircle className="toast-type-icon" size={18} />;
      case 'warning':
        return <AlertTriangle className="toast-type-icon" size={18} />;
      case 'loading':
        return <Loader2 className="toast-type-icon toast-spin-icon" size={18} />;
      case 'info':
      default:
        return <Info className="toast-type-icon" size={18} />;
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
              className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'} ${t.paused ? 'toast-paused' : ''}`}
              onMouseEnter={() => t.duration > 0 && pauseToast(t.id)}
              onMouseLeave={() => t.duration > 0 && resumeToast(t.id)}
              onClick={() => removeToast(t.id)}
            >
              <div className="toast-accent-strip" />
              <div className="toast-icon-wrapper">
                {renderIcon(t.type)}
              </div>
              <div className="toast-content">
                <span className="toast-message">{t.message}</span>
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
                <X size={14} />
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


