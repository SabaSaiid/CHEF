import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import RecipeModal from '../components/RecipeModal';

export default function SavedRecipes() {
  const { token } = useContext(AuthContext);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [sortBy, setSortBy] = useState('date');

  const fetchRecipes = async () => {
    if (!token) {
      setError('Please log in to view saved recipes.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.get(`/recipes/saved?sort_by=${sortBy}`);
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [token, sortBy]);

  const handleRate = async (id, rating) => {
    try {
      await api.put(`/recipes/saved/${id}/rate`, { rating });
      fetchRecipes();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/recipes/saved/${id}`);
      fetchRecipes();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Saved Recipes</h1>
          <p className="subtitle">Your bookmarked recipes</p>
        </div>
        <div className="sort-control" style={{ marginTop: '10px' }}>
          <label style={{ marginRight: '10px', color: 'var(--text-muted)' }}>Sort by:</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px', borderRadius: '8px' }}>
            <option value="date">Date Added</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      <div className="results-area">
        {error && <div style={{color: 'red', marginTop: '20px'}}>{error}</div>}
        {loading && <div style={{textAlign: 'center', marginTop: '20px'}}>Loading...</div>}

        {!loading && !error && recipes.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">📚</span>
            <p>No saved recipes yet. Search for recipes and save your favorites!</p>
          </div>
        )}

        {recipes.length > 0 && (
          <div className="recipe-grid">
            {recipes.map((r, idx) => (
              <div key={r.id} className="recipe-card" style={{animationDelay: `${idx * 0.06}s`}}>
                {r.image_url && <img className="recipe-image" src={r.image_url} alt={r.title} />}
                <div className="recipe-info">
                  <div className="recipe-title">{r.title}</div>
                  {r.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{__html: r.summary}}></div>}
                  <div className="recipe-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      {r.calories && <span className="recipe-meta-item" style={{marginRight: '10px'}}>🔥 <span className="value">{r.calories} kcal</span></span>}
                      {r.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{r.ready_in_minutes} min</span></span>}
                    </div>
                    <div className="recipe-rating" style={{ fontSize: '1.2rem', cursor: 'pointer' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <span 
                          key={star} 
                          onClick={() => handleRate(r.id, star)}
                          style={{ color: star <= (r.rating || 0) ? '#FFD700' : 'var(--border-color)', margin: '0 2px', transition: 'color 0.2s' }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="recipe-actions" style={{ marginTop: '15px' }}>
                    <button className="btn-secondary" onClick={() => setSelectedRecipe({...r, ingredients: r.ingredients ? r.ingredients.split(', ') : []})}>View Details</button>
                    <button className="btn-danger" onClick={() => handleDelete(r.id)}>🗑️ Remove</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </section>
  );
}
