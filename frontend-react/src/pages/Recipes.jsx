import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';

export default function Recipes() {
  const location = useLocation();
  const toast = useToast();
  const [ingredients, setIngredients] = useState(location.state?.ingredients || '');
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
  const didInitRef = useRef(false);

  const loadPantry = async () => {
    try {
      setLoading(true);
      const data = await api.get('/pantry');
      if (data && data.length > 0) {
        const pantryIngs = data.map(item => item.name).join(', ');
        setIngredients(pantryIngs);
        toast.success("Loaded ingredients from pantry!");
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
    if (!ingredients.trim() && !region && !mealType && !diet && !maxCal && !maxTime) {
      // Just fetch popular recipes if nothing is selected
    }
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

  const saveRecipe = async (recipe) => {
    try {
      await api.post('/recipes/save', {
        title: recipe.title,
        image_url: recipe.image_url || null,
        summary: recipe.summary || null,
        ingredients: (recipe.ingredients || []).join(', '),
        instructions: recipe.instructions || null,
        calories: recipe.nutrition?.calories || null,
        protein_g: recipe.nutrition?.protein_g || null,
        carbs_g: recipe.nutrition?.carbs_g || null,
        fat_g: recipe.nutrition?.fat_g || null,
        ready_in_minutes: recipe.ready_in_minutes || null,
        servings: recipe.servings || null,
      });
      toast.success(`"${recipe.title}" saved to bookmarks ✓`);
    } catch (err) {
      toast.error(err.message || "Something went wrong");
    }
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Find Recipes</h1>
        <p className="subtitle">Explore 7,000+ recipes tailored to your ingredients, diet, and lifestyle.</p>
      </div>

      <div className="card glass">
        <div className="input-row">
          <input 
            type="text" 
            placeholder="e.g. paneer, tomato, onion" 
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch(1)}
          />
          <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={() => handleSearch(1)} disabled={loading}>
            <span className="btn-icon">🍽️</span> Search
          </button>
          <button className="btn-secondary" onClick={loadPantry} disabled={loading} style={{marginLeft: '10px'}}>
            <span className="btn-icon">🛒</span> Use My Pantry
          </button>
        </div>
        <div className="constraints-row">
          <span className="constraints-label">⚙️ Filters</span>
          <select value={region} onChange={e => setRegion(e.target.value)}>
            <option value="">Any Region</option>
            <option value="Indian">🇮🇳 Indian</option>
            <option value="European">🇪🇺 European</option>
            <option value="Chinese">🇨🇳 Chinese</option>
            <option value="Japanese">🇯🇵 Japanese</option>
            <option value="Mexican">🇲🇽 Mexican</option>
            <option value="Middle Eastern">🧆 Middle Eastern</option>
            <option value="American">🇺🇸 American</option>
            <option value="Italian">🇮🇹 Italian</option>
          </select>
          <select value={mealType} onChange={e => setMealType(e.target.value)}>
            <option value="">Any Meal</option>
            <option value="Breakfast">🍳 Breakfast</option>
            <option value="Lunch">🥗 Lunch</option>
            <option value="Dinner">🍲 Dinner</option>
            <option value="Snack">🍿 Snack</option>
            <option value="Dessert">🍰 Dessert</option>
            <option value="Drink">🍹 Drink</option>
          </select>
          <select value={diet} onChange={e => setDiet(e.target.value)}>
            <option value="">Any Diet</option>
            <option value="vegetarian">🥬 Vegetarian</option>
            <option value="vegan">🌱 Vegan</option>
            <option value="keto">🥑 Keto</option>
            <option value="gluten-free">🌾 Gluten-Free</option>
            <option value="high-protein">💪 High-Protein</option>
            <option value="non-vegetarian">🍖 Non-Vegetarian</option>
          </select>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="best_match">Sort by: Best Match</option>
            <option value="fastest">Sort by: Fastest</option>
            <option value="lowest_calories">Sort by: Lowest Calories</option>
            <option value="highest_protein">Sort by: Highest Protein</option>
          </select>
          <input type="number" placeholder="Max kcal" min="50" max="5000" step="50" className="constraint-input" value={maxCal} onChange={e => setMaxCal(e.target.value)} />
          <input type="number" placeholder="Max min" min="5" max="300" step="5" className="constraint-input" value={maxTime} onChange={e => setMaxTime(e.target.value)} />
          <button className="btn-secondary" style={{marginLeft: '10px'}} onClick={clearFilters}>Clear filters</button>
        </div>
      </div>

      <div className="results-area">
        {error && <div style={{color: 'red', marginBottom: '20px'}}>{error}</div>}
        {!hasSearched && !loading && (
          <div className="empty-state">
            <span className="empty-icon">🔎</span>
            <p>Enter ingredients and optional filters to discover recipes.</p>
          </div>
        )}

        {hasSearched && results && results.recipes.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🍳</span>
            <p>No matching recipes found. Try different ingredients or relax your constraints.</p>
          </div>
        )}

        {results && results.recipes.length > 0 && (
          <>
            <div>
              <span className="source-badge">Source: {results.source} · {results.total} recipe(s)</span>
              {results.constraints_applied?.map(c => <span key={c} className="constraints-badge" style={{marginLeft: '10px'}}>⚙️ {c}</span>)}
            </div>
            <div className="recipe-grid" style={{marginTop: '20px'}}>
              {results.recipes.map((recipe, idx) => (
                <div key={idx} className="recipe-card" style={{animationDelay: `${idx * 0.06}s`}}>
                  {recipe.image_url && <img className="recipe-image" src={recipe.image_url} alt={recipe.title} loading="lazy" />}
                  <div className="recipe-info">
                    <div className="recipe-title">{recipe.title}</div>
                    {recipe.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(recipe.summary)}}></div>}
                    {recipe.diets?.length > 0 && (
                      <div className="diet-tags">
                        {recipe.diets.map(d => <span key={d} className="diet-tag">{d}</span>)}
                      </div>
                    )}
                    <div className="recipe-meta">
                      {ingredients.trim() && Math.round(recipe.match_score * 100) > 0 && <span className="match-badge">{Math.round(recipe.match_score * 100)}% match</span>}
                      {recipe.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{recipe.ready_in_minutes} min</span></span>}
                      {recipe.nutrition?.calories && <span className="recipe-meta-item">🔥 <span className="value">{recipe.nutrition.calories} kcal</span></span>}
                      {recipe.servings && <span className="recipe-meta-item">🍽️ <span className="value">{recipe.servings} servings</span></span>}
                    </div>
                      {recipe.video_url && (
                        <>
                          <div style={{ color: "#e07a5f", fontSize: "12px", marginTop: "5px" }}>
                            🎥 Video available
                          </div>

                          <button
                            onClick={() => {
                              let url = recipe.video_url;
                              // Convert embed URLs to regular watch URLs so they play in a new tab
                              if (url.includes('/embed/')) {
                                const videoId = url.split('/embed/')[1].split('?')[0];
                                url = `https://www.youtube.com/watch?v=${videoId}`;
                              }
                              window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            style={{
                              marginTop: "10px",
                              padding: "8px 12px",
                              backgroundColor: "#e07a5f",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer"
                            }}
                          >
                            ▶ Watch Recipe Video
                          </button>
                        </>
                      )}
                    <div className="recipe-actions">
                      <button className="btn-secondary" onClick={() => setSelectedRecipe(recipe)}>View Details</button>
                      <button className="btn-secondary" onClick={() => saveRecipe(recipe)}>💾 Save</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {results && results.total > 25 && (
              <div className="pagination">
                <div className="pagination-info">
                  Showing {Math.min((page - 1) * 25 + 1, results.total)}-{Math.min(page * 25, results.total)} of {results.total} recipes
                </div>
                
                <button 
                  className="pagination-btn" 
                  disabled={page === 1 || loading} 
                  onClick={() => handleSearch(page - 1)}
                >
                  &lt; Previous
                </button>
                
                {(() => {
                  const totalPages = Math.ceil(results.total / 25);
                  const pages = [];
                  for (let p = 1; p <= totalPages; p++) {
                    if (p === 1 || p === totalPages || Math.abs(p - page) <= 2) {
                      if (pages.length > 0 && p - pages[pages.length - 1] > 1) {
                        pages.push('...');
                      }
                      pages.push(p);
                    }
                  }
                  return pages.map((p, idx) => {
                    if (p === '...') {
                      return <span key={`ellipsis-${idx}`} className="pagination-ellipsis">...</span>;
                    }
                    return (
                      <button
                        key={p}
                        className={`pagination-btn ${page === p ? 'active' : ''}`}
                        disabled={loading}
                        onClick={() => handleSearch(p)}
                      >
                        {p}
                      </button>
                    );
                  });
                })()}
                
                <button 
                  className="pagination-btn" 
                  disabled={page * 25 >= results.total || loading} 
                  onClick={() => handleSearch(page + 1)}
                >
                  Next &gt;
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </section>
  );
}
