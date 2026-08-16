import React, { useState, useEffect, useContext, useRef } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateMacroPercentages } from '../utils/nutrition';
import useHoldToRepeat from '../hooks/useHoldToRepeat';
import { getLocalDateString, CHEF_EVENTS, dispatchChefEvent } from '../utils/dateUtils';
import ChefScoreBadge from '../components/ChefScoreBadge';

function HoldableWaterBtn({ label, amount, onAdd, disabled, className, title }) {
  const handlers = useHoldToRepeat(() => onAdd(amount), 350, 100);
  return (
    <button
      type="button"
      className={className}
      disabled={disabled}
      title={title}
      {...handlers}
    >
      {label}
    </button>
  );
}

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const MEAL_SLOT_META = {
  Breakfast: { emoji: '🌅', color: '#f59e0b', recPct: '25-30%' },
  Lunch: { emoji: '☀️', color: '#10b981', recPct: '35-40%' },
  Dinner: { emoji: '🌙', color: '#6366f1', recPct: '25-30%' },
  Snack: { emoji: '🍿', color: '#ec4899', recPct: '10-15%' },
};

const COMMON_PRESETS = [
  { name: 'Boiled Egg', baseQty: 1, unit: 'piece', calories: 78, protein: 6.3, carbs: 0.6, fat: 5.3, fiber: 0, icon: '🥚' },
  { name: 'Oatmeal with Almond Milk', baseQty: 1, unit: 'cup', calories: 150, protein: 5.0, carbs: 27.0, fat: 3.0, fiber: 4.0, icon: '🥣' },
  { name: 'Grilled Chicken Breast', baseQty: 150, unit: 'g', calories: 248, protein: 46.5, carbs: 0.0, fat: 5.4, fiber: 0, icon: '🍗' },
  { name: 'Greek Yogurt (Plain)', baseQty: 100, unit: 'g', calories: 59, protein: 10.0, carbs: 3.6, fat: 0.4, fiber: 0, icon: '🥛' },
  { name: 'Fresh Paneer (Cottage Cheese)', baseQty: 100, unit: 'g', calories: 265, protein: 18.3, carbs: 1.2, fat: 20.8, fiber: 0, icon: '🧀' },
  { name: 'Crisp Apple', baseQty: 1, unit: 'piece', calories: 95, protein: 0.5, carbs: 25.0, fat: 0.3, fiber: 4.4, icon: '🍎' },
  { name: 'Whey Protein Scoop', baseQty: 1, unit: 'scoop', calories: 120, protein: 24.0, carbs: 3.0, fat: 1.5, fiber: 0, icon: '🥤' },
  { name: 'Roasted Almonds', baseQty: 28, unit: 'g', calories: 164, protein: 6.0, carbs: 6.1, fat: 14.2, fiber: 3.5, icon: '🥜' },
  { name: 'Steamed White Rice', baseQty: 1, unit: 'cup', calories: 205, protein: 4.2, carbs: 45.0, fat: 0.4, fiber: 0.6, icon: '🍚' },
  { name: 'Fresh Avocado', baseQty: 0.5, unit: 'piece', calories: 160, protein: 2.0, carbs: 8.5, fat: 14.7, fiber: 6.7, icon: '🥑' },
];

/* ── Macro Donut Chart (Pure SVG) ───────────────────────────── */
function MacroDonut({ protein, carbs, fat }) {
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const total = proteinCal + carbsCal + fatCal;

  if (total === 0) return null;

  const { proteinPct, carbsPct, fatPct } = calculateMacroPercentages(protein, carbs, fat, total);

  const radius = 46;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { label: 'Protein', value: protein, pct: proteinPct, color: '#10b981', gradId: 'proteinGrad', cal: proteinCal },
    { label: 'Carbs', value: carbs, pct: carbsPct, color: '#3b82f6', gradId: 'carbsGrad', cal: carbsCal },
    { label: 'Fat', value: fat, pct: fatPct, color: '#f59e0b', gradId: 'fatGrad', cal: fatCal },
  ];

  let offset = 0;

  return (
    <div className="macro-donut-card">
      <div className="macro-donut-svg-wrap">
        <svg className="macro-donut-svg" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="proteinGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#10b981" />
            </linearGradient>
            <linearGradient id="carbsGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
            <linearGradient id="fatGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          {segments.map((seg) => {
            const dash = (seg.pct / 100) * circumference;
            const gap = circumference - dash;
            const currentOffset = offset;
            offset += dash;
            return (
              <circle
                key={seg.label}
                className="macro-donut-segment"
                cx="60" cy="60" r={radius}
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-currentOffset}
                stroke={`url(#${seg.gradId})`}
                strokeWidth="12"
                strokeLinecap="round"
                style={{ transition: 'all 0.4s ease' }}
              />
            );
          })}
        </svg>
        <div className="macro-donut-center">
          <div className="macro-donut-center-value">{Math.round(total)}</div>
          <div className="macro-donut-center-label">kcal</div>
        </div>
      </div>
      <div className="macro-donut-legend">
        {segments.map(seg => (
          <div key={seg.label} className="macro-legend-item">
            <span className="macro-legend-dot" style={{ background: seg.color }} />
            <span className="macro-legend-name">{seg.label}</span>
            <span className="macro-legend-val">{Math.round(seg.value)}g ({seg.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NutritionTracker() {
  const { token, activeProfile } = useContext(AuthContext);
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [logs, setLogs] = useState([]);
  const [waterTotal, setWaterTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Logging Modal state
  const [showLogModal, setShowLogModal] = useState(false);
  const [logModalTab, setLogModalTab] = useState('ai'); // 'ai', 'search', 'preset', 'copy'
  const [lookupLoading, setLookupLoading] = useState(false);
  const [targetMealSlot, setTargetMealSlot] = useState('Breakfast');

  // Search tab state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  // Form state
  const [form, setForm] = useState({
    food_item: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    quantity: 1,
    unit: 'serving',
    meal_slot: 'Breakfast',
  });

  // Base item macros before multiplier
  const [baseMacros, setBaseMacros] = useState(null);

  // Edit item state
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({
    food_item: '',
    calories: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fiber_g: 0,
    quantity: 1,
    unit: 'serving',
    meal_slot: 'Breakfast',
  });

  // Summary view
  const [summaryRange, setSummaryRange] = useState('week');
  const [selectedTrendMetric, setSelectedTrendMetric] = useState('calories'); // 'calories', 'protein', 'water', 'carbs_fat'
  const [summaryData, setSummaryData] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // AI Coach Insights
  const [coachData, setCoachData] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

  // Date Strip list (7 days centered around selectedDate)
  const formatDateStr = (dateObj) => {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const parseLocalDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const shiftDate = (days) => {
    const d = parseLocalDate(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(formatDateStr(d));
  };

  // Generate 7-day strip centered around the selected date
  const getWeekStripDays = () => {
    const center = parseLocalDate(selectedDate);
    const days = [];
    for (let i = -3; i <= 3; i++) {
      const d = new Date(center);
      d.setDate(center.getDate() + i);
      const str = formatDateStr(d);
      days.push({
        dateStr: str,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        dayNum: d.getDate(),
        isToday: str === getLocalDateString(),
        isSelected: str === selectedDate,
      });
    }
    return days;
  };

  const fetchCoachInsights = async () => {
    if (!token) return;
    setLoadingCoach(true);
    try {
      const data = await api.get('/nutrition/log/coach-insights');
      setCoachData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCoach(false);
    }
  };

  const fetchLogs = async () => {
    if (!token) {
      const storedLogs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
      const dateLogs = storedLogs.filter(l => l.date === selectedDate);
      setLogs(dateLogs);
      const storedWater = JSON.parse(localStorage.getItem('chef_guest_water_map') || '{}');
      setWaterTotal(storedWater[selectedDate] || 0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/nutrition/log?date=${selectedDate}`);
      setLogs(data || []);

      const waterData = await api.get(`/nutrition/log/water?date=${selectedDate}`);
      setWaterTotal(waterData.total_ml || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    if (!token) {
      // Guest demo timeline from localStorage
      const storedLogs = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
      const storedWater = JSON.parse(localStorage.getItem('chef_guest_water_map') || '{}');
      const daysCount = summaryRange === 'week' ? 7 : 30;
      const endDate = parseLocalDate(selectedDate);
      const startDate = parseLocalDate(selectedDate);
      startDate.setDate(startDate.getDate() - (daysCount - 1));

      const fullTimeline = [];
      const curr = new Date(startDate);
      while (curr <= endDate) {
        const dStr = formatDateStr(curr);
        const dayLogs = storedLogs.filter(l => l.date === dStr);
        const dayWater = storedWater[dStr] || 0;
        const totalCals = dayLogs.reduce((s, l) => s + (l.calories || 0), 0);
        const totalProt = dayLogs.reduce((s, l) => s + (l.protein_g || 0), 0);
        const totalCarbs = dayLogs.reduce((s, l) => s + (l.carbs_g || 0), 0);
        const totalFat = dayLogs.reduce((s, l) => s + (l.fat_g || 0), 0);
        const totalFib = dayLogs.reduce((s, l) => s + (l.fiber_g || 0), 0);

        fullTimeline.push({
          date: dStr,
          total_calories: totalCals,
          total_protein_g: totalProt,
          total_carbs_g: totalCarbs,
          total_fat_g: totalFat,
          total_fiber_g: totalFib,
          total_water_ml: dayWater,
          items_logged: dayLogs.length,
          hasData: dayLogs.length > 0 || dayWater > 0,
        });
        curr.setDate(curr.getDate() + 1);
      }
      setSummaryData(fullTimeline);
      return;
    }

    const daysCount = summaryRange === 'week' ? 7 : 30;
    const endDate = parseLocalDate(selectedDate);
    const startDate = parseLocalDate(selectedDate);
    startDate.setDate(startDate.getDate() - (daysCount - 1));

    const startStr = formatDateStr(startDate);
    const endStr = formatDateStr(endDate);

    try {
      const data = await api.get(`/nutrition/log/summary?start_date=${startStr}&end_date=${endStr}`);
      const dataMap = new Map((data || []).map(item => [item.date, item]));

      const fullTimeline = [];
      const curr = new Date(startDate);
      while (curr <= endDate) {
        const dateStr = formatDateStr(curr);
        const existing = dataMap.get(dateStr);
        fullTimeline.push({
          date: dateStr,
          total_calories: existing ? existing.total_calories || 0 : 0,
          total_protein_g: existing ? existing.total_protein_g || 0 : 0,
          total_carbs_g: existing ? existing.total_carbs_g || 0 : 0,
          total_fat_g: existing ? existing.total_fat_g || 0 : 0,
          total_fiber_g: existing ? existing.total_fiber_g || 0 : 0,
          items_logged: existing ? existing.items_logged || 0 : 0,
          hasData: !!existing && (existing.items_logged || 0) > 0,
        });
        curr.setDate(curr.getDate() + 1);
      }
      setSummaryData(fullTimeline);
    } catch {
      const fullTimeline = [];
      const curr = new Date(startDate);
      while (curr <= endDate) {
        fullTimeline.push({
          date: formatDateStr(curr),
          total_calories: 0,
          total_protein_g: 0,
          total_carbs_g: 0,
          total_fat_g: 0,
          total_fiber_g: 0,
          items_logged: 0,
          hasData: false,
        });
        curr.setDate(curr.getDate() + 1);
      }
      setSummaryData(fullTimeline);
    }
  };

  useEffect(() => {
    fetchLogs();
    fetchSummary();
    fetchCoachInsights();
  }, [token, selectedDate, summaryRange]);

  // Live Auto-complete search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/nutrition/suggest?q=${encodeURIComponent(searchQuery)}`);
        setSearchSuggestions(res || []);
      } catch {
        setSearchSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleLookup = async () => {
    if (!form.food_item.trim()) return;
    setLookupLoading(true);
    try {
      const data = await api.post('/nutrition/analyze', {
        food_item: form.food_item,
        quantity: form.quantity || 1,
        unit: form.unit || 'serving',
      });
      setForm(prev => ({
        ...prev,
        food_item: data.food_item || prev.food_item,
        calories: data.calories || 0,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
      }));
      setBaseMacros({
        calories: (data.calories || 0) / (form.quantity || 1),
        protein_g: (data.protein_g || 0) / (form.quantity || 1),
        carbs_g: (data.carbs_g || 0) / (form.quantity || 1),
        fat_g: (data.fat_g || 0) / (form.quantity || 1),
        fiber_g: (data.fiber_g || 0) / (form.quantity || 1),
      });
      toast.success(`Matched: ${data.food_item} ✓`);
    } catch (err) {
      toast.error("Lookup failed. Please adjust values manually.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectSearchItem = async (foodName) => {
    setSearchQuery('');
    setSearchSuggestions([]);
    setLookupLoading(true);
    try {
      const data = await api.post('/nutrition/analyze', {
        food_item: foodName,
        quantity: 1,
        unit: 'serving',
      });
      setForm({
        food_item: data.food_item || foodName,
        calories: data.calories || 0,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
        quantity: 1,
        unit: 'serving',
        meal_slot: targetMealSlot,
      });
      setBaseMacros({
        calories: data.calories || 0,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
      });
      toast.success(`Selected ${data.food_item}!`);
    } catch {
      setForm(prev => ({ ...prev, food_item: foodName, meal_slot: targetMealSlot }));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSelectPreset = (preset) => {
    setForm({
      food_item: preset.name,
      calories: preset.calories,
      protein_g: preset.protein,
      carbs_g: preset.carbs,
      fat_g: preset.fat,
      fiber_g: preset.fiber,
      quantity: preset.baseQty,
      unit: preset.unit,
      meal_slot: targetMealSlot,
    });
    setBaseMacros({
      calories: preset.calories / preset.baseQty,
      protein_g: preset.protein / preset.baseQty,
      carbs_g: preset.carbs / preset.baseQty,
      fat_g: preset.fat / preset.baseQty,
      fiber_g: preset.fiber / preset.baseQty,
    });
    toast.success(`Selected ${preset.name}!`);
  };

  const handlePortionMultiplier = (mult) => {
    const newQty = Math.round((form.quantity * mult) * 10) / 10;
    if (newQty <= 0) return;
    if (baseMacros) {
      setForm(prev => ({
        ...prev,
        quantity: newQty,
        calories: Math.round(baseMacros.calories * newQty * 10) / 10,
        protein_g: Math.round(baseMacros.protein_g * newQty * 10) / 10,
        carbs_g: Math.round(baseMacros.carbs_g * newQty * 10) / 10,
        fat_g: Math.round(baseMacros.fat_g * newQty * 10) / 10,
        fiber_g: Math.round(baseMacros.fiber_g * newQty * 10) / 10,
      }));
    } else {
      setForm(prev => ({ ...prev, quantity: newQty }));
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!form.food_item.trim()) {
      toast.error("Please enter a food item name");
      return;
    }
    if (selectedDate < getLocalDateString()) {
      const confirmEdit = window.confirm(`⚠️ You are about to add a food entry to a PAST date (${selectedDate}). Are you sure?`);
      if (!confirmEdit) return;
    }
    try {
      if (token) {
        await api.post('/nutrition/log', { ...form, date: selectedDate });
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const newLog = { ...form, id: Date.now(), date: selectedDate };
        localStorage.setItem('chef_guest_logs', JSON.stringify([...stored, newLog]));
      }
      toast.success(`${form.food_item} logged to ${form.meal_slot}! 🎉`);
      setForm({
        food_item: '',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        quantity: 1,
        unit: 'serving',
        meal_slot: targetMealSlot,
      });
      setBaseMacros(null);
      setShowLogModal(false);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCopyYesterday = async (slot = null) => {
    const yesterday = new Date(parseLocalDate(selectedDate));
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateStr(yesterday);

    try {
      if (token) {
        await api.post('/nutrition/log/copy-day', {
          source_date: yesterdayStr,
          target_date: selectedDate,
          meal_slot: slot || undefined,
        });
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const sourceLogs = stored.filter(l => l.date === yesterdayStr && (!slot || l.meal_slot === slot));
        if (sourceLogs.length === 0) {
          toast.error(`No logs found on yesterday (${yesterdayStr}) to copy.`);
          return;
        }
        const copied = sourceLogs.map(l => ({ ...l, id: Date.now() + Math.random(), date: selectedDate }));
        localStorage.setItem('chef_guest_logs', JSON.stringify([...stored, ...copied]));
      }
      toast.success(`Copied meals from yesterday (${yesterdayStr}) ✓`);
      setShowLogModal(false);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message || 'No logs found on yesterday to copy');
    }
  };

  const handleDuplicateItem = async (item) => {
    try {
      if (token) {
        await api.post('/nutrition/log', {
          food_item: item.food_item,
          calories: item.calories,
          protein_g: item.protein_g,
          carbs_g: item.carbs_g,
          fat_g: item.fat_g,
          fiber_g: item.fiber_g,
          quantity: item.quantity,
          unit: item.unit,
          meal_slot: item.meal_slot,
          date: selectedDate,
        });
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const newLog = { ...item, id: Date.now(), date: selectedDate };
        localStorage.setItem('chef_guest_logs', JSON.stringify([...stored, newLog]));
      }
      toast.success(`Duplicated ${item.food_item}!`);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMoveSlot = async (item, newSlot) => {
    try {
      if (token) {
        await api.put(`/nutrition/log/${item.id}`, { meal_slot: newSlot });
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const updated = stored.map(l => l.id === item.id ? { ...l, meal_slot: newSlot } : l);
        localStorage.setItem('chef_guest_logs', JSON.stringify(updated));
      }
      toast.success(`Moved to ${newSlot}!`);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleStartEdit = (item) => {
    setEditingItem(item);
    setEditForm({
      food_item: item.food_item,
      calories: item.calories,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g || 0,
      quantity: item.quantity,
      unit: item.unit,
      meal_slot: item.meal_slot,
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      if (token) {
        await api.put(`/nutrition/log/${editingItem.id}`, editForm);
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const updated = stored.map(l => l.id === editingItem.id ? { ...l, ...editForm } : l);
        localStorage.setItem('chef_guest_logs', JSON.stringify(updated));
      }
      toast.success("Log entry updated ✓");
      setEditingItem(null);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (selectedDate < getLocalDateString()) {
      const confirmDelete = window.confirm(`⚠️ You are about to delete an entry from a PAST date (${selectedDate}). Are you sure?`);
      if (!confirmDelete) return;
    }
    try {
      if (token) {
        await api.delete(`/nutrition/log/${id}`);
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const updated = stored.filter(item => item.id !== id);
        localStorage.setItem('chef_guest_logs', JSON.stringify(updated));
      }
      toast.success('Entry removed');
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleClearDay = async () => {
    const confirmClear = window.confirm(`Are you sure you want to clear ALL logged food items for ${selectedDate}?`);
    if (!confirmClear) return;
    try {
      if (token) {
        for (const l of logs) {
          await api.delete(`/nutrition/log/${l.id}`);
        }
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const updated = stored.filter(l => l.date !== selectedDate);
        localStorage.setItem('chef_guest_logs', JSON.stringify(updated));
      }
      toast.success(`Cleared all food logs for ${selectedDate}`);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddWaterCustom = async (amount) => {
    if (selectedDate < getLocalDateString()) {
      const confirmWater = window.confirm(`⚠️ You are about to modify water intake for a PAST date (${selectedDate}). Are you sure?`);
      if (!confirmWater) return;
    }
    if (token) {
      try {
        if (amount < 0) {
          const waterData = await api.get(`/nutrition/log/water?date=${selectedDate}`);
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
          }
        } else {
          await api.post('/nutrition/log/water', { amount_ml: amount, date: selectedDate });
          toast.success(`Logged ${amount}ml water! 💧`);
        }
        fetchLogs();
        fetchSummary();
        fetchCoachInsights();
        dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
      } catch (err) {
        toast.error(err.message);
      }
    } else {
      const storedMap = JSON.parse(localStorage.getItem('chef_guest_water_map') || '{}');
      const current = storedMap[selectedDate] || 0;
      const newTotal = Math.max(0, current + amount);
      storedMap[selectedDate] = newTotal;
      localStorage.setItem('chef_guest_water_map', JSON.stringify(storedMap));
      setWaterTotal(newTotal);
      dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
      if (amount > 0) {
        toast.success(`Logged ${amount}ml water! 💧`);
      } else {
        toast.success(`Removed ${Math.abs(amount)}ml water! 💧`);
      }
    }
  };

  const handleResetWater = async () => {
    if (token) {
      try {
        const waterData = await api.get(`/nutrition/log/water?date=${selectedDate}`);
        const logsToDelete = waterData.logs || [];
        for (const log of logsToDelete) {
          await api.delete(`/nutrition/log/water/${log.id}`);
        }
        fetchLogs();
        fetchSummary();
        fetchCoachInsights();
        dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
        toast.success("Hydration reset!");
      } catch (err) {
        toast.error(err.message);
      }
    } else {
      const storedMap = JSON.parse(localStorage.getItem('chef_guest_water_map') || '{}');
      storedMap[selectedDate] = 0;
      localStorage.setItem('chef_guest_water_map', JSON.stringify(storedMap));
      setWaterTotal(0);
      dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
      toast.success("Hydration reset!");
    }
  };

  // Copy Daily Summary to Clipboard
  const handleCopySummaryToClipboard = () => {
    const textLines = [
      `🥗 CHEF Nutrition Summary — ${selectedDate}`,
      `━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      `🔥 Calories: ${Math.round(totals.calories)} / ${targets.calories} kcal (${Math.round((totals.calories / targets.calories) * 100)}%)`,
      `🥩 Protein:  ${Math.round(totals.protein_g)}g / ${targets.protein_g}g`,
      `🍞 Carbs:    ${Math.round(totals.carbs_g)}g / ${targets.carbs_g}g (Net: ${Math.round(totals.carbs_g - totals.fiber_g)}g)`,
      `🥑 Fat:      ${Math.round(totals.fat_g)}g / ${targets.fat_g}g`,
      `🌾 Fiber:    ${Math.round(totals.fiber_g)}g / ${(activeProfile?.target_fiber_g || 30)}g`,
      `💧 Hydration:${waterTotal} ml / ${(activeProfile?.target_water_ml || 2500)} ml`,
      `\n🍽️ Logged Meals (${logs.length} items):`,
    ];

    MEAL_SLOTS.forEach(slot => {
      const slotLogs = logs.filter(l => l.meal_slot === slot);
      if (slotLogs.length > 0) {
        textLines.push(`\n${MEAL_SLOT_META[slot].emoji} ${slot} (${Math.round(slotLogs.reduce((s, l) => s + l.calories, 0))} kcal):`);
        slotLogs.forEach(l => {
          textLines.push(`  • ${l.food_item} (${l.quantity} ${l.unit}) — ${l.calories} kcal [P:${l.protein_g}g C:${l.carbs_g}g F:${l.fat_g}g]`);
        });
      }
    });

    navigator.clipboard.writeText(textLines.join('\n'));
    toast.success("Daily summary copied to clipboard! 📋");
  };

  // Compute today's totals
  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein_g: acc.protein_g + (log.protein_g || 0),
      carbs_g: acc.carbs_g + (log.carbs_g || 0),
      fat_g: acc.fat_g + (log.fat_g || 0),
      fiber_g: acc.fiber_g + (log.fiber_g || 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 }
  );

  // Targets from user profile
  const targets = {
    calories: activeProfile?.target_calories || 2000,
    protein_g: activeProfile?.target_protein || 125,
    carbs_g: activeProfile?.target_carbs || 240,
    fat_g: activeProfile?.target_fat || 60,
  };

  const calRemaining = Math.round(targets.calories - totals.calories);
  const isOverBudget = calRemaining < 0;

  const calculateNutritionGrade = () => {
    if (logs.length === 0) return { grade: 'N/A', label: 'No logs yet', color: 'var(--text-muted)', score: 0 };

    let score = 100;
    const calTarget = targets.calories || 2000;
    const calDiffPct = Math.abs(totals.calories - calTarget) / calTarget;
    score -= Math.min(30, calDiffPct * 100);

    const protTarget = targets.protein_g || 150;
    const protDiffPct = Math.abs(totals.protein_g - protTarget) / protTarget;
    score -= Math.min(25, protDiffPct * 100);

    const fiberTarget = activeProfile?.target_fiber_g || 30;
    if (totals.fiber_g < fiberTarget) {
      const fiberDiffPct = (fiberTarget - totals.fiber_g) / fiberTarget;
      score -= Math.min(15, fiberDiffPct * 15);
    }

    const finalScore = Math.max(0, Math.round(score));

    let grade = 'E';
    let color = '#E63E11';
    let label = 'Needs Balance Adjustment';
    let tip = 'Increase protein density and dietary fiber.';

    if (finalScore >= 95) {
      grade = 'S';
      color = '#DAA520';
      label = '★ Superior Daily Balance';
      tip = 'Perfect macro and caloric execution!';
    } else if (finalScore >= 85) {
      grade = 'A';
      color = '#038141';
      label = 'Excellent Daily Balance';
      tip = 'Great macro distribution and adherence.';
    } else if (finalScore >= 70) {
      grade = 'B';
      color = '#85BB2F';
      label = 'Good Daily Balance';
      tip = 'Within healthy target parameters.';
    } else if (finalScore >= 55) {
      grade = 'C';
      color = '#FECB02';
      label = 'Moderate Balance';
      tip = 'Add more protein and balance carbs.';
    } else if (finalScore >= 40) {
      grade = 'D';
      color = '#EE8100';
      label = 'Sub-optimal Balance';
      tip = 'High deviation from caloric or macro targets.';
    }

    return { grade, score: finalScore, label, color, tip };
  };

  const healthGrade = calculateNutritionGrade();
  const weekStrip = getWeekStripDays();

  return (
    <section className="page active" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* ── Top Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>🥗</span> Nutrition & Hydration Tracker
          </h1>
          <p className="subtitle">Track your daily food intake, macro targets, and hydration balance</p>
        </div>

        {/* Quick Actions Bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            onClick={handleCopySummaryToClipboard}
            title="Copy formatted daily summary to clipboard"
            style={{ fontSize: '13px', padding: '8px 14px', marginTop: 0 }}
          >
            📋 Copy Summary
          </button>
          <button
            className="btn-secondary"
            onClick={() => window.print()}
            title="Print or export as PDF"
            style={{ fontSize: '13px', padding: '8px 14px', marginTop: 0 }}
          >
            🖨️ Print View
          </button>
          <button
            className="btn-primary"
            onClick={() => { setTargetMealSlot('Breakfast'); setShowLogModal(true); }}
            style={{ fontSize: '13px', padding: '8px 16px', marginTop: 0, background: 'var(--accent-1)' }}
          >
            ✨ Log Food
          </button>
        </div>
      </div>

      {/* ── Interactive Date Navigator & 7-Day Calendar Strip ── */}
      <div className="tracker-date-nav">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            className="btn-secondary"
            onClick={() => shiftDate(-1)}
            title="Previous Day"
            style={{ padding: '6px 12px', fontSize: '12px', marginTop: 0 }}
          >
            ◀ Prev
          </button>
          <button
            className={`btn-secondary ${selectedDate === getLocalDateString() ? 'active' : ''}`}
            onClick={() => setSelectedDate(getLocalDateString())}
            style={{ padding: '6px 12px', fontSize: '12px', marginTop: 0 }}
          >
            Today
          </button>
          <button
            className="btn-secondary"
            onClick={() => shiftDate(1)}
            title="Next Day"
            style={{ padding: '6px 12px', fontSize: '12px', marginTop: 0 }}
          >
            Next ▶
          </button>
        </div>

        {/* 7-Day Strip */}
        <div className="tracker-date-strip">
          {weekStrip.map(day => (
            <div
              key={day.dateStr}
              className={`tracker-date-pill ${day.isSelected ? 'active' : ''}`}
              onClick={() => setSelectedDate(day.dateStr)}
              title={`Jump to ${day.dateStr}`}
            >
              <span className="tracker-pill-day">{day.dayName}</span>
              <span className="tracker-pill-date">{day.dayNum}</span>
              <span
                className="tracker-pill-dot"
                style={{
                  background: day.isSelected 
                    ? '#ffffff' 
                    : (day.dateStr === getLocalDateString() ? 'var(--accent-1)' : 'rgba(255,255,255,0.2)'),
                }}
              />
            </div>
          ))}
        </div>

        {/* Date Picker Input */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-glass)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font)',
              fontSize: '13px',
            }}
          />
        </div>
      </div>

      {/* Historical Log Warning Banner */}
      {selectedDate < getLocalDateString() && (
        <div style={{
          marginBottom: '20px',
          padding: '12px 18px',
          borderRadius: '14px',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          color: '#d97706',
          fontSize: '13.5px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '18px' }}>⚠️</span>
            <span>Viewing Historical Log ({selectedDate}). Modifying past records will trigger confirmation prompts.</span>
          </div>
          <button
            className="btn-secondary"
            onClick={() => setSelectedDate(getLocalDateString())}
            style={{ fontSize: '11.5px', padding: '4px 10px', marginTop: 0 }}
          >
            ⚡ Jump to Today
          </button>
        </div>
      )}

      {/* ── Top Energy Budget Equation Banner ── */}
      <div className="tracker-budget-banner">
        <div className="tracker-budget-equation">
          <div className="tracker-budget-item">
            <span className="tracker-budget-label">🎯 Target Goal</span>
            <span className="tracker-budget-value">{targets.calories} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>kcal</span></span>
          </div>
          <span className="tracker-budget-operator">−</span>
          <div className="tracker-budget-item">
            <span className="tracker-budget-label">🍽️ Food Intake</span>
            <span className="tracker-budget-value" style={{ color: 'var(--accent-1)' }}>{Math.round(totals.calories)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>kcal</span></span>
          </div>
          <span className="tracker-budget-operator">=</span>
          <div className="tracker-budget-item">
            <span className="tracker-budget-label">{isOverBudget ? '🔥 Surplus' : '⚡ Remaining'}</span>
            <span className="tracker-budget-value" style={{ color: isOverBudget ? '#ef4444' : '#10b981' }}>
              {Math.abs(calRemaining)} <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>kcal</span>
            </span>
          </div>
        </div>

        {/* Quick Health Grade Badge */}
        {healthGrade.grade !== 'N/A' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'var(--bg-primary)', padding: '6px 14px', borderRadius: '12px', border: `1px solid ${healthGrade.color}40` }}>
            <div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: '700' }}>Balance Score</div>
              <div style={{ fontSize: '13px', fontWeight: '800', color: healthGrade.color }}>{healthGrade.label}</div>
            </div>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', border: `2px solid ${healthGrade.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', color: healthGrade.color, fontSize: '16px' }}>
              {healthGrade.grade}
            </div>
          </div>
        )}
      </div>

      {/* Over-eating Warning Alert Banner */}
      {isOverBudget && (
        <div className="card glass fade-in-up" style={{ 
          marginBottom: '20px', 
          padding: '14px 20px', 
          borderLeft: '4px solid #ef4444', 
          background: 'rgba(239, 68, 68, 0.08)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderRadius: '14px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🚨</span>
            <div>
              <h4 style={{ fontSize: '12px', textTransform: 'uppercase', color: '#ef4444', margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>
                Calorie Surplus Alert
              </h4>
              <p style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)', margin: '2px 0 0' }}>
                Exceeded daily calorie target by <span style={{ color: '#ef4444', fontWeight: '800' }}>+{Math.abs(calRemaining)} kcal</span> ({Math.round((totals.calories / targets.calories) * 100)}% of budget)
              </p>
            </div>
          </div>
          <span style={{ background: '#ef4444', color: '#fff', fontSize: '11px', fontWeight: '800', padding: '5px 12px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' }}>
            🔥 Surplus
          </span>
        </div>
      )}

      {/* ── Daily Progress Rings ── */}
      <div className="card glass" style={{ marginBottom: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Daily Macro & Micronutrient Goals</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Target Compliance & Breakdown</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '11.5px', padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-glass)', fontWeight: '600', color: 'var(--text-secondary)' }}>
              Net Carbs: {Math.max(0, Math.round(totals.carbs_g - totals.fiber_g))}g
            </span>
          </div>
        </div>

        <div className="tracker-progress-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))' }}>
          {[
            { label: 'Calories', value: totals.calories, target: targets.calories, unit: 'kcal', icon: '🔥', gradStart: '#f97316', gradEnd: '#ef4444', gradId: 'calRingGrad' },
            { label: 'Protein', value: totals.protein_g, target: targets.protein_g, unit: 'g', icon: '🥩', gradStart: '#34d399', gradEnd: '#10b981', gradId: 'protRingGrad' },
            { label: 'Carbs', value: totals.carbs_g, target: targets.carbs_g, unit: 'g', icon: '🍞', gradStart: '#60a5fa', gradEnd: '#3b82f6', gradId: 'carbRingGrad' },
            { label: 'Fat', value: totals.fat_g, target: targets.fat_g, unit: 'g', icon: '🥑', gradStart: '#fbbf24', gradEnd: '#f59e0b', gradId: 'fatRingGrad' },
            { label: 'Fiber', value: totals.fiber_g, target: (activeProfile?.target_fiber_g || 30), unit: 'g', icon: '🌾', gradStart: '#c084fc', gradEnd: '#8b5cf6', gradId: 'fibRingGrad' },
          ].map(({ label, value, target, unit, icon, gradStart, gradEnd, gradId }) => {
            const rawPct = target > 0 ? Math.round((value / target) * 100) : 0;
            const visualPct = Math.min(rawPct, 100);
            const diff = Math.round(value - target);
            const isExceeded = diff > 0;
            const isCriticalOverflow = rawPct >= 140;
            const isTargetMet = rawPct >= 90 && rawPct <= 110;

            const badgeBg = isCriticalOverflow ? 'rgba(231, 76, 60, 0.25)' : (isExceeded ? 'rgba(243, 156, 18, 0.25)' : (isTargetMet ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-primary)'));
            const badgeColor = isCriticalOverflow ? '#e74c3c' : (isExceeded ? '#f39c12' : (isTargetMet ? '#10b981' : 'var(--text-muted)'));
            const borderCol = isCriticalOverflow ? '1px solid rgba(231, 76, 60, 0.6)' : (isExceeded ? '1px solid rgba(243, 156, 18, 0.5)' : (isTargetMet ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid var(--border-glass)'));

            return (
              <div 
                key={label} 
                className="tracker-ring-card"
                style={{
                  position: 'relative',
                  padding: '16px 10px 14px',
                  borderRadius: '16px',
                  background: 'var(--bg-secondary)',
                  border: borderCol,
                  transition: 'all 0.25s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  fontSize: '9.5px',
                  fontWeight: 'bold',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  background: badgeBg,
                  color: badgeColor,
                  border: '1px solid var(--border-glass)'
                }}>
                  {rawPct}% {isCriticalOverflow ? '🚨' : ''}
                </div>

                <div className="tracker-ring" style={{ width: '80px', height: '80px', margin: '6px auto 10px' }}>
                  <svg viewBox="0 0 36 36" className="tracker-ring-svg" style={{ overflow: 'visible' }}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor={gradStart} />
                        <stop offset="100%" stopColor={gradEnd} />
                      </linearGradient>
                    </defs>
                    <path
                      className="tracker-ring-bg"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      stroke="var(--border-glass)"
                      strokeWidth="3.2"
                      fill="none"
                    />
                    <path
                      className="tracker-ring-fill"
                      strokeDasharray={`${visualPct}, 100`}
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      stroke={`url(#${gradId})`}
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      fill="none"
                      style={{ transition: 'stroke-dasharray 0.6s ease' }}
                    />
                  </svg>
                  <div className="tracker-ring-text">
                    <span className="tracker-ring-value" style={{ fontSize: '14px', fontWeight: 'bold' }}>{Math.round(value)}</span>
                    <span className="tracker-ring-unit" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{unit}</span>
                  </div>
                </div>

                <div className="tracker-ring-label" style={{ fontWeight: '700', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>{icon}</span> {label}
                </div>
                <div className="tracker-ring-target" style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  of {target} {unit}
                </div>
                <div style={{
                  fontSize: '10px',
                  marginTop: '4px',
                  fontWeight: '600',
                  color: isExceeded ? '#f59e0b' : 'var(--text-muted)'
                }}>
                  {isExceeded ? `+${diff}${unit} over` : `${Math.abs(diff)}${unit} left`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Macro Distribution & Hydration Card Grid ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0) && (
          <div className="card glass" style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Macro Distribution</h3>
            <MacroDonut protein={totals.protein_g} carbs={totals.carbs_g} fat={totals.fat_g} />
          </div>
        )}

        {/* ── Hydration Widget ── */}
        <div className="card glass water-widget" style={{ flex: '1', minWidth: '320px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
          {(() => {
            const targetWater = activeProfile?.target_water_ml || 2500;
            const actualPctWater = Math.round((waterTotal / targetWater) * 100);
            const barWidthPct = Math.min(100, actualPctWater);
            const isGoalReached = waterTotal >= targetWater;
            const isPastDate = selectedDate < getLocalDateString();

            return (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800' }}>💧 Hydration Tracker</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {isPastDate && (
                      <span style={{ fontSize: '0.72rem', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', padding: '2px 8px', borderRadius: '10px', fontWeight: '700' }}>
                        🔒 Historical Log
                      </span>
                    )}
                    {isGoalReached && (
                      <span className="water-goal-badge">🎉 Goal Met!</span>
                    )}
                  </div>
                </div>

                <p style={{ margin: '2px 0 10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {waterTotal} ml / {targetWater} ml <span style={{ color: isGoalReached ? '#10b981' : '#38bdf8', fontWeight: '700', marginLeft: '6px' }}>({actualPctWater}%)</span>
                </p>

                {/* Progress bar */}
                <div style={{ width: '100%', position: 'relative', marginBottom: '16px' }}>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${Math.min(barWidthPct, 100)}%`, 
                      height: '100%', 
                      background: barWidthPct > 125 
                        ? 'linear-gradient(90deg, #f59e0b, #ef4444)' 
                        : 'linear-gradient(90deg, #38bdf8, #0284c7)', 
                      transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', 
                      borderRadius: '4px' 
                    }} />
                  </div>
                </div>

                {/* Over-hydration warning */}
                {actualPctWater > 125 && (
                  <div style={{ 
                    background: 'rgba(239, 68, 68, 0.12)', 
                    border: '1px solid rgba(239, 68, 68, 0.3)', 
                    borderRadius: '10px', 
                    padding: '6px 12px', 
                    marginBottom: '12px',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    ⚠️ Upper Hydration Limit Exceeded — Consider moderating intake
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="water-controls" style={{ marginTop: 0, display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      <HoldableWaterBtn className="water-btn primary-btn" amount={150} onAdd={handleAddWaterCustom} label="☕ +150ml" title="Cup" />
                      <HoldableWaterBtn className="water-btn primary-btn" amount={250} onAdd={handleAddWaterCustom} label="💧 +250ml" title="Glass" />
                      <HoldableWaterBtn className="water-btn" amount={500} onAdd={handleAddWaterCustom} label="🍼 +500ml" title="Bottle" />
                      <HoldableWaterBtn className="water-btn" amount={750} onAdd={handleAddWaterCustom} label="🏋️ +750ml" title="Shaker" />
                      <HoldableWaterBtn className="water-btn danger-btn" amount={-250} onAdd={handleAddWaterCustom} disabled={waterTotal <= 0} label="➖ -250ml" title="Remove" />
                      <button className="water-btn" onClick={handleResetWater} title="Reset hydration tracker">
                        🔄 Reset
                      </button>
                    </div>
                  </div>

                  {/* Fluid Tumbler */}
                  <div className="water-display" style={{ margin: 0, width: '90px', height: '90px', borderRadius: '6px 6px 28px 28px' }}>
                    <div
                      className="water-level"
                      style={{ height: `${Math.min(barWidthPct, 100)}%` }}
                    >
                      <div className="water-wave" />
                      <div className="water-bubble" />
                      <div className="water-bubble" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Categorized Meal Slots (Breakfast, Lunch, Dinner, Snack) ── */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Daily Meals & Intake</h3>
          <button
            className="btn-secondary"
            onClick={handleClearDay}
            disabled={logs.length === 0}
            style={{ fontSize: '12px', padding: '5px 12px', marginTop: 0, color: logs.length > 0 ? '#ef4444' : 'var(--text-muted)' }}
          >
            🗑️ Clear Today's Log
          </button>
        </div>

        {MEAL_SLOTS.map(slot => {
          const slotMeta = MEAL_SLOT_META[slot];
          const slotLogs = logs.filter(l => l.meal_slot === slot);
          const slotCals = Math.round(slotLogs.reduce((s, l) => s + (l.calories || 0), 0));
          const slotProt = Math.round(slotLogs.reduce((s, l) => s + (l.protein_g || 0), 0));
          const slotCarbs = Math.round(slotLogs.reduce((s, l) => s + (l.carbs_g || 0), 0));
          const slotFat = Math.round(slotLogs.reduce((s, l) => s + (l.fat_g || 0), 0));
          const slotPct = targets.calories > 0 ? Math.round((slotCals / targets.calories) * 100) : 0;

          return (
            <div key={slot} className="meal-slot-card">
              <div className="meal-slot-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '20px' }}>{slotMeta.emoji}</span>
                  <div>
                    <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{slot}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                      (Rec: {slotMeta.recPct})
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {slotLogs.length > 0 && (
                    <div className="meal-slot-macro-pill">
                      <span>🔥 {slotCals} kcal ({slotPct}%)</span>
                      <span>·</span>
                      <span style={{ color: '#10b981' }}>P:{slotProt}g</span>
                      <span style={{ color: '#3b82f6' }}>C:{slotCarbs}g</span>
                      <span style={{ color: '#f59e0b' }}>F:{slotFat}g</span>
                    </div>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setTargetMealSlot(slot);
                      setForm(prev => ({ ...prev, meal_slot: slot }));
                      setShowLogModal(true);
                    }}
                    style={{ fontSize: '12px', padding: '4px 12px', marginTop: 0 }}
                  >
                    + Add to {slot}
                  </button>
                </div>
              </div>

              {/* Slot Items */}
              {slotLogs.length === 0 ? (
                <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: '13px', fontStyle: 'italic', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>No food logged for {slot} yet.</span>
                  <button
                    className="btn-secondary"
                    onClick={() => handleCopyYesterday(slot)}
                    style={{ fontSize: '11px', padding: '3px 8px', marginTop: 0 }}
                    title={`Copy yesterday's ${slot}`}
                  >
                    📋 Copy Yesterday's {slot}
                  </button>
                </div>
              ) : (
                slotLogs.map(log => (
                  <div key={log.id} className="meal-slot-item-row">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '14.5px', fontWeight: '600', color: 'var(--text-primary)' }}>
                        {log.food_item}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {log.quantity} {log.unit} · {Math.round(log.calories)} kcal
                        </span>
                        <span className="macro-tag-pill macro-tag-protein">P: {Math.round(log.protein_g)}g</span>
                        <span className="macro-tag-pill macro-tag-carbs">C: {Math.round(log.carbs_g)}g</span>
                        <span className="macro-tag-pill macro-tag-fat">F: {Math.round(log.fat_g)}g</span>
                        {log.fiber_g > 0 && <span className="macro-tag-pill macro-tag-fiber">Fib: {Math.round(log.fiber_g)}g</span>}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {/* Move Slot dropdown */}
                      <select
                        value={log.meal_slot}
                        onChange={(e) => handleMoveSlot(log, e.target.value)}
                        style={{
                          fontSize: '11px',
                          padding: '3px 6px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-glass)',
                          background: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)'
                        }}
                        title="Move to another meal slot"
                      >
                        {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>

                      <button
                        className="btn-secondary"
                        onClick={() => handleDuplicateItem(log)}
                        title="Duplicate food entry"
                        style={{ fontSize: '12px', padding: '4px 8px', marginTop: 0 }}
                      >
                        📄
                      </button>

                      <button
                        className="btn-secondary"
                        onClick={() => handleStartEdit(log)}
                        title="Edit entry"
                        style={{ fontSize: '12px', padding: '4px 8px', marginTop: 0 }}
                      >
                        ✏️
                      </button>

                      <button
                        className="tracker-log-delete"
                        onClick={() => handleDelete(log.id)}
                        title="Delete entry"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* ── AI Coach Insights Card ── */}
      {coachData && coachData.insights && coachData.insights.length > 0 && (
        <div className="card glass fade-in-up" style={{ 
          marginBottom: '20px', 
          padding: '24px', 
          borderLeft: '4px solid var(--accent-1)',
          background: 'var(--bg-secondary)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              🧠 AI Nutrition Coach Insights
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {coachData.insights.map((insight, idx) => {
              const bg = insight.status === 'warning' ? 'linear-gradient(135deg, rgba(231, 76, 60, 0.1), rgba(231, 76, 60, 0.02))' : 
                         insight.status === 'success' ? 'linear-gradient(135deg, rgba(39, 174, 96, 0.1), rgba(39, 174, 96, 0.02))' : 'linear-gradient(135deg, rgba(52, 152, 219, 0.1), rgba(52, 152, 219, 0.02))';
              const col = insight.status === 'warning' ? '#e74c3c' : 
                          insight.status === 'success' ? '#27ae60' : '#2980b9';
              return (
                <div key={idx} style={{ 
                  display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', 
                  background: bg, borderRadius: '12px', border: `1px solid ${col}30`,
                  transition: 'transform 0.2s', cursor: 'default'
                }}>
                  <div style={{ background: `${col}20`, padding: '4px 8px', borderRadius: '6px', color: col, fontWeight: '800', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {insight.category}
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, flex: 1, lineHeight: '1.5' }}>
                    {insight.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Multi-Metric Trend Analytics Overhaul (SVG Line Chart) ── */}
      {(() => {
        if (summaryData.length === 0) return null;

        const width = 640;
        const height = 250;
        const paddingLeft = 55;
        const paddingRight = 30;
        const paddingTop = 45;
        const paddingBottom = 40;

        const totalDays = summaryData.length;
        const activeDays = summaryData.filter(d => (d.total_calories || 0) > 0);
        const activeCount = activeDays.length;

        // Metric extraction based on selectedTrendMetric
        const getMetricValue = (d) => {
          if (selectedTrendMetric === 'protein') return d.total_protein_g || 0;
          if (selectedTrendMetric === 'water') return d.total_water_ml || 0;
          return d.total_calories || 0;
        };

        const getMetricTarget = () => {
          if (selectedTrendMetric === 'protein') return targets.protein_g || 125;
          if (selectedTrendMetric === 'water') return activeProfile?.target_water_ml || 2500;
          return targets.calories || 2000;
        };

        const getMetricUnit = () => {
          if (selectedTrendMetric === 'protein') return 'g';
          if (selectedTrendMetric === 'water') return 'ml';
          return 'kcal';
        };

        const targetGoal = getMetricTarget();
        const metricUnit = getMetricUnit();

        const rawMax = Math.max(...summaryData.map(getMetricValue), targetGoal);
        const step = selectedTrendMetric === 'protein' ? 25 : (selectedTrendMetric === 'water' ? 500 : 500);
        const maxCal = Math.max(Math.ceil((rawMax * 1.25) / step) * step, step * 2);

        const avgVal = activeCount > 0 
          ? Math.round(activeDays.reduce((acc, curr) => acc + getMetricValue(curr), 0) / activeCount) 
          : 0;
        const peakVal = Math.round(Math.max(0, ...summaryData.map(getMetricValue)));
        const onTrackCount = summaryData.filter(d => getMetricValue(d) >= targetGoal * 0.85 && getMetricValue(d) <= targetGoal * 1.15).length;
        const onTrackPct = activeCount > 0 ? Math.round((onTrackCount / activeCount) * 100) : 0;

        const points = summaryData.map((d, index) => {
          const val = getMetricValue(d);
          const x = paddingLeft + (index * (width - paddingLeft - paddingRight)) / (totalDays - 1 || 1);
          const y = height - paddingBottom - (val * (height - paddingTop - paddingBottom)) / maxCal;
          return { x, y, date: d.date, value: val, hasData: d.hasData };
        });

        const targetY = height - paddingBottom - (targetGoal * (height - paddingTop - paddingBottom)) / maxCal;
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        
        const areaPath = points.length > 0 
          ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
          : '';

        const yTickValues = [0, Math.round(maxCal * 0.33), Math.round(maxCal * 0.66), maxCal];
        const isHoveredNearTop = hoveredPoint && hoveredPoint.y < (height * 0.45);
        const tooltipLeftPct = hoveredPoint ? Math.max(8, Math.min(92, (hoveredPoint.x / width) * 100)) : 50;

        const isLabelTick = (idx) => {
          if (summaryRange === 'week') return true;
          return idx === 0 || idx === 5 || idx === 10 || idx === 15 || idx === 20 || idx === 25 || idx === totalDays - 1;
        };

        return (
          <div className="card glass" style={{ marginTop: '24px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Trend Analytics & Performance</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {summaryRange === 'month' ? '30-Day Monthly' : '7-Day Weekly'} {selectedTrendMetric === 'protein' ? 'Protein' : (selectedTrendMetric === 'water' ? 'Hydration' : 'Calorie')} Compliance
                </span>
              </div>

              {/* Metric & Range Toggles */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-secondary)', padding: '3px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                  <button
                    className={`btn-secondary ${selectedTrendMetric === 'calories' ? 'active' : ''}`}
                    onClick={() => { setSelectedTrendMetric('calories'); setHoveredPoint(null); }}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: 0, borderRadius: '12px', ...(selectedTrendMetric === 'calories' ? { background: 'var(--accent-1)', color: '#fff' } : {}) }}
                  >
                    🔥 Calories
                  </button>
                  <button
                    className={`btn-secondary ${selectedTrendMetric === 'protein' ? 'active' : ''}`}
                    onClick={() => { setSelectedTrendMetric('protein'); setHoveredPoint(null); }}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: 0, borderRadius: '12px', ...(selectedTrendMetric === 'protein' ? { background: 'var(--accent-1)', color: '#fff' } : {}) }}
                  >
                    🥩 Protein
                  </button>
                  <button
                    className={`btn-secondary ${selectedTrendMetric === 'water' ? 'active' : ''}`}
                    onClick={() => { setSelectedTrendMetric('water'); setHoveredPoint(null); }}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: 0, borderRadius: '12px', ...(selectedTrendMetric === 'water' ? { background: 'var(--accent-1)', color: '#fff' } : {}) }}
                  >
                    💧 Water
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    className={`btn-secondary ${summaryRange === 'week' ? 'active' : ''}`}
                    onClick={() => { setSummaryRange('week'); setHoveredPoint(null); }}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: 0, borderRadius: '12px', ...(summaryRange === 'week' ? { background: 'var(--accent-1)', color: '#fff', fontWeight: 'bold' } : {}) }}
                  >
                    7d
                  </button>
                  <button
                    className={`btn-secondary ${summaryRange === 'month' ? 'active' : ''}`}
                    onClick={() => { setSummaryRange('month'); setHoveredPoint(null); }}
                    style={{ fontSize: '11px', padding: '4px 10px', marginTop: 0, borderRadius: '12px', ...(summaryRange === 'month' ? { background: 'var(--accent-1)', color: '#fff', fontWeight: 'bold' } : {}) }}
                  >
                    30d
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Daily Avg (Active)</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>{avgVal} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>{metricUnit}</span></div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Goal Match Rate</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>{onTrackPct}% <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({onTrackCount}/{activeCount || totalDays}d)</span></div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Peak Day</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>{peakVal} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>{metricUnit}</span></div>
              </div>
            </div>

            <div style={{ position: 'relative', width: '100%', overflow: 'visible' }}>
              <svg 
                viewBox={`0 0 ${width} ${height}`} 
                style={{ width: '100%', height: 'auto', background: 'transparent', overflow: 'visible' }}
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent-1)" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="var(--accent-1)" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="chartLineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="50%" stopColor="var(--accent-1)" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                  <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="var(--accent-1)" floodOpacity="0.3" />
                  </filter>
                </defs>

                {/* Y-Axis Horizontal Gridlines & Tick Labels */}
                {yTickValues.map((tickVal) => {
                  const tickY = height - paddingBottom - (tickVal * (height - paddingTop - paddingBottom)) / maxCal;
                  return (
                    <g key={tickVal}>
                      <line 
                        x1={paddingLeft} y1={tickY} 
                        x2={width - paddingRight} y2={tickY} 
                        stroke="var(--border-glass)" 
                        strokeWidth="0.8" 
                        strokeDasharray="3 3" 
                        opacity="0.6"
                      />
                      <text 
                        x={paddingLeft - 8} 
                        y={tickY + 3} 
                        fill="var(--text-muted)" 
                        fontSize="9px" 
                        fontWeight="600" 
                        textAnchor="end"
                      >
                        {tickVal}
                      </text>
                    </g>
                  );
                })}

                {/* Target Line */}
                <line 
                  x1={paddingLeft} y1={targetY} 
                  x2={width - paddingRight} y2={targetY} 
                  stroke="var(--accent-1)" 
                  strokeDasharray="5 4" 
                  strokeWidth="1.8" 
                />
                
                {/* Target Badge */}
                <rect 
                  x={width - paddingRight - 110} 
                  y={targetY - 14} 
                  width="110" 
                  height="16" 
                  rx="4" 
                  fill="var(--accent-1)" 
                  fillOpacity="0.15" 
                />
                <text 
                  x={width - paddingRight - 6} 
                  y={targetY - 2} 
                  fill="var(--accent-1)" 
                  fontSize="10px" 
                  fontWeight="bold" 
                  textAnchor="end"
                >
                  🎯 Target: {targetGoal} {metricUnit}
                </text>

                {/* Area Gradient Fill */}
                {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}

                {/* Chart Polyline */}
                {linePath && (
                  <path 
                    d={linePath} 
                    fill="none" 
                    stroke="url(#chartLineGrad)" 
                    strokeWidth="3.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    filter="url(#glowEffect)"
                    style={{ transition: 'all 0.3s ease' }}
                  />
                )}

                {/* Interactive Points */}
                {points.map((p) => {
                  const isHovered = hoveredPoint?.date === p.date;
                  const diff = p.value - targetGoal;
                  const isNearTarget = p.value > 0 && Math.abs(diff) <= targetGoal * 0.12;
                  const pointColor = p.value === 0 ? 'var(--text-muted)' : (isNearTarget ? '#10b981' : (diff > 0 ? '#f59e0b' : '#3b82f6'));

                  return (
                    <g key={p.date}>
                      {isHovered && (
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r="9"
                          fill={pointColor}
                          fillOpacity="0.2"
                        />
                      )}
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : (summaryRange === 'month' ? 3.5 : 4.5)}
                        fill="var(--bg-primary)"
                        stroke={pointColor}
                        strokeWidth={summaryRange === 'month' ? 2 : 3}
                        style={{ cursor: 'pointer', transition: 'r 0.15s ease, fill 0.15s ease' }}
                        onMouseEnter={() => setHoveredPoint(p)}
                        onClick={() => setSelectedDate(p.date)}
                      />
                      {(isHovered || (summaryRange === 'week' && p.value > 0)) && (
                        <g>
                          <rect 
                            x={p.x - 18} 
                            y={p.y - (p.y < paddingTop + 20 ? -22 : 18)} 
                            width="36" 
                            height="14" 
                            rx="4" 
                            fill="var(--bg-secondary)" 
                            stroke="var(--border-glass)" 
                            strokeWidth="0.8" 
                          />
                          <text
                            x={p.x}
                            y={p.y - (p.y < paddingTop + 20 ? -12 : 8)}
                            fill="var(--text-primary)"
                            fontSize="9px"
                            fontWeight="bold"
                            textAnchor="middle"
                            style={{ pointerEvents: 'none' }}
                          >
                            {Math.round(p.value)}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* X-Axis Date Labels */}
                {points.filter((_, idx) => isLabelTick(idx)).map(p => {
                  const dateObj = parseLocalDate(p.date);
                  const label = summaryRange === 'month' 
                    ? dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                    : dateObj.toLocaleDateString(undefined, { weekday: 'short' });
                  return (
                    <text 
                      key={p.date} 
                      x={p.x} 
                      y={height - 12} 
                      fill="var(--text-muted)" 
                      fontSize="10px" 
                      fontWeight="600" 
                      textAnchor="middle"
                    >
                      {label}
                    </text>
                  );
                })}
              </svg>

              {/* Dynamic Glassmorphism Tooltip */}
              {hoveredPoint && (() => {
                const diff = Math.round(hoveredPoint.value - targetGoal);
                const diffText = hoveredPoint.value === 0 
                  ? 'No intake logged'
                  : (diff > 0 ? `+${diff} ${metricUnit} over target` : `${Math.abs(diff)} ${metricUnit} remaining`);
                const diffColor = hoveredPoint.value === 0 
                  ? 'var(--text-muted)'
                  : (Math.abs(diff) <= targetGoal * 0.12 ? '#10b981' : (diff > 0 ? '#f59e0b' : '#3b82f6'));
                const pctOfTarget = Math.round((hoveredPoint.value / targetGoal) * 100);

                return (
                  <div style={{
                    position: 'absolute',
                    left: `${tooltipLeftPct}%`,
                    top: isHoveredNearTop 
                      ? `${(hoveredPoint.y / height) * 100 + 10}%`
                      : `${(hoveredPoint.y / height) * 100 - 10}%`,
                    transform: isHoveredNearTop ? 'translate(-50%, 0%)' : 'translate(-50%, -100%)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-glass)',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    pointerEvents: 'none',
                    zIndex: 10,
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(10px)',
                    transition: 'left 0.15s ease, top 0.15s ease'
                  }}>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', marginBottom: '2px' }}>{hoveredPoint.date}</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{Math.round(hoveredPoint.value)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{metricUnit} ({pctOfTarget}%)</span></div>
                    <div style={{ fontSize: '10px', color: diffColor, marginTop: '2px' }}>{diffText}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

      {/* ── Multi-Modal Smart Food Logger Modal ── */}
      {showLogModal && (
        <div className="modal-backdrop-blur" onClick={() => setShowLogModal(false)}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✨ Log Food & Nutrition
              </h3>
              <button
                className="btn-secondary"
                onClick={() => setShowLogModal(false)}
                style={{ padding: '4px 8px', fontSize: '14px', marginTop: 0 }}
              >
                ✕
              </button>
            </div>

            {/* Mode Tabs */}
            <div className="tracker-tabs-header">
              <button
                className={`tracker-tab-btn ${logModalTab === 'ai' ? 'active' : ''}`}
                onClick={() => setLogModalTab('ai')}
              >
                🧠 Natural AI Text
              </button>
              <button
                className={`tracker-tab-btn ${logModalTab === 'search' ? 'active' : ''}`}
                onClick={() => setLogModalTab('search')}
              >
                🔍 Live Search
              </button>
              <button
                className={`tracker-tab-btn ${logModalTab === 'preset' ? 'active' : ''}`}
                onClick={() => setLogModalTab('preset')}
              >
                ⚡ Quick Presets
              </button>
              <button
                className={`tracker-tab-btn ${logModalTab === 'copy' ? 'active' : ''}`}
                onClick={() => setLogModalTab('copy')}
              >
                📋 Copy Yesterday
              </button>
            </div>

            {/* Tab 1: AI Natural Language */}
            {logModalTab === 'ai' && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Type freely. E.g., "2 scrambled eggs with 1 slice whole wheat bread and black coffee"
                </p>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
                  <textarea
                    placeholder="What did you eat?"
                    value={form.food_item}
                    onChange={(e) => setForm({ ...form, food_item: e.target.value })}
                    className="form-input"
                    style={{ flex: 1, minHeight: '70px', resize: 'vertical', fontSize: '0.95rem', padding: '12px' }}
                  />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleLookup}
                    disabled={lookupLoading || !form.food_item.trim()}
                    style={{ background: 'var(--accent-1)', padding: '0 18px', marginTop: 0, height: 'auto', alignSelf: 'stretch' }}
                  >
                    {lookupLoading ? '⏳ Analyzing...' : '🧠 Analyze'}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2: Live Database Search */}
            {logModalTab === 'search' && (
              <div style={{ marginBottom: '16px', position: 'relative' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Instant search from verified USDA & ICMR-NIN food database
                </p>
                <input
                  type="text"
                  placeholder="Search food item (e.g. chicken breast, paneer, oats, apple)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '12px 14px', fontSize: '0.95rem', marginBottom: '8px' }}
                />

                {searchSuggestions.length > 0 && (
                  <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '10px', maxHeight: '180px', overflowY: 'auto', padding: '6px' }}>
                    {searchSuggestions.map((item) => (
                      <div
                        key={item}
                        onClick={() => handleSelectSearchItem(item)}
                        style={{ padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-primary)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <span>🍽️ {item}</span>
                        <span style={{ fontSize: '11px', color: 'var(--accent-1)', fontWeight: 'bold' }}>+ Select</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Quick Presets */}
            {logModalTab === 'preset' && (
              <div style={{ marginBottom: '16px' }}>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  Click to quickly populate common staple foods
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px', maxHeight: '200px', overflowY: 'auto', padding: '4px 0' }}>
                  {COMMON_PRESETS.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      className="tracker-preset-chip"
                      onClick={() => handleSelectPreset(p)}
                    >
                      <span>{p.icon}</span>
                      <div style={{ textAlign: 'left', minWidth: 0, overflow: 'hidden' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{p.calories} kcal · {p.protein}g P</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tab 4: Copy from Yesterday */}
            {logModalTab === 'copy' && (
              <div style={{ marginBottom: '16px', background: 'var(--bg-secondary)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: '600', marginBottom: '8px' }}>
                  Duplicate meals from yesterday into today's log ({selectedDate})
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => handleCopyYesterday()}
                    style={{ fontSize: '12px', padding: '8px 16px', marginTop: 0, background: 'var(--accent-1)' }}
                  >
                    📋 Copy Entire Day
                  </button>
                  {MEAL_SLOTS.map(s => (
                    <button
                      key={s}
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleCopyYesterday(s)}
                      style={{ fontSize: '12px', padding: '8px 12px', marginTop: 0 }}
                    >
                      Copy {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Portion Adjuster Chips */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Portion Multiplier:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[0.5, 1, 1.5, 2, 3].map(mult => (
                  <button
                    key={mult}
                    type="button"
                    className="btn-secondary"
                    onClick={() => handlePortionMultiplier(mult)}
                    style={{ fontSize: '11px', padding: '3px 8px', marginTop: 0, borderRadius: '8px' }}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </div>

            {/* Nutrition Inputs Grid */}
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Food Name</label>
                  <input type="text" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.food_item} onChange={e => setForm({ ...form, food_item: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Qty & Unit</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <input type="number" className="form-input" style={{ padding: '6px 8px', fontSize: '12.5px', width: '60px' }} value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })} min="0.1" step="0.1" />
                    <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '12.5px', flex: 1 }} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calories</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.calories} onChange={e => setForm({ ...form, calories: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protein (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.protein_g} onChange={e => setForm({ ...form, protein_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carbs (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.carbs_g} onChange={e => setForm({ ...form, carbs_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fat (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.fat_g} onChange={e => setForm({ ...form, fat_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fiber (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.fiber_g} onChange={e => setForm({ ...form, fiber_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Meal Slot</label>
                  <select className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={form.meal_slot} onChange={e => setForm({ ...form, meal_slot: e.target.value })}>
                    {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ marginTop: 0, flex: 1, padding: '12px', background: 'var(--accent-1)' }}>
                  ✅ Save to {form.meal_slot}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowLogModal(false)} style={{ marginTop: 0, padding: '12px 20px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Inline Edit Food Item Modal ── */}
      {editingItem && (
        <div className="modal-backdrop-blur" onClick={() => setEditingItem(null)}>
          <div className="modal-content-glass" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800' }}>
                ✏️ Edit Food Entry
              </h3>
              <button
                className="btn-secondary"
                onClick={() => setEditingItem(null)}
                style={{ padding: '4px 8px', fontSize: '14px', marginTop: 0 }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px', marginBottom: '16px', background: 'var(--bg-secondary)', padding: '14px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Food Name</label>
                  <input type="text" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.food_item} onChange={e => setEditForm({ ...editForm, food_item: e.target.value })} required />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Quantity</label>
                  <input type="number" className="form-input" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: parseFloat(e.target.value) || 1 })} min="0.1" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Unit</label>
                  <input type="text" className="form-input" style={{ padding: '6px 8px', fontSize: '12.5px' }} value={editForm.unit} onChange={e => setEditForm({ ...editForm, unit: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calories</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.calories} onChange={e => setEditForm({ ...editForm, calories: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protein (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.protein_g} onChange={e => setEditForm({ ...editForm, protein_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carbs (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.carbs_g} onChange={e => setEditForm({ ...editForm, carbs_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fat (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.fat_g} onChange={e => setEditForm({ ...editForm, fat_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fiber (g)</label>
                  <input type="number" className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.fiber_g} onChange={e => setEditForm({ ...editForm, fiber_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
                </div>
                <div>
                  <label style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Meal Slot</label>
                  <select className="form-input" style={{ padding: '6px 10px', fontSize: '12.5px' }} value={editForm.meal_slot} onChange={e => setEditForm({ ...editForm, meal_slot: e.target.value })}>
                    {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ marginTop: 0, flex: 1, padding: '10px', background: 'var(--accent-1)' }}>
                  ✅ Update Entry
                </button>
                <button type="button" className="btn-secondary" onClick={() => setEditingItem(null)} style={{ marginTop: 0, padding: '10px 18px' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
