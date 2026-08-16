import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Zap, 
  Share2, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Copy, 
  MoreHorizontal, 
  RotateCcw, 
  Check, 
  Printer, 
  Search, 
  SlidersHorizontal, 
  Utensils, 
  Flame, 
  Clock, 
  ArrowRight, 
  PieChart, 
  Grid, 
  Eye, 
  RefreshCw, 
  TrendingUp, 
  Heart, 
  Info,
  Layers,
  ChevronDown
} from 'lucide-react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import { getLocalDateString } from '../utils/dateUtils';
import RecipeModal from '../components/RecipeModal';
import ChefScoreBadge from '../components/ChefScoreBadge';
import { getRecipeCardVisual } from '../utils/recipeVisuals';
import AuthModal from '../components/AuthModal';

export default function MealPlanner() {
  const { token, activeProfile } = useContext(AuthContext);
  const { settings } = useSettings();
  const toast = useToast();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  // Active view: 'grid' (7-day calendar) | 'day' (Daily Focus) | 'analytics' (Macro & Nutri Breakdown)
  const [viewMode, setViewMode] = useState('grid');
  const [focusedDayIndex, setFocusedDayIndex] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // 0 for Mon ... 6 for Sun
  });

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
  
  // Recipe Picker Modal State
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null); // {date: '2026-04-20', slot: 'Breakfast'}
  const [pickerSearch, setPickerSearch] = useState('');
  const [pickerTag, setPickerTag] = useState('all');
  const [pickerTab, setPickerTab] = useState('saved'); // 'saved' | 'custom'
  const [customDishName, setCustomDishName] = useState('');
  const [customDishCals, setCustomDishCals] = useState('');
  const [customDishProtein, setCustomDishProtein] = useState('');

  // Active Single Recipe Modal
  const [activeRecipeModal, setActiveRecipeModal] = useState(null);
  
  // Shopping List State
  const [isShoppingListOpen, setIsShoppingListOpen] = useState(false);
  const [shoppingList, setShoppingList] = useState({ categories: {}, in_pantry_skipped: [] });
  const [loadingShoppingList, setLoadingShoppingList] = useState(false);
  const [checkedListItems, setCheckedListItems] = useState({});
  const [grocerySearch, setGrocerySearch] = useState('');

  // Bulk Actions & Modals
  const [smartFilling, setSmartFilling] = useState(false);
  const [loggingToday, setLoggingToday] = useState(false);
  const [sharingPlan, setSharingPlan] = useState(false);
  const [isPlanActionsOpen, setIsPlanActionsOpen] = useState(false);
  const [activeDayMenuDate, setActiveDayMenuDate] = useState(null);

  const [groceryFilter, setGroceryFilter] = useState('all'); // 'all' | 'tobuy' | 'checked'
  const [customItems, setCustomItems] = useState([]);
  const [newItemName, setNewItemName] = useState('');
  const [showPantryInPrint, setShowPantryInPrint] = useState(true);

  // Mouse / Touch Drag state for Meal Planner Grid
  const gridRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragScrollLeft, setDragScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const isDragEnabled = settings?.dragPlannerEnabled ?? true;

  const handleGridMouseDown = (e) => {
    if (!isDragEnabled || !gridRef.current) return;
    // Don't drag if clicking buttons, links, or cards
    if (e.target.closest('button') || e.target.closest('.day-action-trigger')) return;
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
    updateScrollButtons();
  };

  const updateScrollButtons = () => {
    if (!gridRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = gridRef.current;
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  const scrollGrid = (direction) => {
    if (!gridRef.current) return;
    const scrollAmount = direction === 'left' ? -320 : 320;
    gridRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    setTimeout(updateScrollButtons, 350);
  };

  const scrollToToday = () => {
    if (!gridRef.current) return;
    const todayCard = gridRef.current.querySelector('.calendar-day.today');
    if (todayCard) {
      todayCard.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  };

  const SLOTS = [
    { name: 'Breakfast', icon: '🌅', time: '8:00 AM', defaultRatio: 0.25 },
    { name: 'Lunch', icon: '☀️', time: '1:00 PM', defaultRatio: 0.35 },
    { name: 'Snack', icon: '🍎', time: '4:30 PM', defaultRatio: 0.10 },
    { name: 'Dinner', icon: '🌙', time: '7:30 PM', defaultRatio: 0.30 }
  ];

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
  const startDateStr = getLocalDateString(weekDays[0]);
  const endDateStr = getLocalDateString(weekDays[6]);

  const isCurrentWeek = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const thisMon = new Date(today.setDate(diff));
    thisMon.setHours(0,0,0,0);
    return getLocalDateString(thisMon) === startDateStr;
  }, [startDateStr]);

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

  useEffect(() => {
    const el = gridRef.current;
    if (el) {
      el.addEventListener('scroll', updateScrollButtons);
      updateScrollButtons();
      return () => el.removeEventListener('scroll', updateScrollButtons);
    }
  }, [viewMode, mealPlans]);

  const changeWeek = (weeks) => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + (weeks * 7));
    setCurrentWeekStart(newStart);
  };

  const jumpToCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const thisMon = new Date(today.setDate(diff));
    thisMon.setHours(0,0,0,0);
    setCurrentWeekStart(thisMon);
    setTimeout(scrollToToday, 200);
  };

  const getMealForSlot = (dateStr, slotName) => {
    return mealPlans.find(mp => mp.date === dateStr && mp.meal_slot === slotName);
  };

  const openRecipePicker = (dateStr, slotName) => {
    setSelectedSlot({ date: dateStr, slot: slotName });
    setPickerSearch('');
    setPickerTag('all');
    setPickerTab('saved');
    setCustomDishName('');
    setCustomDishCals('');
    setCustomDishProtein('');
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

  const handleAddCustomDishToSlot = async (e) => {
    e.preventDefault();
    if (!customDishName.trim()) {
      toast.error("Please enter dish title");
      return;
    }
    try {
      // Save custom dish as bookmark first
      const saved = await api.post('/recipes/save', {
        title: customDishName.trim(),
        calories: customDishCals ? parseFloat(customDishCals) : 400,
        protein_g: customDishProtein ? parseFloat(customDishProtein) : 20,
        summary: 'Custom quick meal',
        ingredients: 'Custom ingredients'
      });
      await api.post('/mealplan', {
        recipe_id: saved.id,
        date: selectedSlot.date,
        meal_slot: selectedSlot.slot
      });
      toast.success(`Added custom dish "${customDishName}" to ${selectedSlot.slot}! ✓`);
      setIsRecipePickerOpen(false);
      setSelectedSlot(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to add custom meal");
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

  // 1-Click Copy Meal to Tomorrow
  const handleDuplicateMealToNextDay = async (meal, e) => {
    if (e) e.stopPropagation();
    try {
      const mealDate = new Date(meal.date);
      mealDate.setDate(mealDate.getDate() + 1);
      const nextDateStr = getLocalDateString(mealDate);
      await api.post('/mealplan', {
        recipe_id: meal.recipe_id || meal.recipe?.id,
        date: nextDateStr,
        meal_slot: meal.meal_slot
      });
      toast.success(`Repeated "${meal.recipe?.title}" to next day! 📋`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to copy meal to next day");
    }
  };

  // Copy Entire Day to Tomorrow
  const handleCopyDayToTomorrow = async (sourceDateStr) => {
    setActiveDayMenuDate(null);
    try {
      const srcDate = new Date(sourceDateStr);
      srcDate.setDate(srcDate.getDate() + 1);
      const targetDateStr = getLocalDateString(srcDate);
      await api.post(`/mealplan/copy-day?source_date=${sourceDateStr}&target_date=${targetDateStr}`);
      toast.success(`Copied all meals to tomorrow (${targetDateStr})! ✨`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to copy day's plan");
    }
  };

  // Clear Day
  const handleClearDay = async (dateStr) => {
    setActiveDayMenuDate(null);
    try {
      await api.delete(`/mealplan/clear-range?start_date=${dateStr}&end_date=${dateStr}`);
      toast.success(`Cleared all meals for ${dateStr}`);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to clear day");
    }
  };

  // Clear Week
  const handleClearWeek = async () => {
    setIsPlanActionsOpen(false);
    if (!window.confirm("Are you sure you want to clear all meals for this week?")) return;
    try {
      await api.delete(`/mealplan/clear-range?start_date=${startDateStr}&end_date=${endDateStr}`);
      toast.success("Week meal plan cleared!");
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to clear week");
    }
  };

  // Copy Week to Next Week
  const handleCopyWeekToNext = async () => {
    setIsPlanActionsOpen(false);
    try {
      const nextStart = new Date(currentWeekStart);
      nextStart.setDate(nextStart.getDate() + 7);
      const nextStartStr = getLocalDateString(nextStart);
      await api.post(`/mealplan/copy-week?source_start_date=${startDateStr}&target_start_date=${nextStartStr}`);
      toast.success("Successfully copied full meal plan to next week! 🚀");
    } catch (err) {
      toast.error(err.message || "Failed to copy week plan");
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
      const todayStr = getLocalDateString();
      const result = await api.post(`/mealplan/log-today?date=${todayStr}`);
      toast.success(result.message || "Today's planned meals logged into tracker! ⚡");
    } catch (err) {
      toast.error(err.message || 'Failed to log today\'s meals.');
    } finally {
      setLoggingToday(false);
    }
  };

  const handleSharePlanToFeed = async () => {
    if (mealPlans.length === 0) {
      toast.error("No meals scheduled for this week to share!");
      return;
    }
    setSharingPlan(true);
    try {
      const slotsData = mealPlans.map(mp => ({
        date: mp.date,
        meal_slot: mp.meal_slot,
        recipe_title: mp.recipe?.title || 'Unknown Recipe',
        calories: mp.recipe?.calories || 0,
        image_url: mp.recipe?.image_url || null,
      }));

      const content = `🗓️ My Meal Plan for the week of ${weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (${mealPlans.length} meals planned)`;

      await api.post('/community/posts', {
        content,
        shared_meal_plan: {
          week_start: startDateStr,
          slots: slotsData
        }
      });

      toast.success("🗓️ Meal plan shared to Community Feed!");
    } catch (err) {
      toast.error(err.message || "Failed to share meal plan to feed.");
    } finally {
      setSharingPlan(false);
    }
  };

  const generateShoppingList = async () => {
    setIsShoppingListOpen(true);
    setLoadingShoppingList(true);
    try {
      const data = await api.get(`/mealplan/grocery-list?start_date=${startDateStr}&end_date=${endDateStr}`);
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

  // Weekly Nutrition Stats computation
  const weeklyStats = useMemo(() => {
    const totalSlots = 28; // 7 days * 4 slots
    const filledSlots = mealPlans.length;
    const targetCals = activeProfile?.target_calories || 2000;
    
    let totalCals = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    const scores = [];

    mealPlans.forEach(mp => {
      if (mp.recipe) {
        totalCals += mp.recipe.calories || 0;
        totalProtein += mp.recipe.protein_g || 0;
        totalCarbs += mp.recipe.carbs_g || 0;
        totalFat += mp.recipe.fat_g || 0;
        const score = mp.recipe.nutri_score || mp.recipe.chef_score;
        if (score?.numeric_score !== undefined) scores.push(score.numeric_score);
      }
    });

    const avgDailyCals = Math.round(totalCals / 7);
    const avgDailyProtein = Math.round(totalProtein / 7);
    const avgDailyCarbs = Math.round(totalCarbs / 7);
    const avgDailyFat = Math.round(totalFat / 7);

    let weeklyGrade = null;
    if (scores.length > 0) {
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      if (avgScore <= -4) weeklyGrade = 'S';
      else if (avgScore <= -1) weeklyGrade = 'A';
      else if (avgScore <= 2) weeklyGrade = 'B';
      else if (avgScore <= 10) weeklyGrade = 'C';
      else if (avgScore <= 18) weeklyGrade = 'D';
      else weeklyGrade = 'E';
    }

    return {
      filledSlots,
      totalSlots,
      fillPercent: Math.round((filledSlots / totalSlots) * 100),
      avgDailyCals,
      targetCals,
      avgDailyProtein,
      avgDailyCarbs,
      avgDailyFat,
      weeklyGrade,
    };
  }, [mealPlans, activeProfile]);

  // Filtered Saved Recipes in Picker
  const filteredPickerRecipes = useMemo(() => {
    return savedRecipes.filter(r => {
      if (pickerSearch.trim()) {
        const q = pickerSearch.toLowerCase();
        const matchesTitle = r.title?.toLowerCase().includes(q);
        const matchesIng = typeof r.ingredients === 'string' && r.ingredients.toLowerCase().includes(q);
        if (!matchesTitle && !matchesIng) return false;
      }
      if (pickerTag === 'high-protein') return (r.protein_g || 0) >= 25;
      if (pickerTag === 'low-cal') return (r.calories || 0) <= 400 && (r.calories || 0) > 0;
      if (pickerTag === 'quick') return (r.ready_in_minutes || 0) <= 30 && (r.ready_in_minutes || 0) > 0;
      if (pickerTag === 'veg') {
        const t = (r.title || '').toLowerCase();
        return !t.includes('chicken') && !t.includes('beef') && !t.includes('pork') && !t.includes('fish') && !t.includes('shrimp');
      }
      return true;
    });
  }, [savedRecipes, pickerSearch, pickerTag]);

  if (!token) {
    return (
      <section className="page active meal-planner-page" style={{ textAlign: 'center', paddingTop: '80px', paddingBottom: '80px' }}>
        <div className="card glass" style={{ maxWidth: '540px', margin: '0 auto', padding: '48px 32px', borderRadius: '28px', border: '1px solid var(--border-glass)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>📅</div>
          <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '12px', letterSpacing: '-0.5px' }}>Smart Weekly Meal Planner</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '28px', lineHeight: '1.6', fontSize: '1rem' }}>
            Plan 7 days of balanced nutrition, auto-generate grocery lists matching your pantry stock, and sync daily meals in one click.
          </p>
          <button className="btn-primary" onClick={() => setAuthModalOpen(true)} style={{ padding: '14px 32px', fontSize: '1.05rem', borderRadius: '16px', fontWeight: '700' }}>
            🔐 Log In / Sign Up to Access Planner
          </button>
        </div>
        <AuthModal isOpen={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      </section>
    );
  }

  return (
    <section className="page active meal-planner-page">
      {/* ── Main Planner Header ── */}
      <div className="planner-header-container">
        <div className="planner-title-block">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '2rem' }}>🗓️</span>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.9rem', fontWeight: 800, letterSpacing: '-0.5px' }}>Weekly Meal Planner</h1>
              <p className="subtitle" style={{ margin: '2px 0 0', fontSize: '0.9rem' }}>
                Drag & pan your 7-day culinary schedule, auto-log macros, and generate smart groceries.
              </p>
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="planner-actions-toolbar">
          <button 
            className="planner-action-btn share-btn" 
            onClick={handleSharePlanToFeed} 
            disabled={sharingPlan}
            title="Share this week's plan to Community Feed"
          >
            <Share2 size={16} />
            <span>{sharingPlan ? 'Sharing...' : 'Share Plan'}</span>
          </button>

          <button 
            className="planner-action-btn magic-btn" 
            onClick={handleSmartAutofill} 
            disabled={smartFilling}
            title="Auto-fill 7 days matching your target calories & macros"
          >
            <Sparkles size={16} />
            <span>{smartFilling ? 'Generating...' : 'Magic Fill'}</span>
          </button>

          <button 
            className="planner-action-btn log-today-btn" 
            onClick={handleLogToday} 
            disabled={loggingToday}
            title="Log all today's planned meals into tracker"
          >
            <Zap size={16} />
            <span>Log Today's Meals</span>
          </button>

          <button 
            className="planner-action-btn grocery-btn" 
            onClick={generateShoppingList}
            title="Generate smart grocery list (pantry stock excluded)"
          >
            <ShoppingCart size={16} />
            <span>Groceries</span>
          </button>

          <div style={{ position: 'relative' }}>
            <button 
              className="planner-action-btn more-btn"
              onClick={() => setIsPlanActionsOpen(prev => !prev)}
              title="More Plan Options"
            >
              <MoreHorizontal size={18} />
            </button>

            {isPlanActionsOpen && (
              <div className="planner-dropdown-menu glass fade-in">
                <button onClick={handleCopyWeekToNext}>
                  <Copy size={15} /> Copy Week to Next Week
                </button>
                <button onClick={() => window.print()}>
                  <Printer size={15} /> Print Meal Plan Poster
                </button>
                <div className="dropdown-divider" />
                <button onClick={handleClearWeek} style={{ color: '#ef4444' }}>
                  <Trash2 size={15} /> Clear Entire Week
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Week Carousel Navigation & View Mode Switcher ── */}
      <div className="planner-navigation-card glass">
        <div className="week-nav-cluster">
          <button className="week-nav-arrow" onClick={() => changeWeek(-1)} title="Previous Week">
            <ChevronLeft size={20} />
          </button>
          
          <div className="week-label-box">
            <div className="week-range-text">
              {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            {isCurrentWeek ? (
              <span className="current-week-badge">✨ Current Week</span>
            ) : (
              <button className="jump-today-btn" onClick={jumpToCurrentWeek}>
                Jump to Current Week
              </button>
            )}
          </div>

          <button className="week-nav-arrow" onClick={() => changeWeek(1)} title="Next Week">
            <ChevronRight size={20} />
          </button>
        </div>

        {/* View Switcher Tabs */}
        <div className="planner-view-tabs">
          <button 
            className={`view-tab-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={15} /> 7-Day Grid
          </button>
          <button 
            className={`view-tab-btn ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
          >
            <Eye size={15} /> Daily Focus
          </button>
          <button 
            className={`view-tab-btn ${viewMode === 'analytics' ? 'active' : ''}`}
            onClick={() => setViewMode('analytics')}
          >
            <PieChart size={15} /> Macro Analytics
          </button>
        </div>
      </div>

      {/* ── Weekly Nutritional Overview & Day Strip ── */}
      <div className="planner-summary-ribbon glass">
        <div className="summary-stat-cell">
          <div className="stat-label">Planned Meals</div>
          <div className="stat-value">{weeklyStats.filledSlots} <span className="stat-sub">/ {weeklyStats.totalSlots} slots</span></div>
          <div className="stat-progress-line">
            <div className="stat-progress-fill" style={{ width: `${weeklyStats.fillPercent}%` }} />
          </div>
        </div>

        <div className="summary-stat-cell">
          <div className="stat-label">Daily Avg Energy</div>
          <div className="stat-value">{weeklyStats.avgDailyCals} <span className="stat-sub">/ {weeklyStats.targetCals} kcal</span></div>
          <span className={`stat-badge ${weeklyStats.avgDailyCals > weeklyStats.targetCals ? 'badge-warn' : 'badge-good'}`}>
            {weeklyStats.avgDailyCals === 0 ? 'Empty Plan' : (weeklyStats.avgDailyCals <= weeklyStats.targetCals ? '✓ On Target' : '⚠️ Over Budget')}
          </span>
        </div>

        <div className="summary-stat-cell">
          <div className="stat-label">Weekly Health Score</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
            {weeklyStats.weeklyGrade ? (
              <>
                <ChefScoreBadge grade={weeklyStats.weeklyGrade} size="md" showTooltip={true} />
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Grade {weeklyStats.weeklyGrade}</span>
              </>
            ) : (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Plan meals to grade</span>
            )}
          </div>
        </div>

        <div className="summary-stat-cell macro-split-cell">
          <div className="stat-label">Avg Daily Macros</div>
          <div className="macro-chips-row">
            <span className="macro-chip protein">🥩 {weeklyStats.avgDailyProtein}g P</span>
            <span className="macro-chip carbs">🍞 {weeklyStats.avgDailyCarbs}g C</span>
            <span className="macro-chip fat">🥑 {weeklyStats.avgDailyFat}g F</span>
          </div>
        </div>

        {/* Quick Day Mini Strip */}
        <div className="mini-day-strip">
          {weekDays.map((dObj, idx) => {
            const dStr = getLocalDateString(dObj);
            const isToday = dStr === getLocalDateString();
            const dayMeals = SLOTS.map(s => getMealForSlot(dStr, s.name)).filter(Boolean);
            const dayCals = dayMeals.reduce((sum, m) => sum + (m.recipe?.calories || 0), 0);
            const isSelected = focusedDayIndex === idx;

            return (
              <button 
                key={dStr}
                className={`mini-day-pill ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => {
                  setFocusedDayIndex(idx);
                  if (viewMode !== 'day') {
                    // Scroll to this day card in grid
                    const cards = gridRef.current?.querySelectorAll('.calendar-day');
                    if (cards && cards[idx]) {
                      cards[idx].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                  }
                }}
                title={`${dObj.toLocaleDateString('en-US', { weekday: 'short' })}: ${Math.round(dayCals)} kcal (${dayMeals.length}/4 meals)`}
              >
                <span className="mini-day-name">{dObj.toLocaleDateString('en-US', { weekday: 'narrow' })}</span>
                <span className="mini-day-num">{dObj.getDate()}</span>
                <span className={`mini-day-dot ${dayMeals.length === 4 ? 'dot-full' : (dayMeals.length > 0 ? 'dot-partial' : 'dot-empty')}`} />
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="planner-error-banner">
          <span>⚠️ {error}</span>
          <button onClick={fetchData}>Retry</button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 1: 7-DAY SLIDING GRID                              */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'grid' && (
        <div className="planner-grid-wrapper">
          {/* Scroll Navigation Chevrons */}
          {canScrollLeft && (
            <button className="grid-scroll-arrow arrow-left" onClick={() => scrollGrid('left')} title="Scroll Left">
              <ChevronLeft size={24} />
            </button>
          )}
          {canScrollRight && (
            <button className="grid-scroll-arrow arrow-right" onClick={() => scrollGrid('right')} title="Scroll Right">
              <ChevronRight size={24} />
            </button>
          )}

          <div 
            ref={gridRef}
            className={`calendar-grid ${isDragging ? 'is-dragging' : ''}`}
            onMouseDown={handleGridMouseDown}
            onMouseLeave={handleGridMouseLeave}
            onMouseUp={handleGridMouseUp}
            onMouseMove={handleGridMouseMove}
          >
            {weekDays.map((dateObj, dayIdx) => {
              const dateStr = getLocalDateString(dateObj);
              const isToday = dateStr === getLocalDateString();
              
              // Daily macro totals
              const todaysMeals = SLOTS.map(slot => getMealForSlot(dateStr, slot.name)).filter(Boolean);
              const dailyCals = todaysMeals.reduce((sum, mp) => sum + (mp.recipe?.calories || 0), 0);
              const targetCals = activeProfile?.target_calories || 2000;
              const calPercent = Math.min(100, Math.max(0, (dailyCals / targetCals) * 100));
              const isOverTarget = dailyCals > targetCals;

              // Daily Nutri-Score grade
              const dayNutriScores = todaysMeals.map(m => m.recipe?.nutri_score || m.recipe?.chef_score).filter(Boolean);
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
                <div 
                  key={dateStr} 
                  className={`calendar-day ${isToday ? 'today' : ''} fade-in-up`}
                  style={{ animationDelay: `${dayIdx * 0.04}s` }}
                >
                  {/* Day Header */}
                  <div className="day-header">
                    <div className="day-header-top">
                      <div className="day-weekday">{dateObj.toLocaleDateString('en-US', { weekday: 'long' })}</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {dailyGrade && (
                          <ChefScoreBadge grade={dailyGrade} size="sm" showTooltip={true} />
                        )}
                        
                        {/* Day Action Dropdown */}
                        <div style={{ position: 'relative' }}>
                          <button 
                            className="day-action-trigger" 
                            onClick={() => setActiveDayMenuDate(activeDayMenuDate === dateStr ? null : dateStr)}
                            title="Day actions"
                          >
                            <MoreHorizontal size={14} />
                          </button>
                          
                          {activeDayMenuDate === dateStr && (
                            <div className="day-dropdown-menu glass fade-in">
                              <button onClick={() => handleCopyDayToTomorrow(dateStr)}>
                                <Copy size={13} /> Copy to Tomorrow
                              </button>
                              <button onClick={() => { setFocusedDayIndex(dayIdx); setViewMode('day'); }}>
                                <Eye size={13} /> Focus on Day
                              </button>
                              <div className="dropdown-divider" />
                              <button onClick={() => handleClearDay(dateStr)} style={{ color: '#ef4444' }}>
                                <Trash2 size={13} /> Clear Day
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="day-date-number">{dateObj.getDate()}</div>
                    
                    {/* Calorie Progress Ring / Bar */}
                    <div className="day-calorie-status">
                      <div className="cal-text-line">
                        <span className="cal-val">{Math.round(dailyCals)}</span>
                        <span className="cal-target">/ {targetCals} kcal</span>
                      </div>
                      <div className="calorie-progress-container">
                        <div 
                          className="calorie-progress-bar" 
                          style={{ 
                            width: `${calPercent}%`, 
                            backgroundColor: isOverTarget ? '#ef4444' : (isToday ? 'var(--primary)' : 'var(--accent-2)') 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Day Slots */}
                  <div className="day-slots">
                    {SLOTS.map(slot => {
                      const meal = getMealForSlot(dateStr, slot.name);
                      return (
                        <div key={slot.name} className="meal-slot-wrapper">
                          <div className="slot-badge-line">
                            <span className="slot-icon-name">{slot.icon} {slot.name}</span>
                            <span className="slot-time-hint">{slot.time}</span>
                          </div>

                          {meal ? (
                            <div 
                              className="planned-meal-card glass"
                              onClick={() => setActiveRecipeModal(meal.recipe)}
                            >
                              {(() => {
                                const visual = getRecipeCardVisual(meal.recipe);
                                return (
                                  <>
                                    {meal.recipe?.image_url ? (
                                      <img 
                                        src={meal.recipe.image_url} 
                                        alt={meal.recipe?.title}
                                        className="meal-thumb-img"
                                        onError={(e) => {
                                          e.target.onerror = null;
                                          e.target.style.display = 'none';
                                          if (e.target.nextSibling) {
                                            e.target.nextSibling.style.display = 'flex';
                                          }
                                        }}
                                      />
                                    ) : null}
                                    <div 
                                      className="meal-thumb-fallback"
                                      style={{ 
                                        display: meal.recipe?.image_url ? 'none' : 'flex', 
                                        background: visual.gradient 
                                      }}
                                    >
                                      {visual.icon}
                                    </div>
                                  </>
                                );
                              })()}

                              <div className="meal-info-block">
                                <div className="meal-title-text">{meal.recipe?.title}</div>
                                <div className="meal-meta-pills">
                                  <span className="pill-cals">🔥 {Math.round(meal.recipe?.calories || 0)} kcal</span>
                                  {meal.recipe?.protein_g && (
                                    <span className="pill-protein">🥩 {Math.round(meal.recipe.protein_g)}g</span>
                                  )}
                                  {(meal.recipe?.nutri_score || meal.recipe?.chef_score) && (
                                    <ChefScoreBadge grade={(meal.recipe?.nutri_score || meal.recipe?.chef_score).grade} size="sm" />
                                  )}
                                </div>
                              </div>

                              {/* Hover Quick Actions */}
                              <div className="meal-hover-actions">
                                <button 
                                  className="action-icon-btn copy-btn"
                                  onClick={(e) => handleDuplicateMealToNextDay(meal, e)}
                                  title="Repeat to Tomorrow"
                                >
                                  <Copy size={13} />
                                </button>
                                <button 
                                  className="action-icon-btn remove-btn"
                                  onClick={(e) => removeMeal(meal.id, e)}
                                  title="Remove Meal"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button 
                              className="empty-slot-btn" 
                              onClick={() => openRecipePicker(dateStr, slot.name)}
                            >
                              <Plus size={14} />
                              <span>Plan {slot.name}</span>
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
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 2: DAILY FOCUS DEEP-DIVE                            */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'day' && (
        <div className="daily-focus-container fade-in">
          {/* Day Selector Carousel Header */}
          <div className="focus-day-carousel glass">
            {weekDays.map((dObj, idx) => {
              const dStr = getLocalDateString(dObj);
              const isSelected = focusedDayIndex === idx;
              const isToday = dStr === getLocalDateString();
              const dayMeals = SLOTS.map(s => getMealForSlot(dStr, s.name)).filter(Boolean);

              return (
                <button 
                  key={dStr}
                  className={`focus-day-tab ${isSelected ? 'active' : ''} ${isToday ? 'is-today' : ''}`}
                  onClick={() => setFocusedDayIndex(idx)}
                >
                  <span className="focus-tab-weekday">{dObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="focus-tab-daynum">{dObj.getDate()}</span>
                  <span className="focus-tab-meals-badge">{dayMeals.length}/4</span>
                </button>
              );
            })}
          </div>

          {/* Focused Day Timeline Content */}
          {(() => {
            const activeDateObj = weekDays[focusedDayIndex];
            const activeDateStr = getLocalDateString(activeDateObj);
            const dayMeals = SLOTS.map(s => getMealForSlot(activeDateStr, s.name)).filter(Boolean);
            const totalCals = dayMeals.reduce((sum, m) => sum + (m.recipe?.calories || 0), 0);
            const totalP = dayMeals.reduce((sum, m) => sum + (m.recipe?.protein_g || 0), 0);
            const totalC = dayMeals.reduce((sum, m) => sum + (m.recipe?.carbs_g || 0), 0);
            const totalF = dayMeals.reduce((sum, m) => sum + (m.recipe?.fat_g || 0), 0);
            const targetCals = activeProfile?.target_calories || 2000;

            return (
              <div className="focus-day-content-grid">
                {/* Timeline Slots */}
                <div className="focus-timeline-column">
                  <div className="focus-column-header">
                    <h2>
                      {activeDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                    </h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-secondary-sm" onClick={() => handleCopyDayToTomorrow(activeDateStr)}>
                        <Copy size={13} /> Copy to Tomorrow
                      </button>
                      <button className="btn-secondary-sm" onClick={() => handleClearDay(activeDateStr)}>
                        <Trash2 size={13} /> Clear
                      </button>
                    </div>
                  </div>

                  <div className="focus-slots-timeline">
                    {SLOTS.map((slot, sIdx) => {
                      const meal = getMealForSlot(activeDateStr, slot.name);
                      return (
                        <div key={slot.name} className="focus-timeline-slot glass">
                          <div className="timeline-slot-left">
                            <div className="timeline-time">{slot.time}</div>
                            <div className="timeline-icon">{slot.icon}</div>
                            <div className="timeline-slot-name">{slot.name}</div>
                          </div>

                          <div className="timeline-slot-body">
                            {meal ? (
                              <div className="focus-meal-card" onClick={() => setActiveRecipeModal(meal.recipe)}>
                                {meal.recipe?.image_url && (
                                  <img src={meal.recipe.image_url} alt={meal.recipe.title} className="focus-meal-img" />
                                )}
                                <div style={{ flex: 1 }}>
                                  <h4 style={{ margin: '0 0 6px 0', fontSize: '1.1rem' }}>{meal.recipe?.title}</h4>
                                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700 }}>🔥 {Math.round(meal.recipe?.calories || 0)} kcal</span>
                                    <span>🥩 {Math.round(meal.recipe?.protein_g || 0)}g Protein</span>
                                    <span>🍞 {Math.round(meal.recipe?.carbs_g || 0)}g Carbs</span>
                                    <span>🥑 {Math.round(meal.recipe?.fat_g || 0)}g Fat</span>
                                  </div>
                                </div>
                                <button className="btn-ghost-sm" onClick={(e) => removeMeal(meal.id, e)} title="Remove">
                                  <Trash2 size={15} style={{ color: '#ef4444' }} />
                                </button>
                              </div>
                            ) : (
                              <div className="focus-empty-slot">
                                <span>No meal scheduled for {slot.name}</span>
                                <button className="btn-primary-sm" onClick={() => openRecipePicker(activeDateStr, slot.name)}>
                                  <Plus size={14} /> Add Recipe
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Day Nutrition Breakdown Card */}
                <div className="focus-nutrition-column glass">
                  <h3 style={{ marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={20} style={{ color: 'var(--primary)' }} /> Daily Macro Budget
                  </h3>

                  <div className="focus-cal-summary-card">
                    <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                      {Math.round(totalCals)}
                      <span style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: 500 }}> / {targetCals} kcal</span>
                    </div>
                    <div className="calorie-progress-container" style={{ height: '10px', marginTop: '12px' }}>
                      <div 
                        className="calorie-progress-bar" 
                        style={{ 
                          width: `${Math.min(100, (totalCals / targetCals) * 100)}%`,
                          backgroundColor: totalCals > targetCals ? '#ef4444' : 'var(--primary)'
                        }} 
                      />
                    </div>
                  </div>

                  <div className="focus-macro-progress-list" style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                        <span>🥩 Protein</span>
                        <span>{Math.round(totalP)}g</span>
                      </div>
                      <div className="macro-bar-track"><div className="macro-bar-fill protein" style={{ width: `${Math.min(100, (totalP / 120) * 100)}%` }} /></div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                        <span>🍞 Carbohydrates</span>
                        <span>{Math.round(totalC)}g</span>
                      </div>
                      <div className="macro-bar-track"><div className="macro-bar-fill carbs" style={{ width: `${Math.min(100, (totalC / 200) * 100)}%` }} /></div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '6px' }}>
                        <span>🥑 Healthy Fats</span>
                        <span>{Math.round(totalF)}g</span>
                      </div>
                      <div className="macro-bar-track"><div className="macro-bar-fill fat" style={{ width: `${Math.min(100, (totalF / 60) * 100)}%` }} /></div>
                    </div>
                  </div>

                  <div style={{ marginTop: '30px', padding: '16px', background: 'rgba(255, 90, 54, 0.08)', borderRadius: '16px', border: '1px solid rgba(255, 90, 54, 0.2)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--primary)', marginBottom: '4px' }}>💡 Chef's Prep Tip</div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      Prep vegetables and marinate proteins the evening before to shave 15 minutes off your morning and lunch cooking times.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* VIEW MODE 3: WEEKLY NUTRITION & MACRO ANALYTICS               */}
      {/* ───────────────────────────────────────────────────────────── */}
      {viewMode === 'analytics' && (
        <div className="planner-analytics-container fade-in">
          <div className="analytics-grid-row">
            {/* Calorie Distribution Across Week */}
            <div className="analytics-card glass">
              <h3 style={{ marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={18} style={{ color: 'var(--primary)' }} /> 7-Day Caloric Trajectory
              </h3>
              
              <div className="weekly-cal-bars-chart">
                {weekDays.map((dObj) => {
                  const dStr = getLocalDateString(dObj);
                  const meals = SLOTS.map(s => getMealForSlot(dStr, s.name)).filter(Boolean);
                  const cals = meals.reduce((sum, m) => sum + (m.recipe?.calories || 0), 0);
                  const target = activeProfile?.target_calories || 2000;
                  const barHeight = Math.min(100, (cals / (target * 1.3)) * 100);

                  return (
                    <div key={dStr} className="cal-chart-col">
                      <div className="cal-chart-val">{Math.round(cals)}</div>
                      <div className="cal-chart-bar-slot">
                        <div 
                          className="cal-chart-bar-fill"
                          style={{ 
                            height: `${barHeight}%`,
                            background: cals > target ? '#ef4444' : 'var(--primary)'
                          }} 
                        />
                      </div>
                      <div className="cal-chart-day">{dObj.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Macro Breakdown Pie / Distribution */}
            <div className="analytics-card glass">
              <h3 style={{ marginTop: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PieChart size={18} style={{ color: 'var(--accent-2)' }} /> Average Macro Distribution
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px' }}>
                <div className="macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#3b82f6' }} />
                    <span style={{ fontWeight: 600 }}>Protein</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{weeklyStats.avgDailyProtein}g / day</span>
                </div>

                <div className="macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#f59e0b' }} />
                    <span style={{ fontWeight: 600 }}>Carbohydrates</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{weeklyStats.avgDailyCarbs}g / day</span>
                </div>

                <div className="macro-stat-row">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: '#10b981' }} />
                    <span style={{ fontWeight: 600 }}>Fats</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{weeklyStats.avgDailyFat}g / day</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RECIPE PICKER MODAL                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isRecipePickerOpen && selectedSlot && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsRecipePickerOpen(false)}>
          <div className="modal-content glass recipe-picker-dialog">
            <button className="modal-close" onClick={() => setIsRecipePickerOpen(false)}>×</button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '1.6rem' }}>🍽️</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>
                  Assign to {selectedSlot.slot}
                </h2>
                <p className="subtitle" style={{ margin: 0, fontSize: '0.85rem' }}>
                  {new Date(selectedSlot.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Picker Tab Switcher */}
            <div className="picker-tabs-row">
              <button 
                className={`picker-tab-btn ${pickerTab === 'saved' ? 'active' : ''}`}
                onClick={() => setPickerTab('saved')}
              >
                📚 Saved Recipes ({savedRecipes.length})
              </button>
              <button 
                className={`picker-tab-btn ${pickerTab === 'custom' ? 'active' : ''}`}
                onClick={() => setPickerTab('custom')}
              >
                ✏️ Custom Quick Dish
              </button>
            </div>

            {pickerTab === 'saved' ? (
              <>
                {/* Search & Tag Filter Bar */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <div className="picker-search-input-wrap">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text"
                      placeholder="Search recipes or ingredients..."
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="picker-filter-tags">
                  {[
                    { id: 'all', label: 'All Recipes' },
                    { id: 'high-protein', label: '🥩 High Protein (>25g)' },
                    { id: 'low-cal', label: '🥗 Low Calorie (<400)' },
                    { id: 'quick', label: '⏱️ Quick (<30m)' },
                    { id: 'veg', label: '🌱 Vegetarian' }
                  ].map(t => (
                    <button 
                      key={t.id}
                      className={`picker-tag-pill ${pickerTag === t.id ? 'active' : ''}`}
                      onClick={() => setPickerTag(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* Recipe Grid */}
                {filteredPickerRecipes.length === 0 ? (
                  <div className="empty-state" style={{ padding: '40px 20px' }}>
                    <span className="empty-icon">🍳</span>
                    <p style={{ margin: 0, fontWeight: 600 }}>No matching recipes found.</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Try adjusting your filters or switch to Custom Quick Dish!</p>
                  </div>
                ) : (
                  <div className="picker-recipe-grid">
                    {filteredPickerRecipes.map(r => {
                      const visual = getRecipeCardVisual(r);
                      return (
                        <div 
                          key={r.id} 
                          className="picker-recipe-item glass"
                          onClick={() => assignRecipeToSlot(r.id)}
                        >
                          {r.image_url ? (
                            <img 
                              src={r.image_url} 
                              alt={r.title}
                              className="picker-item-img"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.style.display = 'none';
                                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="picker-item-fallback"
                            style={{ 
                              display: r.image_url ? 'none' : 'flex', 
                              background: visual.gradient 
                            }}
                          >
                            {visual.icon}
                          </div>

                          <div className="picker-item-info">
                            <div className="picker-item-title">{r.title}</div>
                            <div className="picker-item-meta">
                              {r.calories && <span className="item-cals">🔥 {Math.round(r.calories)} kcal</span>}
                              {r.protein_g && <span className="item-prot">🥩 {Math.round(r.protein_g)}g</span>}
                              {(r.nutri_score || r.chef_score) && (
                                <ChefScoreBadge grade={(r.nutri_score || r.chef_score).grade} size="sm" />
                              )}
                            </div>
                          </div>

                          <button className="picker-assign-btn">
                            <Plus size={16} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              /* Custom Quick Dish Form */
              <form onSubmit={handleAddCustomDishToSlot} className="custom-dish-form">
                <div className="form-group">
                  <label>Dish Name *</label>
                  <input 
                    type="text" 
                    placeholder="e.g., Grilled Chicken Wrap, Protein Shake, Greek Salad"
                    value={customDishName}
                    onChange={(e) => setCustomDishName(e.target.value)}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Calories (kcal)</label>
                    <input 
                      type="number" 
                      placeholder="450"
                      value={customDishCals}
                      onChange={(e) => setCustomDishCals(e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Protein (grams)</label>
                    <input 
                      type="number" 
                      placeholder="25"
                      value={customDishProtein}
                      onChange={(e) => setCustomDishProtein(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-primary" style={{ marginTop: '10px', padding: '12px' }}>
                  ⚡ Add Custom Dish to {selectedSlot.slot}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* GROCERY LIST DRAWER                                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      {isShoppingListOpen && (
        <div className="modal-overlay grocery-modal-overlay" onClick={(e) => e.target === e.currentTarget && setIsShoppingListOpen(false)}>
          <div className="modal-content glass grocery-drawer">
            <button className="modal-close no-print" onClick={() => setIsShoppingListOpen(false)}>×</button>

            {/* Print Header */}
            <div className="grocery-print-header" style={{ display: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '16px' }}>
                <div>
                  <h1 style={{ fontSize: '1.8rem', fontWeight: 800, margin: 0 }}>🛒 CHEF — Grocery Checklist</h1>
                  <p style={{ margin: '4px 0 0', color: '#444' }}>
                    Week of {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{completedItemsCount} / {totalItemsCount} Completed</div>
                </div>
              </div>
            </div>
            
            {/* Screen Header */}
            <div className="grocery-screen-header no-print">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="grocery-icon-box">🛒</div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Smart Grocery List</h2>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.82rem' }}>Pantry ingredients automatically deducted</p>
                </div>
              </div>

              {/* Progress Bar */}
              {totalItemsCount > 0 && (
                <div className="grocery-progress-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px' }}>
                    <span>Shopping Progress</span>
                    <span>{completedItemsCount} / {totalItemsCount} ({progressPercent}%)</span>
                  </div>
                  <div style={{ height: '8px', background: 'rgba(0,0,0,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progressPercent}%`, background: 'var(--primary)', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
              )}

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                <button className="btn-secondary-sm" onClick={handleCheckAll}>
                  ✓ Select All
                </button>
                <button className="btn-secondary-sm" onClick={handleUncheckAll}>
                  ↺ Clear
                </button>
                <button className="btn-secondary-sm" onClick={copyListToClipboard} style={{ marginLeft: 'auto' }}>
                  📋 Copy List
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="grocery-filter-tabs">
                <button 
                  onClick={() => setGroceryFilter('all')}
                  className={groceryFilter === 'all' ? 'active' : ''}
                >
                  All ({totalItemsCount})
                </button>
                <button 
                  onClick={() => setGroceryFilter('tobuy')}
                  className={groceryFilter === 'tobuy' ? 'active' : ''}
                >
                  To Buy ({totalItemsCount - completedItemsCount})
                </button>
                <button 
                  onClick={() => setGroceryFilter('checked')}
                  className={groceryFilter === 'checked' ? 'active' : ''}
                >
                  Checked ({completedItemsCount})
                </button>
              </div>

              {/* Quick Add Custom Item */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input 
                  type="text" 
                  placeholder="+ Add custom item (e.g., Paper Towels)..." 
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCustomItem()}
                  className="grocery-add-input"
                />
                <button className="btn-primary-sm" onClick={handleAddCustomItem}>
                  Add
                </button>
              </div>
            </div>
            
            {/* Scrollable Categories Area */}
            <div className="grocery-scroll-area">
              {loadingShoppingList ? (
                <div style={{ textAlign: 'center', marginTop: '60px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '10px', animation: 'spin 2s linear infinite' }}>🥑</div>
                  Analyzing planned recipe ingredients...
                </div>
              ) : totalItemsCount === 0 ? (
                <div className="empty-state" style={{ padding: '60px 20px' }}>
                  <span className="empty-icon">📝</span>
                  <p style={{ fontWeight: 600 }}>All ingredients in pantry or plan is empty!</p>
                </div>
              ) : (
                <div className="grocery-categories-container">
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
                        <h4 className="grocery-category-header">
                          <span>{getCategoryIcon(category)} {category}</span>
                          <span className="cat-count">({filteredItems.length})</span>
                        </h4>
                        
                        <div className="grocery-items-list">
                          {filteredItems.map((item, idx) => {
                            const isChecked = !!checkedListItems[item.name];
                            const isCustom = category === 'Custom Additions';
                            return (
                              <div 
                                key={idx} 
                                className={`grocery-item-row ${isChecked ? 'is-checked' : ''}`}
                                onClick={() => toggleCheck(item.name)}
                              >
                                <div className={`grocery-checkbox ${isChecked ? 'checked' : ''}`}>
                                  {isChecked && <Check size={12} color="white" />}
                                </div>
                                
                                <div style={{ flex: 1 }}>
                                  <div className="item-title-text">{item.name}</div>
                                  <div className="item-subtitle-text">
                                    {isCustom ? 'Added manually' : `Used in: ${item.recipes.join(', ')}`}
                                  </div>
                                </div>

                                {isCustom && (
                                  <button 
                                    className="delete-custom-btn no-print"
                                    onClick={(e) => { e.stopPropagation(); handleRemoveCustomItem(item.name); }}
                                    title="Remove item"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pantry Stock Skipped Chips */}
                  {showPantryInPrint && shoppingList.in_pantry_skipped && shoppingList.in_pantry_skipped.length > 0 && (
                    <div className="grocery-pantry-section">
                      <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#10b981', marginBottom: '8px' }}>
                        ✅ Already In Pantry ({shoppingList.in_pantry_skipped.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {shoppingList.in_pantry_skipped.map((ing, idx) => (
                          <span key={idx} className="pantry-chip">
                            {ing}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Print & Footer Actions */}
            <div className="no-print" style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button 
                className="btn-primary" 
                style={{ padding: '14px', borderRadius: '16px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                onClick={() => window.print()}
              >
                <Printer size={18} />
                <span>Print Grocery Checklist</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* INDIVIDUAL RECIPE MODAL                                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      {activeRecipeModal && (
        <RecipeModal 
          recipe={{
            ...activeRecipeModal, 
            ingredients: activeRecipeModal.ingredients ? (typeof activeRecipeModal.ingredients === 'string' ? activeRecipeModal.ingredients.split(', ') : activeRecipeModal.ingredients) : []
          }} 
          onClose={() => setActiveRecipeModal(null)} 
        />
      )}
    </section>
  );
}
