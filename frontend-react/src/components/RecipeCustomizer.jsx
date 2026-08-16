import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import ChefScoreBadge from './ChefScoreBadge';
import { parseIngredient, formatQuantityValue } from '../utils/ingredientParser';
import { useToast } from '../context/ToastContext';

const COMMON_UNITS = [
  { value: 'g', label: 'g (grams)' },
  { value: 'kg', label: 'kg' },
  { value: 'cup', label: 'cup / cups' },
  { value: 'tbsp', label: 'tbsp (tablespoon)' },
  { value: 'tsp', label: 'tsp (teaspoon)' },
  { value: 'ml', label: 'ml (milliliters)' },
  { value: 'l', label: 'l (liters)' },
  { value: 'oz', label: 'oz (ounces)' },
  { value: 'lb', label: 'lb (pounds)' },
  { value: 'pcs', label: 'pcs / whole' },
  { value: 'medium', label: 'medium' },
  { value: 'slice', label: 'slice / slices' },
  { value: 'clove', label: 'clove / cloves' },
  { value: 'pinch', label: 'pinch' },
];

export default function RecipeCustomizer({
  recipe,
  initialIngredients = [],
  initialServings = 1,
  onUpdateCalculation,
  onSaveCustomVariation,
  onClose,
}) {
  const toast = useToast();

  // Parse initial ingredients into structured editable items
  const parsedDefaultItems = useMemo(() => {
    const list = Array.isArray(initialIngredients) ? initialIngredients : [];
    return list.map((ingStr, idx) => {
      const parsed = parseIngredient(ingStr);
      let qty = parsed.qty || 1.0;
      let unit = parsed.unit || 'g';
      let name = parsed.name || (typeof ingStr === 'string' ? ingStr : '');

      if (!parsed.hasQuantity) {
        qty = 100;
        unit = 'g';
        name = typeof ingStr === 'string' ? ingStr : '';
      }

      return {
        id: `ing-${idx}-${Date.now()}`,
        name: name.trim(),
        qty: Number(qty) || 1,
        unit: unit || 'g',
        raw: typeof ingStr === 'string' ? ingStr : '',
      };
    });
  }, [initialIngredients]);

  const [items, setItems] = useState(parsedDefaultItems);
  const [servings, setServings] = useState(initialServings || 1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState(null);
  const [customTitle, setCustomTitle] = useState(`${recipe?.title || 'Custom Recipe'} (My Variation)`);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Suggestions state for auto-complete
  const [activeSuggestIdx, setActiveSuggestIdx] = useState(null);
  const [suggestions, setSuggestions] = useState([]);

  // Reset items when recipe changes
  useEffect(() => {
    setItems(parsedDefaultItems);
    setServings(initialServings || 1);
    setCustomTitle(`${recipe?.title || 'Custom Recipe'} (My Variation)`);
  }, [parsedDefaultItems, initialServings, recipe?.title]);

  // Debounced live calculation trigger
  useEffect(() => {
    const timer = setTimeout(async () => {
      const validItems = items.filter(it => it.name.trim().length > 0);
      if (validItems.length === 0) {
        setCalcResult(null);
        return;
      }

      setIsCalculating(true);
      try {
        const payload = {
          title: recipe?.title || 'Custom Recipe',
          servings: Number(servings) || 1,
          ingredients: validItems.map(it => ({
            name: it.name,
            qty: Number(it.qty) || 1,
            unit: it.unit,
            raw: `${it.qty} ${it.unit} ${it.name}`.trim(),
          })),
          meal_type: recipe?.meal_type || null,
        };

        const res = await api.post('/nutrition/recipe/calculate', payload);
        setCalcResult(res);
        if (onUpdateCalculation) {
          onUpdateCalculation(res);
        }
      } catch (err) {
        console.error('Error calculating custom recipe nutrition:', err);
      } finally {
        setIsCalculating(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [items, servings, recipe?.title, recipe?.meal_type, onUpdateCalculation]);

  // Fetch suggestions when typing ingredient name
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

  // Quantity helpers
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

  const handleAddItem = () => {
    setItems(prev => [
      ...prev,
      {
        id: `ing-new-${Date.now()}`,
        name: '',
        qty: 100,
        unit: 'g',
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

  // Helper macro delta
  const baseCalories = recipe?.calories || recipe?.nutrition?.calories || 0;
  const baseProtein = recipe?.protein_g || recipe?.nutrition?.protein_g || 0;
  const baseCarbs = recipe?.carbs_g || recipe?.nutrition?.carbs_g || 0;
  const baseFat = recipe?.fat_g || recipe?.nutrition?.fat_g || 0;

  const currentCals = calcResult?.per_serving_nutrition?.calories || baseCalories;
  const currentProtein = calcResult?.per_serving_nutrition?.protein_g || baseProtein;
  const currentCarbs = calcResult?.per_serving_nutrition?.carbs_g || baseCarbs;
  const currentFat = calcResult?.per_serving_nutrition?.fat_g || baseFat;

  const calDelta = currentCals - baseCalories;
  const protDelta = currentProtein - baseProtein;
  const carbDelta = currentCarbs - baseCarbs;
  const fatDelta = currentFat - baseFat;

  const activeScore = calcResult?.nutri_score || recipe?.nutri_score || recipe?.chef_score;
  const activeGrade = activeScore?.grade || 'C';

  return (
    <div className="recipe-customizer-container">
      {/* Top Header Banner */}
      <div className="customizer-header-banner">
        <div className="customizer-header-title">
          <span className="customizer-icon">🎛️</span>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-primary)' }}>
              Interactive Recipe Studio
            </h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Tweak ingredient quantities or add/remove items to dynamically recalculate nutrition &amp; Nutri-Score.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn-customizer-reset"
            onClick={handleReset}
            title="Reset to default recipe ingredients"
          >
            ↺ Reset
          </button>
          <button
            type="button"
            className="btn-customizer-save"
            onClick={() => setShowSaveModal(true)}
            disabled={!calcResult || isCalculating}
            title="Save your customized recipe variation"
          >
            💾 Save Variation
          </button>
        </div>
      </div>

      {/* Live Real-time Comparison HUD */}
      <div className="customizer-hud-card">
        <div className="hud-metric-column">
          <div className="hud-metric-label">Live Nutri-Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <ChefScoreBadge
              grade={activeGrade}
              size="md"
              placement="bottom-start"
              nextTier={activeScore?.next_tier}
              pointsToNextTier={activeScore?.points_to_next_tier}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>
                Tier {activeGrade}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {activeScore?.numeric_score !== undefined ? `Score: ${activeScore.numeric_score}` : 'Simulated'}
                {activeScore?.positive_total !== undefined && ` (${activeScore.positive_total} Pos / ${activeScore.negative_total} Neg)`}
              </div>
            </div>
          </div>
        </div>

        <div className="hud-metric-divider" />

        {/* Calories & Macros HUD */}
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

        {/* Servings Adjuster */}
        <div className="hud-servings-box">
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
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

      {/* Ingredient Tweaker List */}
      <div className="customizer-list-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <h4 style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
            Ingredients &amp; Quantities ({items.length})
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
            return (
              <div key={it.id || idx} className="customizer-item-row">
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
                      {contrib.sodium_mg > 0 && <span>🧂 {contrib.sodium_mg}mg Na</span>}
                      {contrib.fiber_g > 0 && <span>🌾 {contrib.fiber_g}g Fib</span>}
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
          onClick={handleAddItem}
        >
          ➕ Add Custom Ingredient
        </button>
      </div>

      {/* Save Modal */}
      {showSaveModal && (
        <div className="customizer-save-overlay" onClick={() => setShowSaveModal(false)}>
          <div className="customizer-save-modal" onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>
              💾 Save Custom Variation
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
              Save your tweaked ingredients and recalculated nutrition as a personal variation in your bookmarks.
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
