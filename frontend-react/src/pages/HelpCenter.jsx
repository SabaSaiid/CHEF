import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  BookOpen, 
  Sparkles, 
  Flame, 
  ShieldCheck, 
  Printer, 
  ArrowLeft, 
  MessageSquare, 
  Sliders,
  ExternalLink
} from 'lucide-react';

const FAQ_DATA = [
  {
    category: 'nutrition',
    categoryName: 'Nutritional Science & Formulas',
    icon: '🔥',
    items: [
      {
        q: 'How does CHEF calculate my Daily Caloric Target (TDEE)?',
        a: 'CHEF uses the scientifically validated Mifflin-St Jeor and Harris-Benedict formulas to compute your Basal Metabolic Rate (BMR) based on your age, height, weight, and biological sex. We then apply an activity level multiplier (1.2 to 1.9) and adjust for your specific goal (e.g. -500 kcal for 0.5kg/week fat loss, or +300 kcal for lean muscle gain).'
      },
      {
        q: 'What is the CHEF Score (0–100) on recipes?',
        a: 'The CHEF Score is a proprietary nutrient density algorithm evaluating protein-to-calorie ratio, dietary fiber, micronutrient density, and alignment with your active fitness goals. A score of 80+ indicates an exceptionally nutrient-dense meal.'
      },
      {
        q: 'How are Macro Ratios (Protein, Carbs, Fats) determined?',
        a: 'Macro splits adapt based on your chosen diet type (e.g., High Protein 35/45/20, Keto 5/20/75, Balanced 30/40/30). You can customize exact gram targets anytime under Settings > Planner & Targets.'
      }
    ]
  },
  {
    category: 'ai',
    categoryName: 'AI Food Vision & Scanning',
    icon: '📸',
    items: [
      {
        q: 'How does AI Food Image Detection work?',
        a: 'Our computer vision model analyzes uploaded photos or live camera captures to detect ingredient bounding boxes, estimate food labels, and query matching nutritional profiles from USDA FoodData Central.'
      },
      {
        q: 'Can AI detection detect food allergies or hidden ingredients?',
        a: 'No. Computer vision scans ingredients visually from shapes and colors. It cannot detect microscopic cross-contamination, hidden trace allergens, or invisible seasonings. Always check physical packaging labels for severe allergies.'
      },
      {
        q: 'What photo formats are supported?',
        a: 'CHEF supports JPG, PNG, WEBP, and live webcam captures up to 10MB in size.'
      }
    ]
  },
  {
    category: 'planner',
    categoryName: 'Meal Planner & Pantry Inventory',
    icon: '📅',
    items: [
      {
        q: 'How do I generate a weekly meal plan?',
        a: 'Navigate to the Planner tab. You can auto-generate balanced 7-day meal plans matching your exact calorie targets, or manually drag and drop recipes into specific meal slots (Breakfast, Lunch, Dinner, Snacks).'
      },
      {
        q: 'How do I export my Grocery Shopping List?',
        a: 'In the Planner tab, click "Grocery List" to automatically consolidate all recipe ingredients for the selected week. You can print a clean paper checklist or export to PDF.'
      },
      {
        q: 'How does Pantry Expiration tracking work?',
        a: 'In the Pantry tab, items are sorted into Fresh (Green), Expiring Soon (Amber), and Expired (Red) based on shelf life. CHEF prioritized recipes using items close to expiration to reduce food waste.'
      }
    ]
  },
  {
    category: 'privacy',
    categoryName: 'Privacy, Storage & Data Control',
    icon: '🔒',
    items: [
      {
        q: 'Where is my personal meal history stored?',
        a: 'For guest users, 100% of your data remains inside your local browser cache (localStorage). For registered accounts, data is synced securely using JWT session tokens. We never sell your personal data.'
      },
      {
        q: 'How can I export my data or wipe my account?',
        a: 'Go to Settings > Data Management (or Data & Privacy Portal). You can download a complete JSON backup, export CSV meal logs, or trigger a complete data purge ("Right to Erasure").'
      }
    ]
  }
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [expandedIndex, setExpandedIndex] = useState({});

  const toggleAccordion = (catId, idx) => {
    const key = `${catId}-${idx}`;
    setExpandedIndex(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filter FAQ items
  const filteredData = FAQ_DATA.map(cat => {
    if (activeCategory !== 'all' && cat.category !== activeCategory) {
      return null;
    }
    const filteredItems = cat.items.filter(item => {
      const qMatch = item.q.toLowerCase().includes(searchQuery.toLowerCase());
      const aMatch = item.a.toLowerCase().includes(searchQuery.toLowerCase());
      return qMatch || aMatch;
    });

    if (filteredItems.length === 0) return null;
    return { ...cat, items: filteredItems };
  }).filter(Boolean);

  return (
    <div className="help-page-wrapper">
      {/* Top Banner */}
      <div className="help-header-banner">
        <div className="help-header-content">
          <button className="terms-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={18} />
            <span>Back to CHEF</span>
          </button>

          <div className="help-title-group">
            <h1 className="help-main-title">Help Center & Knowledge Base</h1>
            <p className="help-subtitle">
              Learn how CHEF calculates macro targets, processes AI food photos, and manages your dietary safety.
            </p>
          </div>

          {/* Search Box */}
          <div className="help-search-container">
            <Search size={18} className="search-icon" />
            <input 
              type="text"
              placeholder="Search help articles (e.g., TDEE, AI scanner, export)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="help-search-input"
            />
          </div>

          {/* Quick Tag Shortcuts */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '-8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>Popular Searches:</span>
            {['TDEE', 'AI Vision', 'Export Data', 'Allergies'].map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setSearchQuery(tag)}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-glass)',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--accent-1)',
                  cursor: 'pointer'
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="help-main-container">
        {/* Category Pill Filters */}
        <div className="help-category-pills">
          <button 
            className={`help-pill ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            🌟 All Topics
          </button>
          <button 
            className={`help-pill ${activeCategory === 'nutrition' ? 'active' : ''}`}
            onClick={() => setActiveCategory('nutrition')}
          >
            🔥 Nutritional Science
          </button>
          <button 
            className={`help-pill ${activeCategory === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveCategory('ai')}
          >
            📸 AI Food Vision
          </button>
          <button 
            className={`help-pill ${activeCategory === 'planner' ? 'active' : ''}`}
            onClick={() => setActiveCategory('planner')}
          >
            📅 Planner & Pantry
          </button>
          <button 
            className={`help-pill ${activeCategory === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveCategory('privacy')}
          >
            🔒 Privacy & Storage
          </button>
        </div>

        {/* FAQ Accordion List */}
        <div className="help-faq-section">
          {filteredData.length === 0 ? (
            <div className="help-empty-state">
              <HelpCircle size={40} className="empty-icon" />
              <h3>No matching help articles found</h3>
              <p>Try searching for a different keyword like "TDEE", "macro", or "AI".</p>
            </div>
          ) : (
            filteredData.map(cat => (
              <div key={cat.category} className="help-faq-group">
                <h3 className="faq-group-title">
                  <span className="group-icon">{cat.icon}</span>
                  <span>{cat.categoryName}</span>
                </h3>

                <div className="faq-accordion-list">
                  {cat.items.map((item, idx) => {
                    const key = `${cat.category}-${idx}`;
                    const isOpen = expandedIndex[key];
                    return (
                      <div key={idx} className={`faq-accordion-item ${isOpen ? 'open' : ''}`}>
                        <button 
                          className="faq-question-btn"
                          onClick={() => toggleAccordion(cat.category, idx)}
                        >
                          <span className="question-text">{item.q}</span>
                          <span className="toggle-icon">
                            {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </span>
                        </button>
                        {isOpen && (
                          <div className="faq-answer-body">
                            <p>{item.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Quick User Guides Banner */}
        <div className="help-guides-card">
          <div className="guides-header">
            <BookOpen size={22} className="guides-icon" />
            <div>
              <h3>Quick User Guides & Tools</h3>
              <p>Explore CHEF's primary features and step-by-step documentation.</p>
            </div>
          </div>

          <div className="guides-grid">
            <div className="guide-card" onClick={() => navigate('/recipes')}>
              <h4>📖 Recipe Search & Scores</h4>
              <p>Filter by dietary preference (Keto, Vegan) and view CHEF Score breakdowns.</p>
            </div>
            <div className="guide-card" onClick={() => navigate('/tdee')}>
              <h4>🎯 TDEE Profile Setup</h4>
              <p>Calculate your exact daily caloric baseline and target macronutrient ratios.</p>
            </div>
            <div className="guide-card" onClick={() => navigate('/terms?tab=terms')}>
              <h4>📜 Terms & Governance</h4>
              <p>Review legal agreements, user responsibilities, and medical disclaimers.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
