import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Ingredients() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chef_search_history')) || []; }
    catch { return []; }
  });
  const navigate = useNavigate();

  const handleParse = async (queryToParse = text) => {
    if (!queryToParse.trim()) { setError('Please enter some ingredients first'); return; }
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ingredients/parse', { text: queryToParse });
      setResults(data);
      
      // Update history
      const newHistory = [queryToParse.trim(), ...history.filter(h => h !== queryToParse.trim())].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('chef_search_history', JSON.stringify(newHistory));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchRecipes = () => {
    if (results && results.ingredient_names.length > 0) {
      navigate('/recipes', { state: { ingredients: results.ingredient_names.join(', ') } });
    }
  };


  return (
    <section className="page active">
      <div className="page-header">
        <h1>Enter Ingredients</h1>
        <p className="subtitle">Analyze your ingredients to discover matching recipes from our 7,000+ collection.</p>
      </div>

      <div className="card glass">
        <textarea
          placeholder={"Enter ingredients, e.g.:\n2 cups atta (wheat flour)\n1 cup chana dal\npotatoes, onion, tomato\npaneer, green chili, cumin"}
          rows="6"
          value={text}
          onChange={e => setText(e.target.value)}
        />
        {history.length > 0 && (
          <div className="search-history" style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>🕒 Recent:</span>
            {history.map((h, i) => (
              <button 
                key={i} 
                className="sub-tag" 
                style={{ cursor: 'pointer', border: 'none', background: 'var(--bg-secondary)', color: 'var(--text-main)' }}
                onClick={() => {
                  setText(h);
                  handleParse(h);
                }}
              >
                {h.length > 20 ? h.substring(0, 20) + '...' : h}
              </button>
            ))}
          </div>
        )}
        {error && <div style={{ color: 'red', marginTop: '10px' }}>{error}</div>}
        <button className={`btn-primary ${loading ? 'loading' : ''}`} onClick={() => handleParse(text)} disabled={loading} style={{marginTop: '15px'}}>
          <span className="btn-icon">🔍</span> Analyze
        </button>
      </div>

      <div className="results-area">
        {results && results.ingredients.length === 0 && (
          <div className="empty-state">
            <span className="empty-icon">🤷</span>
            <p>No ingredients found. Try something like "2 cups flour, 3 eggs"</p>
          </div>
        )}

        {results && results.ingredients.length > 0 && (
          <>
            <table className="ingredient-table">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Quantity</th>
                  <th>Unit</th>
                  <th>Substitutes</th>
                </tr>
              </thead>
              <tbody>
                {results.ingredients.map((ing, i) => (
                  <tr key={i}>
                    <td className="ingredient-name">{ing.name}</td>
                    <td>{ing.quantity !== null ? ing.quantity : '—'}</td>
                    <td>{ing.unit ? ing.unit : '—'}</td>
                    <td>
                      {!ing.substitutes || ing.substitutes.length === 0 ? (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None found</span>
                      ) : (
                        <div className="sub-list">
                          {ing.substitutes.map((s, si) => (
                            <span key={si} className="sub-tag">{s}</span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="search-from-parsed" style={{ marginTop: '20px' }}>
              <button className="btn-secondary" onClick={handleSearchRecipes}>
                🍽️ Find recipes with these ingredients
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
