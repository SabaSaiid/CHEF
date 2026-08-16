import React, { useState, useEffect, useContext, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useSettings } from '../context/SettingsContext';
import api from '../services/api';
import { getLocalDateString, CHEF_EVENTS, dispatchChefEvent } from '../utils/dateUtils';
import { playSuccessSound, playAddSound, playClickSound } from '../utils/soundEffects';
import {
  Target,
  Flame,
  Plus,
  Sliders,
  Check,
  Sparkles,
  Utensils,
  ChevronRight,
  Info,
  Calendar,
  TrendingUp,
  Clock,
  Search,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  PieChart,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

/* ── Animated Counter Component ─────────────────────────────── */
function AnimatedCounter({ end, suffix = '', duration = 1200 }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const startTime = performance.now();
    const targetVal = typeof end === 'number' && !isNaN(end) ? end : 0;
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * targetVal));
      if (progress < 1) {
        ref.current = requestAnimationFrame(animate);
      }
    };
    ref.current = requestAnimationFrame(animate);
    return () => { if (ref.current) cancelAnimationFrame(ref.current); };
  }, [end, duration]);

  return <>{count.toLocaleString()}{suffix}</>;
}

/* ── Common Quick Presets for Fast Food Logging ──────────────── */
const QUICK_LOG_PRESETS = [
  { label: '🥚 2 Boiled Eggs', food_item: 'Hard Boiled Eggs (2 large)', calories: 140, protein_g: 12, carbs_g: 1, fat_g: 10, fiber_g: 0, meal_slot: 'Breakfast' },
  { label: '🥤 Whey Protein Shake', food_item: 'Whey Protein Shake (1 scoop + water)', calories: 140, protein_g: 27, carbs_g: 3, fat_g: 1.5, fiber_g: 0, meal_slot: 'Snack' },
  { label: '🥣 Oatmeal with Milk', food_item: 'Rolled Oats with Milk & Honey', calories: 310, protein_g: 12, carbs_g: 52, fat_g: 6, fiber_g: 5, meal_slot: 'Breakfast' },
  { label: '🍗 Grilled Chicken & Rice', food_item: 'Grilled Chicken Breast with White Rice', calories: 480, protein_g: 42, carbs_g: 55, fat_g: 8, fiber_g: 2, meal_slot: 'Lunch' },
  { label: '🥗 Greek Salad & Feta', food_item: 'Greek Salad with Olive Oil & Feta', calories: 260, protein_g: 8, carbs_g: 14, fat_g: 19, fiber_g: 4, meal_slot: 'Lunch' },
  { label: '🍎 Apple & Almond Butter', food_item: 'Fresh Apple with Almond Butter', calories: 210, protein_g: 4, carbs_g: 28, fat_g: 11, fiber_g: 5, meal_slot: 'Snack' },
  { label: '🐟 Salmon & Roasted Veggies', food_item: 'Baked Salmon with Roasted Broccoli', calories: 450, protein_g: 38, carbs_g: 12, fat_g: 28, fiber_g: 4, meal_slot: 'Dinner' },
  { label: '☕ Black Coffee / Tea', food_item: 'Black Coffee / Green Tea (zero cal)', calories: 2, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, meal_slot: 'Snack' },
];

export default function DailyTargetsWidget({ onAdjustNavigate }) {
  const { token, username, userProfile, activeProfile, refreshActiveProfile } = useContext(AuthContext);
  const { settings } = useSettings();
  const toast = useToast();
  const navigate = useNavigate();

  // ── Component View State ──────────────────────────────────────
  const [viewTab, setViewTab] = useState('intake'); // 'intake' | 'planned' | 'budget'
  const [isQuickLogOpen, setIsQuickLogOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [logTab, setLogTab] = useState('quick'); // 'quick' | 'custom' | 'planned' | 'search'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // ── Live Intake & Meal Plan Data ──────────────────────────────
  const [todayLog, setTodayLog] = useState([]);
  const [guestLogs, setGuestLogs] = useState([]);
  const [todayMeals, setTodayMeals] = useState({ Breakfast: null, Lunch: null, Dinner: null, Snack: null });

  // ── Recipe Search for Quick Log ───────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // ── Custom Log Form State ─────────────────────────────────────
  const [customForm, setCustomForm] = useState({
    food_item: '',
    calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    fiber_g: '',
    quantity: 1,
    unit: 'serving',
    meal_slot: 'Breakfast',
  });

  // ── Target Adjust Form State ──────────────────────────────────
  const [adjustForm, setAdjustForm] = useState({
    target_calories: 2000,
    protein_pct: 30,
    carbs_pct: 45,
    fat_pct: 25,
    target_fiber_g: 30,
  });

  // ── Resolved Targets ──────────────────────────────────────────
  const targets = useMemo(() => {
    let cal = activeProfile?.target_calories || userProfile?.tdee || 2000;
    let prot = activeProfile?.target_protein || 125;
    let carb = activeProfile?.target_carbs || 240;
    let fat = activeProfile?.target_fat || 60;
    let fiber = activeProfile?.target_fiber_g || 30;

    // Check guest profile fallback if not logged in
    if (!token) {
      try {
        const guestData = JSON.parse(localStorage.getItem('chef_guest_profile') || '{}');
        if (guestData?.results?.target_calories) {
          cal = guestData.results.target_calories;
          prot = guestData.results.target_protein || prot;
          carb = guestData.results.target_carbs || carb;
          fat = guestData.results.target_fat || fat;
          fiber = guestData.results.target_fiber_g || fiber;
        }
      } catch { /* use defaults */ }
    }

    return {
      calories: Math.max(800, cal),
      protein: Math.max(20, prot),
      carbs: Math.max(20, carb),
      fat: Math.max(10, fat),
      fiber: Math.max(10, fiber),
    };
  }, [activeProfile, userProfile, token]);

  // Sync adjust form with targets when opened
  useEffect(() => {
    if (isAdjustOpen) {
      const pPct = activeProfile?.protein_pct || 30;
      const cPct = activeProfile?.carbs_pct || 45;
      const fPct = activeProfile?.fat_pct || 25;
      setAdjustForm({
        target_calories: targets.calories,
        protein_pct: pPct,
        carbs_pct: cPct,
        fat_pct: fPct,
        target_fiber_g: targets.fiber,
      });
    }
  }, [isAdjustOpen, targets, activeProfile]);

  // ── Fetch Today's Intake & Meal Plan ──────────────────────────
  const fetchIntakeData = useCallback(async () => {
    const todayStr = getLocalDateString();
    setIsLoadingLogs(true);

    if (!token) {
      try {
        const storedLogs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const todayGuest = storedLogs.filter(item => item.date === todayStr);
        setGuestLogs(todayGuest);
      } catch {
        setGuestLogs([]);
      }
      setIsLoadingLogs(false);
      return;
    }

    try {
      const [logsData, mealsData] = await Promise.allSettled([
        api.get(`/nutrition/log?date=${todayStr}`),
        api.get(`/mealplan?start_date=${todayStr}&end_date=${todayStr}`),
      ]);

      if (logsData.status === 'fulfilled') {
        setTodayLog(Array.isArray(logsData.value) ? logsData.value : []);
      }
      if (mealsData.status === 'fulfilled' && Array.isArray(mealsData.value)) {
        const mealMap = { Breakfast: null, Lunch: null, Dinner: null, Snack: null };
        mealsData.value.forEach(m => {
          if (m.meal_slot in mealMap) {
            mealMap[m.meal_slot] = m;
          }
        });
        setTodayMeals(mealMap);
      }
    } catch (err) {
      console.error("DailyTargetsWidget: Failed to fetch today's stats:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [token]);

  useEffect(() => {
    fetchIntakeData();
  }, [fetchIntakeData]);

  // Real-time custom window sync
  useEffect(() => {
    const handleSync = () => {
      fetchIntakeData();
      if (refreshActiveProfile) refreshActiveProfile();
    };

    window.addEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
    window.addEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
    window.addEventListener('storage', handleSync);

    return () => {
      window.removeEventListener(CHEF_EVENTS.NUTRITION_UPDATED, handleSync);
      window.removeEventListener(CHEF_EVENTS.PROFILE_UPDATED, handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, [fetchIntakeData, refreshActiveProfile]);

  // ── Calculated Logged Totals ──────────────────────────────────
  const totals = useMemo(() => {
    let cal = 0, prot = 0, carb = 0, fat = 0, fib = 0;
    const logs = token ? todayLog : guestLogs;

    logs.forEach(item => {
      cal += Number(item.calories) || 0;
      prot += Number(item.protein_g ?? item.protein) || 0;
      carb += Number(item.carbs_g ?? item.carbs) || 0;
      fat += Number(item.fat_g ?? item.fat) || 0;
      fib += Number(item.fiber_g ?? item.fiber) || 0;
    });

    return {
      calories: Math.round(cal),
      protein: Math.round(prot),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      fiber: Math.round(fib),
    };
  }, [todayLog, guestLogs, token]);

  // ── Calculated Planned Totals (from Meal Planner) ─────────────
  const plannedTotals = useMemo(() => {
    let cal = 0, prot = 0, carb = 0, fat = 0, fib = 0;
    let count = 0;

    Object.values(todayMeals).forEach(entry => {
      if (entry?.recipe) {
        count += 1;
        cal += Number(entry.recipe.calories) || 0;
        prot += Number(entry.recipe.protein_g ?? entry.recipe.protein) || 0;
        carb += Number(entry.recipe.carbs_g ?? entry.recipe.carbs) || 0;
        fat += Number(entry.recipe.fat_g ?? entry.recipe.fat) || 0;
        fib += Number(entry.recipe.fiber_g ?? entry.recipe.fiber) || 0;
      }
    });

    return {
      calories: Math.round(cal),
      protein: Math.round(prot),
      carbs: Math.round(carb),
      fat: Math.round(fat),
      fiber: Math.round(fib),
      count,
    };
  }, [todayMeals]);

  // ── Macro Distribution across Meal Slots ──────────────────────
  const macroDistribution = useMemo(() => {
    const logs = token ? todayLog : guestLogs;
    const slotCals = { Breakfast: 0, Lunch: 0, Dinner: 0, Snack: 0 };
    const totalLogged = totals.calories || 1;

    logs.forEach(log => {
      const rawSlot = log.meal_slot || 'Snack';
      const slot = rawSlot.charAt(0).toUpperCase() + rawSlot.slice(1).toLowerCase();
      if (slot in slotCals) {
        slotCals[slot] += Number(log.calories) || 0;
      } else {
        slotCals.Snack += Number(log.calories) || 0;
      }
    });

    return {
      breakfastPct: Math.round((slotCals.Breakfast / totalLogged) * 100) || 0,
      lunchPct: Math.round((slotCals.Lunch / totalLogged) * 100) || 0,
      dinnerPct: Math.round((slotCals.Dinner / totalLogged) * 100) || 0,
      snackPct: Math.round((slotCals.Snack / totalLogged) * 100) || 0,
      slotCals,
    };
  }, [todayLog, guestLogs, token, totals.calories]);

  // ── Calorie & Macro Deficit / Surplus Status ───────────────────
  const activeCalories = viewTab === 'planned' ? plannedTotals.calories : totals.calories;
  const activeProtein = viewTab === 'planned' ? plannedTotals.protein : totals.protein;
  const activeCarbs = viewTab === 'planned' ? plannedTotals.carbs : totals.carbs;
  const activeFat = viewTab === 'planned' ? plannedTotals.fat : totals.fat;

  const calDiff = targets.calories - activeCalories;
  const calPct = Math.round((activeCalories / (targets.calories || 1)) * 100);
  const isOverCal = activeCalories > targets.calories;
  const isGoalReached = calPct >= 95 && calPct <= 108;

  // Ring stroke calculation (radius = 54, circumference = 2 * PI * 54 = 339.292)
  const ringCircumference = 339.292;
  const ringFillRatio = Math.min(activeCalories / (targets.calories || 1), 1.0);
  const ringDashOffset = ringCircumference - (ringFillRatio * ringCircumference);

  // Dynamic Ring Gradient colors based on progress status
  const ringGradient = useMemo(() => {
    if (isOverCal && activeCalories - targets.calories > 150) {
      return { stop1: '#f43f5e', stop2: '#ef4444', stop3: '#dc2626' }; // Warning Red/Rose
    }
    if (calPct >= 90) {
      return { stop1: '#10b981', stop2: '#059669', stop3: '#14b8a6' }; // Goal Met Emerald
    }
    if (calPct >= 50) {
      return { stop1: '#3b82f6', stop2: '#10b981', stop3: '#06b6d4' }; // Progress Blue-Emerald
    }
    return { stop1: '#6366f1', stop2: '#3b82f6', stop3: '#0ea5e9' }; // Morning/Starting Violet-Blue
  }, [calPct, isOverCal, activeCalories, targets.calories]);

  // Dynamic AI Coaching Tip
  const coachingInsight = useMemo(() => {
    if (totals.calories === 0) {
      return { text: "No meals logged yet today. Kickstart your day with a protein-rich breakfast!", icon: '🌅', color: '#6366f1' };
    }
    if (isOverCal) {
      return { text: `Exceeded calorie target by ${Math.abs(calDiff)} kcal. Consider hydrating & prioritizing fiber for next meals.`, icon: '⚠️', color: '#ef4444' };
    }
    if (totals.protein < targets.protein * 0.5 && totals.calories > targets.calories * 0.6) {
      return { text: `Protein is running low (${totals.protein}g / ${targets.protein}g). Add a high-protein item like Greek yogurt or grilled chicken.`, icon: '🥩', color: '#f59e0b' };
    }
    if (calDiff <= 350 && calDiff > 0) {
      return { text: `Almost there! ${calDiff} kcal remaining to hit your perfect daily energy goal.`, icon: '🎯', color: '#10b981' };
    }
    return { text: `${calDiff} kcal remaining today. Balanced macro pace maintained!`, icon: '✨', color: '#10b981' };
  }, [totals, targets, calDiff, isOverCal]);

  // ── Logging Handlers ──────────────────────────────────────────
  const logItemAction = async (payload) => {
    setIsSubmitting(true);
    playAddSound();
    const todayStr = getLocalDateString();

    try {
      if (token) {
        await api.post('/nutrition/log', {
          food_item: payload.food_item,
          calories: Number(payload.calories) || 0,
          protein_g: Number(payload.protein_g) || 0,
          carbs_g: Number(payload.carbs_g) || 0,
          fat_g: Number(payload.fat_g) || 0,
          fiber_g: Number(payload.fiber_g) || 0,
          quantity: Number(payload.quantity) || 1,
          unit: payload.unit || 'serving',
          date: todayStr,
          meal_slot: payload.meal_slot || 'Snack',
        });
      } else {
        const newLog = {
          id: Date.now() + Math.random(),
          food_name: payload.food_item,
          food_item: payload.food_item,
          calories: Number(payload.calories) || 0,
          protein_g: Number(payload.protein_g) || 0,
          carbs_g: Number(payload.carbs_g) || 0,
          fat_g: Number(payload.fat_g) || 0,
          fiber_g: Number(payload.fiber_g) || 0,
          quantity: Number(payload.quantity) || 1,
          unit: payload.unit || 'serving',
          meal_slot: payload.meal_slot || 'Snack',
          date: todayStr,
        };
        const existing = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        localStorage.setItem('chef_guest_logs', JSON.stringify([...existing, newLog]));
      }

      playSuccessSound();
      toast.success(`Logged "${payload.food_item}" (+${Math.round(payload.calories)} kcal)! 🎯`);
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
      fetchIntakeData();
      setIsQuickLogOpen(false);
      // Reset form
      setCustomForm({
        food_item: '',
        calories: '',
        protein_g: '',
        carbs_g: '',
        fat_g: '',
        fiber_g: '',
        quantity: 1,
        unit: 'serving',
        meal_slot: 'Breakfast',
      });
    } catch (err) {
      toast.error(err.message || 'Failed to log food item.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCustomFormSubmit = (e) => {
    e.preventDefault();
    if (!customForm.food_item.trim()) {
      toast.error('Please enter a food name');
      return;
    }
    logItemAction(customForm);
  };

  const handleLogPlannedMeal = async (slotKey, entry) => {
    if (!entry?.recipe) return;
    const recipe = entry.recipe;
    await logItemAction({
      food_item: recipe.title,
      calories: recipe.calories || 0,
      protein_g: recipe.protein_g || recipe.protein || 0,
      carbs_g: recipe.carbs_g || recipe.carbs || 0,
      fat_g: recipe.fat_g || recipe.fat || 0,
      fiber_g: recipe.fiber_g || recipe.fiber || 0,
      quantity: 1,
      unit: 'serving',
      meal_slot: slotKey,
    });
  };

  // Recipe Live Search in Modal
  useEffect(() => {
    if (!searchQuery.trim() || logTab !== 'search') {
      setSearchResults([]);
      return;
    }
    const handler = setTimeout(async () => {
      setIsSearching(true);
      try {
        const data = await api.get(`/recipes?search=${encodeURIComponent(searchQuery)}&limit=8`);
        const list = Array.isArray(data) ? data : (data.recipes || []);
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 280);

    return () => clearTimeout(handler);
  }, [searchQuery, logTab]);

  // ── Target Adjustment Submit ──────────────────────────────────
  const handleSaveAdjustedTargets = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    playClickSound();

    const cal = Number(adjustForm.target_calories) || 2000;
    const pPct = Number(adjustForm.protein_pct) || 30;
    const cPct = Number(adjustForm.carbs_pct) || 45;
    const fPct = Number(adjustForm.fat_pct) || 25;
    const fib = Number(adjustForm.target_fiber_g) || 30;

    const protG = Math.round((cal * (pPct / 100)) / 4);
    const carbsG = Math.round((cal * (cPct / 100)) / 4);
    const fatG = Math.round((cal * (fPct / 100)) / 9);

    try {
      if (token && activeProfile?.id) {
        await api.put(`/profiles/${activeProfile.id}`, {
          ...activeProfile,
          target_calories: cal,
          target_protein: protG,
          target_carbs: carbsG,
          target_fat: fatG,
          target_fiber_g: fib,
          protein_pct: pPct,
          carbs_pct: cPct,
          fat_pct: fPct,
        });
        if (refreshActiveProfile) await refreshActiveProfile();
        toast.success(`Daily targets updated to ${cal} kcal (${protG}g P / ${carbsG}g C / ${fatG}g F)! 🚀`);
      } else {
        // Guest mode update
        const guestObj = {
          results: {
            target_calories: cal,
            target_protein: protG,
            target_carbs: carbsG,
            target_fat: fatG,
            target_fiber_g: fib,
            protein_pct: pPct,
            carbs_pct: cPct,
            fat_pct: fPct,
          }
        };
        localStorage.setItem('chef_guest_profile', JSON.stringify(guestObj));
        toast.success(`Guest daily target saved locally (${cal} kcal)! 🎯`);
      }

      playSuccessSound();
      dispatchChefEvent(CHEF_EVENTS.PROFILE_UPDATED);
      setIsAdjustOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to update targets.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preset Macro Splits for Target Adjustment
  const applyMacroPreset = (presetKey) => {
    playClickSound();
    if (presetKey === 'balanced') {
      setAdjustForm(prev => ({ ...prev, protein_pct: 30, carbs_pct: 45, fat_pct: 25 }));
    } else if (presetKey === 'high_protein') {
      setAdjustForm(prev => ({ ...prev, protein_pct: 40, carbs_pct: 35, fat_pct: 25 }));
    } else if (presetKey === 'keto') {
      setAdjustForm(prev => ({ ...prev, protein_pct: 25, carbs_pct: 10, fat_pct: 65 }));
    } else if (presetKey === 'endurance') {
      setAdjustForm(prev => ({ ...prev, protein_pct: 20, carbs_pct: 60, fat_pct: 20 }));
    }
  };

  // Profile Title display
  const profileLabel = useMemo(() => {
    if (!token) return 'Demo Profile (Guest)';
    if (activeProfile?.display_name && activeProfile?.profile_name) {
      return `${activeProfile.display_name} (${activeProfile.profile_name})`;
    }
    if (activeProfile?.profile_name) {
      return activeProfile.profile_name;
    }
    if (username) return `${username}'s Targets`;
    return 'Active Profile';
  }, [token, activeProfile, username]);

  return (
    <>
      <div className="card glass dashboard-widget-card daily-targets-card" style={{ marginTop: '20px' }}>
        {/* Card Top Header */}
        <div className="daily-targets-header">
          <div className="dt-header-left">
            <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="dt-icon-glow">🎯</span> Daily Targets
            </h3>
            <div className="dt-profile-meta">
              <span className="dt-profile-name" title={profileLabel}>
                {profileLabel}
              </span>
              {activeProfile?.diet_type && (
                <span className="dt-diet-chip">
                  {activeProfile.diet_type}
                </span>
              )}
            </div>
          </div>

          <div className="dt-header-actions">
            <button
              onClick={() => {
                playClickSound();
                setIsQuickLogOpen(true);
              }}
              className="target-quick-btn dt-btn-log"
              title="Quick Log Food"
            >
              <Plus size={14} /> Log
            </button>
            <button
              onClick={() => {
                playClickSound();
                if (onAdjustNavigate) {
                  onAdjustNavigate();
                } else {
                  setIsAdjustOpen(true);
                }
              }}
              className="target-edit-pill"
              title="Customize Daily Targets"
            >
              <Sliders size={13} /> Adjust
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Intake vs Planned vs Remaining) */}
        <div className="dt-view-tabs">
          <button
            className={`dt-tab-btn ${viewTab === 'intake' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setViewTab('intake'); }}
            title={`Intake • ${totals.calories} kcal consumed`}
          >
            📊 Intake
          </button>
          <button
            className={`dt-tab-btn ${viewTab === 'planned' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setViewTab('planned'); }}
            title={`Planned • ${plannedTotals.calories} kcal scheduled`}
          >
            🍱 Planned
          </button>
          <button
            className={`dt-tab-btn ${viewTab === 'budget' ? 'active' : ''}`}
            onClick={() => { playClickSound(); setViewTab('budget'); }}
            title={`Budget • ${Math.max(0, calDiff)} kcal remaining`}
          >
            ⚖️ Budget
          </button>
        </div>

        {/* Main Calorie Progress Ring & Macro Grid */}
        <div className="calorie-tracker-layout">
          {/* SVG Progress Ring */}
          <div className="progress-ring-container" title={`${activeCalories} kcal logged of ${targets.calories} kcal target`}>
            <svg width="146" height="146" viewBox="0 0 146 146">
              <defs>
                <linearGradient id="dynamicRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={ringGradient.stop1} />
                  <stop offset="50%" stopColor={ringGradient.stop2} />
                  <stop offset="100%" stopColor={ringGradient.stop3} />
                </linearGradient>
                <filter id="ringGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle
                cx="73"
                cy="73"
                r="54"
                stroke="var(--border-glass)"
                strokeWidth="11"
                fill="transparent"
                style={{ opacity: 0.35 }}
              />
              <circle
                className="progress-ring-circle"
                cx="73"
                cy="73"
                r="54"
                stroke="url(#dynamicRingGrad)"
                strokeWidth="11"
                fill="transparent"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringDashOffset}
                strokeLinecap="round"
                filter={calPct >= 100 ? "url(#ringGlow)" : "none"}
              />
            </svg>
            <div className="progress-ring-text">
              <span className="progress-ring-val">
                <AnimatedCounter end={activeCalories} />
              </span>
              <span className="progress-ring-label">of {targets.calories} kcal</span>
              <span
                className="progress-ring-pct-badge"
                style={{
                  background: isOverCal
                    ? 'rgba(239, 68, 68, 0.18)'
                    : isGoalReached
                    ? 'rgba(16, 185, 129, 0.22)'
                    : 'rgba(59, 130, 246, 0.15)',
                  color: isOverCal ? '#ef4444' : isGoalReached ? '#10b981' : 'var(--accent-1, #3b82f6)',
                }}
              >
                {calPct}%
              </span>
            </div>
          </div>

          {/* Macro Mini Bars & Energy Partition */}
          <div className="macro-bars-grid">
            <div className="macro-summary-header">
              <span className="macro-summary-remaining">
                {calDiff >= 0
                  ? `🔥 ${calDiff.toLocaleString()} kcal remaining`
                  : `⚠️ ${Math.abs(calDiff).toLocaleString()} kcal over target`}
              </span>
              <button
                className="macro-quick-log-btn"
                onClick={() => {
                  playClickSound();
                  setIsQuickLogOpen(true);
                }}
                title="Quick Log Food"
              >
                ➕ Quick Log
              </button>
            </div>

            {/* Macro Bars */}
            {[
              {
                label: '🥩 Protein',
                val: activeProtein,
                target: targets.protein,
                color: 'linear-gradient(90deg, #10b981, #059669)',
                unit: 'g',
                kcal: activeProtein * 4
              },
              {
                label: '🍞 Carbs',
                val: activeCarbs,
                target: targets.carbs,
                color: 'linear-gradient(90deg, #3b82f6, #2563eb)',
                unit: 'g',
                kcal: activeCarbs * 4
              },
              {
                label: '🥑 Fat',
                val: activeFat,
                target: targets.fat,
                color: 'linear-gradient(90deg, #f59e0b, #d97706)',
                unit: 'g',
                kcal: activeFat * 9
              },
              {
                label: '🌾 Fiber',
                val: viewTab === 'planned' ? plannedTotals.fiber : totals.fiber,
                target: targets.fiber,
                color: 'linear-gradient(90deg, #8b5cf6, #7c3aed)',
                unit: 'g',
                kcal: 0
              }
            ].map(macro => {
              const pct = Math.min((macro.val / (macro.target || 1)) * 100, 100);
              const isOver = macro.val > macro.target;
              return (
                <div key={macro.label} className="macro-bar-item">
                  <div className="macro-bar-header">
                    <span className="macro-label-title">
                      {macro.label}
                    </span>
                    <span className="macro-val-text">
                      <strong>{macro.val}{macro.unit}</strong> / {macro.target}{macro.unit}
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

            {/* Energy Partition Segmented Bar (When Intake > 0) */}
            {totals.calories > 0 && viewTab === 'intake' && (
              <div className="macro-distribution-section">
                <div className="distribution-header">
                  <span className="dist-title">📊 Meal Energy Partition</span>
                  <span className="dist-sub">Distribution across slots</span>
                </div>
                <div className="distribution-segmented-bar">
                  {macroDistribution.breakfastPct > 0 && (
                    <div
                      className="dist-seg seg-breakfast"
                      style={{ width: `${macroDistribution.breakfastPct}%` }}
                      title={`Breakfast: ${macroDistribution.slotCals.Breakfast} kcal (${macroDistribution.breakfastPct}%)`}
                    />
                  )}
                  {macroDistribution.lunchPct > 0 && (
                    <div
                      className="dist-seg seg-lunch"
                      style={{ width: `${macroDistribution.lunchPct}%` }}
                      title={`Lunch: ${macroDistribution.slotCals.Lunch} kcal (${macroDistribution.lunchPct}%)`}
                    />
                  )}
                  {macroDistribution.dinnerPct > 0 && (
                    <div
                      className="dist-seg seg-dinner"
                      style={{ width: `${macroDistribution.dinnerPct}%` }}
                      title={`Dinner: ${macroDistribution.slotCals.Dinner} kcal (${macroDistribution.dinnerPct}%)`}
                    />
                  )}
                  {macroDistribution.snackPct > 0 && (
                    <div
                      className="dist-seg seg-snack"
                      style={{ width: `${macroDistribution.snackPct}%` }}
                      title={`Snacks: ${macroDistribution.slotCals.Snack} kcal (${macroDistribution.snackPct}%)`}
                    />
                  )}
                </div>
                <div className="distribution-legend">
                  <span className="leg-item leg-b">🍳 {macroDistribution.breakfastPct}%</span>
                  <span className="leg-item leg-l">🍲 {macroDistribution.lunchPct}%</span>
                  <span className="leg-item leg-d">🥗 {macroDistribution.dinnerPct}%</span>
                  <span className="leg-item leg-s">🍎 {macroDistribution.snackPct}%</span>
                </div>
              </div>
            )}

            {/* Planned Meals Helper (When in Planned view) */}
            {viewTab === 'planned' && (
              <div className="dt-planned-helper">
                <div className="dt-planned-summary">
                  <span>📅 <strong>{plannedTotals.count} meals planned</strong> for today</span>
                  <button
                    className="dt-planned-log-all-btn"
                    onClick={() => navigate('/planner')}
                  >
                    Open Planner <ArrowRight size={12} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Coach Tip / Insight Footer */}
        <div className="dt-coach-footer" style={{ borderLeftColor: coachingInsight.color }}>
          <span className="dt-coach-icon">{coachingInsight.icon}</span>
          <span className="dt-coach-text">{coachingInsight.text}</span>
          <button
            className="dt-coach-details-btn"
            onClick={() => navigate('/nutrition')}
            title="Open Full Nutrition Tracker"
          >
            Details <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── QUICK LOG MODAL ────────────────────────────────────── */}
      {isQuickLogOpen && (
        <div className="modal-overlay" onClick={() => setIsQuickLogOpen(false)}>
          <div className="modal-content glass dt-log-modal" onClick={e => e.stopPropagation()}>
            <div className="dt-modal-header">
              <div className="dt-modal-title">
                <span>⚡</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Quick Log Food</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Add meals & snacks directly into today's intake
                  </p>
                </div>
              </div>
              <button
                className="dt-modal-close"
                onClick={() => setIsQuickLogOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="dt-modal-tabs">
              <button
                className={`dt-modal-tab-btn ${logTab === 'quick' ? 'active' : ''}`}
                onClick={() => { playClickSound(); setLogTab('quick'); }}
              >
                ⚡ Fast Presets
              </button>
              <button
                className={`dt-modal-tab-btn ${logTab === 'custom' ? 'active' : ''}`}
                onClick={() => { playClickSound(); setLogTab('custom'); }}
              >
                📝 Custom Entry
              </button>
              <button
                className={`dt-modal-tab-btn ${logTab === 'planned' ? 'active' : ''}`}
                onClick={() => { playClickSound(); setLogTab('planned'); }}
              >
                🍱 Today's Plan ({plannedTotals.count})
              </button>
              <button
                className={`dt-modal-tab-btn ${logTab === 'search' ? 'active' : ''}`}
                onClick={() => { playClickSound(); setLogTab('search'); }}
              >
                🔍 Recipe Search
              </button>
            </div>

            {/* Tab 1: Fast Presets */}
            {logTab === 'quick' && (
              <div className="dt-presets-grid">
                {QUICK_LOG_PRESETS.map((preset, i) => (
                  <div key={i} className="dt-preset-card">
                    <div className="dt-preset-info">
                      <span className="dt-preset-name">{preset.label}</span>
                      <div className="dt-preset-stats">
                        <span>🔥 {preset.calories} kcal</span>
                        <span>🥩 {preset.protein_g}g P</span>
                        <span>🍞 {preset.carbs_g}g C</span>
                        <span>🥑 {preset.fat_g}g F</span>
                      </div>
                    </div>
                    <button
                      className="dt-preset-add-btn"
                      disabled={isSubmitting}
                      onClick={() => logItemAction(preset)}
                      title={`Log ${preset.label}`}
                    >
                      <Plus size={15} /> Log
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Custom Entry */}
            {logTab === 'custom' && (
              <form onSubmit={handleCustomFormSubmit} className="dt-custom-form">
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Food / Item Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Paneer Tikka with Paratha"
                    value={customForm.food_item}
                    onChange={e => setCustomForm({ ...customForm, food_item: e.target.value })}
                    className="input dt-input"
                  />
                </div>

                <div className="dt-form-grid-3">
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🔥 Calories (kcal) *</label>
                    <input
                      type="number"
                      required
                      placeholder="e.g., 350"
                      min="0"
                      step="any"
                      value={customForm.calories}
                      onChange={e => setCustomForm({ ...customForm, calories: e.target.value })}
                      className="input dt-input"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🥩 Protein (g)</label>
                    <input
                      type="number"
                      placeholder="e.g., 25"
                      min="0"
                      step="any"
                      value={customForm.protein_g}
                      onChange={e => setCustomForm({ ...customForm, protein_g: e.target.value })}
                      className="input dt-input"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🍞 Carbs (g)</label>
                    <input
                      type="number"
                      placeholder="e.g., 40"
                      min="0"
                      step="any"
                      value={customForm.carbs_g}
                      onChange={e => setCustomForm({ ...customForm, carbs_g: e.target.value })}
                      className="input dt-input"
                    />
                  </div>
                </div>

                <div className="dt-form-grid-3" style={{ marginTop: '10px' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🥑 Fat (g)</label>
                    <input
                      type="number"
                      placeholder="e.g., 12"
                      min="0"
                      step="any"
                      value={customForm.fat_g}
                      onChange={e => setCustomForm({ ...customForm, fat_g: e.target.value })}
                      className="input dt-input"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🌾 Fiber (g)</label>
                    <input
                      type="number"
                      placeholder="e.g., 5"
                      min="0"
                      step="any"
                      value={customForm.fiber_g}
                      onChange={e => setCustomForm({ ...customForm, fiber_g: e.target.value })}
                      className="input dt-input"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🍽️ Meal Slot</label>
                    <select
                      value={customForm.meal_slot}
                      onChange={e => setCustomForm({ ...customForm, meal_slot: e.target.value })}
                      className="input dt-input"
                    >
                      <option value="Breakfast">🍳 Breakfast</option>
                      <option value="Lunch">🍲 Lunch</option>
                      <option value="Dinner">🥗 Dinner</option>
                      <option value="Snack">🍎 Snack</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary dt-submit-btn"
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  {isSubmitting ? 'Logging...' : 'Add Food to Today’s Intake'}
                </button>
              </form>
            )}

            {/* Tab 3: Today's Planned Meals */}
            {logTab === 'planned' && (
              <div className="dt-planned-modal-list">
                {Object.entries(todayMeals).filter(([_, entry]) => entry?.recipe).length === 0 ? (
                  <div className="dt-empty-planned">
                    <Calendar size={32} style={{ opacity: 0.5, marginBottom: '8px' }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>No meals planned for today yet.</p>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      Visit the Meal Planner to schedule your daily nutrition!
                    </p>
                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: '12px' }}
                      onClick={() => { setIsQuickLogOpen(false); navigate('/planner'); }}
                    >
                      Go to Meal Planner
                    </button>
                  </div>
                ) : (
                  Object.entries(todayMeals).map(([slot, entry]) => {
                    if (!entry?.recipe) return null;
                    const r = entry.recipe;
                    return (
                      <div key={slot} className="dt-planned-item-card">
                        <div className="dt-planned-meta">
                          <span className="dt-slot-badge">{slot}</span>
                          <span className="dt-recipe-title">{r.title}</span>
                          <div className="dt-preset-stats">
                            <span>🔥 {r.calories} kcal</span>
                            <span>🥩 {r.protein_g || r.protein || 0}g P</span>
                            <span>🍞 {r.carbs_g || r.carbs || 0}g C</span>
                            <span>🥑 {r.fat_g || r.fat || 0}g F</span>
                          </div>
                        </div>
                        <button
                          className="dt-preset-add-btn"
                          disabled={isSubmitting}
                          onClick={() => handleLogPlannedMeal(slot, entry)}
                        >
                          <Plus size={15} /> Log Meal
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Tab 4: Recipe Search */}
            {logTab === 'search' && (
              <div className="dt-search-section">
                <div className="dt-search-input-wrap">
                  <Search size={16} className="dt-search-icon" />
                  <input
                    type="text"
                    placeholder="Search database recipes (e.g., Palak Paneer, Oats, Chicken Salad)..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="input dt-search-field"
                    autoFocus
                  />
                  {searchQuery && (
                    <button className="dt-clear-search" onClick={() => setSearchQuery('')}>
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isSearching && (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '20px 0' }}>
                    Searching recipe database...
                  </p>
                )}

                <div className="dt-search-results-list">
                  {searchResults.map(recipe => (
                    <div key={recipe.id} className="dt-search-result-card">
                      <div className="dt-result-info">
                        <span className="dt-recipe-title">{recipe.title}</span>
                        <div className="dt-preset-stats">
                          <span>🔥 {recipe.calories} kcal</span>
                          <span>🥩 {recipe.protein_g || recipe.protein || 0}g P</span>
                          <span>🍞 {recipe.carbs_g || recipe.carbs || 0}g C</span>
                          <span>🥑 {recipe.fat_g || recipe.fat || 0}g F</span>
                        </div>
                      </div>
                      <button
                        className="dt-preset-add-btn"
                        disabled={isSubmitting}
                        onClick={() => logItemAction({
                          food_item: recipe.title,
                          calories: recipe.calories || 0,
                          protein_g: recipe.protein_g || recipe.protein || 0,
                          carbs_g: recipe.carbs_g || recipe.carbs || 0,
                          fat_g: recipe.fat_g || recipe.fat || 0,
                          fiber_g: recipe.fiber_g || recipe.fiber || 0,
                          quantity: 1,
                          unit: 'serving',
                          meal_slot: 'Lunch',
                        })}
                      >
                        <Plus size={15} /> Log
                      </button>
                    </div>
                  ))}
                  {searchQuery && !isSearching && searchResults.length === 0 && (
                    <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', margin: '20px 0' }}>
                      No recipes found matching "{searchQuery}". Try a custom entry!
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="dt-modal-footer">
              <button
                className="dt-full-tracker-link"
                onClick={() => { setIsQuickLogOpen(false); navigate('/nutrition'); }}
              >
                Open Full Nutrition Tracker <ExternalLink size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── QUICK ADJUST TARGETS MODAL ─────────────────────────── */}
      {isAdjustOpen && (
        <div className="modal-overlay" onClick={() => setIsAdjustOpen(false)}>
          <div className="modal-content glass dt-adjust-modal" onClick={e => e.stopPropagation()}>
            <div className="dt-modal-header">
              <div className="dt-modal-title">
                <span>⚙️</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Customize Daily Targets</h3>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Fine-tune calorie and macronutrient goals for {profileLabel}
                  </p>
                </div>
              </div>
              <button
                className="dt-modal-close"
                onClick={() => setIsAdjustOpen(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustedTargets} className="dt-adjust-form">
              {/* Daily Calorie Target Input */}
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '0.88rem', fontWeight: 700 }}>🎯 Daily Calorie Goal (kcal)</label>
                  <span style={{ fontWeight: 800, color: 'var(--accent-1, #3b82f6)' }}>
                    {adjustForm.target_calories} kcal
                  </span>
                </div>
                <input
                  type="range"
                  min="1200"
                  max="4500"
                  step="25"
                  value={adjustForm.target_calories}
                  onChange={e => setAdjustForm({ ...adjustForm, target_calories: Number(e.target.value) })}
                  className="dt-range-slider"
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>1200 kcal</span>
                  <span>2500 kcal</span>
                  <span>4500 kcal</span>
                </div>
              </div>

              {/* Macro Presets */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Macro Distribution Presets
                </label>
                <div className="dt-preset-pill-grid">
                  <button
                    type="button"
                    className="dt-preset-pill"
                    onClick={() => applyMacroPreset('balanced')}
                  >
                    🥗 Balanced (30/45/25)
                  </button>
                  <button
                    type="button"
                    className="dt-preset-pill"
                    onClick={() => applyMacroPreset('high_protein')}
                  >
                    🥩 High Protein (40/35/25)
                  </button>
                  <button
                    type="button"
                    className="dt-preset-pill"
                    onClick={() => applyMacroPreset('keto')}
                  >
                    🥑 Low Carb (25/10/65)
                  </button>
                  <button
                    type="button"
                    className="dt-preset-pill"
                    onClick={() => applyMacroPreset('endurance')}
                  >
                    ⚡ Endurance (20/60/20)
                  </button>
                </div>
              </div>

              {/* Macro Sliders & Grams Preview */}
              <div className="dt-macro-adjust-grid">
                {/* Protein */}
                <div className="dt-macro-adjust-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>🥩 Protein</span>
                    <span style={{ fontWeight: 700 }}>
                      {Math.round((adjustForm.target_calories * (adjustForm.protein_pct / 100)) / 4)}g ({adjustForm.protein_pct}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={adjustForm.protein_pct}
                    onChange={e => setAdjustForm({ ...adjustForm, protein_pct: Number(e.target.value) })}
                    className="dt-range-slider"
                  />
                </div>

                {/* Carbs */}
                <div className="dt-macro-adjust-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#3b82f6' }}>🍞 Carbs</span>
                    <span style={{ fontWeight: 700 }}>
                      {Math.round((adjustForm.target_calories * (adjustForm.carbs_pct / 100)) / 4)}g ({adjustForm.carbs_pct}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="75"
                    step="5"
                    value={adjustForm.carbs_pct}
                    onChange={e => setAdjustForm({ ...adjustForm, carbs_pct: Number(e.target.value) })}
                    className="dt-range-slider"
                  />
                </div>

                {/* Fat */}
                <div className="dt-macro-adjust-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: '#f59e0b' }}>🥑 Fat</span>
                    <span style={{ fontWeight: 700 }}>
                      {Math.round((adjustForm.target_calories * (adjustForm.fat_pct / 100)) / 9)}g ({adjustForm.fat_pct}%)
                    </span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="70"
                    step="5"
                    value={adjustForm.fat_pct}
                    onChange={e => setAdjustForm({ ...adjustForm, fat_pct: Number(e.target.value) })}
                    className="dt-range-slider"
                  />
                </div>
              </div>

              {/* Fiber & Water */}
              <div className="dt-form-grid-2" style={{ marginTop: '12px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>🌾 Daily Fiber Goal (g)</label>
                  <input
                    type="number"
                    min="10"
                    max="80"
                    value={adjustForm.target_fiber_g}
                    onChange={e => setAdjustForm({ ...adjustForm, target_fiber_g: Number(e.target.value) })}
                    className="input dt-input"
                  />
                </div>
                <div className="dt-calc-helper-card">
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Need a precise scientific calculation with BMR, BMI & activity multipliers?
                  </p>
                  <button
                    type="button"
                    className="dt-open-tdee-link"
                    onClick={() => { setIsAdjustOpen(false); navigate('/tdee'); }}
                  >
                    Open TDEE Calculator <ExternalLink size={12} />
                  </button>
                </div>
              </div>

              <div className="dt-adjust-actions" style={{ marginTop: '18px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAdjustOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                >
                  {isSubmitting ? 'Saving...' : 'Apply & Save Targets'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
