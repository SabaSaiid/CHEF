import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  AlertTriangle, 
  Sparkles, 
  Search, 
  ExternalLink, 
  CheckCircle2, 
  ArrowRight, 
  ChefHat, 
  Flame, 
  Clock,
  RefreshCw,
  Plus,
  Leaf,
  Layers,
  Trash2
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { playAddSound, playClickSound } from '../utils/soundEffects';
import { CHEF_EVENTS, dispatchChefEvent } from '../utils/dateUtils';

const POPULAR_STAPLES = [
  { name: 'Eggs', emoji: '🥚' },
  { name: 'Paneer', emoji: '🧀' },
  { name: 'Chicken', emoji: '🍗' },
  { name: 'Tomatoes', emoji: '🍅' },
  { name: 'Rice', emoji: '🍚' },
  { name: 'Oats', emoji: '🌾' },
  { name: 'Garlic', emoji: '🧄' },
  { name: 'Spinach', emoji: '🥬' },
];

export default function PantryQuickCookBar({ onSelectRecipe }) {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchingLoading, setMatchingLoading] = useState(false);
  const [fridgeSearch, setFridgeSearch] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddQty, setQuickAddQty] = useState(1);
  const [quickAddUnit, setQuickAddUnit] = useState('pcs');
  const [matchedRecipes, setMatchedRecipes] = useState([]);
  const [showMatchedModal, setShowMatchedModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const fetchPantry = useCallback(async () => {
    setLoading(true);
    if (token) {
      try {
        const items = await api.get('/pantry');
        setPantryItems(Array.isArray(items) ? items : []);
      } catch (err) {
        console.error('Failed to load pantry in kitchen bar:', err);
        setPantryItems([]);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest mode fallback
      try {
        const local = JSON.parse(localStorage.getItem('chef_guest_pantry') || '[]');
        setPantryItems(local);
      } catch {
        setPantryItems([]);
      } finally {
        setLoading(false);
      }
    }
  }, [token]);

  useEffect(() => {
    fetchPantry();
  }, [fetchPantry]);

  // Expiry analysis
  const expiringItems = useMemo(() => {
    return pantryItems.filter(item => 
      item.expiry_status === 'expiring_soon' || 
      item.expiry_status === 'expired' || 
      (item.days_remaining !== undefined && item.days_remaining <= 3)
    );
  }, [pantryItems]);

  const freshItems = useMemo(() => {
    return pantryItems.filter(item => 
      item.expiry_status === 'fresh' || 
      (item.days_remaining !== undefined && item.days_remaining > 3)
    );
  }, [pantryItems]);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;

    playAddSound();
    setIsAdding(true);
    const itemPayload = {
      ingredient_name: quickAddName.trim(),
      quantity: parseFloat(quickAddQty) || 1,
      unit: quickAddUnit || 'pcs',
      category: 'Pantry Staple',
      location: 'Pantry',
      days_fresh: 7
    };

    try {
      if (token) {
        await api.post('/pantry', itemPayload);
      } else {
        const existing = JSON.parse(localStorage.getItem('chef_guest_pantry') || '[]');
        const updated = [...existing, { ...itemPayload, id: Date.now(), expiry_status: 'fresh', days_remaining: 7 }];
        localStorage.setItem('chef_guest_pantry', JSON.stringify(updated));
      }

      toast.success(`Added ${quickAddQty} ${quickAddUnit} of "${quickAddName}" to pantry! 📦`);
      setQuickAddName('');
      setQuickAddQty(1);
      dispatchChefEvent(CHEF_EVENTS.PANTRY_UPDATED);
      fetchPantry();
    } catch (err) {
      toast.error('Failed to add item to pantry.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleMatchPantry = async () => {
    playClickSound();
    if (pantryItems.length === 0) {
      toast.info('Your pantry is empty. Add a few ingredients to match recipes!');
      return;
    }

    setMatchingLoading(true);
    try {
      if (token) {
        const res = await api.get('/pantry/match-recipes?max_results=6');
        if (res && res.matched_recipes && res.matched_recipes.length > 0) {
          setMatchedRecipes(res.matched_recipes);
          setShowMatchedModal(true);
          toast.success(`Found ${res.matched_recipes.length} recipes you can make right now! 🍳`);
        } else {
          const ingredientNames = pantryItems.slice(0, 5).map(i => i.ingredient_name).join(', ');
          navigate('/recipes', { state: { ingredients: ingredientNames } });
        }
      } else {
        const ingredientNames = pantryItems.slice(0, 5).map(i => i.ingredient_name).join(', ');
        navigate('/recipes', { state: { ingredients: ingredientNames } });
      }
    } catch (err) {
      toast.error('Failed to match pantry recipes.');
      const ingredientNames = pantryItems.slice(0, 5).map(i => i.ingredient_name).join(', ');
      navigate('/recipes', { state: { ingredients: ingredientNames } });
    } finally {
      setMatchingLoading(false);
    }
  };

  const handleFridgeSearchSubmit = (e) => {
    e.preventDefault();
    if (!fridgeSearch.trim()) return;
    navigate('/recipes', { state: { ingredients: fridgeSearch.trim() } });
  };

  const handleStapleClick = (stapleName) => {
    playClickSound();
    navigate('/recipes', { state: { ingredients: stapleName } });
  };

  const handleRescueExpiring = () => {
    playClickSound();
    const names = expiringItems.map(i => i.ingredient_name).join(', ');
    navigate('/recipes', { state: { ingredients: names } });
  };

  return (
    <div className="card glass pantry-quick-cook-card fade-in-up" style={{ marginBottom: '24px' }}>
      {/* Top Header Row */}
      <div className="pantry-bar-top">
        <div className="pantry-bar-status">
          <div className="pantry-icon-glow">
            <Package size={20} />
          </div>
          <div>
            <div className="pantry-bar-title-row">
              <h3 className="pantry-bar-title">Smart Pantry & Fridge Radar</h3>
              <span className="pantry-count-chip">
                {pantryItems.length} {pantryItems.length === 1 ? 'item' : 'items'} in stock
              </span>
            </div>
            <p className="pantry-bar-desc">
              Track in-stock ingredients to unlock zero-waste meal matching and eliminate food waste.
            </p>
          </div>
        </div>

        <div className="pantry-bar-actions">
          <button
            className="btn-pantry-match"
            onClick={handleMatchPantry}
            disabled={matchingLoading}
            title="Find recipes you can cook with in-stock pantry items"
          >
            <Sparkles size={14} className={matchingLoading ? 'spin-anim' : ''} />
            <span>{matchingLoading ? 'Matching...' : 'What Can I Cook?'}</span>
          </button>

          <button
            className="btn-pantry-manage"
            onClick={() => navigate('/pantry')}
            title="Open Pantry Storage Manager"
          >
            <span>Full Pantry</span>
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      {/* Quick Inventory Stat Badges */}
      <div className="pantry-stat-badges-row">
        <div className="pantry-mini-stat">
          <span className="stat-num">{pantryItems.length}</span>
          <span className="stat-lbl">In Stock</span>
        </div>
        <div className="pantry-mini-stat fresh">
          <span className="stat-num">{freshItems.length}</span>
          <span className="stat-lbl">Fresh</span>
        </div>
        <div className={`pantry-mini-stat ${expiringItems.length > 0 ? 'alert' : ''}`}>
          <span className="stat-num">{expiringItems.length}</span>
          <span className="stat-lbl">Expiring &lt; 72h</span>
        </div>
      </div>

      {/* Expiry Rescue Alert Pill */}
      {expiringItems.length > 0 && (
        <div className="pantry-expiry-banner">
          <div className="expiry-banner-info">
            <AlertTriangle size={16} className="expiry-alert-icon" />
            <span>
              <strong>Zero-Waste Alert:</strong> {expiringItems.length} {expiringItems.length === 1 ? 'item is' : 'items are'} expiring soon ({expiringItems.slice(0, 3).map(i => i.ingredient_name).join(', ')}{expiringItems.length > 3 ? ` +${expiringItems.length - 3} more` : ''})
            </span>
          </div>
          <button 
            className="btn-rescue-ingredients"
            onClick={handleRescueExpiring}
            title="Find recipes that use expiring items immediately"
          >
            Rescue Ingredients 🍳
          </button>
        </div>
      )}

      {/* Search Bar + Quick Add Row */}
      <div className="fridge-search-integrated">
        <form onSubmit={handleFridgeSearchSubmit} className="fridge-search-form">
          <Search size={16} className="fridge-input-icon" />
          <input
            type="text"
            placeholder="Search recipes by fridge ingredients (e.g. eggs, spinach, garlic, tomatoes)..."
            value={fridgeSearch}
            onChange={(e) => setFridgeSearch(e.target.value)}
            className="fridge-search-input"
          />
          <button type="submit" className="fridge-search-submit-btn" disabled={!fridgeSearch.trim()}>
            Find Recipes
          </button>
        </form>

        {/* Quick Add Ingredient Mini Bar */}
        <form onSubmit={handleQuickAdd} className="pantry-quick-add-form">
          <span className="quick-add-title">➕ Quick Add to Stock:</span>
          <input
            type="text"
            placeholder="Ingredient name (e.g. Eggs, Milk, Tomatoes)"
            value={quickAddName}
            onChange={(e) => setQuickAddName(e.target.value)}
            className="quick-add-input"
          />
          <input
            type="number"
            min="0.25"
            step="0.25"
            value={quickAddQty}
            onChange={(e) => setQuickAddQty(e.target.value)}
            className="quick-add-qty"
          />
          <select
            value={quickAddUnit}
            onChange={(e) => setQuickAddUnit(e.target.value)}
            className="quick-add-unit"
          >
            <option value="pcs">pcs</option>
            <option value="g">g</option>
            <option value="kg">kg</option>
            <option value="ml">ml</option>
            <option value="l">L</option>
            <option value="cup">cup</option>
          </select>
          <button type="submit" className="btn-quick-add-submit" disabled={!quickAddName.trim() || isAdding}>
            Add Item
          </button>
        </form>

        {/* Quick Staple Tags */}
        <div className="fridge-staple-chips">
          <span className="staple-label">Quick Staples:</span>
          {POPULAR_STAPLES.map(staple => (
            <button
              key={staple.name}
              className="staple-chip-btn"
              onClick={() => handleStapleClick(staple.name)}
              title={`Find recipes with ${staple.name}`}
            >
              <span>{staple.emoji}</span>
              <span>{staple.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Matched Recipes Quick Drawer */}
      {showMatchedModal && matchedRecipes.length > 0 && (
        <div className="matched-recipes-drawer fade-in-up">
          <div className="matched-drawer-header">
            <h4 className="matched-drawer-title">✨ Recommended from Your Pantry ({matchedRecipes.length})</h4>
            <button className="matched-drawer-close" onClick={() => setShowMatchedModal(false)}>✕</button>
          </div>
          <div className="matched-recipes-grid">
            {matchedRecipes.map(item => {
              const r = item.recipe || item;
              const matchPct = Math.round(item.match_percentage || (item.match_score ? item.match_score * 100 : 85));
              return (
                <div 
                  key={r.id} 
                  className="matched-recipe-mini-card"
                  onClick={() => {
                    if (onSelectRecipe) onSelectRecipe(r);
                  }}
                >
                  <div className="matched-mini-header">
                    <span className="match-pct-badge">{matchPct}% in stock</span>
                    {r.ready_in_minutes && <span className="match-time">⏱️ {r.ready_in_minutes}m</span>}
                  </div>
                  <p className="matched-mini-title">{r.title}</p>
                  {r.nutrition?.calories && (
                    <span className="matched-mini-cal">🔥 {Math.round(r.nutrition.calories)} kcal</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
