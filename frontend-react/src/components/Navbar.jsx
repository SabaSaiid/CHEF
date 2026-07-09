import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import AuthModal from './AuthModal';

export default function Navbar({ onToggleSidebar }) {
  const { token, username, logout } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <nav id="main-nav">
        <div className="nav-brand">
          <span className="nav-logo">👨‍🍳</span>
          <div className="nav-brand-text">
            <span className="nav-title">CHEF</span>
            <span className="nav-subtitle"></span>
          </div>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Kitchen</NavLink>
          <NavLink to="/recipes" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Recipes</NavLink>
          <NavLink to="/ingredients" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Ingredients</NavLink>
          <NavLink to="/detection" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Detection</NavLink>
          <NavLink to="/nutrition" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Nutrition</NavLink>
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
              <span>👋 {username}</span>
            </div>
          )}

          <button 
            className="navbar-sidebar-toggle theme-toggle"
            onClick={onToggleSidebar}
            title="Toggle Chef Panel"
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
