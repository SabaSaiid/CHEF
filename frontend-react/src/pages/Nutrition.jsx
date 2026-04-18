import React, { useState } from 'react';
import api from '../services/api';

export default function Nutrition() {
  const [food, setFood] = useState('');
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!food.trim()) {
      setError('Enter a food item to analyze');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/nutrition/analyze', { food_item: food, quantity: parseFloat(qty) || 1 });
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Nutrition Lookup</h1>
        <p className="subtitle">Check nutritional values for common foods</p>
      </div>

      <div className="card glass">
        <div className="input-row">
          <input 
            type="text" 
            placeholder="e.g. chicken breast" 
            value={food}
            onChange={e => setFood(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
          />
          <input 
            type="number" 
            placeholder="Qty" 
            value={qty} 
            min="0.1" 
            step="0.1" 
            className="qty-input" 
            onChange={e => setQty(e.target.value)}
          />
          <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={handleAnalyze} disabled={loading}>
            <span className="btn-icon">📊</span> Analyze
          </button>
        </div>
      </div>

      <div className="results-area">
        {error && <div style={{color: 'red'}}>{error}</div>}
        {results && (
          <div className="nutrition-card">
            <div className="nutrition-header">{results.food_item}</div>
            <div className="nutrition-source">
              {results.quantity} {results.unit} · Source: {results.source}
            </div>
            <div className="nutrition-grid">
              <div className="nutrient-box">
                <div className="nutrient-value calories">{results.calories}<span className="nutrient-unit"> kcal</span></div>
                <div className="nutrient-label">Calories</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.protein_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Protein</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.carbs_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Carbs</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.fat_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Fat</div>
              </div>
              {results.fiber_g !== null && (
                <div className="nutrient-box">
                  <div className="nutrient-value">{results.fiber_g}<span className="nutrient-unit">g</span></div>
                  <div className="nutrient-label">Fiber</div>
                </div>
              )}
              {results.sugar_g !== null && (
                <div className="nutrient-box">
                  <div className="nutrient-value">{results.sugar_g}<span className="nutrient-unit">g</span></div>
                  <div className="nutrient-label">Sugar</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
