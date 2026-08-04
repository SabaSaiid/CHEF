import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Bookmark, 
  Sparkles, 
  Clock, 
  Flame, 
  Plus, 
  Utensils, 
  ChevronRight 
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { getRecipeCardVisual } from '../utils/recipeVisuals';
import { useToast } from '../context/ToastContext';

export default function MealSlotPickerModal({ isOpen, slot, date, onClose, onAssignSuccess }) {
  const { token } = useContext(AuthContext);
  const toast = useToast();

  const [savedRecipes, setSavedRecipes] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [assigningId, setAssigningId] = useState(null);
  const [activeTab, setActiveTab] = useState('saved'); // 'saved' | 'search'

  useEffect(() => {
    if (!isOpen || !token) return;
    
    // Fetch saved recipes
    const loadSaved = async () => {
      setLoading(true);
      try {
        const data = await api.get('/recipes/saved');
        setSavedRecipes(data || []);
      } catch (err) {
        console.error('Failed to load saved recipes for picker:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSaved();
  }, [isOpen, token]);

  // Handle Search
  useEffect(() => {
    if (!searchQuery.trim() || activeTab !== 'search') return;

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/recipes/search?query=${encodeURIComponent(searchQuery)}&number=8`);
        setSearchResults(res.results || res.recipes || res || []);
      } catch (err) {
        console.error('Search failed in picker:', err);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  if (!isOpen) return null;

  const handleAssign = async (recipe) => {
    setAssigningId(recipe.id);
    try {
      await api.post('/mealplan', {
        recipe_id: recipe.id,
        date: date || new Date().toISOString().split('T')[0],
        meal_slot: slot
      });
      toast.success(`Assigned ${recipe.title} to ${slot}! ✨`);
      if (onAssignSuccess) onAssignSuccess(recipe);
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to assign recipe to meal plan.');
    } finally {
      setAssigningId(null);
    }
  };

  const displayedRecipes = activeTab === 'saved' ? savedRecipes : searchResults;

  return createPortal(
    <div className="modal-overlay fade-in">
      <div className="modal-content glass meal-slot-picker-modal" style={{ maxWidth: '640px', width: '92%', padding: '24px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.25rem' }}>
              <Utensils size={20} style={{ color: 'var(--primary)' }} />
              Schedule for {slot}
            </h3>
            <p className="subtitle" style={{ margin: '4px 0 0 0', fontSize: '0.85rem' }}>
              Select a recipe to add to today's meal plan
            </p>
          </div>
          <button 
            className="icon-btn-ghost" 
            onClick={onClose} 
            aria-label="Close" 
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '6px' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-glass)', pb: '12px' }}>
          <button 
            className={`btn-pill-tab ${activeTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveTab('saved')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: activeTab === 'saved' ? '1px solid var(--primary)' : '1px solid transparent',
              background: activeTab === 'saved' ? 'rgba(255, 107, 0, 0.12)' : 'transparent',
              color: activeTab === 'saved' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Bookmark size={14} /> Saved Recipes ({savedRecipes.length})
          </button>
          <button 
            className={`btn-pill-tab ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: activeTab === 'search' ? '1px solid var(--primary)' : '1px solid transparent',
              background: activeTab === 'search' ? 'rgba(255, 107, 0, 0.12)' : 'transparent',
              color: activeTab === 'search' ? 'var(--primary)' : 'var(--text-secondary)',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.85rem'
            }}
          >
            <Search size={14} /> Search All
          </button>
        </div>

        {/* Search Bar if Search tab active */}
        {activeTab === 'search' && (
          <div style={{ position: 'relative', marginBottom: '16px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search recipes by name, ingredient (e.g. Salmon, Salad)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 36px',
                borderRadius: '12px',
                border: '1px solid var(--border-glass)',
                background: 'rgba(255,255,255,0.6)',
                fontSize: '0.9rem',
                outline: 'none'
              }}
            />
          </div>
        )}

        {/* Recipe Grid */}
        <div style={{ maxHeight: '340px', overflowY: 'auto', paddingRight: '4px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
              Loading recipes...
            </div>
          ) : displayedRecipes.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {displayedRecipes.map((recipe) => (
                <div 
                  key={recipe.id}
                  className="card glass picker-recipe-card"
                  style={{
                    padding: '10px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: '1px solid var(--border-glass)'
                  }}
                  onClick={() => handleAssign(recipe)}
                >
                  {(() => {
                    const visual = getRecipeCardVisual(recipe);
                    return (
                      <>
                        {recipe.image_url ? (
                          <img 
                            src={recipe.image_url} 
                            alt={recipe.title} 
                            style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }}
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
                          style={{ 
                            display: recipe.image_url ? 'none' : 'flex', 
                            width: '56px', 
                            height: '56px', 
                            borderRadius: '10px', 
                            background: visual.gradient,
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '24px',
                            flexShrink: 0
                          }}
                        >
                          {visual.icon}
                        </div>
                      </>
                    );
                  })()}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h4 style={{ margin: 0, fontSize: '0.88rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {recipe.title}
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {recipe.calories && (
                        <span style={{ color: 'var(--primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Flame size={12} /> {recipe.calories} kcal
                        </span>
                      )}
                      {recipe.ready_in_minutes && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Clock size={12} /> {recipe.ready_in_minutes}m
                        </span>
                      )}
                    </div>
                  </div>
                  <button 
                    className="btn-primary"
                    disabled={assigningId === recipe.id}
                    style={{
                      padding: '6px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--text-muted)' }}>
              {activeTab === 'saved' ? (
                <>
                  <Bookmark size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>No saved recipes found yet.</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Switch to <strong>Search All</strong> or save recipes while browsing!</p>
                </>
              ) : (
                <>
                  <Search size={32} style={{ opacity: 0.4, marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>Type above to search delicious recipes.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Need full meal planner calendar?
          </span>
          <a 
            href="/meal-planner" 
            style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
          >
            Open Meal Planner <ChevronRight size={14} />
          </a>
        </div>

      </div>
    </div>,
    document.body
  );
}
