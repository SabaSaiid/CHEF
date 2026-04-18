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

  const fetchRecipes = async () => {
    if (!token) {
      setError('Please log in to view saved recipes.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.get('/recipes/saved');
      setRecipes(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, [token]);

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
      <div className="page-header">
        <h1>Saved Recipes</h1>
        <p className="subtitle">Your bookmarked recipes</p>
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
            {recipes.map(r => (
              <div key={r.id} className="recipe-card">
                {r.image_url && <img className="recipe-image" src={r.image_url} alt={r.title} />}
                <div className="recipe-info">
                  <div className="recipe-title">{r.title}</div>
                  {r.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{__html: r.summary}}></div>}
                  <div className="recipe-meta">
                    {r.calories && <span className="recipe-meta-item">🔥 <span className="value">{r.calories} kcal</span></span>}
                    {r.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{r.ready_in_minutes} min</span></span>}
                  </div>
                  <div className="recipe-actions">
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
