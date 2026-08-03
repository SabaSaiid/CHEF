import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, 
  ShieldCheck, 
  AlertTriangle, 
  Database, 
  ArrowLeft, 
  Printer, 
  CheckCircle, 
  Lock, 
  HeartPulse, 
  Search,
  ExternalLink
} from 'lucide-react';

export default function TermsAndConditions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialTab = searchParams.get('tab') || 'terms';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['terms', 'privacy', 'disclaimer', 'data'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="terms-page-wrapper">
      {/* Top Header */}
      <div className="terms-header-banner">
        <div className="terms-header-content">
          <button className="terms-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
            <span>Back to CHEF</span>
          </button>
          
          <div className="terms-title-group">
            <h1 className="terms-main-title">Terms, Privacy & Governance</h1>
            <p className="terms-subtitle">
              Transparency, user safety, and nutritional accountability for the CHEF application platform.
            </p>
          </div>

          <div className="terms-action-bar">
            <span className="terms-version-badge">Effective Version 1.2.0 • Updated August 2026</span>
            <button className="terms-print-btn" onClick={handlePrint} title="Print Legal Document">
              <Printer size={16} />
              <span>Print Terms</span>
            </button>
          </div>
        </div>
      </div>

      <div className="terms-main-container">
        {/* Sidebar Navigation */}
        <aside className="terms-nav-sidebar">
          <div className="terms-search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text"
              placeholder="Filter topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terms-search-input"
            />
          </div>

          <nav className="terms-tab-list">
            <button 
              className={`terms-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
              onClick={() => handleTabChange('terms')}
            >
              <FileText size={18} />
              <div className="tab-btn-text">
                <span className="tab-title">Terms of Service</span>
                <span className="tab-sub">User agreements & obligations</span>
              </div>
            </button>

            <button 
              className={`terms-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => handleTabChange('privacy')}
            >
              <ShieldCheck size={18} />
              <div className="tab-btn-text">
                <span className="tab-title">Privacy Policy</span>
                <span className="tab-sub">Data collection & protection</span>
              </div>
            </button>

            <button 
              className={`terms-tab-btn ${activeTab === 'disclaimer' ? 'active' : ''}`}
              onClick={() => handleTabChange('disclaimer')}
            >
              <HeartPulse size={18} />
              <div className="tab-btn-text">
                <span className="tab-title">Nutritional Disclaimer</span>
                <span className="tab-sub">Medical notice & algorithm limits</span>
              </div>
            </button>

            <button 
              className={`terms-tab-btn ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => handleTabChange('data')}
            >
              <Database size={18} />
              <div className="tab-btn-text">
                <span className="tab-title">Data & AI Usage</span>
                <span className="tab-sub">Vision models & storage policies</span>
              </div>
            </button>
          </nav>

          <div className="terms-quick-help-card">
            <h4>Questions regarding legal policies?</h4>
            <p>If you have any questions or privacy inquiries regarding CHEF, please consult our documentation or open an issue on our GitHub repository.</p>
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="terms-github-link"
            >
              <span>GitHub Repository</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </aside>

        {/* Content Body */}
        <main className="terms-content-area">
          {/* TERMS OF SERVICE TAB */}
          {activeTab === 'terms' && (
            <article className="terms-article">
              <div className="article-header">
                <h2>Terms of Service</h2>
                <p>Welcome to CHEF (Constraint-based Hybrid Eating Framework). By using our application, websites, services, or tools, you agree to comply with and be bound by the following terms.</p>
              </div>

              <section className="terms-section">
                <h3>1. Acceptance of Agreement</h3>
                <p>
                  By accessing CHEF via guest mode or authenticated account, you accept these Terms of Service in full. If you disagree with any part of these terms, you must not use our software or features.
                </p>
              </section>

              <section className="terms-section">
                <h3>2. Platform Purpose & License Grant</h3>
                <p>
                  CHEF is designed as an interactive nutritional management, recipe discovery, food detection, and meal planning platform. Subject to compliance with these Terms, CHEF grants you a non-exclusive, non-transferable, revocable license to access and use the platform for personal, non-commercial health management.
                </p>
              </section>

              <section className="terms-section">
                <h3>3. User Accounts & Security</h3>
                <ul>
                  <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
                  <li>Guest sessions store macro preferences locally within browser storage. Registered accounts sync data across devices.</li>
                  <li>You agree not to use CHEF for unauthorized batch data extraction, malicious payload injection, or attempting unauthorized database access.</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>4. User-Generated Content & Recipe Logs</h3>
                <p>
                  When you input custom recipes, meal logs, ingredients, or dietary preferences into CHEF:
                </p>
                <ul>
                  <li>You retain full ownership of your personal custom recipe submissions and custom ingredient entries.</li>
                  <li>You grant CHEF permission to process these entries to calculate caloric totals, macro breakdowns, and CHEF scores.</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>5. Limitation of Liability</h3>
                <p>
                  To the maximum extent permitted by applicable law, CHEF and its developers shall not be liable for any indirect, incidental, or consequential damages resulting from dietary decisions, allergic reactions, macro calculations, or system downtime.
                </p>
              </section>
            </article>
          )}

          {/* PRIVACY POLICY TAB */}
          {activeTab === 'privacy' && (
            <article className="terms-article">
              <div className="article-header">
                <h2>Privacy Policy</h2>
                <p>Your privacy is central to how we design CHEF. Learn how we handle your personal metrics, dietary targets, and account data.</p>
              </div>

              <div className="terms-highlight-box">
                <Lock size={20} className="highlight-icon" />
                <div>
                  <strong>Zero Third-Party Data Sales:</strong> CHEF never sells, rents, or monetizes your personal health metrics, email, or meal logs to advertisers or third-party brokers.
                </div>
              </div>

              <section className="terms-section">
                <h3>1. Information We Collect</h3>
                <p>We collect only the minimum data required to compute accurate TDEE, macro breakdowns, and custom meal plans:</p>
                <ul>
                  <li><strong>Account Credentials:</strong> Username and encrypted password (when creating an account).</li>
                  <li><strong>Biometric & Profile Metrics:</strong> Age, height, weight, gender, activity level, and primary fitness goal.</li>
                  <li><strong>Dietary Preferences:</strong> Vegetarian, Vegan, Keto, Paleo, Halal, or custom allergen restrictions.</li>
                  <li><strong>Meal Logs & Pantry Data:</strong> Saved recipes, logged daily meals, custom pantry inventory items, and shopping lists.</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>2. How We Store Your Data</h3>
                <p>
                  For guest mode users, all data remains 100% local inside your browser's <code>localStorage</code>. For registered accounts, data is stored securely in SQLite/PostgreSQL with JWT authentication tokens used for session security.
                </p>
              </section>

              <section className="terms-section">
                <h3>3. Data Portability & Right to Erasure</h3>
                <p>
                  You hold full control over your data. Under CHEF's Settings panel, you can:
                </p>
                <ul>
                  <li>Export your entire profile, recipe collection, and daily meal history as JSON or CSV.</li>
                  <li>Permanently clear local guest cache or request total deletion of your registered account.</li>
                </ul>
              </section>
            </article>
          )}

          {/* MEDICAL & NUTRITIONAL DISCLAIMER TAB */}
          {activeTab === 'disclaimer' && (
            <article className="terms-article">
              <div className="article-header">
                <h2>Nutritional & Medical Disclaimer</h2>
                <p>Important health information regarding the algorithmic advice, score metrics, and meal plans provided by CHEF.</p>
              </div>

              <div className="terms-alert-box warning">
                <AlertTriangle size={24} className="alert-icon" />
                <div className="alert-text">
                  <strong>Not Medical Advice:</strong> CHEF is an educational and informational tool. The calculations, TDEE estimates, macronutrient targets, and CHEF scores provided are algorithmically computed and DO NOT constitute medical, clinical, or formal dietetic advice.
                </div>
              </div>

              <section className="terms-section">
                <h3>1. Algorithmic Recommendations</h3>
                <p>
                  TDEE and BMR targets generated within CHEF rely on mathematical formulas (Mifflin-St Jeor & Harris-Benedict). Individual metabolism, medical conditions, thyroid health, and muscle mass variations mean actual caloric expenditure may vary.
                </p>
              </section>

              <section className="terms-section">
                <h3>2. Allergens & Dietary Restrictions</h3>
                <p>
                  While CHEF includes safety warnings for severe allergens (e.g. peanuts, gluten, dairy), ingredients imported or computed may have inaccurate manufacturer label data. Always cross-check ingredients directly on physical packaging if you have severe life-threatening allergies (anaphylaxis).
                </p>
              </section>

              <section className="terms-section">
                <h3>3. Consultation with Healthcare Professionals</h3>
                <p>
                  Always consult a licensed physician, registered dietitian (RD), or healthcare provider before commencing any radical calorie deficit, extreme surplus, ketogenic diet, or new physical fitness routine, especially if you have pre-existing conditions such as diabetes, hypertension, or eating disorders.
                </p>
              </section>
            </article>
          )}

          {/* DATA & AI USAGE POLICY TAB */}
          {activeTab === 'data' && (
            <article className="terms-article">
              <div className="article-header">
                <h2>Data & AI Image Processing Policy</h2>
                <p>Details regarding computer vision food detection, AI model execution, and data storage practices.</p>
              </div>

              <section className="terms-section">
                <h3>1. Food Image Detection</h3>
                <p>
                  CHEF features computer vision tools to detect food ingredients from uploaded photos or live camera captures:
                </p>
                <ul>
                  <li>Uploaded food images are processed strictly for bounding-box ingredient identification.</li>
                  <li>Images are processed dynamically and are NOT permanently stored on public cloud servers or used to train public generative models without consent.</li>
                </ul>
              </section>

              <section className="terms-section">
                <h3>2. Local Storage & Cookie Usage</h3>
                <p>
                  CHEF uses standard browser <code>localStorage</code> to maintain theme preferences (Light/Dark mode), notification logs, and active session tokens. We do NOT use invasive cross-site tracking cookies or third-party telemetry scripts.
                </p>
              </section>

              <section className="terms-section">
                <h3>3. Export & Data Backups</h3>
                <p>
                  You can export your database backup at any time from <strong>Settings &gt; Data Management</strong>. Backup files are stored in standard JSON format for easy migration and personal archiving.
                </p>
              </section>
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
