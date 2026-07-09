import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext();

let toastIdCounter = 0;

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, exiting: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      if (timersRef.current[id]) {
        clearTimeout(timersRef.current[id]);
        delete timersRef.current[id];
      }
    }, 300);
  }, []);

  const addToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = ++toastIdCounter;
    setToasts(prev => [...prev, { id, message, type, exiting: false, duration }]);
    timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    return id;
  }, [removeToast]);

  const toast = useCallback({
    success: (msg, duration) => addToast(msg, 'success', duration),
    error: (msg, duration) => addToast(msg, 'error', duration || 4000),
    info: (msg, duration) => addToast(msg, 'info', duration),
  }, [addToast]);

  // Fix: useCallback can't be called on an object literal like that.
  // Let's restructure:
  const success = useCallback((msg, duration) => addToast(msg, 'success', duration), [addToast]);
  const error = useCallback((msg, duration) => addToast(msg, 'error', duration || 4000), [addToast]);
  const info = useCallback((msg, duration) => addToast(msg, 'info', duration), [addToast]);

  const toastApi = { success, error, info };

  const icons = { success: '✓', error: '✕', info: 'ℹ' };

  return (
    <ToastContext.Provider value={toastApi}>
      {children}
      {createPortal(
        <div className="toast-container" aria-live="polite">
          {toasts.map(t => (
            <div
              key={t.id}
              className={`toast toast-${t.type} ${t.exiting ? 'toast-exit' : 'toast-enter'}`}
              onClick={() => removeToast(t.id)}
            >
              <span className="toast-icon">{icons[t.type]}</span>
              <span className="toast-message">{t.message}</span>
              <div className="toast-progress" style={{ animationDuration: `${t.duration}ms` }} />
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}
