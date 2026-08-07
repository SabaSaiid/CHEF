import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { formatQuantityValue } from '../utils/ingredientParser';

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
                    <td>{ing.quantity !== null ? formatQuantityValue(ing.quantity) : '—'}</td>
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

      {/* Ingredient Directory Catalog */}
      {!results && (
        <div style={{ marginTop: '24px' }}>
          <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            📚 Ingredient Directory
          </h2>
          <p className="subtitle" style={{ marginBottom: '16px' }}>Quick-click any ingredient to analyze it instantly.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {[
              { cat: '🥬 Produce', items: ['Tomato', 'Onion', 'Potato', 'Spinach', 'Garlic', 'Ginger', 'Green Chili', 'Coriander', 'Carrot', 'Capsicum'] },
              { cat: '🍗 Proteins', items: ['Chicken', 'Paneer', 'Eggs', 'Tofu', 'Lentils (Dal)', 'Chickpeas', 'Fish', 'Mutton', 'Soy Chunks', 'Kidney Beans'] },
              { cat: '🧈 Dairy & Oils', items: ['Ghee', 'Butter', 'Milk', 'Yogurt (Curd)', 'Cream', 'Coconut Oil', 'Mustard Oil', 'Olive Oil', 'Cheese', 'Coconut Milk'] },
              { cat: '🌾 Grains & Flour', items: ['Rice', 'Wheat Flour (Atta)', 'Besan (Gram Flour)', 'Semolina (Suji)', 'Oats', 'Maida', 'Poha (Flattened Rice)', 'Quinoa', 'Bread', 'Pasta'] },
              { cat: '🫙 Spices', items: ['Turmeric', 'Cumin', 'Coriander Powder', 'Red Chili Powder', 'Garam Masala', 'Mustard Seeds', 'Black Pepper', 'Cinnamon', 'Cardamom', 'Bay Leaf'] },
              { cat: '🫒 Condiments', items: ['Salt', 'Sugar', 'Lemon Juice', 'Vinegar', 'Soy Sauce', 'Tamarind', 'Jaggery', 'Honey', 'Tomato Paste', 'Amchur (Dry Mango)'] },
            ].map((group) => (
              <div key={group.cat} className="card glass" style={{ padding: '16px' }}>
                <h3 style={{ margin: '0 0 10px', fontSize: '1rem', fontWeight: 700 }}>{group.cat}</h3>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {group.items.map(item => (
                    <button
                      key={item}
                      className="sub-tag"
                      style={{ 
                        cursor: 'pointer', 
                        border: '1px solid var(--border-glass)', 
                        background: 'var(--bg-secondary)', 
                        color: 'var(--text-main)',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => {
                        setText(item);
                        handleParse(item);
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'var(--bg-secondary)'; e.currentTarget.style.color = 'var(--text-main)'; }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
