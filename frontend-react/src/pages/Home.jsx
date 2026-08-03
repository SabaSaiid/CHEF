import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import DOMPurify from 'dompurify';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import RecipeModal from '../components/RecipeModal';
import MealSlotPickerModal from '../components/MealSlotPickerModal';
import ChefScoreBadge from '../components/ChefScoreBadge';
import foodFacts from '../data/foodFacts';
import { getLocalDateString, CHEF_EVENTS, dispatchChefEvent } from '../utils/dateUtils';
import { 
  Droplet, 
  Droplets, 
  Plus, 
  Minus, 
  Coffee, 
  Sun, 
  Utensils, 
  Moon, 
  Apple, 
  Calendar, 
  CheckCircle2, 
  PlusCircle, 
  Check, 
  Trash2, 
  Flame, 
  ExternalLink, 
  Sparkles,
  Lightbulb,
  RefreshCw,
  Copy,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Evening';
}

const FACT_COUNT = 3;
const AUTO_ROTATE_MS = 6000;

/* ── Animated Counter Component ─────────────────────────────── */
function AnimatedCounter({ end, suffix = '', duration = 1400 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration]);

  return <>{count.toLocaleString()}{suffix}</>;
}

export default function Home() {
  const { token, username, activeProfile, refreshActiveProfile } = useContext(AuthContext);
  const { settings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [dailyRecipe, setDailyRecipe] = useState(null);
  const [quickRecipes, setQuickRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickLoading, setQuickLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickerSlot, setPickerSlot] = useState('Breakfast');
  const [activeFact, setActiveFact] = useState(0);
  const [selectedFactCategory, setSelectedFactCategory] = useState('All');
  const [copiedFact, setCopiedFact] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef(null);

  const [todayLog, setTodayLog] = useState([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [guestLogs, setGuestLogs] = useState([]);
  const [todayMeals, setTodayMeals] = useState({ Breakfast: null, Lunch: null, Dinner: null, Snack: null });
  const [fridgeQuery, setFridgeQuery] = useState('');

  const greeting = useMemo(() => getGreeting(), []);

  // Pick 5 facts per day using a deterministic daily seed
  const dailyFacts = useMemo(() => {
    const now = new Date();
    const dayIndex = Math.floor(now.getTime() / 86400000);
    const indices = foodFacts.map((_, i) => i);
    let seed = dayIndex;
    for (let i = indices.length - 1; i > 0; i--) {
      seed = (seed * 16807 + 0) % 2147483647;
      const j = seed % (i + 1);
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, 6).map(i => foodFacts[i]);
  }, []);

  const filteredFacts = useMemo(() => {
    if (selectedFactCategory === 'All') return dailyFacts;
    const match = foodFacts.filter(f => f.category === selectedFactCategory);
    return match.length > 0 ? match : dailyFacts;
  }, [selectedFactCategory, dailyFacts]);

  const handleShuffleFact = () => {
    const randomIndex = Math.floor(Math.random() * foodFacts.length);
    const randomFact = foodFacts[randomIndex];
    const foundIdx = filteredFacts.findIndex(f => f.id === randomFact.id);
    if (foundIdx !== -1) {
      setActiveFact(foundIdx);
    } else {
      setSelectedFactCategory('All');
      const allIdx = dailyFacts.findIndex(f => f.id === randomFact.id);
      setActiveFact(allIdx !== -1 ? allIdx : Math.floor(Math.random() * dailyFacts.length));
    }
    toast.success('Shuffled a new food science fact! 💡');
  };

  const handleCopyFact = (factText) => {
    navigator.clipboard.writeText(factText);
    setCopiedFact(true);
    toast.success('Fact copied to clipboard! 📋');
    setTimeout(() => setCopiedFact(false), 2000);
  };

  // Auto-rotate facts
  const nextFact = useCallback(() => {
    setActiveFact(prev => (prev + 1) % filteredFacts.length);
  }, [filteredFacts.length]);

  useEffect(() => {
    if (isPaused || filteredFacts.length <= 1) return;
    timerRef.current = setInterval(nextFact, AUTO_ROTATE_MS);
    return () => clearInterval(timerRef.current);
  }, [isPaused, nextFact, filteredFacts.length]);

  const targets = useMemo(() => {
    return {
      calories: activeProfile?.target_calories || 2000,
      protein: activeProfile?.target_protein || 125,
      carbs: activeProfile?.target_carbs || 240,
      fat: activeProfile?.target_fat || 60,
      water: activeProfile?.target_water_ml || settings?.waterGoalTarget || 2000,
    };
  }, [activeProfile, settings]);

  const fetchTodayStats = useCallback(async () => {
    const todayStr = getLocalDateString();

    if (!token) {
      // Dynamic Guest Mode Data
      const guestWater = parseInt(localStorage.getItem('chef_guest_water')) || 0;
      setWaterTotal(guestWater);
      try {
        const storedLogs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const todayGuestLogs = storedLogs.filter(item => item.date === todayStr);
        setGuestLogs(todayGuestLogs);
      } catch {
        setGuestLogs([]);
      }
      return;
    }

    // 1. Fetch Nutrition Logs for today
    try {
      const logs = await api.get(`/nutrition/log?date=${todayStr}`);
      setTodayLog(logs);
    } catch (err) {
      console.error("Failed to fetch today's nutrition logs:", err);
    }

    // 2. Fetch Water logs
    try {
      const waterData = await api.get(`/nutrition/log/water?date=${todayStr}`);
      setWaterTotal(waterData.total_ml || 0);
    } catch (err) {
      console.error("Failed to fetch water log:", err);
    }

    // 3. Fetch Today's Meal Plan
    try {
      const meals = await api.get(`/mealplan?start_date=${todayStr}&end_date=${todayStr}`);
      const mealMap = { Breakfast: null, Lunch: null, Dinner: null, Snack: null };
      meals.forEach(m => {
        if (m.meal_slot in mealMap) {
          mealMap[m.meal_slot] = m;
        }
      });
      setTodayMeals(mealMap);
    } catch (err) {
      console.error("Failed to fetch today's meals:", err);
    }
  }, [token]);

  // Sync on mount, token change, or route navigation back to home
  useEffect(() => {
    fetchTodayStats();
  }, [fetchTodayStats, token, location.pathname]);

  // Subscribe to real-time custom window sync events from other tabs/pages
  useEffect(() => {
    const handleSync = () => {
      fetchTodayStats();
      if (refreshActiveProfile) refreshActiveProfile();
    };

    window.addEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
    window.addEventListener(CHEF_EVENTS.WATER_UPDATED, handleSync);
    window.addEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
      window.removeEventListener(CHEF_EVENTS.WATER_UPDATED, handleSync);
      window.removeEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchTodayStats, refreshActiveProfile]);

  const totals = useMemo(() => {
    let cal = 0, prot = 0, carb = 0, fat = 0;
    const logSource = token ? todayLog : guestLogs;

    logSource.forEach(item => {
      cal += item.calories || 0;
      prot += item.protein_g || 0;
      carb += item.carbs_g || 0;
      fat += item.fat_g || 0;
    });

    return {
      calories: Math.round(cal),
      protein: Math.round(prot),
      carbs: Math.round(carb),
      fat: Math.round(fat),
    };
  }, [todayLog, guestLogs, token]);

  const plannedTotals = useMemo(() => {
    let cal = 0, prot = 0, carb = 0, fat = 0;
    Object.values(todayMeals).forEach(entry => {
      if (entry?.recipe) {
        cal += entry.recipe.calories || 0;
        prot += entry.recipe.protein_g || entry.recipe.protein || 0;
        carb += entry.recipe.carbs_g || entry.recipe.carbs || 0;
        fat += entry.recipe.fat_g || entry.recipe.fat || 0;
      }
    });
    return {
      calories: Math.round(cal),
      protein: Math.round(prot),
      carbs: Math.round(carb),
      fat: Math.round(fat),
    };
  }, [todayMeals]);

  const isMealSlotLogged = useCallback((slotEntry) => {
    if (!slotEntry?.recipe) return false;
    const recipeId = slotEntry.recipe.id;
    const title = slotEntry.recipe.title?.toLowerCase();
    const logSource = token ? todayLog : guestLogs;

    return logSource.some(log => 
      (recipeId && log.recipe_id === recipeId) ||
      (log.food_name && log.food_name.toLowerCase() === title)
    );
  }, [todayLog, guestLogs, token]);

  const handleQuickLogMeal = async (e, slotEntry, slotName) => {
    e.stopPropagation();
    if (!slotEntry?.recipe) return;

    const recipe = slotEntry.recipe;
    const todayStr = getLocalDateString();

    try {
      if (token) {
        await api.post('/nutrition/log', {
          recipe_id: recipe.id,
          food_name: recipe.title,
          calories: recipe.calories || 0,
          protein_g: recipe.protein_g || recipe.protein || 0,
          carbs_g: recipe.carbs_g || recipe.carbs || 0,
          fat_g: recipe.fat_g || recipe.fat || 0,
          date: todayStr,
          meal_type: slotName ? slotName.toLowerCase() : 'snack'
        });
      } else {
        const newLog = {
          id: Date.now(),
          recipe_id: recipe.id,
          food_name: recipe.title,
          calories: recipe.calories || 0,
          protein_g: recipe.protein_g || 0,
          carbs_g: recipe.carbs_g || 0,
          fat_g: recipe.fat_g || 0,
          date: todayStr
        };
        const existing = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        localStorage.setItem('chef_guest_logs', JSON.stringify([...existing, newLog]));
      }

      toast.success(`Logged "${recipe.title}" into daily nutrition! 🎯`);
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
      fetchTodayStats();
    } catch (err) {
      toast.error(err.message || 'Failed to log meal.');
    }
  };

  const handleRemoveMealFromPlan = async (e, mealPlanId) => {
    e.stopPropagation();
    if (!mealPlanId) return;
    try {
      await api.delete(`/mealplan/${mealPlanId}`);
      toast.success('Meal removed from today\'s plan');
      fetchTodayStats();
    } catch (err) {
      toast.error(err.message || 'Failed to remove meal.');
    }
  };

  const handleLogWater = async (amount) => {
    const todayStr = getLocalDateString();
    if (token) {
      try {
        if (amount < 0) {
          const waterData = await api.get(`/nutrition/log/water?date=${todayStr}`);
          if (waterData.logs && waterData.logs.length > 0) {
            let remainingToSubtract = Math.abs(amount);
            for (const log of waterData.logs) {
              if (remainingToSubtract <= 0) break;
              if (log.amount_ml <= remainingToSubtract) {
                await api.delete(`/nutrition/log/water/${log.id}`);
                remainingToSubtract -= log.amount_ml;
              } else {
                const newAmount = log.amount_ml - remainingToSubtract;
                await api.put(`/nutrition/log/water/${log.id}`, { amount_ml: newAmount });
                remainingToSubtract = 0;
              }
            }
            toast.success(`Removed ${Math.abs(amount)}ml water! 💧`);
            fetchTodayStats();
            dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
          }
        } else {
          await api.post('/nutrition/log/water', { amount_ml: amount, date: todayStr });
          toast.success(`Added ${amount}ml water! 💧`);
          fetchTodayStats();
          dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
        }
      } catch (err) {
        toast.error("Failed to log water: " + err.message);
      }
    } else {
      const newTotal = Math.max(0, (parseInt(localStorage.getItem('chef_guest_water')) || 0) + amount);
      localStorage.setItem('chef_guest_water', newTotal);
      setWaterTotal(newTotal);
      dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
      if (amount > 0) {
        toast.success(`Logged ${amount}ml water (demo mode) 💧`);
      } else {
        toast.success(`Removed ${Math.abs(amount)}ml water (demo mode) 💧`);
      }
    }
  };

  const handleFridgeSearch = (e) => {
    e.preventDefault();
    if (!fridgeQuery.trim()) return;
    navigate('/recipes', { state: { ingredients: fridgeQuery } });
  };

  useEffect(() => {
    api.get('/recipes/daily')
      .then(data => {
        setDailyRecipe(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });

    api.get('/recipes/quick')
      .then(data => {
        setQuickRecipes(data);
        setQuickLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch quick recipes:", err);
        setQuickLoading(false);
      });
  }, []);

  const handleSaveRecipe = async () => {
    if (!dailyRecipe) return;
    try {
      await api.post('/recipes/save', {
        title: dailyRecipe.title,
        image_url: dailyRecipe.image_url || null,
        summary: dailyRecipe.summary || null,
        ingredients: (dailyRecipe.ingredients || []).join(', '),
        instructions: dailyRecipe.instructions || null,
        calories: dailyRecipe.nutrition?.calories || null,
        protein_g: dailyRecipe.nutrition?.protein_g || null,
        carbs_g: dailyRecipe.nutrition?.carbs_g || null,
        fat_g: dailyRecipe.nutrition?.fat_g || null,
        ready_in_minutes: dailyRecipe.ready_in_minutes || null,
        servings: dailyRecipe.servings || null,
      });
      toast.success(`"${dailyRecipe.title}" saved to bookmarks ✓`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const quickActions = [
    { icon: '🥕', label: 'By Ingredients', desc: 'Cook with what you have', path: '/ingredients' },
    { icon: '📖', label: 'Browse Recipes', desc: 'Explore our collection', path: '/recipes' },
    { icon: '📸', label: 'Food Detection', desc: 'Identify food by image', path: '/detection' },
    { icon: '🎯', label: 'Calorie Profile', desc: 'Track your daily goals', path: '/tdee' },
    { icon: '📅', label: 'Meal Planner', desc: 'Plan your weekly meals', path: '/planner' },
    { icon: '💾', label: 'Saved Recipes', desc: 'Your bookmarked favorites', path: '/saved' },
  ];

  const slots = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const slotEmojis = { Breakfast: '🍳', Lunch: '🍲', Dinner: '🥗', Snack: '🍎' };
  const slotIcons = {
    Breakfast: <Coffee size={14} />,
    Lunch: <Utensils size={14} />,
    Dinner: <Moon size={14} />,
    Snack: <Apple size={14} />
  };
  const slotColors = { Breakfast: '#ff9f43', Lunch: '#10ac84', Dinner: '#ee5253', Snack: '#0abde3' };

  const activeSlot = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'Breakfast';
    if (hour >= 11 && hour < 16) return 'Lunch';
    if (hour >= 17 && hour < 23) return 'Dinner';
    return 'Snack';
  }, []);

  return (
    <section className="page active">
      <div className="page-header fade-in-up" style={{ '--delay': '0ms' }}>
        <h1>{username ? `${greeting}, ${username}!` : 'My Kitchen'}</h1>
        <p className="subtitle">Welcome to your hybrid eating framework dashboard.</p>
      </div>



      {/* ── Recipe of the Day + Fun Fact ── */}
      <div className="kitchen-layout fade-in-up" style={{ '--delay': '200ms' }}>
        <div className="kitchen-main-col">
          <h2 className="section-title">✨ Recipe of the Day</h2>
          <div className="card glass daily-recipe-card">
            {loading ? (
              <div style={{ padding: '20px' }}>
                <div className="skeleton" style={{ height: '200px', marginBottom: '16px' }}></div>
                <div className="skeleton" style={{ height: '24px', width: '60%', marginBottom: '10px' }}></div>
                <div className="skeleton" style={{ height: '14px', width: '80%' }}></div>
              </div>
            ) : error ? (
              <div style={{ padding: '20px', color: 'var(--accent-1)', textAlign: 'center' }}>{error}</div>
            ) : dailyRecipe && (
              <>
                {dailyRecipe.image_url && <img className="recipe-image" style={{ maxHeight: '250px', objectFit: 'cover' }} src={dailyRecipe.image_url} alt={dailyRecipe.title} />}
                <div className="recipe-info" style={{ padding: '20px' }}>
                  <div className="recipe-title" style={{ fontSize: '1.5rem' }}>{dailyRecipe.title}</div>
                  {dailyRecipe.summary && <div className="recipe-summary" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(dailyRecipe.summary) }} style={{ marginBottom: '15px' }}></div>}
                  {dailyRecipe.diets?.length > 0 && (
                    <div className="diet-tags" style={{ marginBottom: '15px' }}>
                      {dailyRecipe.diets.map(d => <span key={d} className="diet-tag">{d}</span>)}
                    </div>
                  )}
                  <div className="recipe-meta" style={{ marginBottom: '15px' }}>
                    {dailyRecipe.ready_in_minutes && <span className="recipe-meta-item">⏱️ <span className="value">{dailyRecipe.ready_in_minutes} min</span></span>}
                    {dailyRecipe.nutrition?.calories && <span className="recipe-meta-item">🔥 <span className="value">{dailyRecipe.nutrition.calories} kcal</span></span>}
                    {dailyRecipe.servings && <span className="recipe-meta-item">🍽️ <span className="value">{dailyRecipe.servings} servings</span></span>}
                  </div>
                  {dailyRecipe.video_url && (
                    <div className="recipe-video" style={{ marginBottom: '15px' }}>
                      <iframe
                        src={dailyRecipe.video_url}
                        title={`${dailyRecipe.title} video`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ width: '100%', aspectRatio: '16/9', borderRadius: '12px', border: 'none' }}
                      ></iframe>
                    </div>
                  )}
                  <div className="recipe-actions">
                    <button className="btn-primary" onClick={() => { setSelectedRecipe(dailyRecipe); setModalOpen(true); }}>Let's Cook</button>
                    <button className="btn-secondary" onClick={handleSaveRecipe}>💾 Bookmark</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div
          className="kitchen-side-col"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h2 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lightbulb size={20} className="glowing-bulb-icon" /> Did You Know?
            </h2>
            <button
              className="btn-fact-shuffle"
              onClick={handleShuffleFact}
              title="Shuffle a new food science fact"
            >
              <RefreshCw size={13} /> Shuffle
            </button>
          </div>

          <div className="fun-fact-widget">
            {/* Category Filter Pills */}
            <div className="fun-fact-categories">
              {['All', 'Nutrition', 'Culture', 'Cooking', 'Health'].map(cat => (
                <button
                  key={cat}
                  className={`fact-cat-pill ${selectedFactCategory === cat ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedFactCategory(cat);
                    setActiveFact(0);
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Fact slides */}
            <div className="fun-fact-slides">
              {filteredFacts.map((fact, idx) => (
                <div
                  key={fact.id || idx}
                  className={`fun-fact-slide ${idx === activeFact ? 'active' : ''}`}
                >
                  <div className="fun-fact-top-row">
                    <div className="fun-fact-icon-wrap">
                      <span className="fun-fact-icon">{fact.icon}</span>
                    </div>
                    <span className={`fun-fact-category-badge cat-${(fact.category || 'Nutrition').toLowerCase().replace(/\s+/g, '')}`}>
                      {fact.category}
                    </span>
                    <button 
                      className="btn-fact-copy"
                      onClick={() => handleCopyFact(fact.fact)}
                      title="Copy fact text"
                    >
                      {copiedFact ? <Check size={13} style={{ color: '#10ac84' }} /> : <Copy size={13} />}
                    </button>
                  </div>

                  <p className="fun-fact-text">{fact.fact}</p>
                </div>
              ))}
            </div>

            {/* Navigation controls */}
            <div className="fun-fact-controls">
              <button
                className="fun-fact-arrow"
                onClick={() => setActiveFact(prev => (prev - 1 + filteredFacts.length) % filteredFacts.length)}
                aria-label="Previous fact"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="fun-fact-dots">
                {filteredFacts.slice(0, 8).map((_, idx) => (
                  <button
                    key={idx}
                    className={`fun-fact-dot ${idx === activeFact ? 'active' : ''}`}
                    onClick={() => setActiveFact(idx)}
                    aria-label={`Fact ${idx + 1}`}
                  />
                ))}
              </div>
              <button
                className="fun-fact-arrow"
                onClick={() => setActiveFact(prev => (prev + 1) % filteredFacts.length)}
                aria-label="Next fact"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Auto-play progress bar */}
            <div className="fun-fact-progress">
              <div
                className={`fun-fact-progress-fill ${isPaused ? 'paused' : ''}`}
                key={`${selectedFactCategory}-${activeFact}`}
              />
            </div>

            <div className="fun-fact-footer">
              <span className="fun-fact-counter">{activeFact + 1} / {filteredFacts.length} Facts</span>
              <span className="fun-fact-source">
                <Sparkles size={12} style={{ color: 'var(--primary)' }} /> Verified Food Science
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Dashboard Cards (Calorie & Water Tracker) ── */}
      <div className="dashboard-row fade-in-up" style={{ '--delay': '300ms' }}>
        {/* Calorie & Macro Tracker Card */}
        <div className="card glass dashboard-widget-card daily-targets-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
            <h3 className="section-title" style={{ marginTop: 0, marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🎯</span> Daily Targets
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={() => navigate('/tdee')}
                className="target-edit-pill"
                title="Edit Target Profile"
              >
                ⚙️ Adjust Profile
              </button>
            </div>
          </div>

          <p className="subtitle" style={{ marginBottom: '16px' }}>
            {token ? (activeProfile ? `Active Profile: ${activeProfile.profile_name}` : "Set up a profile in settings") : "Preview mode — Sign in to track stats"}
          </p>

          <div className="calorie-tracker-layout">
            {/* SVG circular progress ring */}
            <div className="progress-ring-container">
              <svg width="150" height="150" viewBox="0 0 150 150">
                <defs>
                  <linearGradient id="homeRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="50%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                  <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
                {/* Background Ring */}
                <circle
                  cx="75"
                  cy="75"
                  r="58"
                  stroke="var(--border-glass)"
                  strokeWidth="11"
                  fill="transparent"
                  style={{ opacity: 0.5 }}
                />
                {/* Animated Progress Ring */}
                <circle
                  className="progress-ring-circle"
                  cx="75"
                  cy="75"
                  r="58"
                  stroke="url(#homeRingGrad)"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray="364"
                  strokeDashoffset={364 - (Math.min(totals.calories / (targets.calories || 1), 1.0) * 364)}
                  strokeLinecap="round"
                  filter="url(#ringGlow)"
                  style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
                />
              </svg>
              <div className="progress-ring-text">
                <span className="progress-ring-val">
                  <AnimatedCounter end={totals.calories} />
                </span>
                <span className="progress-ring-label">of {targets.calories} kcal</span>
                <span className="progress-ring-pct-badge" style={{
                  background: totals.calories > targets.calories ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: totals.calories > targets.calories ? '#ef4444' : '#10b981',
                }}>
                  {Math.round((totals.calories / (targets.calories || 1)) * 100)}%
                </span>
              </div>
            </div>

            {/* Macros mini bars */}
            <div className="macro-bars-grid">
              <div className="macro-summary-header">
                <span className="macro-summary-remaining">
                  {targets.calories - totals.calories >= 0 
                    ? `🔥 ${targets.calories - totals.calories} kcal remaining`
                    : `⚠️ ${totals.calories - targets.calories} kcal over target`}
                </span>
                <button 
                  className="macro-quick-log-btn"
                  onClick={() => navigate('/nutrition')}
                  title="Log Meal / Quick Add"
                >
                  ➕ Log Meal
                </button>
              </div>

              {[
                { label: '🥩 Protein', val: totals.protein, target: targets.protein, color: 'linear-gradient(90deg, #10b981, #059669)', cals: totals.protein * 4 },
                { label: '🍞 Carbs', val: totals.carbs, target: targets.carbs, color: 'linear-gradient(90deg, #3b82f6, #2563eb)', cals: totals.carbs * 4 },
                { label: '🥑 Fat', val: totals.fat, target: targets.fat, color: 'linear-gradient(90deg, #f59e0b, #d97706)', cals: totals.fat * 9 }
              ].map(macro => {
                const pct = Math.min((macro.val / (macro.target || 1)) * 100, 100);
                const isOver = macro.val > macro.target;
                return (
                  <div key={macro.label} className="macro-bar-item">
                    <div className="macro-bar-header">
                      <span className="macro-label-title">{macro.label}</span>
                      <span className="macro-val-text">
                        <strong>{macro.val}g</strong> / {macro.target}g
                        <span className={`macro-pct-chip ${isOver ? 'over' : ''}`}>
                          {Math.round((macro.val / (macro.target || 1)) * 100)}%
                        </span>
                      </span>
                    </div>
                    <div className="macro-bar-container">
                      <div
                        className="macro-bar-fill"
                        style={{ width: `${pct}%`, background: macro.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Water Tracker Card */}
        {(() => {
          const targetWater = targets.water || 2500;
          const pctWater = Math.min(100, Math.round((waterTotal / targetWater) * 100));
          const isGoalReached = waterTotal >= targetWater;

          return (
            <div className="card glass dashboard-widget-card water-widget">
              <div className="water-widget-header">
                <div>
                  <h3 className="section-title" style={{ marginTop: 0, marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="water-title-icon">💧</span>
                    <span>Daily Hydration</span>
                  </h3>
                  <p className="subtitle" style={{ margin: 0, fontSize: '0.82rem' }}>Target: <strong>{targetWater} ml</strong></p>
                </div>
                {isGoalReached ? (
                  <span className="water-goal-badge pulse-glow">🎉 Goal Met!</span>
                ) : (
                  <span className="water-pct-badge">{pctWater}%</span>
                )}
              </div>

              {/* Realistic Glass Tumbler Container */}
              <div className="water-glass-container">
                {/* Volume Measurement Ticks */}
                <div className="glass-ticks">
                  <span className="tick-mark t-100">100%</span>
                  <span className="tick-mark t-75">75%</span>
                  <span className="tick-mark t-50">50%</span>
                  <span className="tick-mark t-25">25%</span>
                </div>

                <div className="water-display">
                  {/* Water level fill */}
                  <div className="water-level" style={{ height: `${pctWater}%` }}>
                    <div className="water-wave wave-1" />
                    <div className="water-wave wave-2" />
                    <div className="water-bubble b1" />
                    <div className="water-bubble b2" />
                    <div className="water-bubble b3" />
                    <div className="water-bubble b4" />
                  </div>

                  {/* Glass reflections */}
                  <div className="glass-glare" />
                  <div className="glass-rim" />

                  {/* Empty state prompt inside glass */}
                  {waterTotal === 0 && (
                    <div className="glass-empty-hint">
                      <div className="empty-droplet-glow">
                        <Droplet size={22} className="empty-droplet-icon" />
                      </div>
                      <span className="empty-hint-text">Tap + to log</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Numerical Stat Display */}
              <div className="water-stats-row">
                <div className="water-stat-main">
                  <span className="water-current-num">{waterTotal}</span>
                  <span className="water-target-total">/ {targetWater} ml</span>
                </div>
                <span className={`water-status-tag ${isGoalReached ? 'success' : ''}`}>
                  {isGoalReached ? '✨ Fully Hydrated' : `${Math.max(0, targetWater - waterTotal)} ml remaining`}
                </span>
              </div>

              {/* Enhanced Action Buttons */}
              <div className="water-controls">
                <button className="water-btn preset-btn" onClick={() => handleLogWater(250)} title="Add 250ml water">
                  <Droplet size={15} className="btn-icon-svg" />
                  <span className="btn-text">+250 ml</span>
                </button>
                <button className="water-btn preset-btn bottle" onClick={() => handleLogWater(500)} title="Add 500ml water">
                  <Droplets size={15} className="btn-icon-svg" />
                  <span className="btn-text">+500 ml</span>
                </button>
                <button 
                  className="water-btn subtract-btn" 
                  onClick={() => handleLogWater(-250)} 
                  disabled={waterTotal <= 0} 
                  title="Remove 250ml water"
                >
                  <Minus size={15} className="btn-icon-svg" />
                  <span className="btn-text">-250 ml</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* ── Today's Meal Plan slots ── */}
      <div className="card glass dashboard-widget-card today-plan-widget fade-in-up" style={{ marginBottom: '2rem', '--delay': '400ms' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
          <div>
            <h3 className="section-title" style={{ marginTop: 0, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} style={{ color: 'var(--primary)' }} /> Today's Meal Plan
            </h3>
            <p className="subtitle" style={{ margin: 0 }}>What you scheduled to eat today</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* Planned Total Calories Pill */}
            <div className="today-plan-summary-pill">
              <Flame size={14} style={{ color: 'var(--primary)' }} />
              <span className="summary-val">{plannedTotals.calories}</span>
              <span className="summary-target">/ {targets.calories} kcal Planned</span>
            </div>

            <button 
              className="btn-ghost-sm" 
              onClick={() => navigate('/planner')}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', background: 'rgba(255,107,0,0.08)', border: '1px solid rgba(255,107,0,0.2)', padding: '6px 12px', borderRadius: '10px', color: 'var(--primary)' }}
            >
              Manage Plan <ExternalLink size={13} />
            </button>
          </div>
        </div>

        <div className="today-plan-grid">
          {slots.map(slot => {
            const entry = todayMeals[slot];
            const recipe = entry?.recipe;
            const isActive = slot === activeSlot;
            const logged = isMealSlotLogged(entry);

            return (
              <div
                key={slot}
                className={`today-plan-slot-card ${isActive ? 'slot-active-glow' : ''} ${logged ? 'slot-logged' : ''} ${!recipe ? 'slot-empty' : ''}`}
                onClick={() => {
                  if (recipe) {
                    setSelectedRecipe(recipe);
                    setModalOpen(true);
                  } else {
                    setPickerSlot(slot);
                    setPickerOpen(true);
                  }
                }}
              >
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px' }}>
                  <span
                    className="slot-label-badge"
                    style={{ background: `${slotColors[slot]}15`, color: slotColors[slot], border: `1px solid ${slotColors[slot]}30`, display: 'inline-flex', alignItems: 'center', gap: '5px' }}
                  >
                    {slotIcons[slot]} {slot}
                  </span>

                  {isActive && (
                    <span className="slot-now-tag">NOW</span>
                  )}
                </div>

                {recipe ? (
                  <>
                    <p className="slot-recipe-title">{recipe.title}</p>
                    
                    <div className="slot-macro-row">
                      {recipe.calories && <span className="slot-recipe-cals">🔥 {recipe.calories} kcal</span>}
                      {(recipe.protein_g || recipe.protein) && (
                        <span className="slot-recipe-macro">💪 {recipe.protein_g || recipe.protein}g P</span>
                      )}
                    </div>

                    {/* Action Bar */}
                    <div className="slot-action-bar" onClick={(e) => e.stopPropagation()}>
                      {logged ? (
                        <span className="slot-logged-badge">
                          <CheckCircle2 size={13} /> Logged
                        </span>
                      ) : (
                        <button
                          className="btn-quick-log"
                          onClick={(e) => handleQuickLogMeal(e, entry, slot)}
                          title="Log this meal into daily nutrition"
                        >
                          <Check size={13} /> Quick Log
                        </button>
                      )}

                      {entry?.id && (
                        <button
                          className="btn-slot-remove"
                          onClick={(e) => handleRemoveMealFromPlan(e, entry.id)}
                          title="Remove from plan"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="slot-empty-prompt">
                    <PlusCircle size={22} className="slot-empty-icon" />
                    <span className="slot-empty-text">+ Add Meal</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick & Easy Grid ── */}
      <h2 className="section-title fade-in-up" style={{ marginTop: '2rem', '--delay': '500ms' }}>⏱️ Quick & Easy (Under 30 Mins)</h2>
      {quickLoading ? (
        <div className="quick-recipes-grid fade-in-up" style={{ '--delay': '530ms' }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card glass skeleton" style={{ height: '180px' }}></div>
          ))}
        </div>
      ) : quickRecipes.length > 0 && (
        <div className="quick-recipes-grid fade-in-up" style={{ '--delay': '530ms' }}>
          {quickRecipes.map(recipe => (
            <div key={recipe.id} className="card glass mini-recipe-card" onClick={() => { setSelectedRecipe(recipe); setModalOpen(true); }} style={{ position: 'relative' }}>
              {(recipe.nutri_score || recipe.chef_score) && (
                <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 3 }}>
                  <ChefScoreBadge grade={(recipe.nutri_score || recipe.chef_score).grade} size="sm" />
                </div>
              )}
              <img src={recipe.image_url} alt={recipe.title} className="mini-recipe-image" />
              <div className="mini-recipe-content">
                <h3 className="mini-recipe-title">{recipe.title}</h3>
                <span className="mini-recipe-time">⏱️ {recipe.ready_in_minutes} min</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick Actions Grid ── */}
      <h2 className="section-title fade-in-up" style={{ marginTop: '2rem', '--delay': '600ms' }}>🚀 Explore</h2>
      <div className="quick-actions-grid fade-in-up" style={{ '--delay': '630ms' }}>
        {quickActions.map(action => (
          <button
            key={action.path}
            className="quick-action-card card glass"
            onClick={() => navigate(action.path)}
          >
            <span className="qa-icon">{action.icon}</span>
            <span className="qa-label">{action.label}</span>
            <span className="qa-desc">{action.desc}</span>
          </button>
        ))}
      </div>

      {isModalOpen && selectedRecipe && (
        <RecipeModal recipe={selectedRecipe} onClose={() => { setModalOpen(false); setSelectedRecipe(null); }} />
      )}

      {isPickerOpen && (
        <MealSlotPickerModal
          isOpen={isPickerOpen}
          slot={pickerSlot}
          date={getLocalDateString()}
          onClose={() => setPickerOpen(false)}
          onAssignSuccess={() => fetchTodayStats()}
        />
      )}
    </section>
  );
}
