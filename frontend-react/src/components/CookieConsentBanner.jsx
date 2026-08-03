import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cookie, X, Sliders, Check } from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function CookieConsentBanner({ onOpenSettings }) {
  const [isVisible, setIsVisible] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const consent = localStorage.getItem('chef_cookie_consent');
    if (!consent) {
      // Show banner after a slight delay for smooth entrance
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('chef_cookie_consent', 'all');
    localStorage.setItem('chef_consent_timestamp', new Date().toISOString());
    setIsVisible(false);
    toast.success('Storage & Cookie preferences saved! 🍪');
  };

  const handleEssentialOnly = () => {
    localStorage.setItem('chef_cookie_consent', 'essential');
    localStorage.setItem('chef_consent_timestamp', new Date().toISOString());
    setIsVisible(false);
    toast.info('Essential storage preferences saved.');
  };

  const handleManage = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="cookie-banner-wrapper">
      <div className="cookie-banner-content">
        <div className="cookie-banner-header">
          <div className="cookie-title-group">
            <Cookie className="cookie-icon" size={22} />
            <h4 className="cookie-title">Storage & Privacy Preferences</h4>
          </div>
          <button 
            className="cookie-close-btn" 
            onClick={handleEssentialOnly}
            title="Dismiss & keep essential storage only"
          >
            <X size={16} />
          </button>
        </div>

        <p className="cookie-description">
          CHEF uses browser <strong>Local Storage</strong> to remember your daily macro targets, dietary profile, and theme preferences. We do <strong>not</strong> use invasive third-party ad tracking cookies.
        </p>

        <div className="cookie-btn-group">
          <button className="cookie-btn primary" onClick={handleAcceptAll}>
            <Check size={16} />
            <span>Accept All</span>
          </button>
          <button className="cookie-btn secondary" onClick={handleEssentialOnly}>
            <span>Essential Only</span>
          </button>
          <button className="cookie-btn link" onClick={handleManage}>
            <Sliders size={14} />
            <span>Manage Preferences</span>
          </button>
        </div>
      </div>
    </div>
  );
}
