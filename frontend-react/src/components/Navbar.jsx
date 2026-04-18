import React, { useContext, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import AuthModal from './AuthModal';

export default function Navbar() {
  const { token, username, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <nav id="main-nav">
        <div className="nav-brand">
          <span className="nav-logo">👨‍🍳</span>
          <div className="nav-brand-text">
            <span className="nav-title">CHEF</span>
            <span className="nav-subtitle">Constraint-based Hybrid Eating Framework</span>
          </div>
        </div>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>The Kitchen</NavLink>
          <NavLink to="/ingredients" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Ingredients</NavLink>
          <NavLink to="/recipes" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Recipes</NavLink>
          <NavLink to="/nutrition" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Nutrition</NavLink>
          <NavLink to="/tdee" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Profile/TDEE</NavLink>
          <NavLink to="/detection" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Detection</NavLink>
          <NavLink to="/saved" className={({ isActive }) => `nav-btn ${isActive ? 'active' : ''}`}>Saved</NavLink>
        </div>

        <div className="nav-auth">
          {/* Theme Toggle */}
          <button
            className="theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>

          {!token ? (
            <button className="btn-auth" onClick={() => setAuthModalOpen(true)}>🔐 Login</button>
          ) : (
            <div className="user-greeting">
              <span>👋 {username}</span>
              <button className="btn-auth btn-logout" onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </nav>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
}
