import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';

export default function MealPlanner() {
  const { token, activeProfile } = useContext(AuthContext);
  const toast = useToast();
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
  const [shoppingList, setShoppingList] = useState({ categories: {}, in_pantry_skipped: [] });
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [checkedListItems, setCheckedListItems] = useState({});

  const [smartFilling, setSmartFilling] = useState(false);
  const [loggingToday, setLoggingToday] = useState(false);

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
      toast.success(`Added to ${selectedSlot.slot} ✓`);
      setIsRecipePickerOpen(false);
      setSelectedSlot(null);
      fetchMealPlans();
    } catch (err) {
      toast.error("Failed to assign meal: " + err.message);
    }
  };

  const removeMeal = async (planId, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/mealplan/${planId}`);
      toast.success('Meal removed');
      fetchMealPlans();
    } catch (err) {
      toast.error("Failed to remove meal: " + err.message);
    }
  };

  const generateShoppingList = async () => {
    setIsShoppingListOpen(true);
    setLoadingShoppingList(true);
    try {
      const data = await api.get(`/mealplan/grocery-list?start_date=${startDateStr}&end_date=${endDateStr}`);
      setShoppingList(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate grocery list");
    } finally {
      setLoadingShoppingList(false);
    }
  };

  const getMealForSlot = (dateStr, slot) => {
    return mealPlans.find(mp => mp.date === dateStr && mp.meal_slot === slot);
  };

  const handleSmartAutofill = async () => {
    setSmartFilling(true);
    setTimeout(() => {
      setSmartFilling(false);
      toast.success("✨ Smart AI Autofill complete! (Simulated)");
    }, 1500);
  };

  const handleLogToday = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysMeals = mealPlans.filter(mp => mp.date === todayStr);
    if (todaysMeals.length === 0) {
      toast.error("No meals planned for today!");
      return;
    }
    setLoggingToday(true);
    try {
      await Promise.all(todaysMeals.map(mp => 
        api.post('/nutrition/log', {
          food_item: mp.recipe.title,
          calories: mp.recipe.calories || 0,
          protein_g: mp.recipe.protein_g || 0,
          carbs_g: mp.recipe.carbs_g || 0,
          fat_g: mp.recipe.fat_g || 0,
          fiber_g: 0,
          quantity: 1,
          unit: 'serving',
          meal_slot: mp.meal_slot,
          date: todayStr
        })
      ));
      toast.success(`Logged ${todaysMeals.length} planned meals to Tracker ✓`);
    } catch (err) {
      toast.error("Failed to log meals: " + err.message);
    } finally {
      setLoggingToday(false);
    }
  };

  const toggleCheck = (name) => {
    setCheckedListItems(prev => ({ ...prev, [name]: !prev[name] }));
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
          <p className="subtitle">Plan your meals, automatically log them, and generate groceries.</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
          <button className="btn-secondary" onClick={handleSmartAutofill} disabled={smartFilling} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-card)', transition: 'all 0.2s', padding: '10px 16px' }}>
            {smartFilling ? '🤖 Thinking...' : '✨ Magic Fill'}
          </button>
          <button className="btn-primary" onClick={handleLogToday} disabled={loggingToday} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', background: 'var(--gradient-primary)', boxShadow: 'var(--shadow-glow)', transition: 'transform 0.2s, box-shadow 0.2s' }} onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <span style={{ fontSize: '1.2rem' }}>⚡</span> Log Today's Meals
          </button>
          <button className="btn-secondary" onClick={generateShoppingList} style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-card)', transition: 'all 0.2s', padding: '10px 16px' }}>
            🛒 Groceries
          </button>
        </div>
      </div>

      <div className="planner-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'var(--glass-bg)', border: '1px solid var(--border-glass)', padding: '12px 20px', borderRadius: '16px', boxShadow: 'var(--shadow-card)' }}>
        <button className="btn-secondary" onClick={() => changeWeek(-1)} style={{ padding: '6px 12px' }}>← Prev</button>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>
          {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <button className="btn-secondary" onClick={() => changeWeek(1)} style={{ padding: '6px 12px' }}>Next →</button>
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: '20px', padding: '10px', background: 'rgba(220,38,38,0.1)', borderRadius: '8px' }}>{error}</div>}
      
      <div className="calendar-grid" style={{ display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '30px', padding: '10px 5px' }}>
        {weekDays.map((dateObj, dayIdx) => {
          const dateStr = dateObj.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          
          // Calculate daily planned macros
          const todaysMeals = SLOTS.map(slot => getMealForSlot(dateStr, slot)).filter(Boolean);
          const dailyCals = todaysMeals.reduce((sum, mp) => sum + (mp.recipe?.calories || 0), 0);
          const targetCals = activeProfile?.target_calories || 2000;
          const calPercent = Math.min(100, Math.max(0, (dailyCals / targetCals) * 100));
          const isOverTarget = dailyCals > targetCals;
          
          return (
            <div key={dateStr} className={`calendar-day ${isToday ? 'today' : ''}`} style={{ flex: '1', minWidth: '220px', background: isToday ? 'rgba(255,255,255,0.9)' : 'var(--glass-bg)', borderRadius: '24px', overflow: 'hidden', border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-glass)', boxShadow: isToday ? 'var(--shadow-card-hover)' : 'var(--shadow-card)', transition: 'transform 0.2s', animation: `fadeInUp 0.4s ease forwards ${dayIdx * 0.05}s`, opacity: 0 }}>
              <div className="day-header" style={{ padding: '16px', textAlign: 'center', background: isToday ? 'var(--primary)' : 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-glass)', color: isToday ? 'white' : 'var(--text-primary)' }}>
                <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.8 }}>{dateObj.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: '4px 0' }}>{dateObj.getDate()}</div>
                
                <div style={{ fontSize: '0.75rem', marginTop: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ opacity: 0.9, fontWeight: '600', color: isOverTarget && !isToday ? '#dc2626' : 'inherit' }}>
                    {Math.round(dailyCals)} / {targetCals} kcal
                  </div>
                  <div className="calorie-progress-container">
                    <div className="calorie-progress-bar" style={{ width: `${calPercent}%`, backgroundColor: isOverTarget ? '#ef4444' : (isToday ? 'rgba(255,255,255,0.9)' : 'var(--accent-2)') }} />
                  </div>
                </div>
              </div>
              
              <div className="day-slots" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {SLOTS.map(slot => {
                  const meal = getMealForSlot(dateStr, slot);
                  return (
                    <div key={slot} className="meal-slot" style={{ background: 'rgba(255,255,255,0.4)', borderRadius: '12px', padding: meal ? '0' : '12px', position: 'relative', overflow: 'hidden', minHeight: '80px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      
                      {meal ? (
                        <div className="planned-meal-card" style={{ display: 'flex', height: '100%', cursor: 'pointer' }} onClick={() => setActiveRecipeModal(meal.recipe)}>
                          {meal.recipe?.image_url ? (
                             <div style={{ width: '70px', height: '80px', flexShrink: 0, backgroundImage: `url(${meal.recipe.image_url})`, backgroundSize: 'cover', backgroundPosition: 'center', borderRadius: '8px' }} />
                          ) : (
                             <div style={{ width: '70px', height: '80px', flexShrink: 0, background: 'var(--accent-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px' }}>🍲</div>
                          )}
                          <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                             <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '2px' }}>{slot}</div>
                             <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meal.recipe?.title}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>{meal.recipe?.calories} kcal</div>
                          </div>
                          <button 
                            className="remove-meal-btn"
                            style={{ position: 'absolute', top: '6px', right: '6px', background: 'rgba(255,255,255,0.9)', width: '24px', height: '24px', borderRadius: '50%', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}
                            onClick={(e) => removeMeal(meal.id, e)}
                            title="Remove Meal"
                          >×</button>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.5px' }}>{slot}</div>
                          <button 
                            className="empty-slot-btn" 
                            onClick={() => openRecipePicker(dateStr, slot)}
                          >
                            <span>+</span> Assign
                          </button>
                        </div>
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
          <div className="modal-content glass" style={{ maxWidth: '700px', width: '90%', padding: '30px' }}>
            <button className="modal-close" onClick={() => setIsRecipePickerOpen(false)}>×</button>
            <h2 className="modal-title" style={{ marginBottom: '5px' }}>Assign to {selectedSlot.slot}</h2>
            <p className="subtitle" style={{ marginBottom: '20px' }}>Select a recipe from your saved collection</p>
            
            {savedRecipes.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📚</span>
                <p>You don't have any saved recipes yet. Explore the Kitchen to save some!</p>
              </div>
            ) : (
              <div className="recipe-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', maxHeight: '50vh', overflowY: 'auto', paddingRight: '10px' }}>
                {savedRecipes.map(r => (
                  <div key={r.id} className="recipe-card glass" onClick={() => assignRecipeToSlot(r.id)} style={{ cursor: 'pointer', border: '2px solid transparent', transition: '0.2s' }} onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'} onMouseOut={e => e.currentTarget.style.borderColor = 'transparent'}>
                    {r.image_url ? (
                       <img className="recipe-image" src={r.image_url} alt={r.title} style={{ height: '120px' }} />
                    ) : (
                       <div style={{ height: '120px', background: 'var(--accent-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No Image</div>
                    )}
                    <div className="recipe-info" style={{ padding: '12px' }}>
                      <div className="recipe-title" style={{ fontSize: '1rem', WebkitLineClamp: 2 }}>{r.title}</div>
                      {r.calories && <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '6px', fontWeight: '600' }}>🔥 {r.calories} kcal</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grocery List Drawer */}
      {isShoppingListOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsShoppingListOpen(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '0' }}>
          <div className="modal-content glass" style={{ width: '450px', height: '100vh', margin: '0', borderRadius: '24px 0 0 24px', animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards', display: 'flex', flexDirection: 'column', borderRight: 'none' }}>
            <button className="modal-close" onClick={() => setIsShoppingListOpen(false)}>×</button>
            
            <div style={{ padding: '20px 0 10px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', background: 'rgba(129, 178, 154, 0.1)', color: 'var(--accent-2)', borderRadius: '16px', marginBottom: '16px', fontSize: '1.5rem' }}>🛒</div>
              <h2 className="modal-title" style={{ fontSize: '1.8rem', marginBottom: '4px' }}>Grocery List</h2>
              <p className="subtitle">Categorized ingredients (pantry stock excluded)</p>
            </div>
            
            <div style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', marginTop: '10px' }}>
              {loadingShoppingList ? (
                <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px', animation: 'pulse 1.5s infinite' }}>🥑</div>
                  Analyzing your recipes...
                </div>
              ) : (!shoppingList || Object.keys(shoppingList.categories || {}).length === 0) ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>No ingredients needed! Your scheduled meals match your pantry stock or planner is empty.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {Object.entries(shoppingList.categories).map(([category, items]) => (
                    <div key={category}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px' }}>
                        {category}
                      </h4>
                      <ul style={{ listStyle: 'none', padding: 0 }}>
                        {items.map((item, idx) => {
                          const isChecked = !!checkedListItems[item.name];
                          return (
                            <li key={idx} style={{ padding: '12px', marginBottom: '6px', background: isChecked ? 'transparent' : 'var(--bg-secondary)', border: '1px solid', borderColor: isChecked ? 'transparent' : 'var(--border-glass)', borderRadius: '10px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', opacity: isChecked ? 0.5 : 1 }}>
                              <div 
                                onClick={() => toggleCheck(item.name)}
                                style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border-glass)'}`, background: isChecked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', cursor: 'pointer', transition: '0.2s' }}
                              >
                                {isChecked && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }} onClick={() => toggleCheck(item.name)}>
                                <label style={{ fontWeight: '600', fontSize: '0.95rem', textTransform: 'capitalize', color: 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none', cursor: 'pointer' }}>
                                  {item.name}
                                </label>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Needed for: {item.recipes.join(', ')}
                                </span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}

                  {/* Pantry Skipped List */}
                  {shoppingList.in_pantry_skipped && shoppingList.in_pantry_skipped.length > 0 && (
                    <div style={{ marginTop: '10px', padding: '15px', background: 'rgba(129, 178, 154, 0.06)', borderRadius: '12px', border: '1px dashed rgba(129, 178, 154, 0.3)' }}>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#27ae60', marginBottom: '8px' }}>
                        ✅ Already In Pantry ({shoppingList.in_pantry_skipped.length})
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {shoppingList.in_pantry_skipped.map((ing, idx) => (
                          <span key={idx} style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(129, 178, 154, 0.15)', borderRadius: '20px', color: '#27ae60', textTransform: 'capitalize', textDecoration: 'line-through' }}>
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button className="btn-primary" style={{ marginTop: '24px', padding: '16px', fontSize: '1.1rem', borderRadius: '16px' }} onClick={() => window.print()}>
              🖨️ Print Checklist
            </button>
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
