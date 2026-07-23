import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';
import AuthModal from '../components/AuthModal';
import { Plus, Wand2, Trash2, Search, AlertTriangle, ChefHat, Info, AlertCircle, Package, Clock, Leaf, Minus } from 'lucide-react';
import useHoldToRepeat from '../hooks/useHoldToRepeat';

/**
 * Returns a sensible increment/decrement step based on unit type.
 * e.g., grams → 50, ml → 100, pcs → 1, kg → 0.25
 */
function getStepForUnit(unit) {
  if (!unit) return 1;
  const u = unit.trim().toLowerCase();
  const stepMap = {
    'pcs': 1, 'pieces': 1, 'piece': 1, 'whole': 1, 'nos': 1,
    'slices': 1, 'slice': 1,
    'g': 50, 'gram': 50, 'grams': 50,
    'ml': 100, 'milliliter': 100, 'milliliters': 100,
    'kg': 0.25, 'kilogram': 0.25, 'kilograms': 0.25,
    'l': 0.25, 'liter': 0.25, 'liters': 0.25, 'litre': 0.25, 'litres': 0.25,
    'tbsp': 1, 'tablespoon': 1, 'tablespoons': 1,
    'tsp': 0.5, 'teaspoon': 0.5, 'teaspoons': 0.5,
    'cup': 0.25, 'cups': 0.25,
    'oz': 1, 'ounce': 1, 'ounces': 1,
    'lb': 0.25, 'pound': 0.25, 'pounds': 0.25,
    'serving': 1, 'servings': 1,
    'dozen': 1,
    'bunch': 1, 'bunches': 1,
    'can': 1, 'cans': 1,
    'packet': 1, 'packets': 1,
    'bottle': 1, 'bottles': 1,
    'box': 1, 'boxes': 1,
  };
  return stepMap[u] || 1;
}

/**
 * Formats a step value + unit for display on buttons (e.g., "+50g", "-100ml", "+1")
 */
function formatStepLabel(step, unit, direction) {
  const prefix = direction > 0 ? '+' : '−';
  const u = (unit || '').trim().toLowerCase();
  // For mass/volume units, show unit suffix
  const showUnit = ['g', 'gram', 'grams', 'ml', 'milliliter', 'milliliters', 'kg', 'kilogram', 'kilograms', 'l', 'liter', 'liters', 'litre', 'litres', 'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds', 'tsp', 'teaspoon', 'teaspoons', 'tbsp', 'tablespoon', 'tablespoons', 'cup', 'cups'].includes(u);
  const displayStep = step % 1 === 0 ? step.toString() : step.toFixed(step < 1 ? 2 : 1).replace(/0+$/, '').replace(/\.$/, '');
  return showUnit ? `${prefix}${displayStep}${u}` : `${prefix}${displayStep}`;
}

/**
 * Returns an emoji for a pantry item based on its name (keyword matching).
 * Falls back to a category-based emoji if no name match is found.
 */
function getItemEmoji(ingredientName, category) {
  const name = (ingredientName || '').toLowerCase();

  // Item-specific keyword → emoji mapping (checked in order, first match wins)
  const itemKeywords = [
    // Proteins
    { keywords: ['egg'], emoji: '🥚' },
    { keywords: ['chicken'], emoji: '🍗' },
    { keywords: ['beef', 'steak'], emoji: '🥩' },
    { keywords: ['pork', 'bacon', 'ham'], emoji: '🥓' },
    { keywords: ['fish', 'salmon', 'tuna', 'cod', 'tilapia'], emoji: '🐟' },
    { keywords: ['shrimp', 'prawn', 'seafood', 'crab', 'lobster'], emoji: '🦐' },
    { keywords: ['lamb', 'mutton', 'goat'], emoji: '🍖' },
    { keywords: ['turkey'], emoji: '🦃' },
    { keywords: ['tofu', 'paneer', 'tempeh'], emoji: '🧊' },
    { keywords: ['sausage'], emoji: '🌭' },

    // Dairy
    { keywords: ['milk'], emoji: '🥛' },
    { keywords: ['butter'], emoji: '🧈' },
    { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'feta'], emoji: '🧀' },
    { keywords: ['yogurt', 'yoghurt', 'curd', 'dahi'], emoji: '🥣' },
    { keywords: ['cream', 'whip'], emoji: '🍦' },
    { keywords: ['ice cream'], emoji: '🍨' },

    // Produce — Fruits
    { keywords: ['apple'], emoji: '🍎' },
    { keywords: ['banana'], emoji: '🍌' },
    { keywords: ['orange'], emoji: '🍊' },
    { keywords: ['lemon', 'lime'], emoji: '🍋' },
    { keywords: ['grape'], emoji: '🍇' },
    { keywords: ['strawberr'], emoji: '🍓' },
    { keywords: ['blueberr', 'berr'], emoji: '🫐' },
    { keywords: ['watermelon', 'melon'], emoji: '🍉' },
    { keywords: ['peach', 'apricot', 'nectarine'], emoji: '🍑' },
    { keywords: ['pineapple'], emoji: '🍍' },
    { keywords: ['mango'], emoji: '🥭' },
    { keywords: ['avocado'], emoji: '🥑' },
    { keywords: ['coconut'], emoji: '🥥' },
    { keywords: ['cherry', 'cherries'], emoji: '🍒' },
    { keywords: ['pear'], emoji: '🍐' },
    { keywords: ['kiwi'], emoji: '🥝' },

    // Produce — Vegetables
    { keywords: ['tomato'], emoji: '🍅' },
    { keywords: ['potato'], emoji: '🥔' },
    { keywords: ['sweet potato', 'yam'], emoji: '🍠' },
    { keywords: ['carrot'], emoji: '🥕' },
    { keywords: ['corn'], emoji: '🌽' },
    { keywords: ['broccoli'], emoji: '🥦' },
    { keywords: ['lettuce', 'salad'], emoji: '🥗' },
    { keywords: ['cucumber'], emoji: '🥒' },
    { keywords: ['pepper', 'capsicum', 'bell pepper'], emoji: '🫑' },
    { keywords: ['chili', 'chilli', 'jalapeno'], emoji: '🌶️' },
    { keywords: ['mushroom'], emoji: '🍄' },
    { keywords: ['onion'], emoji: '🧅' },
    { keywords: ['garlic'], emoji: '🧄' },
    { keywords: ['ginger'], emoji: '🫚' },
    { keywords: ['spinach', 'kale', 'greens', 'chard', 'lettuce'], emoji: '🥬' },
    { keywords: ['pea', 'bean', 'lentil', 'chickpea', 'dal'], emoji: '🫘' },
    { keywords: ['eggplant', 'aubergine', 'brinjal'], emoji: '🍆' },
    { keywords: ['cabbage'], emoji: '🥬' },
    { keywords: ['celery'], emoji: '🥬' },
    { keywords: ['pumpkin', 'squash', 'zucchini', 'gourd'], emoji: '🎃' },

    // Grains & Baking
    { keywords: ['bread', 'toast', 'bun', 'roll', 'naan', 'roti', 'pita'], emoji: '🍞' },
    { keywords: ['rice', 'basmati', 'jasmine'], emoji: '🍚' },
    { keywords: ['pasta', 'spaghetti', 'noodle', 'penne', 'macaroni'], emoji: '🍝' },
    { keywords: ['flour', 'wheat', 'atta', 'maida'], emoji: '🌾' },
    { keywords: ['oat', 'cereal', 'granola', 'muesli'], emoji: '🥣' },
    { keywords: ['cookie', 'biscuit'], emoji: '🍪' },
    { keywords: ['cake'], emoji: '🍰' },
    { keywords: ['sugar'], emoji: '🍬' },
    { keywords: ['tortilla', 'wrap'], emoji: '🌯' },
    { keywords: ['cracker'], emoji: '🍘' },

    // Spices & Seasonings
    { keywords: ['olive oil'], emoji: '🫒' },
    { keywords: ['oil', 'cooking oil', 'vegetable oil', 'sunflower'], emoji: '🛢️' },
    { keywords: ['vinegar'], emoji: '🫗' },
    { keywords: ['soy sauce', 'sauce', 'ketchup', 'mayo', 'mustard'], emoji: '🧴' },
    { keywords: ['salt'], emoji: '🧂' },
    { keywords: ['honey'], emoji: '🍯' },
    { keywords: ['spice', 'cumin', 'turmeric', 'coriander', 'paprika', 'cinnamon', 'pepper'], emoji: '🫙' },
    { keywords: ['herb', 'basil', 'parsley', 'mint', 'thyme', 'rosemary', 'oregano', 'cilantro', 'dill'], emoji: '🌿' },

    // Beverages
    { keywords: ['coffee'], emoji: '☕' },
    { keywords: ['tea'], emoji: '🍵' },
    { keywords: ['juice'], emoji: '🧃' },
    { keywords: ['water'], emoji: '💧' },
    { keywords: ['soda', 'cola', 'drink'], emoji: '🥤' },
    { keywords: ['wine'], emoji: '🍷' },
    { keywords: ['beer'], emoji: '🍺' },

    // Nuts & Dried
    { keywords: ['nut', 'almond', 'walnut', 'cashew', 'pistachio', 'peanut', 'hazelnut'], emoji: '🥜' },
    { keywords: ['chocolate', 'cocoa'], emoji: '🍫' },
  ];

  for (const entry of itemKeywords) {
    if (entry.keywords.some(kw => name.includes(kw))) {
      return entry.emoji;
    }
  }

  // Fallback: category-based emoji
  const categoryFallback = {
    'Produce': '🥬',
    'Proteins': '🥩',
    'Dairy': '🧈',
    'Grains & Baking': '🌾',
    'Spices & Seasonings': '🫙',
    'Other': '📦',
  };
  return categoryFallback[category] || '📦';
}

/**
 * Returns the CSS class suffix for a category's accent strip.
 */
function getCategoryAccentClass(category) {
  const map = {
    'Produce': 'produce',
    'Proteins': 'proteins',
    'Dairy': 'dairy',
    'Grains & Baking': 'grains',
    'Spices & Seasonings': 'spices',
    'Other': 'other',
  };
  return map[category] || 'other';
}

function HoldablePantryQtyBtn({ item, step, direction, onAdjust, title }) {
  const amount = direction * step;
  const handlers = useHoldToRepeat(() => onAdjust(item, amount), 350, 100);
  const label = formatStepLabel(step, item?.unit, direction);
  return (
    <button
      type="button"
      className={`pantry-qty-btn ${direction < 0 ? 'minus' : 'plus'}`}
      title={title}
      {...handlers}
    >
      {label}
    </button>
  );
}

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
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

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

  // Filter & Sort states
  const [selectedTab, setSelectedTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name-asc');

  const fetchPantry = async (isInitial = false) => {
    if (!token) {
      setError('Please log in to manage your pantry inventory.');
      return;
    }
    if (isInitial) setLoading(true);
    try {
      const data = await api.get('/pantry');
      setPantryItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch pantry inventory');
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    fetchPantry(true);
  }, [token]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await api.post('/pantry', {
        ingredient_name: name.trim(),
        quantity: parseFloat(quantity) || 1,
        unit: unit.trim() || 'serving',
        category: category || 'Produce',
        days_fresh: parseInt(daysFresh, 10) || 7
      });
      toast.success(`Added "${name}" to pantry ✓`);
      setName('');
      setQuantity(1);
      setUnit('serving');
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add ingredient');
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
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to add preset');
    }
  };

  const handleQuantityAdjust = async (item, amount) => {
    if (!item) return;
    const currentQty = item.quantity || 0;
    // Round to avoid floating-point drift (e.g., 0.25 + 0.25 = 0.5000000001)
    const rawNew = currentQty + amount;
    const newQty = Math.max(0, Math.round(rawNew * 100) / 100);
    if (newQty === 0) {
      handleDelete(item.id, item.ingredient_name);
      return;
    }
    // Optimistic UI update — immediate smooth adjustment
    setPantryItems(prev => (prev || []).map(p => p.id === item.id ? { ...p, quantity: newQty } : p));
    try {
      await api.put(`/pantry/${item.id}`, {
        quantity: newQty
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update quantity');
      fetchPantry(false);
    }
  };

  const handleDelete = async (id, itemName) => {
    if (!id) return;
    // Optimistic UI update — immediate removal
    setPantryItems(prev => (prev || []).filter(p => p.id !== id));
    try {
      await api.delete(`/pantry/${id}`);
      toast.success(`Removed "${itemName || 'item'}"`);
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
      fetchPantry(false);
    }
  };

  const handleMagicImport = async () => {
    if (!magicImportText.trim()) return;
    setImporting(true);
    try {
      const data = await api.post('/pantry/magic-import', { raw_text: magicImportText });
      toast.success(data.message || 'Pantry updated from text!');
      setMagicImportText('');
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateAI = async () => {
    setGeneratingRecipe(true);
    setGeneratedRecipe(null);
    try {
      const data = await api.post('/pantry/generate-recipe');
      setGeneratedRecipe(data);
    } catch (err) {
      toast.error(err.message || 'Recipe generation failed.');
    } finally {
      setGeneratingRecipe(false);
    }
  };

  const handleDeductRecipeIngredients = async (recipe) => {
    if (!recipe || !recipe.ingredients) return;
    try {
      const ingList = recipe.ingredients.map(i => ({ name: i.name, qty: i.amount || 1, unit: i.unit || '' }));
      const res = await api.post('/pantry/deduct-recipe', { ingredients: ingList });
      toast.success(res.message || 'Updated pantry stock!');
      setGeneratedRecipe(null);
      fetchPantry(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update pantry stock.');
    }
  };

  const getFreshnessStatus = (item) => {
    if (!item) return { label: 'Fresh', color: '#27ae60', bg: 'rgba(39,174,96,0.1)' };
    const rawDate = item.updated_at ? new Date(item.updated_at).getTime() : Date.now();
    const updatedDate = isNaN(rawDate) ? Date.now() : rawDate;
    const expiryTime = updatedDate + (item.days_fresh || 7) * 24 * 60 * 60 * 1000;
    const timeLeftMs = expiryTime - Date.now();
    const daysLeft = Math.ceil(timeLeftMs / (24 * 60 * 60 * 1000));

    if (isNaN(daysLeft) || daysLeft > 2) {
      return { label: 'Fresh', color: '#27ae60', bg: 'rgba(39,174,96,0.1)' };
    }
    if (daysLeft <= 0) {
      return { label: 'Expired', color: '#e74c3c', bg: 'rgba(231,76,60,0.1)' };
    }
    return { label: `Expires in ${daysLeft}d`, color: '#f39c12', bg: 'rgba(243,156,18,0.1)' };
  };

  const getFillPercentage = (item) => {
    if (!item || !item.quantity || isNaN(item.quantity)) return 0;
    let fill = 100;
    if (item.unit === 'g' || item.unit === 'ml') fill = Math.min(100, (item.quantity / 1000) * 100);
    else if (item.unit === 'pcs' || item.unit === 'slices') fill = Math.min(100, (item.quantity / 12) * 100);
    if (item.quantity > 0 && fill < 5) fill = 5;
    return isNaN(fill) ? 0 : fill;
  };

  // Metrics Logic
  const safeItems = Array.isArray(pantryItems) ? pantryItems : [];
  const totalItems = safeItems.length;
  const expiringSoonCount = safeItems.filter(item => {
    const status = getFreshnessStatus(item);
    return status.label.includes('Expired') || status.label.includes('Expires in');
  }).length;
  const lowStockCount = safeItems.filter(item => getFillPercentage(item) <= 25 && (item.quantity || 0) > 0).length;

  // Client-side filtering & sorting
  const filteredItems = safeItems.filter(item => {
    if (!item || !item.ingredient_name) return false;
    const matchesTab = selectedTab === 'All' || item.category === selectedTab;
    const matchesSearch = item.ingredient_name.toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesTab && matchesSearch;
  }).sort((a, b) => {
    if (sortOption === 'name-asc') return (a.ingredient_name || '').localeCompare(b.ingredient_name || '');
    if (sortOption === 'name-desc') return (b.ingredient_name || '').localeCompare(a.ingredient_name || '');
    if (sortOption === 'qty-asc') return (a.quantity || 0) - (b.quantity || 0);
    if (sortOption === 'qty-desc') return (b.quantity || 0) - (a.quantity || 0);
    
    const getExpiryTime = (item) => {
      const d = item && item.updated_at ? new Date(item.updated_at).getTime() : Date.now();
      const validD = isNaN(d) ? Date.now() : d;
      return validD + (item.days_fresh || 7) * 24 * 60 * 60 * 1000;
    };
    if (sortOption === 'exp-soon') return getExpiryTime(a) - getExpiryTime(b);
    if (sortOption === 'exp-late') return getExpiryTime(b) - getExpiryTime(a);
    return 0;
  });

  return (
    <section className="page active">
      <div className="page-header fade-in-up" style={{ '--delay': '0ms' }}>
        <h1>Smart Pantry</h1>
        <p className="subtitle">Track ingredients you have in stock at home to unlock matched recipe recommendations.</p>
      </div>

      {!token ? (
        <div className="empty-state fade-in-up" style={{ '--delay': '100ms', padding: '60px 20px', textAlign: 'center' }}>
          <Package size={48} style={{ color: 'var(--text-muted)', marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '10px' }}>Personal Pantry Storage</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Log in or sign up to manage your ingredient inventory and generate matched recipes.</p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)} style={{ padding: '10px 24px', fontSize: '1rem', borderRadius: '12px' }}>
            🔐 Log In / Sign Up
          </button>
        </div>
      ) : (
        <div style={{ marginTop: '20px' }}>
          
          <div className="fade-in-up" style={{ '--delay': '50ms', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
             <div className="card glass pantry-summary-card">
                <div className="pantry-summary-icon total">
                   <Package size={26} />
                </div>
                <div>
                   <h4 className="pantry-summary-label">Total Items</h4>
                   <span className="pantry-summary-value">{totalItems}</span>
                </div>
             </div>
             <div className="card glass pantry-summary-card">
                <div className="pantry-summary-icon expiring">
                   <Clock size={26} />
                </div>
                <div>
                   <h4 className="pantry-summary-label">Expiring Soon</h4>
                   <span className="pantry-summary-value">{expiringSoonCount}</span>
                </div>
             </div>
             <div className="card glass pantry-summary-card">
                <div className="pantry-summary-icon low-stock">
                   <AlertTriangle size={26} />
                </div>
                <div>
                   <h4 className="pantry-summary-label">Low Stock</h4>
                   <span className="pantry-summary-value">{lowStockCount}</span>
                </div>
             </div>
          </div>

          <div className="kitchen-layout">
            <div className="kitchen-side-col fade-in-up" style={{ '--delay': '100ms', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Plus size={20} /> Add Ingredient
              </h2>
              
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
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                      >
                        {PANTRY_CATEGORIES.filter(c => c !== 'All').map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ fontWeight: '600', fontSize: '13px', color: 'var(--text-secondary)' }}>Days Fresh</label>
                      <input
                        type="number"
                        min="1"
                        value={daysFresh}
                        onChange={(e) => setDaysFresh(e.target.value)}
                        style={{ padding: '10px', borderRadius: '8px', border: '1px solid var(--border-glass)' }}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '12px', marginTop: '5px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                  >
                    <Plus size={18} /> Add to Pantry
                  </button>
                </form>
              </div>

              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, marginTop: '10px' }}>
                <Wand2 size={20} /> Smart Quick Import
              </h2>
              
              <div className="card glass" style={{ padding: '20px' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>Paste receipt, notes, or grocery list text to extract and add items automatically.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <textarea
                    rows={3}
                    placeholder="e.g. 2 cartons of milk, 12 eggs, 500g chicken..."
                    value={magicImportText}
                    onChange={(e) => setMagicImportText(e.target.value)}
                    style={{
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-glass)',
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-primary)',
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

              <h2 className="section-title" style={{ margin: 0, marginTop: '10px' }}>Quick Stock Presets</h2>
              <div className="card glass" style={{ padding: '15px', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                 {QUICK_PRESETS.map((preset) => (
                   <button
                     key={preset.name}
                     type="button"
                     onClick={() => handlePresetClick(preset)}
                     className="pantry-preset-btn"
                   >
                     <span className="pantry-preset-emoji">{preset.emoji}</span> {preset.name}
                   </button>
                 ))}
               </div>
            </div>

            <div className="kitchen-main-col fade-in-up" style={{ '--delay': '200ms', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '15px' }}>
                  <h2 className="section-title" style={{ margin: 0, minWidth: 'max-content' }}>Inventory Grid</h2>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', flex: 1, justifyContent: 'flex-end' }}>
                    <button
                      className="btn-primary"
                      onClick={handleGenerateAI}
                      disabled={generatingRecipe || safeItems.length === 0}
                      style={{
                        padding: '8px 16px',
                        background: 'var(--text-primary)',
                        color: 'var(--bg-primary)',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 'bold',
                        opacity: generatingRecipe ? 0.7 : 1,
                        cursor: generatingRecipe ? 'wait' : 'pointer',
                        minWidth: '200px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <ChefHat size={18} />
                      {generatingRecipe ? 'Generating Recipe...' : 'Generate AI Recipe'}
                    </button>
                    
                    <div style={{ position: 'relative', flex: '1 1 200px' }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-muted)' }} />
                      <input
                        type="text"
                        placeholder="Search ingredients..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ padding: '8px 14px 8px 36px', borderRadius: '8px', border: '1px solid var(--border-glass)', width: '100%', background: 'var(--bg-secondary)', color: 'var(--text-primary)', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div className="diet-pill-selector" style={{ overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: '4px', flex: 1, paddingRight: '10px' }}>
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
                  
                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-glass)', 
                      background: 'var(--bg-secondary)', 
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                    <option value="exp-soon">Expiring Soon</option>
                    <option value="exp-late">Expiring Late</option>
                    <option value="qty-asc">Quantity (Low-High)</option>
                    <option value="qty-desc">Quantity (High-Low)</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading pantry list...</div>
              ) : error ? (
                <div style={{ color: 'red', padding: '20px' }}>{error}</div>
              ) : filteredItems.length === 0 ? (
                <div className="empty-state">
                  <Package size={48} style={{ color: 'var(--text-muted)' }} />
                  <p>No ingredients found. Add items to build your stock!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: '16px' }}>
                   {filteredItems.map((item, idx) => {
                     const freshness = getFreshnessStatus(item);
                     const fillPercentage = getFillPercentage(item);
                     const isLowStock = fillPercentage <= 25;
                     const accentClass = getCategoryAccentClass(item.category);
                     const emoji = getItemEmoji(item.ingredient_name, item.category);
                     const step = getStepForUnit(item.unit);
                     const stockLevel = fillPercentage > 50 ? 'high' : fillPercentage > 25 ? 'medium' : 'low';
                     const freshnessClass = freshness.label === 'Fresh' ? 'fresh' : freshness.label.includes('Expired') ? 'expired' : 'expiring';

                     return (
                       <div 
                         key={item.id} 
                         className="card pantry-item-card fade-in-up" 
                         style={{ 
                           animationDelay: `${idx * 40}ms`,
                           border: `1px solid var(--border-glass)`,
                         }}
                       >
                         <div className={`pantry-card-accent ${accentClass}`} />

                         <div className="pantry-category-emoji">{emoji}</div>

                         <div className="pantry-card-body">
                           <div className={`pantry-freshness-badge ${freshnessClass}`}>
                             {freshnessClass === 'fresh' && <Leaf size={10} />}
                             {freshnessClass === 'expiring' && <Clock size={10} />}
                             {freshnessClass === 'expired' && <AlertCircle size={10} />}
                             {freshness.label}
                           </div>
                           
                           <h3 className="pantry-item-name">
                             {item.ingredient_name}
                           </h3>
                           
                           <div className="pantry-stock-gauge">
                             <div className="pantry-stock-label" style={{ color: isLowStock ? '#f39c12' : 'var(--text-secondary)' }}>
                               <span className="pantry-stock-qty">
                                 {isLowStock && <AlertTriangle size={11} />}
                                 {item.quantity} {item.unit}
                               </span>
                               <span>{Math.round(fillPercentage)}%</span>
                             </div>
                             <div className="pantry-stock-bar-bg">
                               <div 
                                 className={`pantry-stock-bar-fill ${stockLevel}`}
                                 style={{ width: `${fillPercentage}%` }} 
                               />
                             </div>
                           </div>

                           <div className="pantry-card-footer">
                             <div className="pantry-qty-stepper">
                               <HoldablePantryQtyBtn item={item} step={step} direction={-1} onAdjust={handleQuantityAdjust} title={`Decrease by ${step} ${item.unit}`} />
                               <div className="pantry-qty-divider" />
                               <span className="pantry-qty-label">qty</span>
                               <div className="pantry-qty-divider" />
                               <HoldablePantryQtyBtn item={item} step={step} direction={1} onAdjust={handleQuantityAdjust} title={`Increase by ${step} ${item.unit}`} />
                             </div>

                             <button 
                               onClick={() => handleDelete(item.id, item.ingredient_name)}
                               className="pantry-delete-btn"
                               title="Remove item"
                             >
                               <Trash2 size={15} />
                             </button>
                           </div>
                         </div>
                       </div>
                     );
                   })}
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {generatedRecipe && (
        <RecipeModal
          recipe={generatedRecipe}
          onClose={() => setGeneratedRecipe(null)}
        />
      )}

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
    </section>
  );
}
