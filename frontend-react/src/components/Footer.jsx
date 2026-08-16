import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, HeartPulse, FileText, Database, Heart, ExternalLink, HelpCircle, Award, MessageSquare } from 'lucide-react';

export default function Footer({ onOpenFeedback }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="app-footer">
      <div className="footer-container">
        <div className="footer-top-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <div className="footer-brand-title">
              <span className="footer-logo">👨‍🍳</span>
              <span className="footer-brand-name">CHEF</span>
            </div>
            <p className="footer-description">
              Constraint-based Hybrid Eating Framework — Empowering personal nutrition with algorithmic precision, macro optimization, and AI food detection.
            </p>
            <div className="footer-status-pill">
              <span className="status-dot"></span>
              <span className="status-text">v2.1.0 • All Systems Operational</span>
            </div>
          </div>

          {/* Quick Nav Links */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Kitchen Dashboard</Link></li>
              <li><Link to="/recipes">Recipe Engine</Link></li>
              <li><Link to="/pantry">Pantry Inventory</Link></li>
              <li><Link to="/tdee">TDEE Profile</Link></li>
              <li><Link to="/planner">Meal Planner</Link></li>
              <li><Link to="/tracker">Nutrition Tracker</Link></li>
            </ul>
          </div>

          {/* Legal & Governance */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Legal & Governance</h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/help" className="footer-legal-link">
                  <HelpCircle size={14} />
                  <span>Help & FAQ</span>
                </Link>
              </li>
              <li>
                <Link to="/attributions" className="footer-legal-link">
                  <Award size={14} />
                  <span>Open Source Credits</span>
                </Link>
              </li>
              <li>
                <Link to="/terms?tab=terms" className="footer-legal-link">
                  <FileText size={14} />
                  <span>Terms of Service</span>
                </Link>
              </li>
              <li>
                <Link to="/terms?tab=privacy" className="footer-legal-link">
                  <ShieldCheck size={14} />
                  <span>Privacy Policy</span>
                </Link>
              </li>
              <li>
                <Link to="/terms?tab=disclaimer" className="footer-legal-link">
                  <HeartPulse size={14} />
                  <span>Medical Disclaimer</span>
                </Link>
              </li>
              <li>
                <Link to="/terms?tab=data" className="footer-legal-link">
                  <Database size={14} />
                  <span>Data & AI Policy</span>
                </Link>
              </li>
              {onOpenFeedback && (
                <li>
                  <button 
                    type="button"
                    onClick={onOpenFeedback} 
                    className="footer-legal-btn"
                  >
                    <MessageSquare size={14} />
                    <span>Report Feedback</span>
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Platform Capabilities */}
          <div className="footer-links-col">
            <h4 className="footer-col-title">Tools & Features</h4>
            <ul className="footer-links-list">
              <li><Link to="/detection">Food Image Detection</Link></li>
              <li><Link to="/nutrition">Nutrient Database</Link></li>
              <li><Link to="/saved">Saved Recipes</Link></li>
              <li><Link to="/ingredients">Ingredients Directory</Link></li>
            </ul>
          </div>
        </div>

        {/* Disclaimer Warning Box */}
        <div className="footer-disclaimer-banner">
          <HeartPulse size={16} className="disclaimer-icon" />
          <p>
            <strong>Health Notice:</strong> CHEF macro targets and meal recommendations are algorithmically calculated for educational and informational purposes only and do not replace professional medical or nutritional consultation.
          </p>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © {currentYear} CHEF Platform. Developed for Capstone Research. All rights reserved.
          </p>
          <div className="footer-legal-inline">
            <Link to="/terms?tab=terms">Terms</Link>
            <span className="dot">•</span>
            <Link to="/terms?tab=privacy">Privacy</Link>
            <span className="dot">•</span>
            <Link to="/terms?tab=disclaimer">Disclaimer</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
