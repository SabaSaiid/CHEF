import React, { useState, useEffect, useContext } from 'react';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';
import ChefScoreBadge from '../components/ChefScoreBadge';
import { getRecipeCardVisual } from '../utils/recipeVisuals';

export default function SavedRecipes() {
  const { token } = useContext(AuthContext);
  const toast = useToast();
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
    const handleFocus = () => fetchRecipes();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token, sortBy]);

  const handleRate = async (id, rating) => {
    try {
      await api.put(`/recipes/saved/${id}/rate`, { rating });
      toast.success(`Rated ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`);
      fetchRecipes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/recipes/saved/${id}`);
      toast.success('Recipe removed');
      fetchRecipes();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExport = async (recipe, format) => {
    try {
      const response = await api.get(`/recipes/saved/${recipe.id}/export?format=${format}`, {
        responseType: 'blob'
      });
      const mimeType = format === 'pdf' ? 'application/pdf' : 'text/plain;charset=utf-8';
      const blob = new Blob([response], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const safeTitle = (recipe.title || 'recipe').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ext = format === 'pdf' ? 'pdf' : 'txt';
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Downloaded ${recipe.title} as ${format.toUpperCase()} ✓`);
    } catch (err) {
      console.error(`Export ${format} failed:`, err);
      // Client-side fallback for text format
      if (format === 'text') {
        try {
          let textContent = `============================================================\n`;
          textContent += `  ${recipe.title}\n`;
          textContent += `============================================================\n\n`;
          if (recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g) {
            textContent += `NUTRITION\n----------------------------------------\n`;
            if (recipe.calories) textContent += `  Calories: ${Math.round(recipe.calories)} kcal\n`;
            if (recipe.protein_g) textContent += `  Protein: ${recipe.protein_g}g\n`;
            if (recipe.carbs_g) textContent += `  Carbs: ${recipe.carbs_g}g\n`;
            if (recipe.fat_g) textContent += `  Fat: ${recipe.fat_g}g\n`;
            textContent += `\n`;
          }
          if (recipe.ingredients) {
            textContent += `INGREDIENTS\n----------------------------------------\n`;
            let ingsArr = [];
            try {
              ingsArr = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
            } catch (e) {
              ingsArr = recipe.ingredients.split(',').map(s => s.trim());
            }
            ingsArr.forEach(ing => {
              const ingStr = typeof ing === 'object' ? `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim() : String(ing).trim();
              textContent += `  • ${ingStr}\n`;
            });
            textContent += `\n`;
          }
          if (recipe.instructions) {
            const cleanInst = recipe.instructions.replace(/<[^>]+>/g, '');
            textContent += `INSTRUCTIONS\n----------------------------------------\n${cleanInst}\n\n`;
          }
          textContent += `------------------------------------------------------------\nExported from CHEF — Constraint-based Hybrid Eating Framework\n`;

          const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
          const url = window.URL.createObjectURL(blob);
          const safeTitle = (recipe.title || 'recipe').replace(/[^a-zA-Z0-9_-]/g, '_');
          const link = document.createElement('a');
          link.href = url;
          link.download = `${safeTitle}.txt`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          toast.success(`Exported "${recipe.title}" as TXT ✓`);
          return;
        } catch (fallbackErr) {
          console.error("Fallback export failed:", fallbackErr);
        }
      }
      toast.error(`Failed to export recipe: ${err.message}`);
    }
  };

  const handlePrint = (recipe) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Pop-up blocked. Please allow pop-ups to print.");
      return;
    }
    const cleanTitle = DOMPurify.sanitize(recipe.title || 'Recipe');
    const cleanSummary = recipe.summary ? DOMPurify.sanitize(recipe.summary) : '';
    let ingsArr = [];
    if (recipe.ingredients) {
      try {
        ingsArr = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
      } catch (e) {
        ingsArr = recipe.ingredients.split(',').map(s => s.trim());
      }
    }
    const ingredientsList = ingsArr.length > 0
      ? ingsArr.map(i => `<li>${DOMPurify.sanitize(typeof i === 'object' ? `${i.amount || ''} ${i.unit || ''} ${i.name || ''}`.trim() : String(i).trim())}</li>`).join('')
      : '<li>No ingredients listed</li>';
    const instructionsText = recipe.instructions
      ? DOMPurify.sanitize(recipe.instructions).replace(/\n/g, '<br/>')
      : 'No instructions listed';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${cleanTitle} — CHEF Recipe</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 40px; color: #2d3748; line-height: 1.6; }
          h1 { color: #e07a5f; margin-bottom: 5px; border-bottom: 2px solid #e07a5f; padding-bottom: 8px; }
          .meta { font-size: 14px; color: #718096; margin-bottom: 20px; }
          .section-title { font-size: 18px; font-weight: bold; color: #e07a5f; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          ul { padding-left: 20px; }
          li { margin-bottom: 6px; }
          .footer { margin-top: 40px; pt-4; border-top: 1px solid #e2e8f0; font-size: 12px; color: #a0aec0; text-align: center; }
          @media print {
            body { margin: 20px; }
          }
        </style>
      </head>
      <body>
        <h1>${cleanTitle}</h1>
        <div class="meta">
          ${recipe.calories ? `<span>🔥 ${Math.round(recipe.calories)} kcal</span> &nbsp;•&nbsp; ` : ''}
          ${recipe.ready_in_minutes ? `<span>⏱️ ${recipe.ready_in_minutes} mins</span> &nbsp;•&nbsp; ` : ''}
          ${recipe.rating ? `<span>★ ${recipe.rating}/5</span>` : ''}
        </div>
        ${cleanSummary ? `<p><em>${cleanSummary}</em></p>` : ''}
        <div class="section-title">Ingredients</div>
        <ul>${ingredientsList}</ul>
        <div class="section-title">Instructions</div>
        <p>${instructionsText}</p>
        <div class="footer">Exported from CHEF — Constraint-based Hybrid Eating Framework</div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
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
            {recipes.map((r, idx) => {
              const visual = getRecipeCardVisual(r);
              return (
              <div key={r.id} className="recipe-card" style={{animationDelay: `${idx * 0.06}s`}}>
                {r.image_url ? (
                  <img 
                    className="recipe-image" 
                    src={r.image_url} 
                    alt={r.title} 
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextSibling) {
                        e.currentTarget.nextSibling.style.display = 'flex';
                      }
                    }} 
                  />
                ) : null}
                
                <div 
                  className="recipe-image" 
                  style={{ 
                    display: r.image_url ? 'none' : 'flex', 
                    background: visual.gradient, 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ fontSize: '32px' }}>{visual.icon}</span>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '8px' }}>
                    {visual.category}
                  </span>
                </div>
                <div className="recipe-info">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="recipe-title" style={{ flex: 1 }}>{r.title}</div>
                    {(r.nutri_score || r.chef_score) && <ChefScoreBadge grade={(r.nutri_score || r.chef_score).grade} size="sm" />}
                  </div>
                  {r.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(r.summary)}}></div>}
                  <div className="recipe-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {r.calories && <span className="recipe-meta-item">🔥 <span className="value">{Math.round(r.calories)} kcal</span></span>}
                      {r.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{r.ready_in_minutes} min</span></span>}
                      {(() => {
                        const isSpoonacular = r.source === 'Spoonacular' || String(r.id).startsWith('spoonacular') || (r.source_url && r.source_url.includes('spoonacular'));
                        return (
                          <span className={`recipe-source-badge ${isSpoonacular ? 'recipe-source-badge-spoonacular' : 'recipe-source-badge-local'}`}>
                            {isSpoonacular ? '🌐 Spoonacular' : '📁 Local'}
                          </span>
                        );
                      })()}
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
                  <div className="recipe-actions" style={{ marginTop: '15px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={() => setSelectedRecipe({...r, ingredients: r.ingredients ? (typeof r.ingredients === 'string' && r.ingredients.startsWith('[') ? JSON.parse(r.ingredients) : r.ingredients.split(', ')) : []})}>View Details</button>
                    <button className="btn-secondary" onClick={() => handleExport(r, 'text')} title="Export as Text">📄 Text</button>
                    <button className="btn-secondary" onClick={() => handleExport(r, 'pdf')} title="Export as PDF">📕 PDF</button>
                    <button className="btn-secondary" onClick={() => handlePrint(r)} title="Print Recipe">🖨️ Print</button>
                    <button className="btn-danger" onClick={() => handleDelete(r.id)}>🗑️ Remove</button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      <RecipeModal recipe={selectedRecipe} onClose={() => setSelectedRecipe(null)} />
    </section>
  );
}
