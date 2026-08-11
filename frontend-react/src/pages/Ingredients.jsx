import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { formatQuantityValue } from '../utils/ingredientParser';
import { Search, BookOpen, Sparkles, Filter, ShoppingCart, Utensils, Check, X, Info, RotateCcw } from 'lucide-react';

const FALLBACK_DIRECTORY = [
  { category: 'Produce', icon: '🥬', items: ['Tomato', 'Onion', 'Potato', 'Spinach', 'Garlic', 'Ginger', 'Green Chili', 'Coriander', 'Carrot', 'Capsicum', 'Cauliflower', 'Eggplant', 'Mushroom', 'Zucchini', 'Lemon', 'Lime'] },
  { category: 'Proteins', icon: '🍗', items: ['Chicken', 'Paneer', 'Eggs', 'Tofu', 'Lentils (Dal)', 'Chickpeas', 'Fish', 'Mutton', 'Pork', 'Shrimp', 'Soy Chunks', 'Kidney Beans', 'Beef', 'Turkey'] },
  { category: 'Dairy & Oils', icon: '🧈', items: ['Ghee', 'Butter', 'Milk', 'Yogurt (Curd)', 'Cream', 'Coconut Oil', 'Mustard Oil', 'Olive Oil', 'Cheese', 'Coconut Milk', 'Heavy Cream', 'Mozzarella', 'Parmesan'] },
  { category: 'Grains & Flour', icon: '🌾', items: ['Rice', 'Wheat Flour (Atta)', 'Besan (Gram Flour)', 'Semolina (Suji)', 'Oats', 'Maida', 'Poha', 'Quinoa', 'Bread', 'Pasta', 'Cornstarch', 'Basmati Rice', 'Noodles'] },
  { category: 'Spices', icon: '🫙', items: ['Turmeric', 'Cumin', 'Coriander Powder', 'Red Chili Powder', 'Garam Masala', 'Mustard Seeds', 'Black Pepper', 'Cinnamon', 'Cardamom', 'Bay Leaf', 'Fennel', 'Cloves', 'Nutmeg', 'Kashmiri Chili'] },
  { category: 'Condiments', icon: '🫒', items: ['Salt', 'Sugar', 'Lemon Juice', 'Vinegar', 'Soy Sauce', 'Tamarind', 'Jaggery', 'Honey', 'Tomato Paste', 'Amchur', 'Fish Sauce', 'Sesame Oil', 'Salsa', 'Ketchup'] }
];

export default function Ingredients() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  // Directory State
  const [directoryGroups, setDirectoryGroups] = useState(FALLBACK_DIRECTORY);
  const [activeCategory, setActiveCategory] = useState('All');
  const [catalogSearch, setCatalogSearch] = useState('');
  const [selectedItems, setSelectedItems] = useState([]);
  const [inspectSubstitute, setInspectSubstitute] = useState(null);
  const [showDirectory, setShowDirectory] = useState(true);

  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chef_search_history')) || []; }
    catch { return []; }
  });

  const navigate = useNavigate();
  const toast = useToast();

  // Load backend directory catalog on mount
  useEffect(() => {
    let isMounted = true;
    api.get('/ingredients/directory')
      .then(res => {
        if (isMounted && res && res.groups && res.groups.length > 0) {
          // Normalize API response into group format
          const formatted = res.groups.map(g => ({
            category: g.category,
            icon: g.icon,
            items: g.items.map(i => typeof i === 'string' ? i : i.name)
          }));
          setDirectoryGroups(formatted);
        }
      })
      .catch(() => {
        // Fallback to static catalog gracefully
      });
    return () => { isMounted = false; };
  }, []);

  // Parse natural language ingredients
  const handleParse = async (queryToParse = text) => {
    const cleanQuery = typeof queryToParse === 'string' ? queryToParse.trim() : text.trim();
    if (!cleanQuery) {
      setError('Please enter or select ingredients to analyze.');
      toast.error('Please enter or select ingredients first.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ingredients/parse', { text: cleanQuery });
      setResults(data);

      // Update history
      const newHistory = [cleanQuery, ...history.filter(h => h !== cleanQuery)].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('chef_search_history', JSON.stringify(newHistory));
      toast.success(`Analyzed ${data.ingredients?.length || 0} ingredient(s)! ✨`);
    } catch (err) {
      setError(err.message || 'Failed to parse ingredients.');
      toast.error(err.message || 'Failed to parse ingredients.');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to recipes with selected or parsed ingredients
  const handleSearchRecipes = (customIngString = null) => {
    let ingStr = customIngString;
    if (!ingStr && results && results.ingredient_names && results.ingredient_names.length > 0) {
      ingStr = results.ingredient_names.join(', ');
    } else if (!ingStr && selectedItems.length > 0) {
      ingStr = selectedItems.join(', ');
    }

    if (ingStr) {
      navigate('/recipes', { state: { ingredients: ingStr } });
    } else {
      toast.error('No ingredients selected to search recipes.');
    }
  };

  // Add items directly to user pantry
  const handleAddToPantry = async (itemsToAdd) => {
    const token = localStorage.getItem('chef_token');
    if (!token) {
      toast.error('Please log in to add items to your pantry. 🔐');
      return;
    }

    const items = Array.isArray(itemsToAdd) ? itemsToAdd : [itemsToAdd];
    if (items.length === 0) return;

    setLoading(true);
    let successCount = 0;
    try {
      for (const item of items) {
        const name = typeof item === 'string' ? item : (item.name || item.raw_text);
        if (!name) continue;
        await api.post('/pantry', {
          ingredient_name: name,
          quantity: item.quantity || 1,
          unit: item.unit || 'unit',
          days_fresh: 7
        });
        successCount++;
      }
      toast.success(`Added ${successCount} ingredient(s) to your pantry! 🛒`);
    } catch (err) {
      toast.error(err.message || 'Failed to add items to pantry.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle ingredient selection in multi-select mode
  const toggleItemSelection = (itemName) => {
    setSelectedItems(prev => {
      const exists = prev.includes(itemName);
      if (exists) {
        return prev.filter(i => i !== itemName);
      } else {
        return [...prev, itemName];
      }
    });
  };

  // Filter directory items by active category & search query
  const filteredDirectory = useMemo(() => {
    const q = catalogSearch.toLowerCase().trim();
    return directoryGroups
      .map(group => {
        if (activeCategory !== 'All' && group.category.toLowerCase() !== activeCategory.toLowerCase()) {
          return null;
        }
        const matchingItems = group.items.filter(item => !q || item.toLowerCase().includes(q));
        if (matchingItems.length === 0) return null;
        return {
          ...group,
          items: matchingItems
        };
      })
      .filter(Boolean);
  }, [directoryGroups, activeCategory, catalogSearch]);

  // Robust Renderer for Substitutes (Fixes Root Cause TypeError)
  const renderSubstitutes = (substitutes, fullIngredientName = '') => {
    if (!substitutes) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None found</span>;
    }

    // Handle legacy/fallback Array case
    if (Array.isArray(substitutes)) {
      if (substitutes.length === 0) {
        return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None found</span>;
      }
      return (
        <div className="sub-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {substitutes.map((s, idx) => (
            <span key={idx} className="sub-tag">{s}</span>
          ))}
        </div>
      );
    }

    // Handle Object case (IngredientSubstitute model)
    const categoryConfigs = [
      { key: 'general', label: 'General', emoji: '🔄', color: 'var(--primary)' },
      { key: 'healthy', label: 'Healthy', emoji: '💪', color: '#10b981' },
      { key: 'vegan', label: 'Vegan', emoji: '🌱', color: '#059669' },
      { key: 'baking', label: 'Baking', emoji: '🍰', color: '#f59e0b' },
      { key: 'gluten_free', label: 'GF', emoji: '🌾', color: '#8b5cf6' },
      { key: 'allergy_friendly', label: 'Safe', emoji: '🛡️', color: '#3b82f6' }
    ];

    const badges = [];
    categoryConfigs.forEach(({ key, label, emoji, color }) => {
      if (Array.isArray(substitutes[key]) && substitutes[key].length > 0) {
        substitutes[key].forEach(val => {
          badges.push({ text: val, category: label, emoji, color });
        });
      }
    });

    if (badges.length === 0 && !substitutes.notes) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None found</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div className="sub-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {badges.slice(0, 4).map((badge, idx) => (
            <span
              key={idx}
              className="sub-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 500,
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-main)',
                cursor: 'pointer'
              }}
              onClick={() => setInspectSubstitute({ ingredient: fullIngredientName, data: substitutes })}
              title={`Click to inspect details for ${badge.category} substitute`}
            >
              <span style={{ fontSize: '11px' }}>{badge.emoji}</span>
              <span>{badge.text}</span>
            </span>
          ))}
          
          {badges.length > 4 && (
            <button
              className="sub-tag-more"
              style={{
                border: 'none',
                background: 'rgba(255, 90, 54, 0.12)',
                color: 'var(--primary)',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
              onClick={() => setInspectSubstitute({ ingredient: fullIngredientName, data: substitutes })}
            >
              +{badges.length - 4} more
            </button>
          )}
        </div>

        {substitutes.notes && (
          <div 
            style={{ 
              fontSize: '11px', 
              color: 'var(--text-muted)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '4px', 
              marginTop: '2px',
              cursor: 'pointer'
            }}
            onClick={() => setInspectSubstitute({ ingredient: fullIngredientName, data: substitutes })}
          >
            <span>💡</span>
            <span style={{ fontStyle: 'italic' }}>
              {substitutes.notes.length > 65 ? substitutes.notes.substring(0, 65) + '...' : substitutes.notes}
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className="page active" style={{ paddingBottom: '60px' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <span>📚</span> Ingredients Directory
            </h1>
            <p className="subtitle" style={{ margin: '6px 0 0' }}>
              Explore culinary ingredients, discover smart substitutes, and analyze recipe matches from our 7,000+ collection.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
            <button
              className={`btn-tab ${showDirectory ? 'active' : ''}`}
              onClick={() => setShowDirectory(true)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: showDirectory ? 'var(--primary)' : 'transparent',
                color: showDirectory ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              📚 Directory Catalog
            </button>
            <button
              className={`btn-tab ${!showDirectory ? 'active' : ''}`}
              onClick={() => setShowDirectory(false)}
              style={{
                padding: '6px 14px',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '8px',
                border: 'none',
                background: !showDirectory ? 'var(--primary)' : 'transparent',
                color: !showDirectory ? '#fff' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔍 Natural Language Parser
            </button>
          </div>
        </div>
      </div>

      {/* Persistent Multi-Selected Sticky Action Bar */}
      {selectedItems.length > 0 && (
        <div className="selected-ingredients-bar fade-in-up" style={{
          position: 'sticky',
          top: '75px',
          zIndex: 90,
          marginBottom: '20px',
          padding: '14px 20px',
          borderRadius: '16px',
          background: 'rgba(15, 23, 42, 0.92)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 90, 54, 0.4)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc', background: 'var(--primary)', padding: '3px 10px', borderRadius: '12px' }}>
              {selectedItems.length} selected
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '40px', overflowY: 'auto' }}>
              {selectedItems.map(item => (
                <span key={item} className="sub-tag" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '12px', padding: '2px 8px', borderRadius: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  {item}
                  <X size={12} style={{ cursor: 'pointer' }} onClick={() => toggleItemSelection(item)} />
                </span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px' }}
              onClick={() => {
                const queryStr = selectedItems.join(', ');
                setText(queryStr);
                handleParse(queryStr);
                setShowDirectory(false);
              }}
            >
              🔍 Parse & Analyze
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px', background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}
              onClick={() => handleSearchRecipes(selectedItems.join(', '))}
            >
              🍽️ Find Recipes
            </button>

            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: '#10b981' }}
              onClick={() => handleAddToPantry(selectedItems)}
            >
              🛒 Add to Pantry
            </button>

            <button
              style={{ border: 'none', background: 'transparent', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => setSelectedItems([])}
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Section 1: Natural Language Ingredients Text Parser */}
      {(!showDirectory || results) && (
        <div className="card glass fade-in-up" style={{ marginBottom: '24px', padding: '20px', borderRadius: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>✍️</span> Plain Text Parser
            </h2>
            {results && (
              <button
                className="btn-secondary"
                style={{ fontSize: '12px', padding: '4px 10px' }}
                onClick={() => setResults(null)}
              >
                Clear Results
              </button>
            )}
          </div>

          <textarea
            placeholder={"Enter ingredients in natural language, e.g.:\n2 cups atta (wheat flour)\n1 cup chana dal\npotatoes, onion, tomato\n200g paneer, green chili, cumin"}
            rows="4"
            value={text}
            onChange={e => setText(e.target.value)}
            style={{
              width: '100%',
              borderRadius: '12px',
              padding: '12px',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-main)',
              fontSize: '14px',
              resize: 'vertical'
            }}
          />

          {history.length > 0 && (
            <div className="search-history" style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                🕒 Recent Searches:
              </span>
              {history.map((h, i) => (
                <button 
                  key={i} 
                  className="sub-tag" 
                  style={{ cursor: 'pointer', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-main)', borderRadius: '14px', padding: '3px 10px', fontSize: '12px' }}
                  onClick={() => {
                    setText(h);
                    handleParse(h);
                  }}
                >
                  {h.length > 25 ? h.substring(0, 25) + '...' : h}
                </button>
              ))}
            </div>
          )}

          {error && <div style={{ color: '#ef4444', marginTop: '10px', fontSize: '13px', fontWeight: 600 }}>⚠️ {error}</div>}

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={() => handleParse(text)} disabled={loading}>
              <span className="btn-icon">🔍</span> Analyze & Extract Ingredients
            </button>
          </div>
        </div>
      )}

      {/* Parsed Ingredients Table */}
      {results && (
        <div className="results-area fade-in-up" style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>📊</span> Parsed Ingredient Breakdown ({results.ingredients?.length || 0})
          </h2>

          {results.ingredients?.length === 0 ? (
            <div className="empty-state card glass" style={{ padding: '30px', textAlign: 'center' }}>
              <span className="empty-icon" style={{ fontSize: '36px' }}>🤷</span>
              <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>No ingredients identified. Try typing e.g. "2 cups flour, 3 eggs".</p>
            </div>
          ) : (
            <div className="card glass" style={{ overflowX: 'auto', padding: 0, borderRadius: '16px' }}>
              <table className="ingredient-table" style={{ margin: 0 }}>
                <thead>
                  <tr>
                    <th>Ingredient Name</th>
                    <th>Quantity</th>
                    <th>Unit</th>
                    <th>Smart Substitutes & Notes</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.ingredients.map((ing, i) => (
                    <tr key={i}>
                      <td className="ingredient-name" style={{ fontWeight: 600, fontSize: '14px' }}>
                        {ing.name}
                        {ing.raw_text && ing.raw_text !== ing.name && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>from "{ing.raw_text}"</div>
                        )}
                      </td>
                      <td>{ing.quantity !== null && ing.quantity !== undefined ? formatQuantityValue(ing.quantity) : '—'}</td>
                      <td>{ing.unit ? ing.unit : '—'}</td>
                      <td style={{ minWidth: '240px' }}>
                        {renderSubstitutes(ing.substitutes, ing.name)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            className="btn-secondary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Add item to your pantry"
                            onClick={() => handleAddToPantry(ing)}
                          >
                            🛒 Pantry
                          </button>
                          <button
                            className="btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                            title="Find recipes with this ingredient"
                            onClick={() => handleSearchRecipes(ing.name)}
                          >
                            🍽️ Recipes
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="search-from-parsed" style={{ padding: '16px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <button
                  className="btn-secondary"
                  onClick={() => handleAddToPantry(results.ingredients)}
                >
                  🛒 Add All ({results.ingredients.length}) to Pantry
                </button>
                <button
                  className="btn-primary"
                  onClick={() => handleSearchRecipes()}
                >
                  🍽️ Find Recipes with All Parsed Ingredients
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Section 2: Interactive Ingredient Directory Catalog */}
      {showDirectory && (
        <div className="directory-catalog-section fade-in-up" style={{ marginTop: '16px' }}>
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <span>📚</span> Interactive Ingredient Catalog
              </h2>
              <p className="subtitle" style={{ margin: '4px 0 0', fontSize: '13px' }}>
                Click any ingredient to toggle selection or parse instantly. Filter by category or search below.
              </p>
            </div>

            {/* Live Search Input for Catalog */}
            <div style={{ position: 'relative', width: '280px' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search catalog ingredients..."
                value={catalogSearch}
                onChange={e => setCatalogSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 34px',
                  borderRadius: '20px',
                  border: '1px solid var(--border-glass)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-main)',
                  fontSize: '13px'
                }}
              />
              {catalogSearch && (
                <X
                  size={14}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', cursor: 'pointer' }}
                  onClick={() => setCatalogSearch('')}
                />
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '12px', marginBottom: '16px' }}>
            {['All', 'Produce', 'Proteins', 'Dairy & Oils', 'Grains & Flour', 'Spices', 'Condiments'].map(cat => (
              <button
                key={cat}
                className={`filter-chip ${activeCategory.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Directory Grid */}
          {filteredDirectory.length === 0 ? (
            <div className="card glass" style={{ padding: '30px', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', margin: 0 }}>No ingredients matched "{catalogSearch}".</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
              {filteredDirectory.map((group) => (
                <div key={group.category} className="card glass" style={{ padding: '16px', borderRadius: '14px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{group.icon}</span>
                    <span>{group.category}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 'auto' }}>
                      ({group.items.length})
                    </span>
                  </h3>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {group.items.map(item => {
                      const isSelected = selectedItems.includes(item);
                      return (
                        <button
                          key={item}
                          className="sub-tag"
                          style={{
                            cursor: 'pointer',
                            border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-glass)',
                            background: isSelected ? 'rgba(255, 90, 54, 0.15)' : 'var(--bg-secondary)',
                            color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                            padding: '5px 11px',
                            borderRadius: '16px',
                            fontSize: '12px',
                            fontWeight: isSelected ? 700 : 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            transition: 'all 0.15s ease'
                          }}
                          onClick={() => toggleItemSelection(item)}
                          title={`Click to toggle ${item} selection`}
                        >
                          {isSelected && <Check size={12} style={{ color: 'var(--primary)' }} />}
                          <span>{item}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Substitute Detail Modal Inspector */}
      {inspectSubstitute && (
        <div className="modal-overlay fade-in" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(6px)',
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="card glass fade-in-up" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '24px',
            borderRadius: '20px',
            border: '1px solid var(--border-glass)',
            background: 'var(--bg-primary)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>🔄</span> Substitutes for "{inspectSubstitute.ingredient}"
              </h3>
              <button
                style={{ border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
                onClick={() => setInspectSubstitute(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {[
                { key: 'general', title: '🔄 General Alternatives', color: 'var(--primary)' },
                { key: 'healthy', title: '💪 Healthy & Low-Calorie', color: '#10b981' },
                { key: 'vegan', title: '🌱 Plant-Based & Vegan', color: '#059669' },
                { key: 'baking', title: '🍰 Baking Replacements', color: '#f59e0b' },
                { key: 'gluten_free', title: '🌾 Gluten-Free Options', color: '#8b5cf6' },
                { key: 'allergy_friendly', title: '🛡️ Allergy-Safe Options', color: '#3b82f6' }
              ].map(({ key, title, color }) => {
                const list = inspectSubstitute.data[key];
                if (!Array.isArray(list) || list.length === 0) return null;
                return (
                  <div key={key} style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color, marginBottom: '6px' }}>{title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {list.map((item, idx) => (
                        <span key={idx} className="sub-tag" style={{ background: 'var(--bg-primary)', fontSize: '12px', padding: '3px 9px', borderRadius: '10px' }}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}

              {inspectSubstitute.data.notes && (
                <div style={{ background: 'rgba(255, 90, 54, 0.08)', padding: '12px 14px', borderRadius: '12px', borderLeft: '4px solid var(--primary)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>💡 Culinary Advisory Note</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: 1.4 }}>{inspectSubstitute.data.notes}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button
                className="btn-primary"
                onClick={() => {
                  handleSearchRecipes(inspectSubstitute.ingredient);
                  setInspectSubstitute(null);
                }}
              >
                🍽️ Search Recipes with {inspectSubstitute.ingredient}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
