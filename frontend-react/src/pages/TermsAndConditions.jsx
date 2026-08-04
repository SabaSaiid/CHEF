import React, { useState, useEffect, useMemo } from 'react';
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
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Eye,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

export default function TermsAndConditions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  
  const initialTab = searchParams.get('tab') || 'terms';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('full'); // 'full' | 'tldr'
  const [scrollProgress, setScrollProgress] = useState(0);
  const [copiedId, setCopiedId] = useState(null);
  const [isAcknowledged, setIsAcknowledged] = useState(() => {
    return localStorage.getItem('chef_terms_acknowledged') === 'true';
  });

  // Track page scroll progress for top progress bar
  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const currentProgress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync query params
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

  const handleCopyLink = (sectionId) => {
    const url = `${window.location.origin}/terms?tab=${activeTab}#${sectionId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(sectionId);
    toast.success('Section link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleAcknowledge = () => {
    const nextState = !isAcknowledged;
    setIsAcknowledged(nextState);
    localStorage.setItem('chef_terms_acknowledged', String(nextState));
    if (nextState) {
      toast.success('Thank you! Legal terms marked as reviewed.');
    }
  };

  const scrollToSection = (sectionId) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const yOffset = -95;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  // Helper function to render text with search term highlighting
  const renderHighlightedText = (text) => {
    if (!searchQuery.trim()) return text;
    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="terms-search-highlight">{part}</mark>
      ) : part
    );
  };

  // Match counter for current active tab
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const contentMap = {
      terms: 'terms of service acceptance agreement platform license grant user accounts security content recipe logs limitation liability',
      privacy: 'privacy policy collection data account metrics biometric dietary preferences meal logs storage portability erasure zero sales',
      disclaimer: 'nutritional medical disclaimer medical advice TDEE BMR algorithms allergens restrictions physician consult RD doctor',
      data: 'data AI image processing food detection vision computer vision local storage cookie usage export database backup'
    };
    const targetText = contentMap[activeTab] || '';
    const regex = new RegExp(searchQuery.trim(), 'gi');
    const matches = targetText.match(regex);
    return matches ? matches.length : 0;
  }, [searchQuery, activeTab]);

  return (
    <div className="terms-page-wrapper">
      {/* Scroll Reading Progress Bar */}
      <div 
        className="terms-progress-bar"
        style={{ width: `${scrollProgress}%` }}
        title={`Reading progress: ${Math.round(scrollProgress)}%`}
      />

      {/* Top Header Banner */}
      <div className="terms-header-banner">
        <div className="terms-header-content">
          <div className="terms-header-top-row">
            <button className="terms-back-btn" onClick={() => navigate('/')}>
              <ArrowLeft size={18} />
              <span>Back to CHEF</span>
            </button>

            <div className="terms-mode-toggle-group">
              <button 
                className={`terms-mode-btn ${viewMode === 'full' ? 'active' : ''}`}
                onClick={() => setViewMode('full')}
                title="Full Legal Document"
              >
                <BookOpen size={15} />
                <span>Full Legal</span>
              </button>
              <button 
                className={`terms-mode-btn ${viewMode === 'tldr' ? 'active' : ''}`}
                onClick={() => setViewMode('tldr')}
                title="Simplified Summary Cards"
              >
                <Sparkles size={15} />
                <span>TL;DR Summary</span>
              </button>
            </div>
          </div>
          
          <div className="terms-title-group">
            <h1 className="terms-main-title">Terms, Privacy & Governance</h1>
            <p className="terms-subtitle">
              Transparency, user safety, and nutritional accountability for the CHEF application platform.
            </p>
          </div>

          <div className="terms-action-bar">
            <span className="terms-version-badge">Effective Version 1.2.0 • Updated August 2026</span>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {isAcknowledged && (
                <span className="terms-reviewed-chip">
                  <CheckCircle2 size={14} /> Reviewed
                </span>
              )}
              <button className="terms-print-btn" onClick={handlePrint} title="Print Legal Document">
                <Printer size={16} />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="terms-main-container">
        {/* Sidebar Navigation */}
        <aside className="terms-nav-sidebar">
          {/* Search Box */}
          <div className="terms-search-box">
            <Search size={16} className="search-icon" />
            <input 
              type="text"
              placeholder="Search legal terms (e.g. data, allergy)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="terms-search-input"
            />
            {searchQuery.trim() !== '' && (
              <span className="search-match-count">{matchCount} matches</span>
            )}
          </div>

          {/* Main Tab Navigation */}
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

          {/* Table of Contents (TOC) for Active Tab */}
          {viewMode === 'full' && (
            <div className="terms-toc-card">
              <h4 className="toc-title">
                <ListFilter size={14} /> Section Directory
              </h4>
              <ul className="toc-list">
                {activeTab === 'terms' && (
                  <>
                    <li onClick={() => scrollToSection('terms-1')}>1. Acceptance of Agreement</li>
                    <li onClick={() => scrollToSection('terms-2')}>2. License Grant & Purpose</li>
                    <li onClick={() => scrollToSection('terms-3')}>3. Accounts & Security</li>
                    <li onClick={() => scrollToSection('terms-4')}>4. User Content & Recipe Logs</li>
                    <li onClick={() => scrollToSection('terms-5')}>5. Limitation of Liability</li>
                  </>
                )}
                {activeTab === 'privacy' && (
                  <>
                    <li onClick={() => scrollToSection('privacy-1')}>1. Information We Collect</li>
                    <li onClick={() => scrollToSection('privacy-2')}>2. How We Store Your Data</li>
                    <li onClick={() => scrollToSection('privacy-3')}>3. Portability & Right to Erasure</li>
                  </>
                )}
                {activeTab === 'disclaimer' && (
                  <>
                    <li onClick={() => scrollToSection('disc-1')}>1. Algorithmic Recommendations</li>
                    <li onClick={() => scrollToSection('disc-2')}>2. Allergens & Restrictions</li>
                    <li onClick={() => scrollToSection('disc-3')}>3. Medical Consultation Notice</li>
                  </>
                )}
                {activeTab === 'data' && (
                  <>
                    <li onClick={() => scrollToSection('data-1')}>1. Food Image Detection AI</li>
                    <li onClick={() => scrollToSection('data-2')}>2. Local Storage & Cookie Usage</li>
                    <li onClick={() => scrollToSection('data-3')}>3. Database Export & Backups</li>
                  </>
                )}
              </ul>
            </div>
          )}

          {/* Quick Help Card */}
          <div className="terms-quick-help-card">
            <h4>Questions regarding legal policies?</h4>
            <p>If you have any questions or privacy inquiries regarding CHEF, please consult our documentation or open an issue on GitHub.</p>
            <a 
              href="https://github.com/SabaSaiid/CHEF" 
              target="_blank" 
              rel="noopener noreferrer"
              className="terms-github-link"
            >
              <span>GitHub Repository</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="terms-content-area">

          {/* TL;DR SUMMARY MODE */}
          {viewMode === 'tldr' && (
            <div className="tldr-container">
              <div className="tldr-header-box">
                <Sparkles size={22} className="tldr-icon" />
                <div>
                  <h3>TL;DR Plain-English Summary</h3>
                  <p>A quick, simplified breakdown of CHEF’s key terms, data handling, and health notices.</p>
                </div>
              </div>

              <div className="tldr-grid">
                <div className="tldr-card green">
                  <span className="tldr-badge">Privacy</span>
                  <h4>🔒 Zero Data Selling</h4>
                  <p>CHEF will never sell, rent, or monetize your health metrics, email, or logged meals to third-party advertisers or brokers.</p>
                </div>

                <div className="tldr-card amber">
                  <span className="tldr-badge warning">Health Notice</span>
                  <h4>🩺 Educational Tool Only</h4>
                  <p>CHEF calorie targets and macro suggestions are computed via mathematical formulas (Mifflin-St Jeor). They do not replace a licensed doctor or dietitian.</p>
                </div>

                <div className="tldr-card blue">
                  <span className="tldr-badge info">Data Control</span>
                  <h4>💾 Local-First Storage</h4>
                  <p>Guest users store all preferences locally in the browser. Registered users can export or permanently delete their data anytime.</p>
                </div>

                <div className="tldr-card purple">
                  <span className="tldr-badge AI">AI Vision</span>
                  <h4>📸 Dynamic Food Scans</h4>
                  <p>Food photos uploaded for detection are processed strictly to recognize ingredients. Images are not stored on public servers or used for public generative model training.</p>
                </div>
              </div>
            </div>
          )}

          {/* FULL LEGAL TEXT MODE */}
          {viewMode === 'full' && (
            <>
              {/* TERMS OF SERVICE TAB */}
              {activeTab === 'terms' && (
                <article className="terms-article">
                  <div className="article-header">
                    <h2>Terms of Service</h2>
                    <p>{renderHighlightedText("Welcome to CHEF (Constraint-based Hybrid Eating Framework). By using our application, websites, services, or tools, you agree to comply with and be bound by the following terms.")}</p>
                  </div>

                  <section id="terms-1" className="terms-section">
                    <div className="section-title-row">
                      <h3>1. Acceptance of Agreement</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('terms-1')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'terms-1' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("By accessing CHEF via guest mode or authenticated account, you accept these Terms of Service in full. If you disagree with any part of these terms, you must not use our software or features.")}
                    </p>
                  </section>

                  <section id="terms-2" className="terms-section">
                    <div className="section-title-row">
                      <h3>2. Platform Purpose & License Grant</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('terms-2')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'terms-2' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("CHEF is designed as an interactive nutritional management, recipe discovery, food detection, and meal planning platform. Subject to compliance with these Terms, CHEF grants you a non-exclusive, non-transferable, revocable license to access and use the platform for personal, non-commercial health management.")}
                    </p>
                  </section>

                  <section id="terms-3" className="terms-section">
                    <div className="section-title-row">
                      <h3>3. User Accounts & Security</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('terms-3')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'terms-3' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <ul>
                      <li>{renderHighlightedText("You are responsible for maintaining the confidentiality of your account credentials.")}</li>
                      <li>{renderHighlightedText("Guest sessions store macro preferences locally within browser storage. Registered accounts sync data securely.")}</li>
                      <li>{renderHighlightedText("You agree not to use CHEF for unauthorized batch data extraction, malicious payload injection, or attempting unauthorized database access.")}</li>
                    </ul>
                  </section>

                  <section id="terms-4" className="terms-section">
                    <div className="section-title-row">
                      <h3>4. User-Generated Content & Recipe Logs</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('terms-4')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'terms-4' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("When you input custom recipes, meal logs, ingredients, or dietary preferences into CHEF:")}
                    </p>
                    <ul>
                      <li>{renderHighlightedText("You retain full ownership of your personal custom recipe submissions and custom ingredient entries.")}</li>
                      <li>{renderHighlightedText("You grant CHEF permission to process these entries to calculate caloric totals, macro breakdowns, and CHEF scores.")}</li>
                    </ul>
                  </section>

                  <section id="terms-5" className="terms-section">
                    <div className="section-title-row">
                      <h3>5. Limitation of Liability</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('terms-5')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'terms-5' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("To the maximum extent permitted by applicable law, CHEF and its developers shall not be liable for any indirect, incidental, or consequential damages resulting from dietary decisions, allergic reactions, macro calculations, or system downtime.")}
                    </p>
                  </section>
                </article>
              )}

              {/* PRIVACY POLICY TAB */}
              {activeTab === 'privacy' && (
                <article className="terms-article">
                  <div className="article-header">
                    <h2>Privacy Policy</h2>
                    <p>{renderHighlightedText("Your privacy is central to how we design CHEF. Learn how we handle your personal metrics, dietary targets, and account data.")}</p>
                  </div>

                  <div className="terms-highlight-box">
                    <Lock size={20} className="highlight-icon" />
                    <div>
                      <strong>Zero Third-Party Data Sales:</strong> CHEF never sells, rents, or monetizes your personal health metrics, email, or meal logs to advertisers or third-party brokers.
                    </div>
                  </div>

                  <section id="privacy-1" className="terms-section">
                    <div className="section-title-row">
                      <h3>1. Information We Collect</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('privacy-1')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'privacy-1' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>{renderHighlightedText("We collect only the minimum data required to compute accurate TDEE, macro breakdowns, and custom meal plans:")}</p>
                    <ul>
                      <li><strong>Account Credentials:</strong> {renderHighlightedText("Username and encrypted password (when creating an account).")}</li>
                      <li><strong>Biometric & Profile Metrics:</strong> {renderHighlightedText("Age, height, weight, gender, activity level, and primary fitness goal.")}</li>
                      <li><strong>Dietary Preferences:</strong> {renderHighlightedText("Vegetarian, Vegan, Keto, Paleo, Halal, or custom allergen restrictions.")}</li>
                      <li><strong>Meal Logs & Pantry Data:</strong> {renderHighlightedText("Saved recipes, logged daily meals, custom pantry inventory items, and shopping lists.")}</li>
                    </ul>
                  </section>

                  <section id="privacy-2" className="terms-section">
                    <div className="section-title-row">
                      <h3>2. How We Store Your Data</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('privacy-2')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'privacy-2' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("For guest mode users, all data remains 100% local inside your browser's localStorage. For registered accounts, data is stored securely with JWT authentication tokens used for session security.")}
                    </p>
                  </section>

                  <section id="privacy-3" className="terms-section">
                    <div className="section-title-row">
                      <h3>3. Data Portability & Right to Erasure</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('privacy-3')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'privacy-3' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>{renderHighlightedText("You hold full control over your data. Under CHEF's Settings panel, you can:")}</p>
                    <ul>
                      <li>{renderHighlightedText("Export your entire profile, recipe collection, and daily meal history as JSON or CSV.")}</li>
                      <li>{renderHighlightedText("Permanently clear local guest cache or request total deletion of your registered account.")}</li>
                    </ul>
                  </section>
                </article>
              )}

              {/* MEDICAL & NUTRITIONAL DISCLAIMER TAB */}
              {activeTab === 'disclaimer' && (
                <article className="terms-article">
                  <div className="article-header">
                    <h2>Nutritional & Medical Disclaimer</h2>
                    <p>{renderHighlightedText("Important health information regarding the algorithmic advice, score metrics, and meal plans provided by CHEF.")}</p>
                  </div>

                  <div className="terms-alert-box warning">
                    <AlertTriangle size={24} className="alert-icon" />
                    <div className="alert-text">
                      <strong>Not Medical Advice:</strong> CHEF is an educational and informational tool. The calculations, TDEE estimates, macronutrient targets, and CHEF scores provided are algorithmically computed and DO NOT constitute medical, clinical, or formal dietetic advice.
                    </div>
                  </div>

                  <section id="disc-1" className="terms-section">
                    <div className="section-title-row">
                      <h3>1. Algorithmic Recommendations</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('disc-1')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'disc-1' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("TDEE and BMR targets generated within CHEF rely on mathematical formulas (Mifflin-St Jeor & Harris-Benedict). Individual metabolism, medical conditions, thyroid health, and muscle mass variations mean actual caloric expenditure may vary.")}
                    </p>
                  </section>

                  <section id="disc-2" className="terms-section">
                    <div className="section-title-row">
                      <h3>2. Allergens & Dietary Restrictions</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('disc-2')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'disc-2' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("While CHEF includes safety warnings for severe allergens (e.g. peanuts, gluten, dairy), ingredients imported or computed may have inaccurate manufacturer label data. Always cross-check ingredients directly on physical packaging if you have severe life-threatening allergies (anaphylaxis).")}
                    </p>
                  </section>

                  <section id="disc-3" className="terms-section">
                    <div className="section-title-row">
                      <h3>3. Consultation with Healthcare Professionals</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('disc-3')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'disc-3' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("Always consult a licensed physician, registered dietitian (RD), or healthcare provider before commencing any radical calorie deficit, extreme surplus, ketogenic diet, or new physical fitness routine, especially if you have pre-existing conditions such as diabetes, hypertension, or eating disorders.")}
                    </p>
                  </section>
                </article>
              )}

              {/* DATA & AI USAGE POLICY TAB */}
              {activeTab === 'data' && (
                <article className="terms-article">
                  <div className="article-header">
                    <h2>Data & AI Image Processing Policy</h2>
                    <p>{renderHighlightedText("Details regarding computer vision food detection, AI model execution, and data storage practices.")}</p>
                  </div>

                  <section id="data-1" className="terms-section">
                    <div className="section-title-row">
                      <h3>1. Food Image Detection AI</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('data-1')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'data-1' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>{renderHighlightedText("CHEF features computer vision tools to detect food ingredients from uploaded photos or live camera captures:")}</p>
                    <ul>
                      <li>{renderHighlightedText("Uploaded food images are processed strictly for bounding-box ingredient identification.")}</li>
                      <li>{renderHighlightedText("Images are processed dynamically and are NOT permanently stored on public cloud servers or used to train public generative models without consent.")}</li>
                    </ul>
                  </section>

                  <section id="data-2" className="terms-section">
                    <div className="section-title-row">
                      <h3>2. Local Storage & Cookie Usage</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('data-2')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'data-2' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("CHEF uses standard browser localStorage to maintain theme preferences (Light/Dark mode), notification logs, and active session tokens. We do NOT use invasive cross-site tracking cookies or third-party telemetry scripts.")}
                    </p>
                  </section>

                  <section id="data-3" className="terms-section">
                    <div className="section-title-row">
                      <h3>3. Export & Data Backups</h3>
                      <button 
                        className="section-anchor-btn" 
                        onClick={() => handleCopyLink('data-3')} 
                        title="Copy direct link to section"
                      >
                        {copiedId === 'data-3' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p>
                      {renderHighlightedText("You can export your database backup at any time from Settings > Data Management. Backup files are stored in standard JSON format for easy migration and personal archiving.")}
                    </p>
                  </section>
                </article>
              )}
            </>
          )}

          {/* Interactive Bottom Acknowledgement Bar */}
          <div className="terms-acknowledge-bar">
            <div className="acknowledge-info">
              <BookOpen size={18} className="acknowledge-icon" />
              <span>
                {isAcknowledged 
                  ? "You have marked CHEF's Terms of Service and Privacy Policy as reviewed."
                  : "Please review CHEF's terms to ensure safe and informed application usage."}
              </span>
            </div>
            <button 
              className={`terms-acknowledge-btn ${isAcknowledged ? 'reviewed' : ''}`}
              onClick={handleAcknowledge}
            >
              {isAcknowledged ? (
                <>
                  <Check size={16} />
                  <span>Terms Reviewed</span>
                </>
              ) : (
                <span>Mark as Reviewed</span>
              )}
            </button>
          </div>

        </main>
      </div>
    </div>
  );
}
