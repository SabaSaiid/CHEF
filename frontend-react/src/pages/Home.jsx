import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import RecipeModal from '../components/RecipeModal';

export default function Home() {
  const { username } = useContext(AuthContext);
  const navigate = useNavigate();
  const [dailyRecipe, setDailyRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api.get('/recipes/daily')
      .then(data => {
        setDailyRecipe(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const handleSaveRecipe = async () => {
    if (!dailyRecipe) return;
    try {
      await api.post('/recipes/save', {
        title: dailyRecipe.title,
        image_url: dailyRecipe.image_url || null,
        summary: dailyRecipe.summary || null,
        ingredients: (dailyRecipe.ingredients || []).join(', '),
        instructions: dailyRecipe.instructions || null,
        calories: dailyRecipe.nutrition?.calories || null,
        protein_g: dailyRecipe.nutrition?.protein_g || null,
        carbs_g: dailyRecipe.nutrition?.carbs_g || null,
        fat_g: dailyRecipe.nutrition?.fat_g || null,
        ready_in_minutes: dailyRecipe.ready_in_minutes || null,
        servings: dailyRecipe.servings || null,
      });
      alert(`"${dailyRecipe.title}" saved!`);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <section className="page active">
      <div className="kitchen-hero-header">
        <h1>{username ? `Good Morning, Chef ${username}!` : 'Welcome to the Kitchen'}</h1>
        <p className="subtitle">Your personalized food assistant</p>
      </div>

      <div className="kitchen-layout">
        <div className="kitchen-main-col">
          <h2 className="section-title">✨ Recipe of the Day</h2>
          <div className="card glass daily-recipe-card">
            {loading ? (
              <div style={{ padding: '20px', textAlign: 'center' }}>Loading special recipe...</div>
            ) : error ? (
              <div style={{ padding: '20px', color: 'red', textAlign: 'center' }}>{error}</div>
            ) : dailyRecipe && (
              <>
                {dailyRecipe.image_url && <img className="recipe-image" style={{ maxHeight: '250px', objectFit: 'cover' }} src={dailyRecipe.image_url} alt={dailyRecipe.title} />}
                <div className="recipe-info" style={{ padding: '20px' }}>
                  <div className="recipe-title" style={{ fontSize: '1.5rem' }}>{dailyRecipe.title}</div>
                  {dailyRecipe.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{ __html: dailyRecipe.summary }} style={{ marginBottom: '15px' }}></div>}
                  {dailyRecipe.diets?.length > 0 && (
                    <div className="diet-tags" style={{ marginBottom: '15px' }}>
                      {dailyRecipe.diets.map(d => <span key={d} className="diet-tag">{d}</span>)}
                    </div>
                  )}
                  <div className="recipe-meta" style={{ marginBottom: '15px' }}>
                    {dailyRecipe.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{dailyRecipe.ready_in_minutes} min</span></span>}
                    {dailyRecipe.nutrition?.calories && <span className="recipe-meta-item">🔥 <span className="value">{dailyRecipe.nutrition.calories} kcal</span></span>}
                    {dailyRecipe.servings && <span className="recipe-meta-item">🍽️ <span className="value">{dailyRecipe.servings} servings</span></span>}
                  </div>
                  <div className="recipe-actions">
                    <button className="btn-primary" onClick={() => setModalOpen(true)}>Let's Cook</button>
                    <button className="btn-secondary" onClick={handleSaveRecipe}>💾 Bookmark</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="kitchen-side-col">
          <h2 className="section-title">🚀 Quick Actions</h2>
          <div className="card glass quick-actions">
            <button className="btn-primary btn-full quick-action-btn" onClick={() => navigate('/ingredients')}>
              <span className="btn-icon">🔍</span> Got ingredients?
            </button>
            <button className="btn-secondary btn-full quick-action-btn" onClick={() => navigate('/recipes')}>
              <span className="btn-icon">🍽️</span> Find any recipe
            </button>
            <button className="btn-secondary btn-full quick-action-btn" onClick={() => navigate('/detection')}>
              <span className="btn-icon">📸</span> Detect food by image
            </button>
            <button className="btn-secondary btn-full quick-action-btn" onClick={() => navigate('/tdee')}>
              <span className="btn-icon">🔥</span> Check Calorie Goals
            </button>
          </div>
        </div>
      </div>
      
      {isModalOpen && dailyRecipe && (
        <RecipeModal recipe={dailyRecipe} onClose={() => setModalOpen(false)} />
      )}
    </section>
  );
}
