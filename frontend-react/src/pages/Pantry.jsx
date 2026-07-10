import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

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

            {/* Quick Presets Panel */}
            <h2 className="section-title" style={{ marginTop: '10px' }}>⚡ Quick Stock Presets</h2>
            <div className="card glass" style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {QUICK_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="sidebar-tool-btn"
                  style={{ padding: '10px', fontSize: '13px', gap: '8px', justifyContent: 'center' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{preset.emoji}</span>
                  {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Inventory List with Tabs & Search */}
          <div className="kitchen-main-col fade-in-up" style={{ '--delay': '200ms', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* Filter controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="section-title" style={{ margin: 0 }}>🥦 My Food Stocks</h2>
                <input
                  type="text"
                  placeholder="🔍 Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', minWidth: '220px', background: 'var(--glass-bg)' }}
                />
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
                  return (
                    <div 
                      key={item.id} 
                      className="card glass fade-in-up" 
                      style={{ 
                        padding: '16px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'space-between', 
                        minHeight: '130px', 
                        position: 'relative',
                        animationDelay: `${idx * 40}ms`
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: freshness.bg, color: freshness.color, fontWeight: '700', textTransform: 'uppercase' }}>
                            {freshness.label}
                          </span>
                          <span style={{ fontSize: '11px', opacity: 0.6, color: 'var(--text-muted)' }}>
                            {item.category}
                          </span>
                        </div>
                        
                        <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-primary)', margin: '4px 0', textTransform: 'capitalize' }}>
                          {item.ingredient_name}
                        </h3>
                        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                          {item.quantity} {item.unit}
                        </p>
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
    </section>
  );
}
