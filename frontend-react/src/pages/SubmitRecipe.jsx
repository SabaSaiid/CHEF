import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import ChefScoreBadge from '../components/ChefScoreBadge';

export default function SubmitRecipe() {
  const { token } = useContext(AuthContext);
  const toast = useToast();
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [readyInMinutes, setReadyInMinutes] = useState(30);
  const [servings, setServings] = useState(4);
  const [ingredients, setIngredients] = useState(['', '']);
  const [instructions, setInstructions] = useState('');
  const [mealType, setMealType] = useState('Lunch/Dinner');
  const [region, setRegion] = useState('International');
  const [selectedDiets, setSelectedDiets] = useState([]);

  // Macros
  const [calories, setCalories] = useState(450);
  const [proteinG, setProteinG] = useState(30);
  const [carbsG, setCarbsG] = useState(40);
  const [fatG, setFatG] = useState(15);
  const [fiberG, setFiberG] = useState(5);
  const [sodiumMg, setSodiumMg] = useState(400);
  const [sugarG, setSugarG] = useState(5);

  const [submitting, setSubmitting] = useState(false);

  const availableDiets = ['Vegetarian', 'Vegan', 'Gluten-Free', 'High-Protein', 'Low-Carb', 'Keto', 'Mediterranean'];

  // Quick Nutri-Score grade estimation preview helper
  const estimateNutriScoreGrade = () => {
    const c = Number(calories) || 0;
    const s = Number(sugarG) || 0;
    const f = Number(fatG) || 0;
    const p = Number(proteinG) || 0;
    const fib = Number(fiberG) || 0;

    let points = (c / 80) + (s / 4.5) + (f / 3);
    let goodPoints = (p / 2) + (fib / 1.5);
    let netScore = points - goodPoints;

    if (netScore <= 2) return 'A';
    if (netScore <= 6) return 'B';
    if (netScore <= 11) return 'C';
    if (netScore <= 16) return 'D';
    return 'E';
  };

  const handleAddIngredient = () => {
    setIngredients(prev => [...prev, '']);
  };

  const handleRemoveIngredient = (index) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index, value) => {
    setIngredients(prev => {
      const copy = [...prev];
      copy[index] = value;
      return copy;
    });
  };

  const handleToggleDiet = (diet) => {
    setSelectedDiets(prev =>
      prev.includes(diet) ? prev.filter(d => d !== diet) : [...prev, diet]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.showError("Please log in to submit a recipe.");
      return;
    }

    const filteredIngs = ingredients.map(i => i.trim()).filter(Boolean);
    if (filteredIngs.length === 0) {
      toast.showError("Please provide at least one ingredient.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim() || null,
        image_url: imageUrl.trim() || null,
        ready_in_minutes: Number(readyInMinutes),
        servings: Number(servings),
        ingredients: filteredIngs,
        instructions: instructions.trim(),
        diets: selectedDiets,
        meal_type: mealType,
        region: region,
        calories: Number(calories),
        protein_g: Number(proteinG),
        carbs_g: Number(carbsG),
        fat_g: Number(fatG),
        fiber_g: Number(fiberG),
        sodium_mg: Number(sodiumMg),
        sugar_g: Number(sugarG),
      };

      const res = await api.post('/community/recipes', payload);
      toast.showSuccess(`Recipe submitted! Status: ${res.moderation_status.toUpperCase()}`);
      navigate('/community');
    } catch (err) {
      toast.showError(err.response?.data?.detail || "Failed to submit recipe.");
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedGrade = estimateNutriScoreGrade();

  return (
    <div className="page-container" style={{ maxWidth: '820px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link to="/community" style={{ textDecoration: 'none', color: 'var(--accent-1)', fontWeight: 700, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Community Hub
        </Link>
        <h1 style={{ margin: '12px 0 6px 0', fontSize: '2rem', fontWeight: '800', color: 'var(--text-primary)' }}>👨‍🍳 Submit a Custom Recipe</h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '14px' }}>
          Share your culinary creation with the CHEF community. Nutri-Score grade will be evaluated automatically.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="community-card-glass" style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
        
        {/* Title & Summary */}
        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Recipe Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Garlic Herb Roasted Chicken Breast"
            value={title}
            onChange={e => setTitle(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>

        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Summary / Description</label>
          <textarea
            rows={2}
            placeholder="Brief description of the dish, flavor profile, or background..."
            value={summary}
            onChange={e => setSummary(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>

        {/* Photo URL & Live Preview */}
        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Photo URL (Optional)</label>
          <input
            type="url"
            placeholder="https://images.unsplash.com/... or Imgur image link"
            value={imageUrl}
            onChange={e => setImageUrl(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px', marginBottom: '10px' }}
          />

          {imageUrl.trim() && (
            <div style={{ position: 'relative', maxWidth: '320px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-glass)' }}>
              <img
                src={imageUrl.trim()}
                alt="Recipe Photo Preview"
                style={{ width: '100%', maxHeight: '180px', objectFit: 'cover', display: 'block' }}
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
              <div style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '2px 8px', borderRadius: '6px', fontSize: '11px' }}>
                Photo Preview
              </div>
            </div>
          )}
        </div>

        {/* Basic metadata */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>Total Time (mins) *</label>
            <input
              type="number"
              min="1"
              required
              value={readyInMinutes}
              onChange={e => setReadyInMinutes(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>Servings Yield *</label>
            <input
              type="number"
              min="1"
              required
              value={servings}
              onChange={e => setServings(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>

          <div>
            <label style={{ fontWeight: '600', fontSize: '13px', display: 'block', marginBottom: '4px', color: 'var(--text-secondary)' }}>Meal Slot</label>
            <select
              value={mealType}
              onChange={e => setMealType(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value="Breakfast">Breakfast</option>
              <option value="Lunch/Dinner">Lunch/Dinner</option>
              <option value="Snack">Snack</option>
            </select>
          </div>
        </div>

        {/* Ingredients Builder */}
        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Ingredients List *</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ingredients.map((ing, idx) => (
              <div key={idx} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={`Ingredient ${idx + 1} (e.g., 200g boneless chicken breast)`}
                  value={ing}
                  onChange={e => handleIngredientChange(idx, e.target.value)}
                  style={{ flex: 1, padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
                />
                {ingredients.length > 1 && (
                  <button type="button" onClick={() => handleRemoveIngredient(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                    ❌
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={handleAddIngredient} className="action-btn secondary" style={{ marginTop: '10px', padding: '6px 14px', fontSize: '13px', borderRadius: '8px' }}>
            ➕ Add Ingredient Line
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '6px', color: 'var(--text-primary)' }}>Step-by-Step Instructions *</label>
          <textarea
            rows={5}
            required
            placeholder="1. Preheat oven to 400°F (200°C)...&#10;2. Season chicken breast with olive oil and spices...&#10;3. Bake for 25 minutes..."
            value={instructions}
            onChange={e => setInstructions(e.target.value)}
            style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '14px' }}
          />
        </div>

        {/* Nutrition Macros & Estimated Nutri-Score Preview */}
        <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <label style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
              Nutrition Facts (per serving)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-muted)' }}>Estimated Score:</span>
              <ChefScoreBadge grade={estimatedGrade} size="sm" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calories (kcal) *</label>
              <input type="number" step="any" min="0" required value={calories} onChange={e => setCalories(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#e07a5f', fontWeight: 700 }}>Protein (g) *</label>
              <input type="number" step="any" min="0" required value={proteinG} onChange={e => setProteinG(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#f2cc8f', fontWeight: 700 }}>Carbs (g) *</label>
              <input type="number" step="any" min="0" required value={carbsG} onChange={e => setCarbsG(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#81b29a', fontWeight: 700 }}>Fat (g) *</label>
              <input type="number" step="any" min="0" required value={fatG} onChange={e => setFatG(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Fiber (g)</label>
              <input type="number" step="any" min="0" value={fiberG} onChange={e => setFiberG(e.target.value)} style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>

        {/* Diet Tags Picker */}
        <div>
          <label style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '8px', color: 'var(--text-primary)' }}>Dietary Tags</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {availableDiets.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => handleToggleDiet(d)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  border: '1px solid',
                  borderColor: selectedDiets.includes(d) ? 'var(--accent-1)' : 'var(--border-glass)',
                  background: selectedDiets.includes(d) ? 'var(--gradient-primary)' : 'var(--bg-secondary)',
                  color: selectedDiets.includes(d) ? '#ffffff' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: selectedDiets.includes(d) ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="action-btn primary"
          style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: '800', borderRadius: '12px', marginTop: '10px' }}
        >
          {submitting ? 'Submitting Recipe...' : '🚀 Submit Recipe to Community'}
        </button>

      </form>
    </div>
  );
}
