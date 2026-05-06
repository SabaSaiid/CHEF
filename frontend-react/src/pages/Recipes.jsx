import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../services/api';
import RecipeModal from '../components/RecipeModal';

export default function Recipes() {
  const location = useLocation();
  const [ingredients, setIngredients] = useState(location.state?.ingredients || '');
  const [diet, setDiet] = useState('');
  const [maxCal, setMaxCal] = useState('');
  const [maxTime, setMaxTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const handleSearch = useCallback(async () => {
    if (!ingredients.trim()) {
      setError('Enter some ingredients to search');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const ingList = ingredients.split(',').map(s => s.trim()).filter(Boolean);
      const body = { ingredients: ingList, max_results: 10 };
      if (diet) body.diet = diet;
      if (maxCal) body.max_calories = parseInt(maxCal, 10);
      if (maxTime) body.max_time = parseInt(maxTime, 10);

      const data = await api.post('/recipes/search', body);
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [ingredients, diet, maxCal, maxTime]);

  useEffect(() => {
    if (location.state?.ingredients) {
      handleSearch();
    }
  }, [location.state?.ingredients, handleSearch]);

  const clearFilters = () => {
    setDiet('');
    setMaxCal('');
    setMaxTime('');
    setError(null);
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
      alert(`"${recipe.title}" saved!`);
    } catch (err) {
      alert(err.message || "Something went wrong");
    }
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Find Recipes</h1>
        <p className="subtitle">Search by ingredients — we'll suggest what you can cook</p>
      </div>

      <div className="card glass">
        <div className="input-row">
          <input 
            type="text" 
            placeholder="e.g. paneer, tomato, onion" 
            value={ingredients}
            onChange={e => setIngredients(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={handleSearch} disabled={loading}>
            <span className="btn-icon">🍽️</span> Search
          </button>
        </div>
        <div className="constraints-row">
          <span className="constraints-label">⚙️ Constraints</span>
          <select value={diet} onChange={e => setDiet(e.target.value)}>
            <option value="">Any Diet</option>
            <option value="vegetarian">🥬 Vegetarian</option>
            <option value="vegan">🌱 Vegan</option>
            <option value="keto">🥑 Keto</option>
            <option value="gluten-free">🌾 Gluten-Free</option>
            <option value="high-protein">💪 High-Protein</option>
            <option value="non-vegetarian">🍖 Non-Vegetarian</option>
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
                    {recipe.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{__html: recipe.summary}}></div>}
                    {recipe.diets?.length > 0 && (
                      <div className="diet-tags">
                        {recipe.diets.map(d => <span key={d} className="diet-tag">{d}</span>)}
                      </div>
                    )}
                    <div className="recipe-meta">
                      {Math.round(recipe.match_score * 100) > 0 && <span className="match-badge">{Math.round(recipe.match_score * 100)}% match</span>}
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
          </>
        )}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </section>
  );
}
