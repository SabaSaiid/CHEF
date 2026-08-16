import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import { 
  Bookmark, 
  Search, 
  Sparkles, 
  Clock, 
  Flame, 
  Star, 
  Filter, 
  Grid, 
  List, 
  Download, 
  Printer, 
  Trash2, 
  Copy, 
  Check, 
  Dices, 
  ChevronDown, 
  Utensils, 
  Share2, 
  X, 
  ExternalLink,
  BookOpen,
  SlidersHorizontal,
  RefreshCw,
  ChefHat,
  ArrowUpDown,
  Lock
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';
import ChefScoreBadge from '../components/ChefScoreBadge';
import AuthModal from '../components/AuthModal';
import { getRecipeCardVisual } from '../utils/recipeVisuals';

/* ── Interactive Star Rating Component ──────────────────────── */
function StarRating({ value = 0, onChange }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="sr-stars" onMouseLeave={() => setHovered(0)} title={`Rating: ${value || 0}/5`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            className={`sr-star-btn ${isFilled ? 'filled' : ''} ${hovered === star ? 'hovered' : ''}`}
            onMouseEnter={() => setHovered(star)}
            onClick={(e) => {
              e.stopPropagation();
              onChange(star === value ? 0 : star);
            }}
            aria-label={`Rate ${star} stars`}
          >
            ★
          </button>
        );
      })}
      {value > 0 && <span className="sr-star-num">{value}.0</span>}
    </div>
  );
}

/* ── Macro Pill Component ───────────────────────────────────── */
function MacroPill({ icon, label, value, color, unit = '' }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className="sr-macro-chip" style={{ '--chip-accent': color }}>
      <span className="sr-macro-icon">{icon}</span>
      <span className="sr-macro-val">{value}{unit}</span>
      <span className="sr-macro-label">{label}</span>
    </div>
  );
}

/* ── Export & Print Utility Helpers ─────────────────────────── */
async function doExport(recipe, format, toast) {
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
    toast.success(`Downloaded "${recipe.title}" as ${format.toUpperCase()} ✓`);
  } catch (err) {
    console.error(`Export ${format} failed:`, err);
    if (format === 'text') {
      try {
        let textContent = `============================================================\n`;
        textContent += `  ${recipe.title}\n`;
        textContent += `============================================================\n\n`;
        if (recipe.calories || recipe.protein_g || recipe.carbs_g || recipe.fat_g) {
          textContent += `NUTRITION & MACROS\n----------------------------------------\n`;
          if (recipe.calories) textContent += `  Calories: ${Math.round(recipe.calories)} kcal\n`;
          if (recipe.protein_g) textContent += `  Protein: ${recipe.protein_g}g\n`;
          if (recipe.carbs_g) textContent += `  Carbs: ${recipe.carbs_g}g\n`;
          if (recipe.fat_g) textContent += `  Fat: ${recipe.fat_g}g\n`;
          if (recipe.ready_in_minutes) textContent += `  Prep Time: ${recipe.ready_in_minutes} minutes\n`;
          if (recipe.servings) textContent += `  Servings: ${recipe.servings}\n`;
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
}

function doPrint(recipe, toast) {
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
        h1 { color: #ff5a36; margin-bottom: 5px; border-bottom: 2px solid #ff5a36; padding-bottom: 8px; font-size: 26px; }
        .meta { font-size: 14px; color: #718096; margin-bottom: 20px; display: flex; gap: 12px; }
        .section-title { font-size: 17px; font-weight: bold; color: #ff5a36; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        ul { padding-left: 20px; margin-top: 8px; }
        li { margin-bottom: 6px; }
        .summary { font-style: italic; color: #4a5568; margin: 15px 0; background: #fff5f2; padding: 12px; border-radius: 8px; border-left: 4px solid #ff5a36; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #a0aec0; text-align: center; }
        @media print { body { margin: 20px; } }
      </style>
    </head>
    <body>
      <h1>${cleanTitle}</h1>
      <div class="meta">
        ${recipe.calories ? `<span>🔥 ${Math.round(recipe.calories)} kcal</span>` : ''}
        ${recipe.ready_in_minutes ? `<span>⏱️ ${recipe.ready_in_minutes} mins</span>` : ''}
        ${recipe.servings ? `<span>🍽️ ${recipe.servings} servings</span>` : ''}
        ${recipe.rating ? `<span>★ ${recipe.rating}/5</span>` : ''}
      </div>
      ${cleanSummary ? `<div class="summary">${cleanSummary}</div>` : ''}
      <div class="section-title">Ingredients</div>
      <ul>${ingredientsList}</ul>
      <div class="section-title">Instructions</div>
      <p>${instructionsText}</p>
      <div class="footer">Exported from CHEF — Constraint-based Hybrid Eating Framework</div>
      <script>window.onload = function() { window.print(); };</script>
    </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
}

function exportAllCookbook(recipes, toast) {
  if (!recipes.length) {
    toast.error("No recipes to export.");
    return;
  }
  let txt = `============================================================\n`;
  txt += `  MY CHEF RECIPE BOOK (${recipes.length} SAVED RECIPES)\n`;
  txt += `  Exported on: ${new Date().toLocaleDateString()}\n`;
  txt += `============================================================\n\n`;

  recipes.forEach((r, idx) => {
    txt += `[RECIPE #${idx + 1}] ${r.title.toUpperCase()}\n`;
    txt += `------------------------------------------------------------\n`;
    if (r.calories || r.protein_g || r.carbs_g || r.fat_g) {
      txt += `Nutrition: ${r.calories ? `${Math.round(r.calories)} kcal | ` : ''}${r.protein_g ? `Protein: ${r.protein_g}g | ` : ''}${r.carbs_g ? `Carbs: ${r.carbs_g}g | ` : ''}${r.fat_g ? `Fat: ${r.fat_g}g` : ''}\n`;
    }
    if (r.ready_in_minutes) txt += `Prep Time: ${r.ready_in_minutes} mins\n`;
    if (r.rating) txt += `Rating: ${'★'.repeat(r.rating)}${'☆'.repeat(5 - r.rating)} (${r.rating}/5)\n`;
    txt += `\n`;
  });

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `My_CHEF_Cookbook_${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
  toast.success(`Exported complete cookbook (${recipes.length} recipes) ✓`);
}

/* ── Recipe Roulette / Surprise Picker Modal ─────────────────── */
function RouletteModal({ isOpen, onClose, recipes, onSelectRecipe }) {
  const [spinning, setSpinning] = useState(false);
  const [chosenRecipe, setChosenRecipe] = useState(null);

  useEffect(() => {
    if (isOpen && recipes.length > 0) {
      spinRoulette();
    }
  }, [isOpen]);

  const spinRoulette = () => {
    if (!recipes.length) return;
    setSpinning(true);
    let count = 0;
    const maxSteps = 16;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * recipes.length);
      setChosenRecipe(recipes[randomIdx]);
      count++;
      if (count >= maxSteps) {
        clearInterval(interval);
        setSpinning(false);
      }
    }, 90);
  };

  if (!isOpen || !chosenRecipe) return null;
  const visual = getRecipeCardVisual(chosenRecipe);

  return (
    <div className="sr-roulette-overlay" onClick={onClose}>
      <div className="sr-roulette-dialog" onClick={e => e.stopPropagation()}>
        <button className="sr-modal-close" onClick={onClose}>✕</button>
        <div className="sr-roulette-header">
          <span className="sr-roulette-badge">🎲 Chef Roulette</span>
          <h2>What Should You Cook Today?</h2>
          <p>We spun your saved recipe book and picked this delicious dish for you!</p>
        </div>

        <div className={`sr-roulette-card ${spinning ? 'spinning' : 'picked'}`}>
          <div className="sr-roulette-visual" style={{ background: visual.gradient }}>
            {chosenRecipe.image_url ? (
              <img src={chosenRecipe.image_url} alt={chosenRecipe.title} />
            ) : (
              <span className="sr-roulette-icon">{visual.icon}</span>
            )}
            <span className="sr-roulette-cat">{visual.category}</span>
          </div>
          <div className="sr-roulette-details">
            <h3 className="sr-roulette-title">{chosenRecipe.title}</h3>
            <div className="sr-roulette-meta">
              {chosenRecipe.calories && <span>🔥 {Math.round(chosenRecipe.calories)} kcal</span>}
              {chosenRecipe.ready_in_minutes && <span>⏱️ {chosenRecipe.ready_in_minutes} min</span>}
              {chosenRecipe.rating ? <span>⭐ {chosenRecipe.rating}/5</span> : null}
            </div>
          </div>
        </div>

        <div className="sr-roulette-actions">
          <button 
            className="btn-primary sr-btn-cook" 
            disabled={spinning}
            onClick={() => {
              onClose();
              onSelectRecipe(chosenRecipe);
            }}
          >
            <Utensils size={18} /> Cook This Recipe
          </button>
          <button 
            className="btn-secondary sr-btn-spin-again" 
            disabled={spinning}
            onClick={spinRoulette}
          >
            <RefreshCw size={16} className={spinning ? 'spin-anim' : ''} /> Spin Again
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Individual Recipe Card (Grid & List View Modes) ────────── */
function RecipeCard({ 
  r, 
  idx, 
  viewMode, 
  onView, 
  onRate, 
  onDelete, 
  onExport, 
  onPrint, 
  onCopyIngredients 
}) {
  const visual = getRecipeCardVisual(r);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [dropdownOpen]);

  const handleCopy = (e) => {
    e.stopPropagation();
    onCopyIngredients(r);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Compact List Mode Layout ────────────────────────────── */
  if (viewMode === 'list') {
    return (
      <div className="sr-list-card" style={{ animationDelay: `${Math.min(idx * 0.04, 0.4)}s` }}>
        <div 
          className="sr-list-thumb" 
          style={{ background: visual.gradient }}
          onClick={() => onView(r)}
        >
          {r.image_url ? (
            <img 
              src={r.image_url} 
              alt={r.title}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <span className="sr-list-thumb-icon">{visual.icon}</span>
          )}
        </div>

        <div className="sr-list-main" onClick={() => onView(r)}>
          <div className="sr-list-header">
            <h3 className="sr-list-title">{r.title}</h3>
            {(r.nutri_score || r.chef_score) && (
              <ChefScoreBadge grade={(r.nutri_score || r.chef_score).grade} size="sm" />
            )}
          </div>

          <div className="sr-list-meta-row">
            {r.calories && <span className="sr-meta-pill">🔥 {Math.round(r.calories)} kcal</span>}
            {r.protein_g && <span className="sr-meta-pill">💪 {Math.round(r.protein_g)}g P</span>}
            {r.carbs_g && <span className="sr-meta-pill">🌾 {Math.round(r.carbs_g)}g C</span>}
            {r.fat_g && <span className="sr-meta-pill">💧 {Math.round(r.fat_g)}g F</span>}
            {r.ready_in_minutes && <span className="sr-meta-pill">⏱️ {r.ready_in_minutes}m</span>}
          </div>
        </div>

        <div className="sr-list-rating-cell">
          <StarRating value={r.rating || 0} onChange={(val) => onRate(r.id, val)} />
        </div>

        <div className="sr-list-actions">
          <button 
            className="btn-secondary sr-btn-view-compact"
            onClick={() => onView(r)}
            title="View full recipe & step-by-step assistant"
          >
            <Utensils size={14} /> Cook
          </button>

          <div className="sr-more-menu-wrapper" ref={dropdownRef}>
            <button 
              className="sr-btn-icon-more" 
              onClick={() => setDropdownOpen(o => !o)}
              title="More Actions"
            >
              ⋯
            </button>

            {dropdownOpen && (
              <div className="sr-dropdown-menu">
                <button onClick={handleCopy}>
                  {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />} 
                  {copied ? 'Copied!' : 'Copy Ingredients'}
                </button>
                <button onClick={() => { setDropdownOpen(false); onExport(r, 'text'); }}>
                  <Download size={14} /> Export Text (.txt)
                </button>
                <button onClick={() => { setDropdownOpen(false); onExport(r, 'pdf'); }}>
                  <Download size={14} /> Export PDF (.pdf)
                </button>
                <button onClick={() => { setDropdownOpen(false); onPrint(r); }}>
                  <Printer size={14} /> Print Recipe
                </button>
                <div className="sr-dropdown-divider" />
                <button className="danger" onClick={() => { setDropdownOpen(false); onDelete(r.id); }}>
                  <Trash2 size={14} /> Remove Recipe
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Modern Grid Card Layout ─────────────────────────────── */
  return (
    <div className="sr-grid-card" style={{ animationDelay: `${Math.min(idx * 0.05, 0.5)}s` }}>
      {/* Cover Media */}
      <div className="sr-card-media" onClick={() => onView(r)}>
        {r.image_url ? (
          <img 
            className="sr-card-img" 
            src={r.image_url} 
            alt={r.title}
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              if (e.currentTarget.nextSibling) {
                e.currentTarget.nextSibling.style.display = 'flex';
              }
            }}
          />
        ) : null}

        <div 
          className="sr-card-img-fallback"
          style={{ 
            display: r.image_url ? 'none' : 'flex',
            background: visual.gradient 
          }}
        >
          <span className="sr-card-fallback-icon">{visual.icon}</span>
        </div>

        {/* Top Badges Overlay */}
        <div className="sr-card-overlay-top">
          <span className="sr-category-badge" style={{ borderColor: `${visual.accentColor}40` }}>
            {visual.icon} {visual.category}
          </span>
          {(r.nutri_score || r.chef_score) && (
            <ChefScoreBadge grade={(r.nutri_score || r.chef_score).grade} size="sm" />
          )}
        </div>

        {/* Time Overlay Bottom */}
        {r.ready_in_minutes ? (
          <div className="sr-card-overlay-bottom">
            <span className="sr-time-badge">
              <Clock size={12} /> {r.ready_in_minutes}m
            </span>
          </div>
        ) : null}

        {/* Hover Action Glow */}
        <div className="sr-card-hover-mask">
          <span className="sr-hover-cook-btn">
            <Utensils size={16} /> View Recipe
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="sr-card-content">
        <div className="sr-card-header-row">
          <h3 className="sr-card-title" onClick={() => onView(r)} title={r.title}>
            {r.title}
          </h3>
        </div>

        {/* Macro Nutrient Strip */}
        <div className="sr-macro-strip">
          <MacroPill icon="🔥" label="kcal" value={r.calories ? Math.round(r.calories) : null} color="#ff5a36" />
          <MacroPill icon="💪" label="P" value={r.protein_g ? Math.round(r.protein_g) : null} unit="g" color="#3b82f6" />
          <MacroPill icon="🌾" label="C" value={r.carbs_g ? Math.round(r.carbs_g) : null} unit="g" color="#eab308" />
          <MacroPill icon="💧" label="F" value={r.fat_g ? Math.round(r.fat_g) : null} unit="g" color="#10b981" />
        </div>

        {/* Rating & Quick Action Row */}
        <div className="sr-card-footer">
          <StarRating value={r.rating || 0} onChange={(val) => onRate(r.id, val)} />

          <div className="sr-card-action-btns">
            <button 
              className="btn-secondary sr-btn-view"
              onClick={() => onView(r)}
              title="Cook & View Details"
            >
              <Utensils size={14} /> Cook
            </button>

            <div className="sr-more-menu-wrapper" ref={dropdownRef}>
              <button 
                className="sr-btn-icon-more" 
                onClick={() => setDropdownOpen(o => !o)}
                title="Options"
              >
                ⋯
              </button>

              {dropdownOpen && (
                <div className="sr-dropdown-menu">
                  <button onClick={handleCopy}>
                    {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />} 
                    {copied ? 'Copied!' : 'Copy Ingredients'}
                  </button>
                  <button onClick={() => { setDropdownOpen(false); onExport(r, 'text'); }}>
                    <Download size={14} /> Export Text (.txt)
                  </button>
                  <button onClick={() => { setDropdownOpen(false); onExport(r, 'pdf'); }}>
                    <Download size={14} /> Export PDF (.pdf)
                  </button>
                  <button onClick={() => { setDropdownOpen(false); onPrint(r); }}>
                    <Printer size={14} /> Print Recipe
                  </button>
                  <div className="sr-dropdown-divider" />
                  <button className="danger" onClick={() => { setDropdownOpen(false); onDelete(r.id); }}>
                    <Trash2 size={14} /> Remove Recipe
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main SavedRecipes Page Component ────────────────────────── */
export default function SavedRecipes() {
  const { token } = useContext(AuthContext);
  const toast = useToast();

  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [isRouletteOpen, setRouletteOpen] = useState(false);

  // Filters & Controls state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState('all');
  const [selectedCalorieFilter, setSelectedCalorieFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date_desc');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'list'

  const fetchRecipes = async () => {
    if (!token) {
      setError(null);
      setRecipes([]);
      return;
    }
    setLoading(true);
    try {
      // Fetch user's saved recipes from backend
      const data = await api.get('/recipes/saved');
      setRecipes(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch saved recipes:', err);
      setError(err.message || 'Failed to load saved recipes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecipes();
    const handleFocus = () => {
      if (token) fetchRecipes();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [token]);

  /* Rating handler */
  const handleRate = async (id, rating) => {
    // Optimistic UI update
    setRecipes(prev => prev.map(r => r.id === id ? { ...r, rating } : r));
    try {
      await api.put(`/recipes/saved/${id}/rate`, { rating });
      if (rating > 0) {
        toast.success(`Rated ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`);
      } else {
        toast.info('Rating reset');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update rating');
      fetchRecipes(); // rollback on error
    }
  };

  /* Delete handler */
  const handleDelete = async (id) => {
    const prevList = [...recipes];
    setRecipes(prev => prev.filter(r => r.id !== id));
    try {
      await api.delete(`/recipes/saved/${id}`);
      toast.success('Recipe removed from saved bookmarks');
    } catch (err) {
      toast.error(err.message || 'Failed to remove recipe');
      setRecipes(prevList);
    }
  };

  /* Copy ingredients to clipboard */
  const handleCopyIngredients = (recipe) => {
    let ingsArr = [];
    if (recipe.ingredients) {
      try {
        ingsArr = typeof recipe.ingredients === 'string' ? JSON.parse(recipe.ingredients) : recipe.ingredients;
      } catch (e) {
        ingsArr = recipe.ingredients.split(',').map(s => s.trim());
      }
    }
    const cleanList = ingsArr.map(i => typeof i === 'object' ? `${i.amount || ''} ${i.unit || ''} ${i.name || ''}`.trim() : String(i).trim()).filter(Boolean);
    if (!cleanList.length) {
      toast.info('No ingredients listed for this recipe.');
      return;
    }
    const textToCopy = `🛒 Ingredients for ${recipe.title}:\n` + cleanList.map(item => `• ${item}`).join('\n');
    navigator.clipboard.writeText(textToCopy)
      .then(() => toast.success(`Copied ${cleanList.length} ingredients to clipboard! 📋`))
      .catch(() => toast.error('Failed to copy to clipboard.'));
  };

  /* View details */
  const handleView = (r) => {
    setSelectedRecipe({
      ...r,
      ingredients: r.ingredients
        ? (typeof r.ingredients === 'string' && r.ingredients.startsWith('[')
            ? JSON.parse(r.ingredients)
            : (Array.isArray(r.ingredients) ? r.ingredients : r.ingredients.split(', ')))
        : []
    });
  };

  /* ── Filtered & Sorted Recipes ───────────────────────────────── */
  const filteredRecipes = useMemo(() => {
    let result = [...recipes];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(r => {
        const titleMatch = (r.title || '').toLowerCase().includes(q);
        const summaryMatch = (r.summary || '').toLowerCase().includes(q);
        const ingMatch = typeof r.ingredients === 'string' && r.ingredients.toLowerCase().includes(q);
        return titleMatch || summaryMatch || ingMatch;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      result = result.filter(r => {
        const cat = getRecipeCardVisual(r).category;
        return cat === selectedCategory;
      });
    }

    // Rating filter
    if (selectedRatingFilter === '5') {
      result = result.filter(r => r.rating === 5);
    } else if (selectedRatingFilter === '4plus') {
      result = result.filter(r => (r.rating || 0) >= 4);
    } else if (selectedRatingFilter === 'rated') {
      result = result.filter(r => (r.rating || 0) > 0);
    }

    // Calorie filter
    if (selectedCalorieFilter === 'light') {
      result = result.filter(r => (r.calories || 0) > 0 && r.calories <= 350);
    } else if (selectedCalorieFilter === 'moderate') {
      result = result.filter(r => (r.calories || 0) > 350 && r.calories <= 650);
    } else if (selectedCalorieFilter === 'hearty') {
      result = result.filter(r => (r.calories || 0) > 650);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'date_desc') return (b.id || 0) - (a.id || 0);
      if (sortBy === 'date_asc') return (a.id || 0) - (b.id || 0);
      if (sortBy === 'rating_desc') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'calories_asc') return (a.calories || 9999) - (b.calories || 9999);
      if (sortBy === 'calories_desc') return (b.calories || 0) - (a.calories || 0);
      if (sortBy === 'time_asc') return (a.ready_in_minutes || 999) - (b.ready_in_minutes || 999);
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'nutri_desc') {
        const gradeA = (a.nutri_score || a.chef_score)?.grade || 'Z';
        const gradeB = (b.nutri_score || b.chef_score)?.grade || 'Z';
        return gradeA.localeCompare(gradeB);
      }
      return 0;
    });

    return result;
  }, [recipes, searchQuery, selectedCategory, selectedRatingFilter, selectedCalorieFilter, sortBy]);

  /* ── Stats Calculations ──────────────────────────────────────── */
  const stats = useMemo(() => {
    if (!recipes.length) return null;
    const rated = recipes.filter(r => r.rating);
    const avgRating = rated.length ? (rated.reduce((a, r) => a + r.rating, 0) / rated.length).toFixed(1) : null;
    
    const withCals = recipes.filter(r => r.calories);
    const avgCals = withCals.length ? Math.round(withCals.reduce((a, r) => a + r.calories, 0) / withCals.length) : null;
    
    const withTime = recipes.filter(r => r.ready_in_minutes);
    const avgTime = withTime.length ? Math.round(withTime.reduce((a, r) => a + r.ready_in_minutes, 0) / withTime.length) : null;

    return {
      total: recipes.length,
      avgRating,
      avgCals,
      avgTime
    };
  }, [recipes]);

  // Categories list extracted dynamically
  const availableCategories = useMemo(() => {
    const catMap = {};
    recipes.forEach(r => {
      const cat = getRecipeCardVisual(r).category;
      catMap[cat] = (catMap[cat] || 0) + 1;
    });
    return Object.entries(catMap).map(([name, count]) => ({ name, count }));
  }, [recipes]);

  const hasActiveFilters = searchQuery || selectedCategory !== 'all' || selectedRatingFilter !== 'all' || selectedCalorieFilter !== 'all';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedRatingFilter('all');
    setSelectedCalorieFilter('all');
  };

  return (
    <section className="page active saved-recipes-page">
      {/* ── Hero Header ─────────────────────────────────────── */}
      <div className="sr-hero-banner">
        <div className="sr-hero-ambient-glow" />
        <div className="sr-hero-content">
          <div className="sr-hero-title-area">
            <div className="sr-hero-badge">
              <BookOpen size={16} className="sr-badge-icon" />
              <span>Personal Culinary Library</span>
            </div>
            <h1 className="sr-hero-h1">
              Saved Recipes
            </h1>
            <p className="sr-hero-sub">
              Your hand-picked collection of delicious meals, nutritional benchmarks, and cooking bookmarks.
            </p>
          </div>

          {/* Quick Header Tools */}
          {token && recipes.length > 0 && (
            <div className="sr-hero-actions">
              <button 
                className="btn-primary sr-hero-btn-roulette" 
                onClick={() => setRouletteOpen(true)}
                title="Can't decide? Let CHEF pick a recipe for you!"
              >
                <Dices size={18} />
                <span>Surprise Me!</span>
              </button>

              <button 
                className="btn-secondary sr-hero-btn-export"
                onClick={() => exportAllCookbook(recipes, toast)}
                title="Download your entire saved cookbook as a clean text file"
              >
                <Download size={16} />
                <span>Export Book</span>
              </button>
            </div>
          )}
        </div>

        {/* Stats Chips Bar */}
        {token && stats && (
          <div className="sr-stats-grid">
            <div className="sr-stat-box">
              <div className="sr-stat-icon-wrapper blue">
                <Bookmark size={20} />
              </div>
              <div className="sr-stat-info">
                <span className="sr-stat-value">{stats.total}</span>
                <span className="sr-stat-name">Recipes Saved</span>
              </div>
            </div>

            <div className="sr-stat-box">
              <div className="sr-stat-icon-wrapper amber">
                <Star size={20} />
              </div>
              <div className="sr-stat-info">
                <span className="sr-stat-value">{stats.avgRating ? `${stats.avgRating} / 5` : '—'}</span>
                <span className="sr-stat-name">Avg Rating</span>
              </div>
            </div>

            <div className="sr-stat-box">
              <div className="sr-stat-icon-wrapper orange">
                <Flame size={20} />
              </div>
              <div className="sr-stat-info">
                <span className="sr-stat-value">{stats.avgCals ? `${stats.avgCals} kcal` : '—'}</span>
                <span className="sr-stat-name">Avg Calories</span>
              </div>
            </div>

            <div className="sr-stat-box">
              <div className="sr-stat-icon-wrapper purple">
                <Clock size={20} />
              </div>
              <div className="sr-stat-info">
                <span className="sr-stat-value">{stats.avgTime ? `${stats.avgTime} mins` : '—'}</span>
                <span className="sr-stat-name">Avg Prep Time</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Non-Authenticated State ─────────────────────────── */}
      {!token && (
        <div className="sr-auth-required-card">
          <div className="sr-auth-illustration">
            <div className="sr-auth-icon-circle">
              <Lock size={36} color="var(--primary)" />
            </div>
            <div className="sr-auth-pulse-ring ring-1" />
            <div className="sr-auth-pulse-ring ring-2" />
          </div>
          <h2>Sign in to Access Your Saved Cookbook</h2>
          <p>
            Bookmark delicious recipes, log personalized ratings, track macros, and export print-ready recipe sheets all in one place.
          </p>
          <button 
            className="btn-primary sr-auth-cta-btn" 
            onClick={() => setAuthModalOpen(true)}
          >
            <ChefHat size={18} /> Sign In or Create Account
          </button>
        </div>
      )}

      {/* ── Authenticated Content Area ──────────────────────── */}
      {token && (
        <>
          {/* Controls Toolbar */}
          <div className="sr-toolbar-card">
            {/* Top row: Search, Sort, View toggle */}
            <div className="sr-toolbar-top">
              <div className="sr-search-bar">
                <Search size={18} className="sr-search-icon" />
                <input 
                  type="text"
                  className="sr-search-input"
                  placeholder="Search by title, ingredients, or keywords..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="sr-search-clear-btn" onClick={() => setSearchQuery('')} title="Clear search">
                    <X size={16} />
                  </button>
                )}
              </div>

              <div className="sr-toolbar-controls">
                {/* Rating Filter */}
                <div className="sr-control-group">
                  <select 
                    className="sr-select"
                    value={selectedRatingFilter}
                    onChange={(e) => setSelectedRatingFilter(e.target.value)}
                  >
                    <option value="all">All Ratings</option>
                    <option value="5">⭐ 5 Stars</option>
                    <option value="4plus">⭐ 4+ Stars</option>
                    <option value="rated">⭐ Rated Only</option>
                  </select>
                </div>

                {/* Calorie Filter */}
                <div className="sr-control-group">
                  <select 
                    className="sr-select"
                    value={selectedCalorieFilter}
                    onChange={(e) => setSelectedCalorieFilter(e.target.value)}
                  >
                    <option value="all">All Calories</option>
                    <option value="light">🥗 Light (≤ 350 kcal)</option>
                    <option value="moderate">🍲 Balanced (350–650 kcal)</option>
                    <option value="hearty">🍗 Hearty (&gt; 650 kcal)</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div className="sr-control-group">
                  <select 
                    className="sr-select sr-sort-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                  >
                    <option value="date_desc">📅 Newest Added</option>
                    <option value="date_asc">📅 Oldest Added</option>
                    <option value="rating_desc">⭐ Highest Rated</option>
                    <option value="calories_asc">🔥 Calories: Low to High</option>
                    <option value="calories_desc">🔥 Calories: High to Low</option>
                    <option value="time_asc">⏱️ Quickest Prep Time</option>
                    <option value="title_asc">🔤 Title (A to Z)</option>
                    <option value="nutri_desc">🏆 Best Nutri-Score</option>
                  </select>
                </div>

                {/* View Mode Toggle */}
                <div className="sr-view-toggle-btns">
                  <button 
                    className={`sr-view-toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                    onClick={() => setViewMode('grid')}
                    title="Grid Card View"
                  >
                    <Grid size={18} />
                  </button>
                  <button 
                    className={`sr-view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                    onClick={() => setViewMode('list')}
                    title="Compact List View"
                  >
                    <List size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Category Pills Strip */}
            {availableCategories.length > 0 && (
              <div className="sr-category-pills-bar">
                <button
                  className={`sr-cat-pill ${selectedCategory === 'all' ? 'active' : ''}`}
                  onClick={() => setSelectedCategory('all')}
                >
                  All Categories ({recipes.length})
                </button>
                {availableCategories.map(cat => (
                  <button
                    key={cat.name}
                    className={`sr-cat-pill ${selectedCategory === cat.name ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(cat.name)}
                  >
                    {cat.name} ({cat.count})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Results Summary Bar */}
          {!loading && recipes.length > 0 && (
            <div className="sr-results-status-bar">
              <span className="sr-results-count-text">
                Showing <strong>{filteredRecipes.length}</strong> of <strong>{recipes.length}</strong> recipes
                {searchQuery && <span> matching &ldquo;<em>{searchQuery}</em>&rdquo;</span>}
              </span>

              {hasActiveFilters && (
                <button className="sr-btn-reset-filters" onClick={clearAllFilters}>
                  <X size={14} /> Clear Active Filters
                </button>
              )}
            </div>
          )}

          {/* ── Main Content Area ───────────────────────────── */}
          <div className="sr-main-results">
            {/* Error banner */}
            {error && (
              <div className="sr-error-banner">
                <span>⚠️ {error}</span>
                <button className="btn-secondary btn-sm" onClick={fetchRecipes}>Retry</button>
              </div>
            )}

            {/* Loading Skeletons */}
            {loading && (
              <div className={viewMode === 'grid' ? 'sr-grid-layout' : 'sr-list-layout'}>
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className={viewMode === 'grid' ? 'sr-skeleton-grid-card' : 'sr-skeleton-list-card'}>
                    <div className="sr-skel-media" />
                    <div className="sr-skel-body">
                      <div className="sr-skel-line title" />
                      <div className="sr-skel-line meta" />
                      <div className="sr-skel-line footer" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty Collection State */}
            {!loading && !error && recipes.length === 0 && (
              <div className="sr-empty-collection-box">
                <div className="sr-empty-graphic">
                  <span className="sr-empty-main-emoji">📖</span>
                  <div className="sr-empty-orbit-icon icon-1">🥗</div>
                  <div className="sr-empty-orbit-icon icon-2">🍛</div>
                  <div className="sr-empty-orbit-icon icon-3">🍳</div>
                </div>
                <h2>Your Recipe Book is Empty</h2>
                <p>
                  Explore thousands of recipes tailored to your dietary goals, health metrics, and pantry ingredients. Tap the <strong>Save</strong> button on any dish to build your personal cookbook!
                </p>
                <div className="sr-empty-action-group">
                  <Link to="/recipes" className="btn-primary sr-empty-cta">
                    <Search size={18} /> Discover Recipes
                  </Link>
                  <Link to="/pantry" className="btn-secondary sr-empty-cta">
                    <Utensils size={18} /> Cook with Pantry
                  </Link>
                </div>
              </div>
            )}

            {/* No Matches Found for Filter/Search */}
            {!loading && !error && recipes.length > 0 && filteredRecipes.length === 0 && (
              <div className="sr-no-results-box">
                <span className="sr-no-results-icon">🔍</span>
                <h3>No Matching Recipes Found</h3>
                <p>No recipes match your current search criteria or active filters.</p>
                <button className="btn-primary sr-btn-clear" onClick={clearAllFilters}>
                  Clear All Filters ({recipes.length} available)
                </button>
              </div>
            )}

            {/* Render Recipe Cards */}
            {!loading && filteredRecipes.length > 0 && (
              <div className={viewMode === 'grid' ? 'sr-grid-layout' : 'sr-list-layout'}>
                {filteredRecipes.map((r, idx) => (
                  <RecipeCard
                    key={r.id}
                    r={r}
                    idx={idx}
                    viewMode={viewMode}
                    onView={handleView}
                    onRate={handleRate}
                    onDelete={handleDelete}
                    onExport={doExport}
                    onPrint={doPrint}
                    onCopyIngredients={handleCopyIngredients}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ─────────────────────────────────────────── */}
      <RecipeModal 
        recipe={selectedRecipe} 
        onClose={() => setSelectedRecipe(null)} 
      />

      <RouletteModal
        isOpen={isRouletteOpen}
        onClose={() => setRouletteOpen(false)}
        recipes={recipes}
        onSelectRecipe={handleView}
      />

      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
      />
    </section>
  );
}
