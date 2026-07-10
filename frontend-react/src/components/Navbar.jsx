import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import AuthModal from './AuthModal';

export default function Navbar({ onToggleSidebar }) {
  const { token, username } = useContext(AuthContext);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <nav id="main-nav">
        <div className="nav-brand">
          <span className="nav-logo">👨‍🍳</span>
          <div className="nav-brand-text">
            <span className="nav-title">CHEF</span>
            <span className="nav-subtitle">Hybrid Eating Framework</span>
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
        </div>

        <div className="nav-auth">
          {!token ? (
            <button className="btn-auth" onClick={() => setAuthModalOpen(true)}>🔐 Login</button>
          ) : (
            <div className="user-greeting">
              <span>👤 {username}</span>
            </div>
          )}

          <button 
            className="navbar-sidebar-toggle theme-toggle"
            onClick={onToggleSidebar}
            title="Toggle Preferences"
            style={{ margin: 0 }}
          >
            ⚙️
          </button>
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
