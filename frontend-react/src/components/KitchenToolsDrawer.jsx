import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  ArrowRightLeft, 
  Sparkles, 
  HelpCircle, 
  Thermometer, 
  Scale, 
  Flame, 
  BookOpen, 
  Copy, 
  Check, 
  Lightbulb,
  ChefHat
} from 'lucide-react';
import kitchenSubstitutes from '../data/kitchenSubstitutes';
import kitchenTips from '../data/kitchenTips';
import { playClickSound } from '../utils/soundEffects';
import { useToast } from '../context/ToastContext';

// Ingredient density table: Grams per 1 US Cup (approx 240ml)
const INGREDIENT_DENSITIES = {
  water_liquid: { name: 'Water / Milk / Broth', gPerCup: 240 },
  all_purpose_flour: { name: 'All-Purpose Flour (Sifted)', gPerCup: 120 },
  bread_flour: { name: 'Bread Flour', gPerCup: 130 },
  granulated_sugar: { name: 'Granulated Sugar', gPerCup: 200 },
  brown_sugar: { name: 'Brown Sugar (Packed)', gPerCup: 220 },
  powdered_sugar: { name: 'Powdered / Icing Sugar', gPerCup: 120 },
  butter: { name: 'Butter', gPerCup: 227 },
  vegetable_oil: { name: 'Vegetable / Olive Oil', gPerCup: 218 },
  honey: { name: 'Honey / Molasses / Maple Syrup', gPerCup: 340 },
  rolled_oats: { name: 'Rolled Oats', gPerCup: 90 },
  cocoa_powder: { name: 'Cocoa Powder', gPerCup: 100 },
  rice_uncooked: { name: 'Rice (Uncooked)', gPerCup: 185 },
};

// Unit ratios to base: Mass -> Grams; Volume -> Milliliters
const MASS_UNITS = {
  g: { label: 'Grams (g)', factor: 1 },
  kg: { label: 'Kilograms (kg)', factor: 1000 },
  oz: { label: 'Ounces (oz)', factor: 28.3495 },
  lb: { label: 'Pounds (lb)', factor: 453.592 },
};

const VOLUME_UNITS = {
  ml: { label: 'Milliliters (ml)', factor: 1 },
  l: { label: 'Liters (L)', factor: 1000 },
  tsp: { label: 'Teaspoon (tsp)', factor: 4.92892 },
  tbsp: { label: 'Tablespoon (tbsp)', factor: 14.7868 },
  cup: { label: 'US Cup (cup)', factor: 240 },
  fl_oz: { label: 'Fluid Ounce (fl oz)', factor: 29.5735 },
};

// Oven Temperature Gas Mark Table
const GAS_MARKS = [
  { mark: '1/4', c: 110, f: 225, desc: 'Very slow' },
  { mark: '1/2', c: 120, f: 250, desc: 'Very slow' },
  { mark: '1',   c: 140, f: 275, desc: 'Slow' },
  { mark: '2',   c: 150, f: 300, desc: 'Slow' },
  { mark: '3',   c: 160, f: 325, desc: 'Moderately slow' },
  { mark: '4',   c: 180, f: 350, desc: 'Moderate (Standard Baking)' },
  { mark: '5',   c: 190, f: 375, desc: 'Moderate' },
  { mark: '6',   c: 200, f: 400, desc: 'Moderately hot' },
  { mark: '7',   c: 220, f: 425, desc: 'Hot' },
  { mark: '8',   c: 230, f: 450, desc: 'Very hot' },
  { mark: '9',   c: 240, f: 475, desc: 'Very hot' },
];

export default function KitchenToolsDrawer({ isOpen, onClose, defaultTab = 'converter' }) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState(defaultTab);

  // ── Converter State ──
  const [convType, setConvType] = useState('density'); // 'density' | 'temp' | 'mass_vol'
  const [inputValue, setInputValue] = useState(1);
  const [selectedDensityKey, setSelectedDensityKey] = useState('all_purpose_flour');
  const [fromUnit, setFromUnit] = useState('cup');
  const [toUnit, setToUnit] = useState('g');
  const [tempValue, setTempValue] = useState(180);
  const [tempFrom, setTempFrom] = useState('C'); // 'C' | 'F'

  // ── Substitutes Search State ──
  const [subSearch, setSubSearch] = useState('');
  const [subCategory, setSubCategory] = useState('All');
  const [copiedId, setCopiedId] = useState(null);

  // ── Tips State ──
  const [tipCategory, setTipCategory] = useState('All');

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Convert Density / Volume ↔ Mass Calculation
  const convertedResult = useMemo(() => {
    const num = parseFloat(inputValue);
    if (isNaN(num) || num < 0) return 0;

    const density = INGREDIENT_DENSITIES[selectedDensityKey] || INGREDIENT_DENSITIES.water_liquid;
    const gPerCup = density.gPerCup;

    // Convert fromUnit to base cups or grams
    let grams = 0;
    if (fromUnit in MASS_UNITS) {
      grams = num * MASS_UNITS[fromUnit].factor;
    } else if (fromUnit in VOLUME_UNITS) {
      const ml = num * VOLUME_UNITS[fromUnit].factor;
      const cups = ml / 240.0;
      grams = cups * gPerCup;
    }

    // Convert grams to toUnit
    if (toUnit in MASS_UNITS) {
      return (grams / MASS_UNITS[toUnit].factor).toFixed(2).replace(/\.00$/, '');
    } else if (toUnit in VOLUME_UNITS) {
      const cups = grams / gPerCup;
      const ml = cups * 240.0;
      return (ml / VOLUME_UNITS[toUnit].factor).toFixed(2).replace(/\.00$/, '');
    }

    return num;
  }, [inputValue, selectedDensityKey, fromUnit, toUnit]);

  // Temperature Conversion
  const convertedTemp = useMemo(() => {
    const num = parseFloat(tempValue);
    if (isNaN(num)) return { c: 0, f: 32, gasMark: '-' };
    let c = tempFrom === 'C' ? num : (num - 32) * (5 / 9);
    let f = tempFrom === 'F' ? num : (num * (9 / 5)) + 32;

    // Nearest Gas Mark
    let closestGas = '-';
    let minDiff = 999;
    GAS_MARKS.forEach(gm => {
      const diff = Math.abs(c - gm.c);
      if (diff < minDiff && diff <= 15) {
        minDiff = diff;
        closestGas = `Gas Mark ${gm.mark} (${gm.desc})`;
      }
    });

    return {
      c: Math.round(c),
      f: Math.round(f),
      gasMark: closestGas
    };
  }, [tempValue, tempFrom]);

  // Filter Substitutes
  const filteredSubstitutes = useMemo(() => {
    return kitchenSubstitutes.filter(item => {
      const matchesCat = subCategory === 'All' || item.category === subCategory;
      const query = subSearch.toLowerCase().trim();
      if (!query) return matchesCat;
      const matchesName = item.ingredient.toLowerCase().includes(query);
      const matchesSub = item.substitutes.some(s => 
        s.name.toLowerCase().includes(query) || 
        s.bestFor.toLowerCase().includes(query)
      );
      return matchesCat && (matchesName || matchesSub);
    });
  }, [subSearch, subCategory]);

  // Filter Tips
  const filteredTips = useMemo(() => {
    if (tipCategory === 'All') return kitchenTips;
    return kitchenTips.filter(t => t.category === tipCategory);
  }, [tipCategory]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Replacement formula copied! 📋');
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="kitchen-tools-backdrop" onClick={onClose}>
      <div className="kitchen-tools-modal glass" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="kitchen-tools-header">
          <div className="tools-title-wrap">
            <div className="tools-icon-badge">
              <ChefHat size={20} />
            </div>
            <div>
              <h2 className="tools-modal-title">Chef's Kitchen Toolkit</h2>
              <p className="tools-modal-subtitle">Culinary conversions, emergency substitutions & chef mastery hacks</p>
            </div>
          </div>
          <button className="tools-close-btn" onClick={onClose} aria-label="Close Toolkit">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="kitchen-tools-tabs">
          <button 
            className={`tools-tab-btn ${activeTab === 'converter' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setActiveTab('converter'); }}
          >
            <Scale size={15} /> Unit & Temp Converter
          </button>
          <button 
            className={`tools-tab-btn ${activeTab === 'substitutes' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setActiveTab('substitutes'); }}
          >
            <ArrowRightLeft size={15} /> Ingredient Substitutes ({kitchenSubstitutes.length})
          </button>
          <button 
            className={`tools-tab-btn ${activeTab === 'tips' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setActiveTab('tips'); }}
          >
            <Lightbulb size={15} /> Chef's Pro Hacks ({kitchenTips.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="kitchen-tools-content">
          {/* TAB 1: CONVERTER */}
          {activeTab === 'converter' && (
            <div className="converter-tool-container fade-in-up">
              <div className="converter-subtabs">
                <button
                  className={`converter-subtab-pill ${convType === 'density' ? 'active' : ''}`}
                  onClick={() => setConvType('density')}
                >
                  🌾 Ingredient Cups ↔ Grams
                </button>
                <button
                  className={`converter-subtab-pill ${convType === 'temp' ? 'active' : ''}`}
                  onClick={() => setConvType('temp')}
                >
                  🌡️ Oven Temp & Gas Mark
                </button>
              </div>

              {convType === 'density' ? (
                <div className="density-converter-box">
                  {/* Ingredient Density Selector */}
                  <div className="form-group" style={{ marginBottom: '16px' }}>
                    <label className="tools-input-label">Select Ingredient (Adjusts for ingredient density):</label>
                    <select
                      className="tools-select"
                      value={selectedDensityKey}
                      onChange={(e) => setSelectedDensityKey(e.target.value)}
                    >
                      {Object.entries(INGREDIENT_DENSITIES).map(([key, item]) => (
                        <option key={key} value={key}>
                          {item.name} ({item.gPerCup}g / cup)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="converter-row">
                    {/* From Section */}
                    <div className="converter-col">
                      <label className="tools-input-label">From:</label>
                      <input
                        type="number"
                        min="0"
                        step="0.25"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        className="tools-number-input"
                      />
                      <select
                        className="tools-select unit"
                        value={fromUnit}
                        onChange={(e) => setFromUnit(e.target.value)}
                      >
                        <optgroup label="Volume (Baking / Liquids)">
                          {Object.entries(VOLUME_UNITS).map(([k, u]) => (
                            <option key={k} value={k}>{u.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Mass / Weight">
                          {Object.entries(MASS_UNITS).map(([k, u]) => (
                            <option key={k} value={k}>{u.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="converter-equal-badge">
                      <ArrowRightLeft size={16} />
                    </div>

                    {/* To Section */}
                    <div className="converter-col">
                      <label className="tools-input-label">To Result:</label>
                      <div className="tools-result-display">
                        <span className="result-number">{convertedResult}</span>
                      </div>
                      <select
                        className="tools-select unit"
                        value={toUnit}
                        onChange={(e) => setToUnit(e.target.value)}
                      >
                        <optgroup label="Mass / Weight">
                          {Object.entries(MASS_UNITS).map(([k, u]) => (
                            <option key={k} value={k}>{u.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label="Volume (Baking / Liquids)">
                          {Object.entries(VOLUME_UNITS).map(([k, u]) => (
                            <option key={k} value={k}>{u.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>

                  {/* Common Kitchen Quick Sheet */}
                  <div className="baking-quick-ref">
                    <span className="baking-ref-title">📌 Quick Chef References:</span>
                    <div className="baking-ref-chips">
                      <span className="ref-chip">1 tbsp = 3 tsp (15ml)</span>
                      <span className="ref-chip">1 cup = 16 tbsp (240ml)</span>
                      <span className="ref-chip">1 stick butter = 1/2 cup = 113g</span>
                      <span className="ref-chip">1 lb = 16 oz = 454g</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Oven Temperature Converter */
                <div className="temp-converter-box">
                  <div className="temp-input-row">
                    <div style={{ flex: 1 }}>
                      <label className="tools-input-label">Oven Temperature:</label>
                      <input
                        type="number"
                        value={tempValue}
                        onChange={(e) => setTempValue(e.target.value)}
                        className="tools-number-input"
                      />
                    </div>
                    <div style={{ width: '120px' }}>
                      <label className="tools-input-label">Scale:</label>
                      <div className="temp-toggle-group">
                        <button
                          className={`temp-scale-btn ${tempFrom === 'C' ? 'active' : ''}`}
                          onClick={() => setTempFrom('C')}
                        >
                          °C (Celsius)
                        </button>
                        <button
                          className={`temp-scale-btn ${tempFrom === 'F' ? 'active' : ''}`}
                          onClick={() => setTempFrom('F')}
                        >
                          °F (Fahrenheit)
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="temp-results-cards">
                    <div className="temp-res-card">
                      <span className="temp-res-val">{convertedTemp.c}°C</span>
                      <span className="temp-res-label">Celsius</span>
                    </div>
                    <div className="temp-res-card">
                      <span className="temp-res-val">{convertedTemp.f}°F</span>
                      <span className="temp-res-label">Fahrenheit</span>
                    </div>
                    <div className="temp-res-card gas">
                      <span className="temp-res-val" style={{ fontSize: '1rem' }}>{convertedTemp.gasMark}</span>
                      <span className="temp-res-label">Oven Setting</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INGREDIENT SUBSTITUTES */}
          {activeTab === 'substitutes' && (
            <div className="substitutes-tool-container fade-in-up">
              <div className="substitutes-search-bar">
                <Search size={16} className="sub-search-icon" />
                <input
                  type="text"
                  placeholder="Search ingredient (e.g. Buttermilk, Egg, Soy Sauce, Cornstarch)..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="sub-search-input"
                />
                {subSearch && (
                  <button className="sub-clear-btn" onClick={() => setSubSearch('')}>
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="sub-cat-pills">
                {['All', 'Dairy', 'Dairy & Fats', 'Baking & Pantry', 'Condiments', 'Produce & Acids'].map(cat => (
                  <button
                    key={cat}
                    className={`sub-cat-btn ${subCategory === cat ? 'active' : ''}`}
                    onClick={() => setSubCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Substitutes Cards List */}
              <div className="substitutes-grid">
                {filteredSubstitutes.length === 0 ? (
                  <div className="empty-sub-state">
                    <p>No exact substitute match found for "{subSearch}".</p>
                    <span className="sub-hint">Try searching for basic staples like "Egg", "Butter", "Milk", or "Sugar".</span>
                  </div>
                ) : (
                  filteredSubstitutes.map(item => (
                    <div key={item.id} className="substitute-card glass">
                      <div className="sub-card-header">
                        <div className="sub-title-group">
                          <span className="sub-emoji">{item.icon}</span>
                          <div>
                            <h4 className="sub-ingredient-name">{item.ingredient}</h4>
                            <span className="sub-cat-tag">{item.category}</span>
                          </div>
                        </div>
                      </div>

                      <div className="sub-options-list">
                        {item.substitutes.map((sub, idx) => (
                          <div key={idx} className="sub-option-row">
                            <div className="sub-option-info">
                              <div className="sub-opt-name-row">
                                <span className="sub-opt-name">✨ {sub.name}</span>
                                <button
                                  className="btn-copy-sub"
                                  onClick={() => handleCopy(`${sub.name}: ${sub.ratio}`, `${item.id}_${idx}`)}
                                  title="Copy replacement ratio"
                                >
                                  {copiedId === `${item.id}_${idx}` ? <Check size={12} style={{ color: '#10ac84' }} /> : <Copy size={12} />}
                                </button>
                              </div>
                              <p className="sub-opt-ratio"><strong>Ratio:</strong> {sub.ratio}</p>
                              {sub.notes && <p className="sub-opt-notes">💡 {sub.notes}</p>}
                              {sub.bestFor && <span className="sub-best-for">Best for: {sub.bestFor}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHEF'S PRO TIPS */}
          {activeTab === 'tips' && (
            <div className="tips-tool-container fade-in-up">
              <div className="sub-cat-pills" style={{ marginBottom: '16px' }}>
                {['All', 'Cooking', 'Technique', 'Flavor', 'Storage', 'Prep', 'Equipment'].map(cat => (
                  <button
                    key={cat}
                    className={`sub-cat-btn ${tipCategory === cat ? 'active' : ''}`}
                    onClick={() => setTipCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="tips-grid">
                {filteredTips.map(tip => (
                  <div key={tip.id} className="tip-card glass">
                    <div className="tip-card-top">
                      <span className="tip-icon">{tip.icon}</span>
                      <span className="tip-cat-badge">{tip.category}</span>
                    </div>
                    <p className="tip-text">{tip.tip}</p>
                    <div className="tip-card-footer">
                      <span className="tip-author">✨ {tip.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
