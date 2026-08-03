import React, { useState, useContext } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, signup } = useContext(AuthContext);
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (mode === 'signup') {
        await signup(formData);
      } else {
        await login({ username: formData.username, password: formData.password });
      }
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggle = () => {
    setMode(mode === 'login' ? 'signup' : 'login');
    setError('');
  };

  return createPortal(
    <div className="modal-overlay">
      <div className="modal-content auth-modal">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">{mode === 'login' ? 'Login to CHEF' : 'Create Account'}</h2>

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="your@email.com" 
                className="form-input" 
                required 
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
              />
            </div>
          )}
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              placeholder="Enter username" 
              className="form-input" 
              required 
              value={formData.username} 
              onChange={e => setFormData({ ...formData, username: e.target.value })} 
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              placeholder="Enter password" 
              className="form-input" 
              required 
              value={formData.password} 
              onChange={e => setFormData({ ...formData, password: e.target.value })} 
            />
          </div>
          {mode === 'signup' && (
            <div className="terms-consent-group" style={{ margin: '14px 0 6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', cursor: 'pointer', lineHeight: '1.4' }}>
                <input type="checkbox" required style={{ marginTop: '3px', accentColor: 'var(--accent-1)' }} />
                <span>
                  I agree to CHEF's{' '}
                  <a href="/terms?tab=terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-1)', textDecoration: 'underline', fontWeight: 'bold' }}>
                    Terms of Service
                  </a>{' '}
                  &{' '}
                  <a href="/terms?tab=privacy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-1)', textDecoration: 'underline', fontWeight: 'bold' }}>
                    Privacy Policy
                  </a>.
                </span>
              </label>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="btn-primary btn-full">
            {mode === 'login' ? 'Login' : 'Sign Up'}
          </button>
        </form>

        <div className="auth-switch">
          <span>{mode === 'login' ? "Don't have an account?" : "Already have an account?"}</span>
          <button className="btn-link" onClick={handleToggle}>
            {mode === 'login' ? 'Sign Up' : 'Login'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

