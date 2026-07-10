import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('chef_token'));
  const [username, setUsername] = useState(localStorage.getItem('chef_username'));
  const [userId, setUserId] = useState(localStorage.getItem('chef_user_id'));
  const [userProfile, setUserProfile] = useState(null); // Full /auth/me response
  const [activeProfile, setActiveProfile] = useState(null); // Active named profile from /profiles/active

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(data => setUserProfile(data))
        .catch(() => logout());
      api.get('/profiles/active')
        .then(data => setActiveProfile(data))
        .catch(() => setActiveProfile(null)); // 404 is fine — user may have no profiles yet
    }
  }, [token]);

  const refreshActiveProfile = async () => {
    try {
      const data = await api.get('/profiles/active');
      setActiveProfile(data);
    } catch {
      setActiveProfile(null);
    }
  };

  const login = async (credentials) => {
    const data = await api.post('/auth/login', credentials);
    saveAuthData(data);
    const [profile] = await Promise.allSettled([
      api.get('/auth/me'),
      api.get('/profiles/active').then(p => setActiveProfile(p)).catch(() => setActiveProfile(null)),
    ]);
    if (profile.status === 'fulfilled') setUserProfile(profile.value);
    return data;
  };

  const signup = async (userData) => {
    const data = await api.post('/auth/signup', userData);
    saveAuthData(data);
    const profile = await api.get('/auth/me');
    setUserProfile(profile);
    setActiveProfile(null); // New account has no profiles yet
    return data;
  };

  const seedDemo = async () => {
    const data = await api.post('/demo/seed');
    saveAuthData(data);
    const profile = await api.get('/auth/me');
    setUserProfile(profile);
    // Try to get the active profile (demo seeder may have created one)
    api.get('/profiles/active').then(p => setActiveProfile(p)).catch(() => setActiveProfile(null));
    return data;
  };

  const saveAuthData = (data) => {
    setToken(data.access_token);
    setUsername(data.username);
    setUserId(data.user_id);
    localStorage.setItem('chef_token', data.access_token);
    localStorage.setItem('chef_username', data.username);
    localStorage.setItem('chef_user_id', data.user_id);
  };

  const logout = () => {
    setToken(null);
    setUsername(null);
    setUserId(null);
    setUserProfile(null);
    setActiveProfile(null);
    localStorage.removeItem('chef_token');
    localStorage.removeItem('chef_username');
    localStorage.removeItem('chef_user_id');
  };

  return (
    <AuthContext.Provider value={{ token, username, userId, userProfile, activeProfile, refreshActiveProfile, login, signup, seedDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
