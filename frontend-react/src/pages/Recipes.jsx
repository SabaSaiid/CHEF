import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';
import { useSettings } from '../context/SettingsContext';

const DIET_OPTIONS = [
  { value: 'vegetarian', label: '🥬 Vegetarian' },
  { value: 'vegan', label: '🌱 Vegan' },
  { value: 'keto', label: '🥑 Keto' },
  { value: 'gluten-free', label: '🌾 Gluten-Free' },
  { value: 'high-protein', label: '💪 High-Protein' },
  { value: 'non-vegetarian', label: '🍖 Non-Veg' },
];

const MEAL_OPTIONS = [
  { value: 'Breakfast', label: '🍳 Breakfast' },
  { value: 'Lunch', label: '🥗 Lunch' },
  { value: 'Dinner', label: '🍲 Dinner' },
  { value: 'Snack', label: '🍿 Snack' },
  { value: 'Dessert', label: '🍰 Dessert' },
];

export default function Recipes() {
  const location = useLocation();
  const toast = useToast();
  const { settings } = useSettings();
  const [ingredients, setIngredients] = useState(location.state?.ingredients || '');
  const [autoCorrectSuggestion, setAutoCorrectSuggestion] = useState(null);
  const [diet, setDiet] = useState('');
  const [region, setRegion] = useState('');
  const [mealType, setMealType] = useState('');
  const [maxCal, setMaxCal] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('best_match');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (!settings.autoCorrectEnabled || !ingredients.trim()) {
      setAutoCorrectSuggestion(null);
      return;
    }
    const timer = setTimeout(async () => {
      const lastWord = ingredients.split(',').pop().trim();
      if (lastWord.length >= 3) {
        try {
          const res = await api.get(`/ingredients/autocorrect?query=${encodeURIComponent(lastWord)}`);
          if (res.is_corrected && res.corrected.toLowerCase() !== lastWord.toLowerCase()) {
            setAutoCorrectSuggestion({ original: lastWord, corrected: res.corrected });
          } else {
            setAutoCorrectSuggestion(null);
          }
        } catch (e) {
          setAutoCorrectSuggestion(null);
        }
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [ingredients, settings.autoCorrectEnabled]);

  const applyAutoCorrect = () => {
    if (!autoCorrectSuggestion) return;
    const parts = ingredients.split(',');
    parts[parts.length - 1] = ` ${autoCorrectSuggestion.corrected}`;
    setIngredients(parts.join(',').trim());
    setAutoCorrectSuggestion(null);
  };


  const loadPantry = async () => {
    try {
      setLoading(true);
      const data = await api.get('/pantry');
      if (data && data.length > 0) {
        const sortedData = [...data].sort((a, b) => a.days_fresh - b.days_fresh);
        const topExpiring = sortedData.slice(0, 5);
        const pantryIngs = topExpiring.map(item => item.ingredient_name).join(', ');
        setIngredients(pantryIngs);
        toast.success(`Loaded ${topExpiring.length} expiring ingredients from pantry!`);
      } else {
        toast.info("Your pantry is empty.");
      }
    } catch (err) {
      toast.error("Failed to load pantry.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = useCallback(async (pageNum = 1) => {
    const actualPage = typeof pageNum === 'number' ? pageNum : 1;
    setLoading(true);
    setError(null);
    try {
      const ingList = ingredients.split(',').map(s => s.trim()).filter(Boolean);
      const body = { ingredients: ingList, max_results: 25, page: actualPage };
      if (diet) body.diet = diet;
      if (region) body.region = region;
      if (mealType) body.meal_type = mealType;
      if (maxCal) body.max_calories = parseInt(maxCal, 10);
      if (maxTime) body.max_time = parseInt(maxTime, 10);
      if (sortBy && sortBy !== 'best_match') body.sort_by = sortBy;

      const data = await api.post('/recipes/search', body);
      setResults(data);
      setPage(actualPage);
      setHasSearched(true);
      if (actualPage > 1) {
        document.querySelector('.results-area')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [ingredients, diet, region, mealType, maxCal, maxTime, sortBy]);

  useEffect(() => {
    if (location.state?.ingredients && !didInitRef.current) {
      didInitRef.current = true;
      handleSearch();
    }
  }, [location.state?.ingredients, handleSearch]);

  const clearFilters = () => {
    setDiet('');
    setRegion('');
    setMealType('');
    setMaxCal('');
    setMaxTime('');
    setSortBy('best_match');
    setError(null);
    setPage(1);
  };

  return (
    <section className="page active" style={{ padding: '0 20px 40px' }}>
      
      {/* Hero Search Section */}
      <div className="hero-search-container fade-in-up">
        <h1 className="hero-search-title">What's in your fridge?</h1>
        <p className="hero-search-subtitle">Discover thousands of premium recipes tailored to your ingredients and lifestyle.</p>
        
        <div className="hero-input-wrapper">
          <input 
            type="text" 
            placeholder="e.g. paneer, tomato, onion..." 
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(1)}
          />
          <button className={`btn-primary hero-btn ${loading ? 'loading' : ''}`} onClick={() => handleSearch(1)} disabled={loading}>
            Search
          </button>
          <button className="btn-secondary hero-btn pantry-pulse-btn" onClick={loadPantry} disabled={loading}>
            🛒 Use My Pantry
          </button>
        </div>

        {autoCorrectSuggestion && (
          <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.88rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Did you mean:</span>
            <button
              onClick={applyAutoCorrect}
              style={{
                background: 'rgba(129, 178, 154, 0.2)',
                color: 'var(--primary)',
                border: '1px solid var(--primary)',
                padding: '3px 10px',
                borderRadius: '16px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: '0.2s'
              }}
            >
              ✨ {autoCorrectSuggestion.corrected} (replace "{autoCorrectSuggestion.original}")
            </button>
          </div>
        )}
      </div>


      {/* Chip Filters Section */}
      <div className="fade-in-up" style={{ '--delay': '100ms', maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 600 }}>Filter by Diet</h3>
          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '13px' }} onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? 'Hide Advanced' : '⚙️ Advanced Filters'}
          </button>
        </div>
        
        <div className="filter-chips-container">
          {DIET_OPTIONS.map(opt => (
            <div 
              key={opt.value} 
              className={`filter-chip ${diet === opt.value ? 'active' : ''}`}
              onClick={() => setDiet(diet === opt.value ? '' : opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>

        <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '15px' }}>Meal Type</h3>
        <div className="filter-chips-container">
          {MEAL_OPTIONS.map(opt => (
            <div 
              key={opt.value} 
              className={`filter-chip ${mealType === opt.value ? 'active' : ''}`}
              onClick={() => setMealType(mealType === opt.value ? '' : opt.value)}
            >
              {opt.label}
            </div>
          ))}
        </div>

        {/* Advanced Filters (collapsible) */}
        <div className={`advanced-filters-drawer ${showAdvanced ? 'open' : ''}`}>
          <div className="card glass fade-in-up" style={{ padding: '20px', marginBottom: '30px', marginTop: '10px' }}>
            <div className="constraints-row" style={{ marginTop: 0 }}>
              <select value={region} onChange={e => setRegion(e.target.value)}>
                <option value="">Any Region</option>
                <option value="Indian">🇮🇳 Indian</option>
                <option value="European">🇪🇺 European</option>
                <option value="Chinese">🇨🇳 Chinese</option>
                <option value="Japanese">🇯🇵 Japanese</option>
                <option value="Mexican">🇲🇽 Mexican</option>
                <option value="American">🇺🇸 American</option>
                <option value="Italian">🇮🇹 Italian</option>
              </select>
              
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="best_match">Sort by: Best Match</option>
                <option value="fastest">Sort by: Fastest</option>
                <option value="lowest_calories">Sort by: Lowest Calories</option>
                <option value="highest_protein">Sort by: Highest Protein</option>
              </select>

              <input type="number" placeholder="Max kcal" min="50" max="5000" step="50" className="constraint-input" value={maxCal} onChange={e => setMaxCal(e.target.value)} />
              <input type="number" placeholder="Max min" min="5" max="300" step="5" className="constraint-input" value={maxTime} onChange={e => setMaxTime(e.target.value)} />
              
              <button className="btn-secondary" onClick={clearFilters}>Clear filters</button>
            </div>
          </div>
        </div>

      </div>

      {/* Results Area */}
      <div className="results-area" style={{ maxWidth: '1000px', margin: '0 auto', paddingTop: '20px' }}>
        {error && <div style={{color: 'red', marginBottom: '20px'}}>{error}</div>}
        {loading && !results && (
          <div className="magazine-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        )}

        {!hasSearched && !loading && (
          <div className="stylized-empty-state">
            <div className="empty-state-graphic">👨‍🍳</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>Ready to cook?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Enter ingredients above or click "Use My Pantry" to begin.</p>
          </div>
        )}

        {hasSearched && results && results.recipes.length === 0 && !loading && (
          <div className="stylized-empty-state">
            <div className="empty-state-graphic" style={{ filter: 'grayscale(1)' }}>🍽️</div>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>No recipes found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '16px' }}>Try different ingredients or relax your filters.</p>
          </div>
        )}

        {results && results.recipes.length > 0 && (
          <div className="fade-in-up">
            <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: 500 }}>
                {results.total} recipe(s) found via {results.source}
              </span>
              {results.constraints_applied?.map(c => <span key={c} className="constraints-badge">⚙️ {c}</span>)}
            </div>

            {/* Magazine Style Grid */}
            <div className="magazine-grid">
              {results.recipes.map((recipe, idx) => (
                <div 
                  key={idx} 
                  className="magazine-card" 
                  style={{animationDelay: `${idx * 0.05}s`}}
                  onClick={() => setSelectedRecipe(recipe)}
                >
                  {ingredients.trim() && Math.round(recipe.match_score * 100) > 0 && (
                    <div className="magazine-card-badge">
                      {Math.round(recipe.match_score * 100)}% match
                    </div>
                  )}

                  <button 
                    className="quick-save-btn" 
                    title="Save Recipe"
                    onClick={(e) => {
                      e.stopPropagation();
                      saveRecipe(recipe);
                    }}
                  >
                    🔖
                  </button>
                  
                  {recipe.image_url ? (
                    <img className="magazine-card-img" src={recipe.image_url} alt={recipe.title} loading="lazy" />
                  ) : (
                    <div className="magazine-card-img" style={{ background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🍽️</div>
                  )}
                  
                  <div className="magazine-card-overlay"></div>
                  
                  <div className="magazine-card-content">
                    <div className="magazine-card-title">{recipe.title}</div>
                    
                    <div className="magazine-card-meta">
                      {recipe.ready_in_minutes && <span>⏱️ {recipe.ready_in_minutes}m</span>}
                      {recipe.nutrition?.calories && <span>🔥 {recipe.nutrition.calories} kcal</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination remains the same */}
            {results.total > 25 && (
              <div className="pagination" style={{ marginTop: '40px' }}>
                <button className="pagination-btn" disabled={page === 1 || loading} onClick={() => handleSearch(page - 1)}>
                  &lt; Prev
                </button>
                <span style={{ fontSize: '14px', fontWeight: 500, margin: '0 15px' }}>Page {page}</span>
                <button className="pagination-btn" disabled={page * 25 >= results.total || loading} onClick={() => handleSearch(page + 1)}>
                  Next &gt;
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </section>
  );
}

