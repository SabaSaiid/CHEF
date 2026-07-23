import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';

const QUICK_CHIPS = [
  { label: '🍗 Chicken Breast', food: 'chicken breast', qty: 100, unit: 'g' },
  { label: '🥚 Whole Egg', food: 'egg', qty: 1, unit: 'serving' },
  { label: '🍚 Rice (Cooked)', food: 'rice', qty: 150, unit: 'g' },
  { label: '🥣 Oats', food: 'oats', qty: 50, unit: 'g' },
  { label: '🧀 Paneer', food: 'paneer', qty: 100, unit: 'g' },
  { label: '🍎 Apple', food: 'apple', qty: 1, unit: 'serving' },
  { label: '🥛 Whole Milk', food: 'milk', qty: 250, unit: 'ml' },
  { label: '🥜 Peanut Butter', food: 'peanut butter', qty: 32, unit: 'g' },
  { label: '💧 Water', food: 'water', qty: 250, unit: 'ml' },
  { label: '🐟 Salmon', food: 'salmon', qty: 150, unit: 'g' },
  { label: '🥑 Avocado', food: 'avocado', qty: 1, unit: 'serving' },
  { label: '🍠 Sweet Potato', food: 'sweet potato', qty: 150, unit: 'g' },
];

const UNITS = [
  { value: 'g', label: 'grams (g)' },
  { value: 'serving', label: 'serving' },
  { value: 'kg', label: 'kilograms (kg)' },
  { value: 'oz', label: 'ounces (oz)' },
  { value: 'cup', label: 'cups' },
  { value: 'tbsp', label: 'tablespoons' },
  { value: 'ml', label: 'milliliters (ml)' },
];

export default function Nutrition() {
  const [activeTab, setActiveTab] = useState('lookup'); // 'lookup' | 'compare'
  const [food, setFood] = useState('');
  const [qty, setQty] = useState(100);
  const [unit, setUnit] = useState('g');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  // Comparison State
  const [compFood1, setCompFood1] = useState('chicken breast');
  const [compFood2, setCompFood2] = useState('tofu');
  const [compRes1, setCompRes1] = useState(null);
  const [compRes2, setCompRes2] = useState(null);
  const [compLoading, setCompLoading] = useState(false);

  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Live auto-complete suggestions
  useEffect(() => {
    if (!food.trim() || food.length < 2) {
      setSearchSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const list = await api.get(`/nutrition/suggest?q=${encodeURIComponent(food)}`);
        setSearchSuggestions(list || []);
        setShowDropdown(list && list.length > 0);
      } catch {
        setSearchSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [food]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAnalyze = async (foodItem = food, q = qty, u = unit) => {
    const targetFood = foodItem || food;
    if (!targetFood.trim()) {
      setError('Enter a food item to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    setShowDropdown(false);

    try {
      const data = await api.post('/nutrition/analyze', {
        food_item: targetFood,
        quantity: parseFloat(q) || 1,
        unit: u || 'g',
      });
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch nutrition data');
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!compFood1.trim() || !compFood2.trim()) return;
    setCompLoading(true);
    try {
      const [res1, res2] = await Promise.all([
        api.post('/nutrition/analyze', { food_item: compFood1, quantity: 100, unit: 'g' }),
        api.post('/nutrition/analyze', { food_item: compFood2, quantity: 100, unit: 'g' }),
      ]);
      setCompRes1(res1);
      setCompRes2(res2);
    } catch (err) {
      console.error('Comparison error:', err);
    } finally {
      setCompLoading(false);
    }
  };

  const handleSelectChip = (chip) => {
    setFood(chip.food);
    setQty(chip.qty);
    setUnit(chip.unit);
    handleAnalyze(chip.food, chip.qty, chip.unit);
  };

  const handleSelectSuggestion = (sug) => {
    setFood(sug);
    setShowDropdown(false);
    handleAnalyze(sug, qty, unit);
  };

  // Live Slider recalculation
  const handleSliderChange = (newQty) => {
    setQty(newQty);
    if (results && results.found) {
      handleAnalyze(food, newQty, unit);
    }
  };

  // Macro calorie percentages for macro bar
  const pCal = (results?.protein_g || 0) * 4;
  const cCal = (results?.carbs_g || 0) * 4;
  const fCal = (results?.fat_g || 0) * 9;
  const totalMacroCal = pCal + cCal + fCal || 1;
  const pPct = Math.round((pCal / totalMacroCal) * 100);
  const cPct = Math.round((cCal / totalMacroCal) * 100);
  const fPct = Math.round((fCal / totalMacroCal) * 100);

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Nutrition Intelligence & Lookup</h1>
        <p className="subtitle">Clinical USDA & ICMR-NIN verified macronutrient, micronutrient & health insights</p>
      </div>

      {/* Tab Selector */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
        <button
          className={`nutrition-tab-btn ${activeTab === 'lookup' ? 'active' : ''}`}
          onClick={() => setActiveTab('lookup')}
        >
          🔍 Single Food Analysis
        </button>
        <button
          className={`nutrition-tab-btn ${activeTab === 'compare' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('compare');
            if (!compRes1) handleCompare();
          }}
        >
          ⚔️ Side-by-Side Comparison
        </button>
      </div>

      {activeTab === 'lookup' && (
        <>
          {/* Quick Search Chips */}
          <div className="quick-chips-container mb-4" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {QUICK_CHIPS.map((chip, idx) => (
              <button
                key={idx}
                type="button"
                className="chip-btn"
                onClick={() => handleSelectChip(chip)}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Search & Quantity Card */}
          <div className="card glass relative" style={{ position: 'relative', zIndex: 10 }}>
            <div className="input-row" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }} ref={dropdownRef}>
              <div style={{ flex: 2, position: 'relative', minWidth: '200px' }}>
                <input
                  type="text"
                  placeholder="e.g. chicken breast, oats, avocado..."
                  value={food}
                  onChange={(e) => setFood(e.target.value)}
                  onFocus={() => searchSuggestions.length > 0 && setShowDropdown(true)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  style={{ width: '100%' }}
                />
                {showDropdown && (
                  <div
                    className="suggestions-dropdown"
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '6px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      zIndex: 100,
                    }}
                  >
                    {searchSuggestions.map((sug, i) => (
                      <div
                        key={i}
                        className="suggestion-item"
                        onClick={() => handleSelectSuggestion(sug)}
                      >
                        🔍 {sug}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <input
                type="number"
                placeholder="Qty"
                value={qty}
                min="0.1"
                step="any"
                className="qty-input"
                style={{ width: '90px' }}
                onChange={(e) => setQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
              />

              <select
                value={unit}
                className="nutrition-select"
                onChange={(e) => setUnit(e.target.value)}
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>

              <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={() => handleAnalyze()} disabled={loading}>
                <span className="btn-icon">📊</span> Analyze
              </button>
            </div>
          </div>

          {/* Results Area */}
          <div className="results-area mt-4">
            {error && <div style={{ color: '#ff6b6b', padding: '12px', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}

            {results && (
              <div className="nutrition-card card glass">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <div className="nutrition-header" style={{ fontSize: '1.8rem', fontWeight: 700, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                      {results.food_item}
                    </div>
                    <div className="nutrition-source" style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>
                      Portion: <strong style={{ color: 'var(--accent-1)' }}>{results.quantity} {results.unit}</strong> ({results.serving_weight_g || 100}g total) · Source: {results.source}
                    </div>
                  </div>

                  {results.found && (
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {results.health_score && (
                        <div
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            color: '#10b981',
                            borderRadius: '12px',
                            padding: '6px 14px',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                          }}
                        >
                          🌟 {results.health_score}/100 Health Score
                        </div>
                      )}
                      {results.glycemic_index !== null && results.glycemic_index !== undefined && (
                        <div
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.3)',
                            color: '#f59e0b',
                            borderRadius: '12px',
                            padding: '6px 14px',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                          }}
                        >
                          🩸 GI: {results.glycemic_index} ({results.glycemic_index <= 55 ? 'Low' : results.glycemic_index <= 69 ? 'Medium' : 'High'})
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {!results.found ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '16px' }}>
                    <p style={{ color: '#ef4444', fontWeight: 600, margin: 0 }}>Item not found in nutrition database.</p>
                    {results.suggestions && results.suggestions.length > 0 && (
                      <div style={{ marginTop: '12px' }}>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '6px' }}>Did you mean one of these?</p>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {results.suggestions.map((sug, idx) => (
                            <button
                              key={idx}
                              onClick={() => handleSelectSuggestion(sug)}
                              className="chip-btn"
                            >
                              {sug}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Tags */}
                    {results.tags && results.tags.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                        {results.tags.map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            style={{
                              background: 'rgba(255, 90, 54, 0.1)',
                              color: 'var(--accent-1)',
                              borderRadius: '16px',
                              padding: '3px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              border: '1px solid rgba(255, 90, 54, 0.25)',
                            }}
                          >
                            🏷️ {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Interactive Quantity Slider */}
                    <div style={{ background: 'var(--bg-card)', borderRadius: '14px', padding: '16px', marginBottom: '20px', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 600 }}>
                        <span>Interactive Quantity Scaling Slider</span>
                        <strong style={{ color: 'var(--accent-1)' }}>{qty} {unit}</strong>
                      </div>
                      <input
                        type="range"
                        min={unit === 'g' || unit === 'ml' ? 10 : 0.5}
                        max={unit === 'g' || unit === 'ml' ? 500 : 10}
                        step={unit === 'g' || unit === 'ml' ? 5 : 0.5}
                        value={qty}
                        onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
                        style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--accent-1)' }}
                      />
                    </div>

                    {/* Macro Split Bar */}
                    <div style={{ marginBottom: '24px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                        <span>Macro Calorie Split</span>
                        <span>Protein {pPct}% ({pCal} kcal) · Carbs {cPct}% ({cCal} kcal) · Fat {fPct}% ({fCal} kcal)</span>
                      </div>
                      <div style={{ height: '10px', borderRadius: '5px', background: 'rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: `${pPct}%`, background: '#6366f1' }} title={`Protein ${pPct}%`} />
                        <div style={{ width: `${cPct}%`, background: '#10b981' }} title={`Carbs ${cPct}%`} />
                        <div style={{ width: `${fPct}%`, background: '#f59e0b' }} title={`Fat ${fPct}%`} />
                      </div>
                    </div>

                    {/* Primary Macronutrient Grid */}
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>🔥 Macronutrient Breakdown</h3>
                    <div className="nutrition-grid" style={{ marginBottom: '24px' }}>
                      <div className="nutrient-box">
                        <div className="nutrient-value calories" style={{ color: '#ff7675', fontSize: '1.8rem', fontWeight: 700 }}>
                          {results.calories}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}> kcal</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Calories</div>
                      </div>
                      <div className="nutrient-box">
                        <div className="nutrient-value" style={{ color: '#6366f1', fontSize: '1.6rem', fontWeight: 700 }}>
                          {results.protein_g}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}>g</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Protein</div>
                      </div>
                      <div className="nutrient-box">
                        <div className="nutrient-value" style={{ color: '#10b981', fontSize: '1.6rem', fontWeight: 700 }}>
                          {results.carbs_g}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}>g</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Carbs</div>
                      </div>
                      <div className="nutrient-box">
                        <div className="nutrient-value" style={{ color: '#f59e0b', fontSize: '1.6rem', fontWeight: 700 }}>
                          {results.fat_g}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}>g</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Fat</div>
                      </div>
                      <div className="nutrient-box">
                        <div className="nutrient-value" style={{ color: '#3b82f6', fontSize: '1.6rem', fontWeight: 700 }}>
                          {results.fiber_g || 0}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}>g</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Dietary Fiber</div>
                      </div>
                      <div className="nutrient-box">
                        <div className="nutrient-value" style={{ color: '#ec4899', fontSize: '1.6rem', fontWeight: 700 }}>
                          {results.sugar_g || 0}
                          <span className="nutrient-unit" style={{ fontSize: '0.9rem' }}>g</span>
                        </div>
                        <div className="nutrient-label" style={{ color: 'var(--text-secondary)' }}>Sugar</div>
                      </div>
                    </div>

                    {/* Micronutrients & Electrolytes Card */}
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 700 }}>⚡ Micronutrients & Electrolytes</h3>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                        gap: '12px',
                        background: 'var(--bg-card)',
                        borderRadius: '14px',
                        padding: '16px',
                        border: '1px solid var(--border-glass)',
                      }}
                    >
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Sodium (Na)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.sodium_mg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg</span></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Potassium (K)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.potassium_mg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg</span></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Calcium (Ca)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.calcium_mg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg</span></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Iron (Fe)</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.iron_mg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg</span></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Vitamin C</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.vitamin_c_mg || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>mg</span></div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600 }}>Saturated Fat</div>
                        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)' }}>{results.saturated_fat_g || 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>g</span></div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* Side by Side Comparison Tab */}
      {activeTab === 'compare' && (
        <div className="card glass mt-4">
          <h2 style={{ fontSize: '1.4rem', marginBottom: '16px', color: 'var(--text-primary)', fontWeight: 700 }}>⚔️ Side-by-Side 100g Food Comparison</h2>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={compFood1}
              onChange={(e) => setCompFood1(e.target.value)}
              placeholder="Food 1 (e.g. chicken breast)"
              style={{ flex: 1, minWidth: '160px' }}
            />
            <span style={{ alignSelf: 'center', fontWeight: 800, color: 'var(--accent-1)', fontSize: '1.1rem' }}>VS</span>
            <input
              type="text"
              value={compFood2}
              onChange={(e) => setCompFood2(e.target.value)}
              placeholder="Food 2 (e.g. tofu)"
              style={{ flex: 1, minWidth: '160px' }}
            />
            <button className="btn-primary" onClick={handleCompare} disabled={compLoading}>
              {compLoading ? 'Comparing...' : 'Compare Foods'}
            </button>
          </div>

          {compRes1 && compRes2 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-primary)' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-glass)', textAlign: 'left', background: 'rgba(255, 90, 54, 0.08)' }}>
                    <th style={{ padding: '12px' }}>Nutrient (per 100g)</th>
                    <th style={{ padding: '12px', color: 'var(--accent-1)', fontWeight: 700 }}>{compRes1.food_item}</th>
                    <th style={{ padding: '12px', color: '#10b981', fontWeight: 700 }}>{compRes2.food_item}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🔥 Calories</td>
                    <td style={{ padding: '10px 12px', fontWeight: compRes1.calories > compRes2.calories ? 700 : 400 }}>{compRes1.calories} kcal</td>
                    <td style={{ padding: '10px 12px', fontWeight: compRes2.calories > compRes1.calories ? 700 : 400 }}>{compRes2.calories} kcal</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🥩 Protein</td>
                    <td style={{ padding: '10px 12px', fontWeight: compRes1.protein_g > compRes2.protein_g ? 700 : 400, color: '#6366f1' }}>{compRes1.protein_g} g</td>
                    <td style={{ padding: '10px 12px', fontWeight: compRes2.protein_g > compRes1.protein_g ? 700 : 400, color: '#10b981' }}>{compRes2.protein_g} g</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🌾 Carbs</td>
                    <td style={{ padding: '10px 12px' }}>{compRes1.carbs_g} g</td>
                    <td style={{ padding: '10px 12px' }}>{compRes2.carbs_g} g</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🥑 Fat</td>
                    <td style={{ padding: '10px 12px' }}>{compRes1.fat_g} g</td>
                    <td style={{ padding: '10px 12px' }}>{compRes2.fat_g} g</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🥦 Fiber</td>
                    <td style={{ padding: '10px 12px' }}>{compRes1.fiber_g || 0} g</td>
                    <td style={{ padding: '10px 12px' }}>{compRes2.fiber_g || 0} g</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--border-glass)' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🩸 Glycemic Index (GI)</td>
                    <td style={{ padding: '10px 12px' }}>{compRes1.glycemic_index ?? 'N/A'}</td>
                    <td style={{ padding: '10px 12px' }}>{compRes2.glycemic_index ?? 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>🌟 Health Score</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f59e0b' }}>{compRes1.health_score || 85}/100</td>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f59e0b' }}>{compRes2.health_score || 85}/100</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
