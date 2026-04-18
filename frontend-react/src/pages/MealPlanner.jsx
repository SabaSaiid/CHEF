import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import RecipeModal from '../components/RecipeModal';

export default function MealPlanner() {
  const { token } = useContext(AuthContext);
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday
    const date = new Date(today.setDate(diff));
    date.setHours(0,0,0,0);
    return date;
  });
  
  const [mealPlans, setMealPlans] = useState([]);
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // {date: '2026-04-20', slot: 'Breakfast'}
  const [activeRecipeModal, setActiveRecipeModal] = useState(null);
  
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);

  const SLOTS = ['Breakfast', 'Lunch', 'Snack', 'Dinner'];

  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  };

  const weekDays = getWeekDays();
  const startDateStr = weekDays[0].toISOString().split('T')[0];
  const endDateStr = weekDays[6].toISOString().split('T')[0];

  const fetchMealPlans = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await api.get(`/mealplan?start_date=${startDateStr}&end_date=${endDateStr}`);
      setMealPlans(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedRecipes = async () => {
    if (!token) return;
    try {
      const data = await api.get('/recipes/saved');
      setSavedRecipes(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMealPlans();
  }, [currentWeekStart, token]);

  useEffect(() => {
    fetchSavedRecipes();
  }, [token]);

  const changeWeek = (offset) => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + offset * 7);
    setCurrentWeekStart(newDate);
  };

  const openRecipePicker = (dateStr, slot) => {
    setSelectedSlot({ date: dateStr, slot });
    setIsRecipePickerOpen(true);
  };

  const assignRecipeToSlot = async (recipeId) => {
    if (!selectedSlot) return;
    try {
      await api.post('/mealplan', {
        recipe_id: recipeId,
        date: selectedSlot.date,
        meal_slot: selectedSlot.slot
      });
      setIsRecipePickerOpen(false);
      setSelectedSlot(null);
      fetchMealPlans();
    } catch (err) {
      alert("Failed to assign meal: " + err.message);
    }
  };

  const removeMeal = async (planId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/mealplan/${planId}`);
      fetchMealPlans();
    } catch (err) {
      alert("Failed to remove meal: " + err.message);
    }
  };

  const generateShoppingList = async () => {
    setIsShoppingListOpen(true);
    setLoadingShoppingList(true);
    try {
      const data = await api.get(`/mealplan/shopping-list?start_date=${startDateStr}&end_date=${endDateStr}`);
      setShoppingList(data);
    } catch (err) {
      console.error(err);
      alert("Failed to generate shopping list");
    } finally {
      setLoadingShoppingList(false);
    }
  };

  const getMealForSlot = (dateStr, slot) => {
    return mealPlans.find(mp => mp.date === dateStr && mp.meal_slot === slot);
  };

  if (!token) {
    return (
      <section className="page active" style={{textAlign: 'center', paddingTop: '100px'}}>
        <h2>Please Log In</h2>
        <p style={{color: 'var(--text-secondary)'}}>You must be logged in to plan your meals.</p>
      </section>
    );
  }

  return (
    <section className="page active meal-planner-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Weekly Meal Planner</h1>
          <p className="subtitle">Plan your meals and generate groceries instantly</p>
        </div>
        <div style={{ marginTop: '10px' }}>
          <button className="btn-secondary" onClick={generateShoppingList} style={{ background: 'var(--accent-color)', color: '#fff', border: 'none' }}>
            🛒 Generate Shopping List
          </button>
        </div>
      </div>

      <div className="planner-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', background: 'var(--card-bg)', padding: '15px', borderRadius: '12px' }}>
        <button className="btn-secondary" onClick={() => changeWeek(-1)}>← Previous Week</button>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
          {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button className="btn-secondary" onClick={() => changeWeek(1)}>Next Week →</button>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}
      
      <div className="calendar-grid" style={{ display: 'flex', gap: '15px', overflowX: 'auto', paddingBottom: '20px' }}>
        {weekDays.map(dateObj => {
          const dateStr = dateObj.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          
          return (
            <div key={dateStr} className={`calendar-day \${isToday ? 'today' : ''}`} style={{ flex: '1', minWidth: '150px', background: 'var(--card-bg)', borderRadius: '16px', overflow: 'hidden', border: isToday ? '2px solid var(--primary-color)' : '1px solid var(--border-color)' }}>
              <div className="day-header" style={{ padding: '10px', textAlign: 'center', background: 'rgba(0,0,0,0.05)', borderBottom: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 'bold' }}>{dateObj.getDate()}</div>
              </div>
              
              <div className="day-slots" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {SLOTS.map(slot => {
                  const meal = getMealForSlot(dateStr, slot);
                  return (
                    <div key={slot} className="meal-slot" style={{ border: '1px dashed var(--border-color)', borderRadius: '8px', padding: '8px', minHeight: '60px', position: 'relative' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '5px' }}>{slot}</div>
                      {meal ? (
                        <div 
                          className="planned-meal" 
                          style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '6px', fontSize: '0.9rem', cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          onClick={() => setActiveRecipeModal(meal.recipe)}
                        >
                          {meal.recipe?.title}
                          <button 
                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'transparent', border: 'none', color: '#ff4444', cursor: 'pointer', fontSize: '1rem' }}
                            onClick={(e) => removeMeal(meal.id, e)}
                          >×</button>
                        </div>
                      ) : (
                        <button 
                          className="add-meal-btn" 
                          style={{ width: '100%', padding: '5px', background: 'transparent', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', opacity: 0.7 }}
                          onClick={() => openRecipePicker(dateStr, slot)}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe Picker Modal */}
      {isRecipePickerOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsRecipePickerOpen(false)}>
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <button className="modal-close" onClick={() => setIsRecipePickerOpen(false)}>×</button>
            <h2 className="modal-title">Select a Recipe for {selectedSlot.slot}</h2>
            
            {savedRecipes.length === 0 ? (
              <p>You don't have any saved recipes yet. Go save some first!</p>
            ) : (
              <div className="recipe-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: '20px', maxHeight: '60vh', overflowY: 'auto', paddingRight: '10px' }}>
                {savedRecipes.map(r => (
                  <div key={r.id} className="recipe-card" onClick={() => assignRecipeToSlot(r.id)} style={{ cursor: 'pointer', border: '2px solid transparent' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary-color)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                    {r.image_url && <img className="recipe-image" src={r.image_url} alt={r.title} style={{ height: '120px' }} />}
                    <div className="recipe-info" style={{ padding: '10px' }}>
                      <div className="recipe-title" style={{ fontSize: '1.1rem' }}>{r.title}</div>
                      {r.calories && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '5px' }}>🔥 {r.calories} kcal</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shopping List Sidebar */}
      {isShoppingListOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsShoppingListOpen(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '0' }}>
          <div className="modal-content" style={{ width: '400px', height: '100vh', margin: '0', borderRadius: '0', animation: 'slideInRight 0.3s forwards', display: 'flex', flexDirection: 'column' }}>
            <button className="modal-close" onClick={() => setIsShoppingListOpen(false)}>×</button>
            <h2 className="modal-title">🛒 Shopping List</h2>
            <p className="subtitle" style={{ marginBottom: '20px' }}>Aggregated for the week</p>
            
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loadingShoppingList ? (
                <div style={{ textAlign: 'center', marginTop: '50px' }}>Analyzing your recipes...</div>
              ) : shoppingList.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>Your meal plan is empty this week.</p>
                </div>
              ) : (
                <ul className="shopping-list" style={{ listStyle: 'none', padding: 0 }}>
                  {shoppingList.map((item, idx) => (
                    <li key={idx} style={{ padding: '12px 15px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center' }}>
                      <input type="checkbox" id={`item-${idx}`} style={{ marginRight: '15px', width: '20px', height: '20px', cursor: 'pointer' }} />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <label htmlFor={`item-${idx}`} style={{ cursor: 'pointer', fontWeight: '500', fontSize: '1.1rem', textTransform: 'capitalize' }}>
                          {item.ingredient}
                        </label>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          Appears in {item.count} recipe(s)
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <button className="btn-primary" style={{ marginTop: '20px' }} onClick={() => window.print()}>🖨️ Print List</button>
          </div>
        </div>
      )}

      {/* Individual Recipe Viewer Modal */}
      {activeRecipeModal && (
        <RecipeModal recipe={{...activeRecipeModal, ingredients: activeRecipeModal.ingredients ? activeRecipeModal.ingredients.split(', ') : []}} onClose={() => setActiveRecipeModal(null)} />
      )}
    </section>
  );
}
