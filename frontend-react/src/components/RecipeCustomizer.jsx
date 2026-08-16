import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import ChefScoreBadge from './ChefScoreBadge';
import { parseIngredient } from '../utils/ingredientParser';
import { useToast } from '../context/ToastContext';

const COMMON_UNITS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'kg', label: 'kg' },
  { value: 'cup', label: 'cup' },
  { value: 'tbsp', label: 'tbsp' },
  { value: 'tsp', label: 'tsp' },
  { value: 'ml', label: 'ml' },
  { value: 'l', label: 'l (liters)' },
  { value: 'oz', label: 'oz' },
  { value: 'lb', label: 'lb' },
  { value: 'pcs', label: 'pcs / whole' },
  { value: 'medium', label: 'medium' },
  { value: 'slice', label: 'slice' },
  { value: 'clove', label: 'clove' },
  { value: 'pinch', label: 'pinch' },
];

function getIngredientCategory(name) {
  const n = (name || '').toLowerCase();
  if (/chicken|mutton|lamb|fish|salmon|shrimp|prawn|egg|eggs|paneer|tofu|curd|yogurt|dahi|whey|protein|beef|pork|tuna|lentil|dal|chana|rajma|soy/i.test(n)) {
    return { label: 'Protein', emoji: '🍗', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)' };
  }
  if (/spinach|palak|tomato|tamatar|onion|pyaaz|potato|aloo|cauliflower|gobi|cabbage|carrot|peas|matar|capsicum|pepper|broccoli|garlic|ginger|coriander|cilantro|mint|pudina|chili|lemon|cucumber|lettuce|mushroom|zucchini/i.test(n)) {
    return { label: 'Veggie', emoji: '🥦', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' };
  }
  if (/rice|flour|atta|maida|bread|roti|naan|pasta|noodle|noodles|oats|quinoa|suji|semolina|poha|sabudana|tortilla|sugar|honey|jaggery/i.test(n)) {
    return { label: 'Carbs', emoji: '🌾', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.12)' };
  }
  if (/oil|ghee|butter|olive oil|mustard oil|coconut oil|cream|malai|cheese|almond|cashew|walnut|peanut|seeds|chia|sesame/i.test(n)) {
    return { label: 'Fats/Oils', emoji: '🥑', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)' };
  }
  if (/salt|pepper|turmeric|haldi|cumin|jeera|mustard seeds|rai|masala|hing|cardamom|cinnamon|clove|coriander powder|amchur/i.test(n)) {
    return { label: 'Seasoning', emoji: '🧂', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)' };
  }
  return { label: 'General', emoji: '🥗', color: '#6b7280', bg: 'rgba(107, 114, 128, 0.12)' };
}

const CANONICAL_UNITS = {
  'g': 'g', 'gram': 'g', 'grams': 'g',
  'kg': 'kg', 'kilogram': 'kg', 'kilograms': 'kg',
  'cup': 'cup', 'cups': 'cup', 'c': 'cup',
  'tbsp': 'tbsp', 'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbs': 'tbsp',
  'tsp': 'tsp', 'teaspoon': 'tsp', 'teaspoons': 'tsp',
  'ml': 'ml', 'milliliter': 'ml', 'milliliters': 'ml',
  'l': 'l', 'liter': 'l', 'liters': 'l',
  'oz': 'oz', 'ounce': 'oz', 'ounces': 'oz',
  'lb': 'lb', 'lbs': 'lb', 'pound': 'lb', 'pounds': 'lb',
  'pcs': 'pcs', 'pc': 'pcs', 'piece': 'pcs', 'pieces': 'pcs', 'whole': 'pcs', 'item': 'pcs',
  'medium': 'medium',
  'slice': 'slice', 'slices': 'slice',
  'clove': 'clove', 'cloves': 'clove',
  'pinch': 'pinch', 'pinches': 'pinch',
};

function normalizeUnit(unitStr) {
  if (!unitStr) return 'g';
  const clean = unitStr.toLowerCase().trim();
  return CANONICAL_UNITS[clean] || 'g';
}

function parseInitialIngredients(ingredientsList) {
  const list = Array.isArray(ingredientsList) ? ingredientsList : [];
  return list.map((ingStr, idx) => {
    const parsed = parseIngredient(ingStr);
    let name = parsed.name || (typeof ingStr === 'string' ? ingStr : '');
    let qty = parsed.qty;
    let unit = normalizeUnit(parsed.unit);

    if (!parsed.hasQuantity || qty === null || qty === undefined || isNaN(qty)) {
      // Smart culinary defaults based on ingredient category
      const cat = getIngredientCategory(name);
      if (cat.label === 'Protein') {
        qty = 150;
        unit = 'g';
      } else if (cat.label === 'Carbs') {
        qty = 1;
        unit = 'cup';
      } else if (cat.label === 'Fats/Oils') {
        qty = 1;
        unit = 'tbsp';
      } else if (cat.label === 'Seasoning') {
        qty = 1;
        unit = 'tsp';
      } else if (cat.label === 'Veggie') {
        if (/onion|tomato|potato|bell pepper|capsicum/i.test(name)) {
          qty = 1;
          unit = 'medium';
        } else if (/spinach|palak|peas|corn/i.test(name)) {
          qty = 100;
          unit = 'g';
        } else if (/garlic/i.test(name)) {
          qty = 2;
          unit = 'clove';
        } else {
          qty = 100;
          unit = 'g';
        }
      } else {
        qty = 100;
        unit = 'g';
      }
    }

    return {
      id: `ing-${idx}-${Date.now()}`,
      name: name.trim(),
      qty: Number(qty) || 1,
      unit: unit,
      raw: typeof ingStr === 'string' ? ingStr : '',
    };
  });
}

export default function RecipeCustomizer({
  recipe,
  initialIngredients = [],
  initialServings = 1,
  onUpdateCalculation,
  onSaveCustomVariation,
  onStartCookingCustom,
  onClose,
}) {
  const toast = useToast();

  const [items, setItems] = useState(() => parseInitialIngredients(initialIngredients));
  const [servings, setServings] = useState(initialServings || 1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [customTitle, setCustomTitle] = useState(`${recipe?.title || 'Custom Recipe'} (My Variation)`);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewTab, setViewTab] = useState('tweak'); // 'tweak' | 'comparison'

  // Ref tracking to avoid render loops
  const onUpdateCalculationRef = useRef(onUpdateCalculation);
  onUpdateCalculationRef.current = onUpdateCalculation;
  const lastPayloadSigRef = useRef('');

  // Suggestions state for auto-complete
  const [activeSuggestIdx, setActiveSuggestIdx] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Reset items ONLY when recipe identity changes
  const recipeKey = `${recipe?.id || ''}-${recipe?.title || ''}`;
  useEffect(() => {
    setItems(parseInitialIngredients(initialIngredients));
    setServings(initialServings || 1);
    setCustomTitle(`${recipe?.title || 'Custom Recipe'} (My Variation)`);
    lastPayloadSigRef.current = '';
  }, [recipeKey]);

  // Debounced live calculation trigger with payload signature memoization
  useEffect(() => {
    let isCancelled = false;

    const validItems = items.filter(it => it.name && it.name.trim().length > 0);
    if (validItems.length === 0) {
      setCalcResult(null);
      return;
    }

    const payload = {
      title: recipe?.title || 'Custom Recipe',
      servings: Number(servings) || 1,
      ingredients: validItems.map(it => ({
        name: it.name.trim(),
        qty: Number(it.qty) || 1,
        unit: it.unit || 'g',
        raw: `${it.qty} ${it.unit} ${it.name}`.trim(),
      })),
      meal_type: recipe?.meal_type || null,
    };

    const payloadSig = JSON.stringify(payload);
    if (payloadSig === lastPayloadSigRef.current) {
      return; // No change in payload, avoid spamming
    }

    const timer = setTimeout(async () => {
      lastPayloadSigRef.current = payloadSig;
      setIsCalculating(true);
      try {
        const res = await api.post('/nutrition/recipe/calculate', payload);
        if (!isCancelled) {
          setCalcResult(res);
          if (onUpdateCalculationRef.current) {
            onUpdateCalculationRef.current(res);
          }
        }
      } catch (err) {
        if (!isCancelled) {
          console.error('Error calculating custom recipe nutrition:', err);
        }
      } finally {
        if (!isCancelled) {
          setIsCalculating(false);
        }
      }
    }, 320);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [items, servings, recipe?.title, recipe?.meal_type]);

  // Autocomplete suggestions
  const handleNameChange = async (idx, text) => {
    const updated = [...items];
    updated[idx].name = text;
    setItems(updated);

    if (text.trim().length >= 2) {
      try {
        const sugg = await api.get(`/nutrition/suggest?q=${encodeURIComponent(text.trim())}`);
        setSuggestions(sugg || []);
        setActiveSuggestIdx(idx);
      } catch (e) {
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setActiveSuggestIdx(null);
    }
  };

  const handleSelectSuggestion = (idx, foodName) => {
    const updated = [...items];
    updated[idx].name = foodName;
    setItems(updated);
    setSuggestions([]);
    setActiveSuggestIdx(null);
  };

  // Quantity handlers
  const handleQtyChange = (idx, newQty) => {
    const val = Math.max(0.05, Number(newQty) || 0);
    const updated = [...items];
    updated[idx].qty = val;
    setItems(updated);
  };

  const handleStepQty = (idx, delta) => {
    const it = items[idx];
    const unit = (it.unit || '').toLowerCase();
    let step = 1;
    if (unit === 'g' || unit === 'ml') step = 25;
    else if (unit === 'kg' || unit === 'l') step = 0.25;
    else if (unit === 'cup' || unit === 'tbsp' || unit === 'tsp' || unit === 'oz') step = 0.25;
    else if (unit === 'pinch') step = 1;
    else step = 1;

    const nextVal = Math.max(0.1, Number((it.qty + delta * step).toFixed(2)));
    handleQtyChange(idx, nextVal);
  };

  const handleUnitChange = (idx, newUnit) => {
    const updated = [...items];
    updated[idx].unit = newUnit;
    setItems(updated);
  };

  const handleAddItem = (presetName = '', presetQty = 100, presetUnit = 'g') => {
    setItems(prev => [
      ...prev,
      {
        id: `ing-new-${Date.now()}`,
        name: presetName,
        qty: presetQty,
        unit: presetUnit,
        raw: '',
      },
    ]);
  };

  const handleRemoveItem = (idx) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleReset = () => {
    setItems(parsedDefaultItems);
    setServings(initialServings || 1);
    toast.info('Reset to standard recipe ingredients ↺');
  };

  // Quick Preset Multipliers
  const handleQuickDoubleProtein = () => {
    let touched = false;
    const updated = items.map(it => {
      const cat = getIngredientCategory(it.name);
      if (cat.label === 'Protein') {
        touched = true;
        return { ...it, qty: Number((it.qty * 2).toFixed(2)) };
      }
      return it;
    });

    if (touched) {
      setItems(updated);
      toast.success('Doubled protein quantities! 🍗');
    } else {
      handleAddItem('chicken breast', 250, 'g');
      toast.success('Added +250g Chicken Breast! 🍗');
    }
  };

  const handleQuickReduceSodium = () => {
    const updated = items.map(it => {
      const cat = getIngredientCategory(it.name);
      if (cat.label === 'Seasoning' && /salt|soy sauce/i.test(it.name)) {
        return { ...it, qty: Number((it.qty * 0.5).toFixed(2)) };
      }
      return it;
    });
    setItems(updated);
    toast.success('Cut salt/sodium by 50% 🧂');
  };

  const handleQuickAddVeggie = () => {
    handleAddItem('spinach', 100, 'g');
    toast.success('Added +100g Fresh Spinach for fiber & vitamins! 🥦');
  };

  const handleScaleBatch = (factor) => {
    const updated = items.map(it => ({
      ...it,
      qty: Number((it.qty * factor).toFixed(2))
    }));
    setItems(updated);
    toast.info(`Scaled batch by ${factor}x! ⚖️`);
  };

  // Save custom variation
  const handleSaveVariation = async () => {
    if (!calcResult) return;
    setSaving(true);
    try {
      const customIngredients = items
        .filter(it => it.name.trim())
        .map(it => `${it.qty} ${it.unit} ${it.name}`.trim());

      const payload = {
        title: customTitle.trim() || `${recipe?.title} (Custom)`,
        image_url: recipe?.image_url || null,
        summary: `Customized variation of ${recipe?.title || 'recipe'}. Nutri-Score: ${calcResult.nutri_score?.grade}.`,
        ingredients: customIngredients.join(', '),
        instructions: recipe?.instructions || '',
        calories: calcResult.per_serving_nutrition?.calories || null,
        protein_g: calcResult.per_serving_nutrition?.protein_g || null,
        carbs_g: calcResult.per_serving_nutrition?.carbs_g || null,
        fat_g: calcResult.per_serving_nutrition?.fat_g || null,
        ready_in_minutes: recipe?.ready_in_minutes || null,
        servings: servings || 1,
      };

      await api.post('/recipes/save', payload);
      toast.success(`"${payload.title}" saved to your recipes! 🔖`);
      setShowSaveModal(false);
      if (onSaveCustomVariation) {
        onSaveCustomVariation(payload);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save customized recipe.');
    } finally {
      setSaving(false);
    }
  };

  // Base values for comparison
  const baseCalories = recipe?.calories || recipe?.nutrition?.calories || 0;
  const baseProtein = recipe?.protein_g || recipe?.nutrition?.protein_g || 0;
  const baseCarbs = recipe?.carbs_g || recipe?.nutrition?.carbs_g || 0;
  const baseFat = recipe?.fat_g || recipe?.nutrition?.fat_g || 0;
  const baseScore = recipe?.nutri_score || recipe?.chef_score;
  const baseGrade = typeof baseScore === 'string' ? baseScore : (baseScore?.grade || 'C');

  const currentCals = calcResult?.per_serving_nutrition?.calories || baseCalories;
  const currentProtein = calcResult?.per_serving_nutrition?.protein_g || baseProtein;
  const currentCarbs = calcResult?.per_serving_nutrition?.carbs_g || baseCarbs;
  const currentFat = calcResult?.per_serving_nutrition?.fat_g || baseFat;

  const calDelta = currentCals - baseCalories;
  const protDelta = currentProtein - baseProtein;
  const carbDelta = currentCarbs - baseCarbs;
  const fatDelta = currentFat - baseFat;

  const activeScore = calcResult?.nutri_score || baseScore;
  const activeGrade = activeScore?.grade || baseGrade;

  return (
    <div className="recipe-customizer-container">
      {/* Studio Header & Mode Tabs */}
      <div className="customizer-header-banner">
        <div className="customizer-header-title">
          <span className="customizer-icon">🎛️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              Interactive Recipe Studio
              <span className="studio-live-pill">● Live Engine</span>
            </h3>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tweak ingredient quantities or test substitutions to see live Nutri-Score &amp; macro shifts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="studio-view-toggle">
            <button
              type="button"
              className={`studio-toggle-btn ${viewTab === 'tweak' ? 'active' : ''}`}
              onClick={() => setViewTab('tweak')}
            >
              ✏️ Tweak List
            </button>
            <button
              type="button"
              className={`studio-toggle-btn ${viewTab === 'comparison' ? 'active' : ''}`}
              onClick={() => setViewTab('comparison')}
            >
              ⚖️ Before vs. After
            </button>
          </div>
          <button
            type="button"
            className="btn-customizer-reset"
            onClick={handleReset}
            title="Reset to default recipe ingredients"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Quick Tweak Preset Modifiers Bar */}
      <div className="quick-modifier-bar">
        <span className="modifier-label">⚡ 1-Tap Tweaks:</span>
        <button type="button" className="quick-mod-btn" onClick={handleQuickDoubleProtein} title="Double all protein portions">
          💪 2x Protein
        </button>
        <button type="button" className="quick-mod-btn" onClick={handleQuickReduceSodium} title="Reduce salt/sodium by 50%">
          🧂 -50% Sodium
        </button>
        <button type="button" className="quick-mod-btn" onClick={handleQuickAddVeggie} title="Add 100g spinach for fiber">
          🥦 +Veggie Boost
        </button>
        <button type="button" className="quick-mod-btn" onClick={() => handleScaleBatch(2)} title="Double whole recipe batch">
          2x Batch
        </button>
        <button type="button" className="quick-mod-btn" onClick={() => handleScaleBatch(0.5)} title="Halve whole recipe batch">
          0.5x Batch
        </button>
      </div>

      {/* Live HUD Summary Card */}
      <div className="customizer-hud-card">
        <div className="hud-metric-column">
          <div className="hud-metric-label">Simulated Nutri-Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <ChefScoreBadge
              grade={activeGrade}
              size="md"
              placement="bottom-start"
              nextTier={activeScore?.next_tier}
              pointsToNextTier={activeScore?.points_to_next_tier}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                Tier {activeGrade}
                {baseGrade !== activeGrade && (
                  <span style={{ fontSize: '0.75rem', marginLeft: '6px', color: '#10b981', fontWeight: 700 }}>
                    (was {baseGrade})
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {activeScore?.numeric_score !== undefined ? `Score: ${activeScore.numeric_score}` : 'Simulated'}
                {activeScore?.positive_total !== undefined && ` (${activeScore.positive_total} Pos / ${activeScore.negative_total} Neg)`}
              </div>
            </div>
          </div>
        </div>

        <div className="hud-metric-divider" />

        {/* Calories & Macros HUD Grid */}
        <div className="hud-macros-grid">
          <div className="hud-macro-pill">
            <span className="macro-name">Calories</span>
            <span className="macro-val">{currentCals} <small>kcal</small></span>
            {calDelta !== 0 && (
              <span className={`macro-delta ${calDelta > 0 ? 'delta-up' : 'delta-down'}`}>
                {calDelta > 0 ? `+${calDelta.toFixed(0)}` : calDelta.toFixed(0)}
              </span>
            )}
          </div>

          <div className="hud-macro-pill pill-protein">
            <span className="macro-name">Protein</span>
            <span className="macro-val">{currentProtein}g</span>
            {protDelta !== 0 && (
              <span className={`macro-delta ${protDelta > 0 ? 'delta-good' : 'delta-down'}`}>
                {protDelta > 0 ? `+${protDelta.toFixed(1)}g` : `${protDelta.toFixed(1)}g`}
              </span>
            )}
          </div>

          <div className="hud-macro-pill pill-carbs">
            <span className="macro-name">Carbs</span>
            <span className="macro-val">{currentCarbs}g</span>
            {carbDelta !== 0 && (
              <span className={`macro-delta ${carbDelta > 0 ? 'delta-up' : 'delta-down'}`}>
                {carbDelta > 0 ? `+${carbDelta.toFixed(1)}g` : `${carbDelta.toFixed(1)}g`}
              </span>
            )}
          </div>

          <div className="hud-macro-pill pill-fat">
            <span className="macro-name">Fat</span>
            <span className="macro-val">{currentFat}g</span>
            {fatDelta !== 0 && (
              <span className={`macro-delta ${fatDelta > 0 ? 'delta-up' : 'delta-down'}`}>
                {fatDelta > 0 ? `+${fatDelta.toFixed(1)}g` : `${fatDelta.toFixed(1)}g`}
              </span>
            )}
          </div>
        </div>

        {/* Servings Stepper */}
        <div className="hud-servings-box">
          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Servings
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
            <button
              type="button"
              className="hud-step-btn"
              onClick={() => setServings(prev => Math.max(1, prev - 1))}
              disabled={servings <= 1}
            >-</button>
            <span style={{ fontWeight: 800, fontSize: '1rem', minWidth: '24px', textAlign: 'center' }}>
              {servings}
            </span>
            <button
              type="button"
              className="hud-step-btn"
              onClick={() => setServings(prev => prev + 1)}
            >+</button>
          </div>
        </div>
      </div>

      {/* Macro Ratio Meter */}
      {calcResult?.macro_percentages && (
        <div className="customizer-macro-bar-container">
          <div className="macro-ratio-bar">
            <div
              style={{ width: `${calcResult.macro_percentages.proteinPct}%`, background: '#10b981' }}
              title={`Protein: ${calcResult.macro_percentages.proteinPct}%`}
            />
            <div
              style={{ width: `${calcResult.macro_percentages.carbsPct}%`, background: '#3b82f6' }}
              title={`Carbs: ${calcResult.macro_percentages.carbsPct}%`}
            />
            <div
              style={{ width: `${calcResult.macro_percentages.fatPct}%`, background: '#f59e0b' }}
              title={`Fat: ${calcResult.macro_percentages.fatPct}%`}
            />
          </div>
          <div className="macro-ratio-labels">
            <span style={{ color: '#10b981' }}>🍗 Protein: {calcResult.macro_percentages.proteinPct}%</span>
            <span style={{ color: '#3b82f6' }}>🌾 Carbs: {calcResult.macro_percentages.carbsPct}%</span>
            <span style={{ color: '#f59e0b' }}>🥑 Fat: {calcResult.macro_percentages.fatPct}%</span>
          </div>
        </div>
      )}

      {/* VIEW TAB 1: TWEAK LIST */}
      {viewTab === 'tweak' && (
        <div className="customizer-list-section">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>📝</span> Recipe Ingredients ({items.length})
            </h4>
            {isCalculating && (
              <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="spinner-mini" /> Recalculating Nutri-Score...
              </span>
            )}
          </div>

          <div className="customizer-items-stack">
            {items.map((it, idx) => {
              const contrib = calcResult?.ingredient_contributions?.[idx];
              const cat = getIngredientCategory(it.name);

              return (
                <div key={it.id || idx} className="customizer-item-row">
                  {/* Category Pill */}
                  <span
                    className="customizer-cat-tag"
                    style={{ background: cat.bg, color: cat.color }}
                    title={`Category: ${cat.label}`}
                  >
                    {cat.emoji} {cat.label}
                  </span>

                  {/* Stepper + Quantity */}
                  <div className="customizer-qty-group">
                    <button
                      type="button"
                      className="customizer-stepper-btn"
                      onClick={() => handleStepQty(idx, -1)}
                      title="Decrease Quantity"
                    >-</button>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      className="customizer-qty-input"
                      value={it.qty}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                    />
                    <button
                      type="button"
                      className="customizer-stepper-btn"
                      onClick={() => handleStepQty(idx, 1)}
                      title="Increase Quantity"
                    >+</button>
                  </div>

                  {/* Unit Selector */}
                  <select
                    className="customizer-unit-select"
                    value={it.unit}
                    onChange={(e) => handleUnitChange(idx, e.target.value)}
                  >
                    {COMMON_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>

                  {/* Name Input & Autocomplete */}
                  <div className="customizer-name-wrapper">
                    <input
                      type="text"
                      className="customizer-name-input"
                      placeholder="e.g. Chicken breast, Curd, Spinach..."
                      value={it.name}
                      onChange={(e) => handleNameChange(idx, e.target.value)}
                      onFocus={() => {
                        if (it.name.trim().length >= 2 && suggestions.length > 0) {
                          setActiveSuggestIdx(idx);
                        }
                      }}
                    />

                    {/* Autocomplete Dropdown */}
                    {activeSuggestIdx === idx && suggestions.length > 0 && (
                      <div className="customizer-suggest-dropdown">
                        {suggestions.map((sugg, sIdx) => (
                          <div
                            key={sIdx}
                            className="customizer-suggest-option"
                            onClick={() => handleSelectSuggestion(idx, sugg)}
                          >
                            🔍 {sugg}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mini Contribution Chip */}
                    {contrib && contrib.found && (
                      <div className="customizer-item-chip">
                        <span>🔥 {contrib.calories} kcal</span>
                        <span>🍗 {contrib.protein_g}g P</span>
                        {contrib.carbs_g > 0 && <span>🌾 {contrib.carbs_g}g C</span>}
                        {contrib.fat_g > 0 && <span>🥑 {contrib.fat_g}g F</span>}
                        {contrib.sodium_mg > 0 && <span>🧂 {contrib.sodium_mg}mg Na</span>}
                        {contrib.fiber_g > 0 && <span>🌱 {contrib.fiber_g}g Fib</span>}
                      </div>
                    )}
                  </div>

                  {/* Remove Button */}
                  <button
                    type="button"
                    className="customizer-delete-btn"
                    onClick={() => handleRemoveItem(idx)}
                    title="Remove this ingredient"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Add Ingredient Button */}
          <button
            type="button"
            className="btn-customizer-add"
            onClick={() => handleAddItem()}
          >
            ➕ Add Custom Ingredient
          </button>
        </div>
      )}

      {/* VIEW TAB 2: BEFORE VS AFTER COMPARISON */}
      {viewTab === 'comparison' && (
        <div className="customizer-comparison-section">
          <div className="comparison-grid">
            {/* Standard Recipe Column */}
            <div className="comparison-card card-standard">
              <div className="comparison-card-header">
                <span>📋 Standard Recipe</span>
                <ChefScoreBadge grade={baseGrade} size="sm" showTooltip={false} />
              </div>
              <div className="comparison-macro-row">
                <span>Calories:</span>
                <strong>{baseCalories} kcal</strong>
              </div>
              <div className="comparison-macro-row">
                <span>Protein:</span>
                <strong>{baseProtein}g</strong>
              </div>
              <div className="comparison-macro-row">
                <span>Carbs:</span>
                <strong>{baseCarbs}g</strong>
              </div>
              <div className="comparison-macro-row">
                <span>Fat:</span>
                <strong>{baseFat}g</strong>
              </div>
              <div className="comparison-macro-row">
                <span>Servings:</span>
                <strong>{initialServings || 1}</strong>
              </div>
            </div>

            {/* Custom Variation Column */}
            <div className="comparison-card card-custom">
              <div className="comparison-card-header">
                <span>✨ Customized Version</span>
                <ChefScoreBadge grade={activeGrade} size="sm" showTooltip={false} />
              </div>
              <div className="comparison-macro-row">
                <span>Calories:</span>
                <strong>
                  {currentCals} kcal{' '}
                  <span className={`comp-delta ${calDelta >= 0 ? 'delta-up' : 'delta-down'}`}>
                    ({calDelta >= 0 ? `+${calDelta.toFixed(0)}` : calDelta.toFixed(0)})
                  </span>
                </strong>
              </div>
              <div className="comparison-macro-row">
                <span>Protein:</span>
                <strong>
                  {currentProtein}g{' '}
                  <span className={`comp-delta ${protDelta >= 0 ? 'delta-good' : 'delta-down'}`}>
                    ({protDelta >= 0 ? `+${protDelta.toFixed(1)}` : protDelta.toFixed(1)})
                  </span>
                </strong>
              </div>
              <div className="comparison-macro-row">
                <span>Carbs:</span>
                <strong>
                  {currentCarbs}g{' '}
                  <span className="comp-delta delta-muted">
                    ({carbDelta >= 0 ? `+${carbDelta.toFixed(1)}` : carbDelta.toFixed(1)})
                  </span>
                </strong>
              </div>
              <div className="comparison-macro-row">
                <span>Fat:</span>
                <strong>
                  {currentFat}g{' '}
                  <span className="comp-delta delta-muted">
                    ({fatDelta >= 0 ? `+${fatDelta.toFixed(1)}` : fatDelta.toFixed(1)})
                  </span>
                </strong>
              </div>
              <div className="comparison-macro-row">
                <span>Servings:</span>
                <strong>{servings}</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Action Bar */}
      <div className="customizer-bottom-bar">
        <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>💡</span>
          <span>Ready to cook or save your custom variation?</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onStartCookingCustom && (
            <button
              type="button"
              className="btn-customizer-cook"
              onClick={onStartCookingCustom}
            >
              🍳 Cook This Version
            </button>
          )}
          <button
            type="button"
            className="btn-customizer-save-primary"
            onClick={() => setShowSaveModal(true)}
            disabled={!calcResult || isCalculating}
          >
            💾 Save as My Variation
          </button>
        </div>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="customizer-save-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="customizer-save-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              💾 Save Custom Variation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Save your tailored ingredients, recalculated macros, and Nutri-Score as a personal variation in your bookmarks.
            </p>

            <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Variation Name:
            </label>
            <input
              type="text"
              className="customizer-save-input"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="e.g. Authentic Litti Chokha (High-Protein)"
            />

            <div style={{ display: 'flex', gap: '10px', marginTop: '18px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn-customizer-cancel"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-customizer-confirm-save"
                onClick={handleSaveVariation}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Confirm & Save 🔖'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
