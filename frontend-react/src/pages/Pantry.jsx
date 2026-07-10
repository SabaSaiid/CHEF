import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';

const PANTRY_CATEGORIES = ['All', 'Produce', 'Proteins', 'Dairy', 'Grains & Baking', 'Spices & Seasonings', 'Other'];

const QUICK_PRESETS = [
  { name: 'Eggs', category: 'Proteins', unit: 'pcs', days_fresh: 14, emoji: '🥚', amount: 6 },
  { name: 'Chicken Breast', category: 'Proteins', unit: 'g', days_fresh: 4, emoji: '🍗', amount: 500 },
  { name: 'Milk', category: 'Dairy', unit: 'ml', days_fresh: 7, emoji: '🥛', amount: 1000 },
  { name: 'Butter', category: 'Dairy', unit: 'g', days_fresh: 30, emoji: '🧈', amount: 250 },
  { name: 'Spinach', category: 'Produce', unit: 'g', days_fresh: 4, emoji: '🥬', amount: 200 },
  { name: 'Onions', category: 'Produce', unit: 'pcs', days_fresh: 20, emoji: '🧅', amount: 4 },
  { name: 'Garlic', category: 'Produce', unit: 'pcs', days_fresh: 30, emoji: '🧄', amount: 2 },
  { name: 'Olive Oil', category: 'Spices & Seasonings', unit: 'ml', days_fresh: 180, emoji: '🫒', amount: 500 },
  { name: 'Rice', category: 'Grains & Baking', unit: 'g', days_fresh: 365, emoji: '🌾', amount: 1000 },
  { name: 'Bread', category: 'Grains & Baking', unit: 'slices', days_fresh: 6, emoji: '🍞', amount: 12 }
];

export default function Pantry() {
  const { token } = useContext(AuthContext);
  const toast = useToast();

  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('serving');
  const [category, setCategory] = useState('Produce');
  const [daysFresh, setDaysFresh] = useState(7);

  // AI Feature states
  const [magicImportText, setMagicImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [generatingRecipe, setGeneratingRecipe] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState(null);

  // Filter states
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPantry = async () => {
    if (!token) {
      setError('Please log in to manage your pantry inventory.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.get('/pantry');
      setPantryItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantry();
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/pantry', {
        ingredient_name: name.trim(),
        quantity: parseFloat(quantity),
        unit: unit.trim(),
        category,
        days_fresh: parseInt(daysFresh, 10)
      });
      toast.success(`Added "${name}" to pantry ✓`);
      setName('');
      setQuantity(1);
      setUnit('serving');
      fetchPantry();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handlePresetClick = async (preset) => {
    try {
      await api.post('/pantry', {
        ingredient_name: preset.name,
        quantity: preset.amount,
        unit: preset.unit,
        category: preset.category,
        days_fresh: preset.days_fresh
      });
      toast.success(`Logged ${preset.emoji} ${preset.name} (+${preset.amount} ${preset.unit})`);
      fetchPantry();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleQuantityAdjust = async (item, amount) => {
    const newQty = Math.max(0, item.quantity + amount);
    if (newQty === 0) {
      handleDelete(item.id, item.ingredient_name);
      return;
    }
    try {
      await api.put(`/pantry/${item.id}`, {
        quantity: newQty
      });
      fetchPantry();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id, itemName) => {
    try {
      await api.delete(`/pantry/${id}`);
      toast.success(`Removed "${itemName}"`);
      fetchPantry();
    } catch (err) {
      toast.error(err.message);
    }
  };
  const handleMagicImport = async () => {
    if (!magicImportText.trim()) return;
    setImporting(true);
    try {
      const data = await api.post('/pantry/magic-import', { text: magicImportText });
      const items = data.items || [];
      if (items.length === 0) {
        toast.error("No ingredients found in text.");
        return;
      }
      for (const item of items) {
        await api.post('/pantry', item);
      }
      toast.success(`Magically imported ${items.length} items! ✨`);
      setMagicImportText('');
      fetchPantry();
    } catch (err) {
      toast.error(err.message || "Failed to parse text. Is your API key set?");
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateRecipe = async () => {
    setGeneratingRecipe(true);
    try {
      const data = await api.get('/pantry/generate-recipe');
      
      // Map Gemini output to match RecipeModal expected format
      const formattedRecipe = {
        title: data.title,
        image_url: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=800', // Generic high quality food fallback
        ready_in_minutes: data.prep_time || 30,
        servings: 2,
        diets: ['Pantry Creation'],
        extended_ingredients: (data.ingredients || []).map(i => ({ original: i })),
        instructions_text: (data.instructions || []).join('\n'),
        nutrition: {
          calories: data.macros?.calories || 0,
          protein_g: data.macros?.protein || 0,
          carbs_g: data.macros?.carbs || 0,
          fat_g: data.macros?.fat || 0
        }
      };
      
      setGeneratedRecipe(formattedRecipe);
      toast.success("AI Chef has created a recipe! 👨‍🍳");
    } catch (err) {
      toast.error(err.message || "Could not generate recipe.");
    } finally {
      setGeneratingRecipe(false);
    }
  };
  // Freshness calculation
  const getFreshnessStatus = (item) => {
    const updatedDate = new Date(item.updated_at).getTime();
    const expiryTime = updatedDate + (item.days_fresh || 7) * 24 * 60 * 60 * 1000;
    const timeLeftMs = expiryTime - Date.now();
    const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));

    if (daysLeft <= 0) {
      return { label: 'Expired', color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' };
    }
    if (daysLeft <= 2) {
      return { label: `Expires in ${daysLeft}d`, color: '#f39c12', bg: 'rgba(243,156,18,0.1)' };
    }
    return { label: 'Fresh', color: '#27ae60', bg: 'rgba(39,174,96,0.1)' };
  };

  // Client-side filtering
  const filteredItems = pantryItems.filter(item => {
    const matchesTab = selectedTab === 'All' || item.category === selectedTab;
    const matchesSearch = item.ingredient_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <section className="page active">
      <div className="page-header fade-in-up" style={{ '--delay': '0ms' }}>
        <h1>Smart Pantry</h1>
        <p className="subtitle">Track ingredients you have in stock at home to unlock matched recipe recommendations.</p>
      </div>

      {!token ? (
        <div className="empty-state fade-in-up" style={{ '--delay': '100ms' }}>
          <span className="empty-icon">🔐</span>
          <p>Please log in to manage your personal pantry ingredients.</p>
        </div>
      ) : (
        <div className="kitchen-layout" style={{ marginTop: '20px' }}>
          {/* Left Column: Form & Presets */}
          <div className="kitchen-side-col fade-in-up" style={{ '--delay': '100ms', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 className="section-title">➕ Add Ingredient</h2>
            
            <div className="card glass" style={{ padding: '20px' }}>
              <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Ingredient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eggs, Chicken, Olive Oil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Quantity</label>
                    <input
                      type="number"
                      required
                      min="0.1"
                      step="any"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                    />
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. pcs, g, ml, serving"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                    >
                      {PANTRY_CATEGORIES.filter(c => c !== 'All').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Freshness (days)</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={daysFresh}
                      onChange={(e) => setDaysFresh(e.target.value)}
                      style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ padding: '12px', border: 'none', borderRadius: '10px', fontWeight: 'bold' }}>
                  Add to Pantry
                </button>
              </form>
            </div>

            {/* AI Magic Import Panel */}
            <h2 className="section-title" style={{ marginTop: '10px' }}>
              AI Magic Import
            </h2>
            <div className="card glass" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Paste a messy grocery list or receipt text. Gemini AI will automatically extract quantities, units, and categories.
                </p>
                <textarea
                  placeholder="e.g. 2 gallons of milk, a bunch of bananas, 500g chicken breast..."
                  value={magicImportText}
                  onChange={(e) => setMagicImportText(e.target.value)}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    minHeight: '80px',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    fontSize: '14px'
                  }}
                />
                <button
                  type="button"
                  onClick={handleMagicImport}
                  disabled={importing || !magicImportText.trim()}
                  className="btn-primary"
                  style={{
                    padding: '10px',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    background: 'var(--text-primary)',
                    color: 'var(--bg-primary)'
                  }}
                >
                  {importing ? 'Parsing Data...' : 'Import Data'}
                </button>
              </div>
            </div>

            {/* Quick Presets Panel */}
            <h2 className="section-title" style={{ marginTop: '10px' }}>Quick Stock Presets</h2>
            <div className="card glass" style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="sidebar-tool-btn"
                  style={{ padding: '10px', fontSize: '13px', fontWeight: '500', justifyContent: 'center', background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)' }}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Inventory List with Tabs & Search */}
          <div className="kitchen-main-col fade-in-up" style={{ '--delay': '200ms', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Expiring Soon Carousel */}
            {(() => {
              const expiringItems = pantryItems.filter(item => {
                const f = getFreshnessStatus(item);
                return f.label.includes('Expired') || f.label.includes('Expires in');
              });
              if (expiringItems.length > 0) {
                return (
                  <div className="card glass" style={{ padding: '15px', borderLeft: '4px solid #e74c3c' }}>
                    <h3 style={{ fontSize: '14px', margin: '0 0 10px 0', color: '#e74c3c', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      Action Needed: Expiring Soon
                    </h3>
                    <div className="custom-scrollbar" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '8px' }}>
                      {expiringItems.map(item => (
                        <div key={item.id} style={{ flexShrink: 0, minWidth: '130px', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                          <strong style={{ fontSize: '13px', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text-primary)' }}>{item.ingredient_name}</strong>
                          <span style={{ fontSize: '11px', color: getFreshnessStatus(item).color, fontWeight: 'bold' }}>{getFreshnessStatus(item).label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Filter controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                <h2 className="section-title" style={{ margin: 0, minWidth: 'max-content' }}>Pantry Inventory</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                  <button
                    className="btn-primary"
                    onClick={handleGenerateRecipe}
                    disabled={generatingRecipe || pantryItems.length === 0}
                    style={{
                      padding: '8px 16px',
                      background: 'var(--text-primary)',
                      color: 'var(--bg-primary)',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      opacity: generatingRecipe ? 0.7 : 1,
                      cursor: generatingRecipe ? 'wait' : 'pointer',
                      minWidth: '200px'
                    }}
                  >
                    {generatingRecipe ? 'Generating Recipe...' : 'Generate AI Recipe'}
                  </button>
                  <input
                    type="text"
                    placeholder="Search ingredients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', minWidth: '200px', flex: '1 1 200px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                  />
                </div>
              </div>
              
              {/* Category tabs */}
              <div className="diet-pill-selector" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px' }}>
                {PANTRY_CATEGORIES.map(tab => (
                  <button
                    key={tab}
                    type="button"
                    className={`diet-pill ${selectedTab === tab ? 'active' : ''}`}
                    onClick={() => setSelectedTab(tab)}
                    style={{ padding: '8px 16px', fontSize: '13px' }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading pantry list...</div>
            ) : error ? (
              <div style={{ color: 'red', padding: '20px' }}>{error}</div>
            ) : filteredItems.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">🍳</span>
                <p>No ingredients found. Add items using the preset panel or forms to build your stock!</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '15px' }}>
                {filteredItems.map((item, idx) => {
                  const freshness = getFreshnessStatus(item);
                  
                  // Premium Category Colors
                  let catColor = 'var(--glass-bg)';
                  let catBorder = 'var(--border-glass)';
                  let catShadow = 'none';
                  
                  if (item.category === 'Produce') { catColor = 'rgba(39, 174, 96, 0.04)'; catBorder = 'rgba(39, 174, 96, 0.2)'; catShadow = '0 4px 20px rgba(39, 174, 96, 0.05)'; }
                  else if (item.category === 'Proteins') { catColor = 'rgba(231, 76, 60, 0.04)'; catBorder = 'rgba(231, 76, 60, 0.2)'; catShadow = '0 4px 20px rgba(231, 76, 60, 0.05)'; }
                  else if (item.category === 'Dairy') { catColor = 'rgba(52, 152, 219, 0.04)'; catBorder = 'rgba(52, 152, 219, 0.2)'; catShadow = '0 4px 20px rgba(52, 152, 219, 0.05)'; }
                  else if (item.category === 'Spices & Seasonings') { catColor = 'rgba(243, 156, 18, 0.04)'; catBorder = 'rgba(243, 156, 18, 0.2)'; catShadow = '0 4px 20px rgba(243, 156, 18, 0.05)'; }
                  else if (item.category === 'Grains & Baking') { catColor = 'rgba(211, 84, 0, 0.04)'; catBorder = 'rgba(211, 84, 0, 0.2)'; catShadow = '0 4px 20px rgba(211, 84, 0, 0.05)'; }

                  // Fill-Level Logic
                  let fillPercentage = 100;
                  if (item.unit === 'g' || item.unit === 'ml') fillPercentage = Math.min(100, (item.quantity / 1000) * 100);
                  else if (item.unit === 'pcs' || item.unit === 'slices') fillPercentage = Math.min(100, (item.quantity / 12) * 100);
                  if (item.quantity > 0 && fillPercentage < 5) fillPercentage = 5;

                  return (
                    <div 
                      key={item.id} 
                      className="card fade-in-up" 
                      style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between', 
                        minHeight: '140px', 
                        position: 'relative',
                        background: catColor,
                        border: `1px solid ${catBorder}`,
                        boxShadow: catShadow,
                        borderRadius: '16px',
                        animationDelay: `${idx * 40}ms`,
                        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 25px ${catBorder.replace('0.2', '0.4')}`; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = catShadow; }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: freshness.bg, color: freshness.color, fontWeight: '700', textTransform: 'uppercase' }}>
                            {freshness.label}
                          </span>
                          <span style={{ fontSize: '11px', opacity: 0.6, color: 'var(--text-muted)', fontWeight: 'bold' }}>
                            {item.category}
                          </span>
                        </div>
                        
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0', textTransform: 'capitalize' }}>
                          {item.ingredient_name}
                        </h3>
                        
                        {/* Fill-Level Gauge */}
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>{item.quantity} {item.unit}</span>
                            <span>{Math.round(fillPercentage)}%</span>
                          </div>
                          <div style={{ height: '6px', width: '100%', background: 'rgba(0,0,0,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ 
                              height: '100%', 
                              width: `${fillPercentage}%`, 
                              background: fillPercentage > 20 ? 'var(--gradient-primary)' : '#e74c3c',
                              transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' 
                            }} />
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px' }}>
                        {/* Interactive Quantity Steppers */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.03)', borderRadius: '6px', padding: '2px' }}>
                          <button 
                            onClick={() => handleQuantityAdjust(item, -1)}
                            className="nav-btn"
                            style={{ padding: '2px 8px', fontSize: '14px', minWidth: '24px', textAlign: 'center', cursor: 'pointer' }}
                            title="Subtract 1"
                          >
                            -
                          </button>
                          <span style={{ fontSize: '12px', fontWeight: 'bold', padding: '0 4px', minWidth: '15px', textAlign: 'center' }}>
                            qty
                          </span>
                          <button 
                            onClick={() => handleQuantityAdjust(item, 1)}
                            className="nav-btn"
                            style={{ padding: '2px 8px', fontSize: '14px', minWidth: '24px', textAlign: 'center', cursor: 'pointer' }}
                            title="Add 1"
                          >
                            +
                          </button>
                        </div>
                        
                        {/* Trash */}
                        <button 
                          onClick={() => handleDelete(item.id, item.ingredient_name)}
                          style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '18px', padding: '4px' }}
                          title="Remove item"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {generatedRecipe && (
        <RecipeModal
          recipe={generatedRecipe}
          onClose={() => setGeneratedRecipe(null)}
        />
      )}
    </section>
  );
}
