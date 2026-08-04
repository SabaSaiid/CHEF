import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import RecipeModal from '../components/RecipeModal';
import ChefScoreBadge from '../components/ChefScoreBadge';
import { getRecipeCardVisual } from '../utils/recipeVisuals';
import AuthModal from '../components/AuthModal';

export default function MealPlanner() {
  const { token, activeProfile } = useContext(AuthContext);
  const toast = useToast();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

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

  const [groceryFilter, setGroceryFilter] = useState('all'); // 'all' | 'tobuy' | 'checked'
  const [customItems, setCustomItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [showPantryInPrint, setShowPantryInPrint] = useState(true);

  // Mouse / Touch Drag state for Meal Planner Grid
  const gridRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);

  const handleGridMouseDown = (e) => {
    if (!gridRef.current) return;
    setIsDragging(true);
    setDragStartX(e.pageX - gridRef.current.offsetLeft);
    setDragScrollLeft(gridRef.current.scrollLeft);
  };

  const handleGridMouseLeave = () => {
    setIsDragging(false);
  };

  const handleGridMouseUp = () => {
    setIsDragging(false);
  };

  const handleGridMouseMove = (e) => {
    if (!isDragging || !gridRef.current) return;
    e.preventDefault();
    const x = e.pageX - gridRef.current.offsetLeft;
    const walk = (x - dragStartX) * 1.5;
    gridRef.current.scrollLeft = dragScrollLeft - walk;
  };

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

  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [plans, recipes] = await Promise.all([
        api.get(`/mealplan?start_date=${startDateStr}&end_date=${endDateStr}`),
        api.get('/recipes/saved'),
      ]);
      setMealPlans(plans || []);
      setSavedRecipes(recipes || []);
    } catch (err) {
      setError(err.message || 'Failed to load meal planner data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, startDateStr, endDateStr]);

  // Load checked state & custom items from localStorage for active week
  useEffect(() => {
    try {
      const savedChecked = localStorage.getItem(`chef_checked_${startDateStr}_${endDateStr}`);
      if (savedChecked) setCheckedListItems(JSON.parse(savedChecked));
      else setCheckedListItems({});

      const savedCustom = localStorage.getItem(`chef_custom_${startDateStr}_${endDateStr}`);
      if (savedCustom) setCustomItems(JSON.parse(savedCustom));
      else setCustomItems([]);
    } catch (e) {
      console.error(e);
    }
  }, [startDateStr, endDateStr]);

  const changeWeek = (weeks) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (weeks * 7));
    setCurrentWeekStart(newStart);
  };

  const getMealForSlot = (dateStr, slot) => {
    return mealPlans.find(mp => mp.date === dateStr && mp.meal_slot === slot);
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
      toast.success(`Assigned to ${selectedSlot.slot}! ✓`);
      setIsRecipePickerOpen(false);
      setSelectedSlot(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to assign recipe.');
    }
  };

  const removeMeal = async (mealPlanId, e) => {
    if (e) e.stopPropagation();
    try {
      await api.delete(`/mealplan/${mealPlanId}`);
      toast.success("Meal removed from plan");
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to remove meal.');
    }
  };

  const handleSmartAutofill = async () => {
    setSmartFilling(true);
    try {
      const result = await api.post(`/mealplan/autofill?start_date=${startDateStr}&end_date=${endDateStr}`);
      toast.success(result.message || "Smart autofill complete! ✨");
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Autofill failed.');
    } finally {
      setSmartFilling(false);
    }
  };

  const handleLogToday = async () => {
    setLoggingToday(true);
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const result = await api.post(`/mealplan/log-today?date=${todayStr}`);
      toast.success(result.message || "Today's planned meals logged into tracker! ⚡");
    } catch (err) {
      toast.error(err.message || 'Failed to log today\'s meals.');
    } finally {
      setLoggingToday(false);
    }
  };

  const generateShoppingList = async () => {
    setIsShoppingListOpen(true);
    setLoadingShoppingList(true);
    try {
      const data = await api.get(`/mealplan/shopping-list?start_date=${startDateStr}&end_date=${endDateStr}`);
      setShoppingList(data || { categories: {}, in_pantry_skipped: [] });
    } catch (err) {
      toast.error(err.message || 'Failed to generate shopping list.');
    } finally {
      setLoadingShoppingList(false);
    }
  };

  const updateCheckedItems = (newChecked) => {
    setCheckedListItems(newChecked);
    try {
      localStorage.setItem(`chef_checked_${startDateStr}_${endDateStr}`, JSON.stringify(newChecked));
    } catch (e) {}
  };

  const toggleCheck = (name) => {
    const updated = { ...checkedListItems, [name]: !checkedListItems[name] };
    updateCheckedItems(updated);
  };

  const handleCheckAll = () => {
    const updated = { ...checkedListItems };
    Object.values(shoppingList.categories || {}).flat().forEach(item => {
      updated[item.name] = true;
    });
    customItems.forEach(item => {
      updated[item.name] = true;
    });
    updateCheckedItems(updated);
    toast.success("All items checked ✓");
  };

  const handleUncheckAll = () => {
    updateCheckedItems({});
    toast.success("Checked list cleared");
  };

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    if (customItems.some(i => i.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Item already in custom list!");
      return;
    }
    const updated = [...customItems, { name, recipes: ['Manual Addition'] }];
    setCustomItems(updated);
    setNewItemName('');
    try {
      localStorage.setItem(`chef_custom_${startDateStr}_${endDateStr}`, JSON.stringify(updated));
    } catch (e) {}
    toast.success(`Added "${name}" to grocery list`);
  };

  const handleRemoveCustomItem = (name) => {
    const updated = customItems.filter(i => i.name !== name);
    setCustomItems(updated);
    try {
      localStorage.setItem(`chef_custom_${startDateStr}_${endDateStr}`, JSON.stringify(updated));
    } catch (e) {}
  };

  const getCategoryIcon = (category) => {
    if (category.includes('Produce')) return '🥬';
    if (category.includes('Meat') || category.includes('Seafood')) return '🥩';
    if (category.includes('Dairy') || category.includes('Eggs')) return '🥛';
    if (category.includes('Grains') || category.includes('Bakery')) return '🍞';
    if (category.includes('Pantry') || category.includes('Spices')) return '🧂';
    if (category.includes('Custom')) return '✏️';
    return '📦';
  };

  const allCategoryEntries = [
    ...Object.entries(shoppingList.categories || {}),
    ...(customItems.length > 0 ? [['Custom Additions', customItems]] : [])
  ];

  const allFlatItems = allCategoryEntries.flatMap(([_, items]) => items);
  const totalItemsCount = allFlatItems.length;
  const completedItemsCount = allFlatItems.filter(i => !!checkedListItems[i.name]).length;
  const progressPercent = totalItemsCount > 0 ? Math.round((completedItemsCount / totalItemsCount) * 100) : 0;

  const copyListToClipboard = () => {
    if (totalItemsCount === 0) {
      toast.error("Grocery list is empty!");
      return;
    }
    
    let text = `🛒 CHEF Grocery Checklist\n📅 Week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}\n\n`;

    allCategoryEntries.forEach(([category, items]) => {
      if (items.length === 0) return;
      text += `--- ${getCategoryIcon(category)} ${category.toUpperCase()} ---\n`;
      items.forEach(item => {
        const isChecked = !!checkedListItems[item.name];
        text += `${isChecked ? '✅' : '☐'} ${item.name} (${item.recipes.join(', ')})\n`;
      });
      text += `\n`;
    });

    if (shoppingList.in_pantry_skipped && shoppingList.in_pantry_skipped.length > 0) {
      text += `✅ ALREADY IN PANTRY: ${shoppingList.in_pantry_skipped.join(', ')}\n\n`;
    }

    text += `Progress: ${completedItemsCount}/${totalItemsCount} completed (${progressPercent}%)\n`;
    text += `Generated with CHEF App`;

    navigator.clipboard.writeText(text);
    toast.success("📋 Grocery checklist copied to clipboard!");
  };

  if (!token) {
    return (
      <section className="page active meal-planner-page" style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="card glass" style={{ maxWidth: '500px', margin: '0 auto', padding: '40px 30px', borderRadius: '24px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📅</div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: '800', marginBottom: '10px' }}>Weekly Meal Planner</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.6' }}>
            Plan your weekly meals, auto-log daily nutrition, and generate smart grocery checklists based on pantry stock.
          </p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)} style={{ padding: '12px 28px', fontSize: '1rem', borderRadius: '14px' }}>
            🔐 Log In / Sign Up to Access Planner
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
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
      
      <div 
        ref={gridRef}
        className="calendar-grid" 
        onMouseDown={handleGridMouseDown}
        onMouseLeave={handleGridMouseLeave}
        onMouseUp={handleGridMouseUp}
        onMouseMove={handleGridMouseMove}
        style={{ 
          display: 'flex', 
          gap: '20px', 
          overflowX: 'auto', 
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: isDragging ? 'none' : 'auto',
          padding: '12px 20px 30px 20px' 
        }}
      >
        {weekDays.map((dateObj, dayIdx) => {
          const dateStr = dateObj.toISOString().split('T')[0];
          const isToday = dateStr === new Date().toISOString().split('T')[0];
          
          // Calculate daily planned macros
          const todaysMeals = SLOTS.map(slot => getMealForSlot(dateStr, slot)).filter(Boolean);
          const dailyCals = todaysMeals.reduce((sum, mp) => sum + (mp.recipe?.calories || 0), 0);
          const targetCals = activeProfile?.target_calories || 2000;
          const calPercent = Math.min(100, Math.max(0, (dailyCals / targetCals) * 100));
          const isOverTarget = dailyCals > targetCals;

          // Compute daily aggregate Nutri-Score grade
          const dayMeals = SLOTS.map(slot => getMealForSlot(dateStr, slot)).filter(Boolean);
          const dayNutriScores = dayMeals.map(m => m.recipe?.nutri_score || m.recipe?.chef_score).filter(Boolean);
          let dailyGrade = null;
          if (dayNutriScores.length > 0) {
            const avgScore = Math.round(dayNutriScores.reduce((acc, s) => acc + (s.numeric_score ?? 0), 0) / dayNutriScores.length);
            if (avgScore <= -4) dailyGrade = 'S';
            else if (avgScore <= -1) dailyGrade = 'A';
            else if (avgScore <= 2) dailyGrade = 'B';
            else if (avgScore <= 10) dailyGrade = 'C';
            else if (avgScore <= 18) dailyGrade = 'D';
            else dailyGrade = 'E';
          }
          
          return (
            <div key={dateStr} className={`calendar-day ${isToday ? 'today' : ''}`} style={{ flex: '1', minWidth: '220px', background: isToday ? 'rgba(255,255,255,0.9)' : 'var(--glass-bg)', borderRadius: '24px', overflow: 'hidden', border: isToday ? '2px solid var(--primary)' : '1px solid var(--border-glass)', boxShadow: isToday ? 'var(--shadow-card-hover)' : 'var(--shadow-card)', transition: 'transform 0.2s', animation: `fadeInUp 0.4s ease forwards ${dayIdx * 0.05}s`, opacity: 0 }}>
              <div className="day-header" style={{ padding: '16px', textAlign: 'center', background: isToday ? 'var(--primary)' : 'rgba(255,255,255,0.5)', borderBottom: '1px solid var(--border-glass)', color: isToday ? 'white' : 'var(--text-primary)', position: 'relative' }}>
                {dailyGrade && (
                  <div style={{ position: 'absolute', top: 12, right: 12 }} title={`Daily Nutri-Score: ${dailyGrade}`}>
                    <ChefScoreBadge grade={dailyGrade} size="sm" showTooltip={true} />
                  </div>
                )}
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
                          {(() => {
                            const visual = getRecipeCardVisual(meal.recipe);
                            return (
                              <>
                                {meal.recipe?.image_url ? (
                                  <img 
                                    src={meal.recipe.image_url} 
                                    alt={meal.recipe?.title}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.style.display = 'none';
                                      if (e.target.nextSibling) {
                                        e.target.nextSibling.style.display = 'flex';
                                      }
                                    }}
                                    style={{ width: '70px', height: '80px', flexShrink: 0, objectFit: 'cover', borderRadius: '8px' }} 
                                  />
                                ) : null}
                                <div style={{ display: meal.recipe?.image_url ? 'none' : 'flex', width: '70px', height: '80px', flexShrink: 0, background: visual.gradient, alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontSize: '24px' }}>
                                  {visual.icon}
                                </div>
                              </>
                            );
                          })()}
                          <div style={{ padding: '8px 10px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                             <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '2px' }}>{slot}</div>
                             <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-primary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{meal.recipe?.title}</div>
                             <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: 6 }}>
                               <span>{meal.recipe?.calories} kcal</span>
                               {(meal.recipe?.nutri_score || meal.recipe?.chef_score) && <ChefScoreBadge grade={(meal.recipe?.nutri_score || meal.recipe?.chef_score).grade} size="sm" />}
                             </div>
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
                    {(() => {
                      const visual = getRecipeCardVisual(r);
                      return (
                        <>
                          {r.image_url ? (
                            <img 
                              className="recipe-image" 
                              src={r.image_url} 
                              alt={r.title} 
                              style={{ height: '120px' }} 
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.style.display = 'none';
                                if (e.currentTarget.nextSibling) {
                                  e.currentTarget.nextSibling.style.display = 'flex';
                                }
                              }} 
                            />
                          ) : null}
                          <div style={{ display: r.image_url ? 'none' : 'flex', height: '120px', background: visual.gradient, alignItems: 'center', justifyContent: 'center', fontSize: '32px' }}>
                            {visual.icon}
                          </div>
                        </>
                      );
                    })()}
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
        <div className="modal-overlay grocery-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsShoppingListOpen(false)} style={{ alignItems: 'flex-start', justifyContent: 'flex-end', paddingTop: '0' }}>
          <div className="modal-content glass grocery-drawer" style={{ width: '480px', height: '100vh', margin: '0', borderRadius: '24px 0 0 24px', animation: 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards', display: 'flex', flexDirection: 'column', borderRight: 'none' }}>
            <button className="modal-close no-print" onClick={() => setIsShoppingListOpen(false)}>×</button>

            {/* Print Only Header */}
            <div className="grocery-print-header" style={{ display: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 4px 0', color: '#000' }}>🛒 CHEF — Grocery Checklist</h1>
                  <p style={{ fontSize: '0.9rem', color: '#333', margin: 0 }}>
                    Week of {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#444' }}>
                  <div style={{ fontWeight: '700' }}>{completedItemsCount} / {totalItemsCount} Completed</div>
                  <div>Printed: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              </div>
            </div>
            
            {/* Screen Header */}
            <div className="grocery-screen-header no-print" style={{ padding: '16px 0 10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '42px', height: '42px', background: 'rgba(129, 178, 154, 0.15)', color: 'var(--accent-2)', borderRadius: '14px', fontSize: '1.4rem' }}>🛒</div>
                <div>
                  <h2 className="modal-title" style={{ fontSize: '1.6rem', marginBottom: '0px' }}>Grocery List</h2>
                  <p className="subtitle" style={{ fontSize: '0.85rem', margin: 0 }}>Categorized ingredients (pantry stock excluded)</p>
                </div>
              </div>

              {/* Progress Bar */}
              {totalItemsCount > 0 && (
                <div style={{ marginTop: '12px', background: 'rgba(0,0,0,0.06)', borderRadius: '10px', padding: '10px 14px', border: '1px solid var(--border-glass)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
                    <span>Shopping Progress</span>
                    <span>{completedItemsCount} of {totalItemsCount} items ({progressPercent}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--border-glass)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }} onClick={handleCheckAll}>
                  ✓ Select All
                </button>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px' }} onClick={handleUncheckAll}>
                  ↺ Clear Checked
                </button>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', borderRadius: '8px', marginLeft: 'auto' }} onClick={copyListToClipboard}>
                  📋 Copy Text List
                </button>
              </div>

              {/* Filter Tabs */}
              <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '3px', marginTop: '12px', gap: '4px' }}>
                <button 
                  onClick={() => setGroceryFilter('all')}
                  style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '8px', background: groceryFilter === 'all' ? 'var(--card-bg)' : 'transparent', color: groceryFilter === 'all' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', boxShadow: groceryFilter === 'all' ? 'var(--shadow-card)' : 'none', transition: '0.2s' }}
                >
                  All ({totalItemsCount})
                </button>
                <button 
                  onClick={() => setGroceryFilter('tobuy')}
                  style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '8px', background: groceryFilter === 'tobuy' ? 'var(--card-bg)' : 'transparent', color: groceryFilter === 'tobuy' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', boxShadow: groceryFilter === 'tobuy' ? 'var(--shadow-card)' : 'none', transition: '0.2s' }}
                >
                  To Buy ({totalItemsCount - completedItemsCount})
                </button>
                <button 
                  onClick={() => setGroceryFilter('checked')}
                  style={{ flex: 1, padding: '6px 0', border: 'none', borderRadius: '8px', background: groceryFilter === 'checked' ? 'var(--card-bg)' : 'transparent', color: groceryFilter === 'checked' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.78rem', cursor: 'pointer', boxShadow: groceryFilter === 'checked' ? 'var(--shadow-card)' : 'none', transition: '0.2s' }}
                >
                  Checked ({completedItemsCount})
                </button>
              </div>

              {/* Quick Add Custom Item Input */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="text" 
                  placeholder="+ Add custom item (e.g., Paper Towels)..." 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                  style={{ flex: 1, padding: '8px 12px', fontSize: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                />
                <button className="btn-primary" onClick={handleAddCustomItem} style={{ padding: '8px 14px', fontSize: '0.85rem', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                  Add
                </button>
              </div>
            </div>
            
            <div className="grocery-scroll-area" style={{ flex: 1, overflowY: 'auto', paddingRight: '6px', marginTop: '10px' }}>
              {loadingShoppingList ? (
                <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '10px', animation: 'pulse 1.5s infinite' }}>🥑</div>
                  Analyzing your recipes...
                </div>
              ) : (totalItemsCount === 0) ? (
                <div className="empty-state">
                  <span className="empty-icon">📝</span>
                  <p>No ingredients needed! Your scheduled meals match your pantry stock or planner is empty.</p>
                </div>
              ) : (
                <div className="grocery-categories-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {allCategoryEntries.map(([category, items]) => {
                    const filteredItems = items.filter(item => {
                      const isChecked = !!checkedListItems[item.name];
                      if (groceryFilter === 'tobuy') return !isChecked;
                      if (groceryFilter === 'checked') return isChecked;
                      return true;
                    });

                    if (filteredItems.length === 0) return null;

                    return (
                      <div key={category} className="grocery-category-group">
                        <h4 className="grocery-category-header" style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{getCategoryIcon(category)}</span>
                          <span>{category}</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: '600', color: 'var(--text-muted)', marginLeft: 'auto' }}>({filteredItems.length})</span>
                        </h4>
                        <ul style={{ listStyle: 'none', padding: 0 }}>
                          {filteredItems.map((item, idx) => {
                            const isChecked = !!checkedListItems[item.name];
                            const isCustom = category === 'Custom Additions';
                            return (
                              <li key={idx} className={`grocery-item-row ${isChecked ? 'is-checked' : ''}`} style={{ padding: '10px 12px', marginBottom: '6px', background: isChecked ? 'transparent' : 'var(--bg-secondary)', border: '1px solid', borderColor: isChecked ? 'transparent' : 'var(--border-glass)', borderRadius: '10px', display: 'flex', alignItems: 'center', transition: 'all 0.2s', opacity: isChecked ? 0.6 : 1 }}>
                                <div 
                                  className="no-print"
                                  onClick={() => toggleCheck(item.name)}
                                  style={{ width: '20px', height: '20px', borderRadius: '5px', border: `2px solid ${isChecked ? 'var(--primary)' : 'var(--border-glass)'}`, background: isChecked ? 'var(--primary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '12px', cursor: 'pointer', transition: '0.2s', flexShrink: 0 }}
                                >
                                  {isChecked && <span style={{ color: 'white', fontSize: '12px' }}>✓</span>}
                                </div>
                                <span className="printable-checkbox-box">{isChecked ? '✓' : ''}</span>
                                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, cursor: 'pointer' }} onClick={() => toggleCheck(item.name)}>
                                  <label className="grocery-item-title" style={{ fontWeight: '600', fontSize: '0.92rem', textTransform: 'capitalize', color: 'var(--text-primary)', textDecoration: isChecked ? 'line-through' : 'none', cursor: 'pointer' }}>
                                    {item.name}
                                  </label>
                                  <span className="grocery-item-sub" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {isCustom ? 'Added manually' : `Needed for: ${item.recipes.join(', ')}`}
                                  </span>
                                </div>
                                {isCustom && (
                                  <button 
                                    className="no-print"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveCustomItem(item.name); }}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: '0.9rem', opacity: 0.7, padding: '4px' }}
                                    title="Delete custom item"
                                  >
                                    🗑️
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}

                  {/* Pantry Skipped List */}
                  {showPantryInPrint && shoppingList.in_pantry_skipped && shoppingList.in_pantry_skipped.length > 0 && (
                    <div className="grocery-pantry-section" style={{ marginTop: '10px', padding: '15px', background: 'rgba(129, 178, 154, 0.06)', borderRadius: '12px', border: '1px dashed rgba(129, 178, 154, 0.3)' }}>
                      <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: '#27ae60', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>✅ Already In Pantry ({shoppingList.in_pantry_skipped.length})</span>
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {shoppingList.in_pantry_skipped.map((ing, idx) => (
                          <span key={idx} className="grocery-pantry-chip" style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(129, 178, 154, 0.15)', borderRadius: '20px', color: '#27ae60', textTransform: 'capitalize', textDecoration: 'line-through' }}>
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print Footer Notice */}
            <div className="grocery-print-footer" style={{ display: 'none' }}>
              <div style={{ marginTop: '20px', borderTop: '1px solid #ccc', paddingTop: '10px', textAlign: 'center', fontSize: '0.75rem', color: '#666' }}>
                Generated by CHEF — Smart Meal & Recipe Manager • chef-app.com
              </div>
            </div>
            
            <div className="no-print" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input 
                  type="checkbox" 
                  checked={showPantryInPrint} 
                  onChange={(e) => setShowPantryInPrint(e.target.checked)} 
                  style={{ borderRadius: '4px', cursor: 'pointer' }}
                />
                Include pantry items in list & printout
              </label>

              <button className="btn-primary" style={{ padding: '14px', fontSize: '1rem', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={() => window.print()}>
                <span>🖨️</span>
                <span>Print Grocery Checklist</span>
              </button>
            </div>
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
