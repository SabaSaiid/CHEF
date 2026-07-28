import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateMacroPercentages } from '../utils/nutrition';
import useHoldToRepeat from '../hooks/useHoldToRepeat';
import { getLocalDateString, CHEF_EVENTS, dispatchChefEvent } from '../utils/dateUtils';

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
  const [showAddForm, setShowAddForm] = useState(false);
  const [lookupLoading, setLookupLoading] = useState(false);

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
    meal_slot: 'Snack',
  });

  // Summary view
  const [summaryRange, setSummaryRange] = useState('week');
  const [summaryData, setSummaryData] = useState([]);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const [coachData, setCoachData] = useState(null);
  const [loadingCoach, setLoadingCoach] = useState(false);

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
      setWaterTotal(parseInt(localStorage.getItem('chef_guest_water')) || 0);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/nutrition/log?date=${selectedDate}`);
      setLogs(data);
      
      const waterData = await api.get(`/nutrition/log/water?date=${selectedDate}`);
      setWaterTotal(waterData.total_ml || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  const fetchSummary = async () => {
    if (!token) return;
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
        calories: data.calories || 0,
        protein_g: data.protein_g || 0,
        carbs_g: data.carbs_g || 0,
        fat_g: data.fat_g || 0,
        fiber_g: data.fiber_g || 0,
      }));
    } catch {
      // keep current values
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.food_item.trim()) return;
    try {
      if (token) {
        await api.post('/nutrition/log', { ...form, date: selectedDate });
      } else {
        const stored = JSON.parse(localStorage.getItem('chef_guest_logs') || '[]');
        const newLog = { ...form, id: Date.now(), date: selectedDate };
        localStorage.setItem('chef_guest_logs', JSON.stringify([...stored, newLog]));
      }
      toast.success(`${form.food_item} logged ✓`);
      setForm({
        food_item: '',
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        quantity: 1,
        unit: 'serving',
        meal_slot: 'Snack',
      });
      setShowAddForm(false);
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
      dispatchChefEvent(CHEF_EVENTS.NUTRITION_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
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

  const handleAddWaterCustom = async (amount) => {
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
      localStorage.setItem('chef_guest_water', 0);
      setWaterTotal(0);
      dispatchChefEvent(CHEF_EVENTS.WATER_UPDATED);
      toast.success("Hydration reset!");
    }
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

  // TDEE targets from user profile
  const targets = {
    calories: activeProfile?.target_calories || 2000,
    protein_g: activeProfile?.target_protein || 125,
    carbs_g: activeProfile?.target_carbs || 240,
    fat_g: activeProfile?.target_fat || 60,
  };

  const pct = (val, target) => Math.min(Math.round((val / target) * 100), 100);

  const calculateNutritionGrade = () => {
    if (logs.length === 0) return { grade: 'N/A', label: 'No logs yet', color: 'var(--text-muted)', score: 0 };
    
    let score = 100;
    
    // 1. Calorie compliance
    const calTarget = targets.calories || 2000;
    const calDiffPct = Math.abs(totals.calories - calTarget) / calTarget;
    score -= Math.min(30, calDiffPct * 100);
    
    // 2. Protein compliance
    const protTarget = targets.protein_g || 150;
    const protDiffPct = Math.abs(totals.protein_g - protTarget) / protTarget;
    score -= Math.min(25, protDiffPct * 100);
    
    // 3. Fiber compliance
    const fiberTarget = activeProfile?.target_fiber_g || 30;
    if (totals.fiber_g < fiberTarget) {
      const fiberDiffPct = (fiberTarget - totals.fiber_g) / fiberTarget;
      score -= Math.min(15, fiberDiffPct * 15);
    }
    
    const finalScore = Math.max(0, Math.round(score));
    
    let grade = 'D';
    let color = '#ef4444';
    let label = 'Needs Balance Adjustment';
    
    if (finalScore >= 90) {
      grade = 'A';
      color = '#10b981';
      label = 'Optimal Nutrient Balance';
    } else if (finalScore >= 75) {
      grade = 'B';
      color = '#3b82f6';
      label = 'Good Nutrient Balance';
    } else if (finalScore >= 60) {
      grade = 'C';
      color = '#f59e0b';
      label = 'Moderate Balance';
    }
    
    return { grade, score: finalScore, label, color };
  };

  if (!token) {
    return (
      <section className="page active">
        <div className="page-header">
          <h1>Nutrition Tracker</h1>
          <p className="subtitle">Log your daily food intake</p>
        </div>
        <div className="empty-state">
          <span className="empty-icon">🔐</span>
          <p>Please log in to track your daily nutrition.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="page active">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Nutrition Tracker</h1>
          <p className="subtitle">Track your daily food intake and monitor your nutrition goals</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{
            padding: '8px 14px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-glass)',
            background: 'var(--glass-bg)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font)',
            fontSize: '14px',
            marginTop: '4px',
          }}
        />
      </div>

      {/* Daily Health Grade Banner */}
      {(() => {
        const health = calculateNutritionGrade();
        if (health.grade === 'N/A') return null;
        return (
          <div className="card glass" style={{ marginBottom: '20px', padding: '16px 20px', borderLeft: `4px solid ${health.color}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', margin: 0, fontWeight: 'bold', letterSpacing: '0.5px' }}>Nutrition Balance Grade</h4>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', margin: '4px 0 0' }}>{health.label}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold' }}>Score: {health.score}/100</span>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${health.color}` }}>
                <span style={{ fontSize: '20px', fontWeight: '800', color: health.color }}>{health.grade}</span>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── AI Coach Insights Card ── */}
      {coachData && coachData.insights && coachData.insights.length > 0 && (
        <div className="card glass fade-in-up" style={{ 
          marginBottom: '20px', 
          padding: '24px', 
          borderLeft: '4px solid var(--accent-1)',
          background: 'var(--bg-secondary)',
          '--delay': '50ms' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              AI Coach Insights
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
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={{ background: `${col}20`, padding: '4px 8px', borderRadius: '6px', color: col, fontWeight: '800', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    {insight.category}
                  </div>
                  <p style={{ fontSize: '14.5px', color: 'var(--text-secondary)', margin: 0, flex: 1, lineHeight: '1.5' }}>
                    {insight.message}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Daily Progress Rings ── */}
      <div className="card glass" style={{ marginBottom: '20px', padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
          <div>
            <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Daily Progress</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Nutrient Goals & Consumption Breakdown</span>
          </div>
          <span style={{ fontSize: '12px', padding: '4px 12px', background: 'var(--bg-secondary)', borderRadius: '20px', border: '1px solid var(--border-glass)', fontWeight: '600', color: 'var(--accent-1)' }}>
            📅 {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
          </span>
        </div>
        
        <div className="tracker-progress-grid">
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
            const isCriticalOverflow = rawPct >= 150;
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
                  padding: '18px 12px 16px',
                  borderRadius: '16px',
                  background: 'var(--bg-secondary)',
                  border: borderCol,
                  transition: 'all 0.25s ease',
                  cursor: 'default'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Percentage Badge */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  background: badgeBg,
                  color: badgeColor,
                  border: '1px solid var(--border-glass)'
                }}>
                  {rawPct}% {isCriticalOverflow ? '🚨' : ''}
                </div>


                <div className="tracker-ring" style={{ width: '84px', height: '84px', margin: '8px auto 12px' }}>
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
                    <span className="tracker-ring-value" style={{ fontSize: '15px', fontWeight: 'bold' }}>{Math.round(value)}</span>
                    <span className="tracker-ring-unit" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{unit}</span>
                  </div>
                </div>

                <div className="tracker-ring-label" style={{ fontWeight: '700', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <span>{icon}</span> {label}
                </div>
                <div className="tracker-ring-target" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  of {target} {unit}
                </div>

                {/* Remaining / Exceeded status footnote */}
                <div style={{
                  fontSize: '10px',
                  marginTop: '6px',
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

      {/* ── Macro Distribution & Hydration ── */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {(totals.protein_g > 0 || totals.carbs_g > 0 || totals.fat_g > 0) && (
          <div className="card glass" style={{ flex: '1', minWidth: '300px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>Macro Distribution</h3>
            <MacroDonut protein={totals.protein_g} carbs={totals.carbs_g} fat={totals.fat_g} />
          </div>
        )}
        
        <div className="card glass water-widget" style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '20px' }}>
          {(() => {
            const targetWater = activeProfile?.target_water_ml || 2500;
            const pctWater = Math.min(100, Math.round((waterTotal / targetWater) * 100));
            const isGoalReached = waterTotal >= targetWater;

            return (
              <div style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: '800' }}>💧 Hydration</h3>
                  {isGoalReached && (
                    <span className="water-goal-badge">🎉 Goal Met!</span>
                  )}
                </div>

                <p style={{ margin: '2px 0 10px', fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                  {waterTotal} ml / {targetWater} ml <span style={{ color: isGoalReached ? '#10b981' : '#38bdf8', fontWeight: '700', marginLeft: '6px' }}>({pctWater}%)</span>
                </p>

                {/* Progress bar background */}
                <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '16px' }}>
                  <div style={{ width: `${pctWater}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #0284c7)', transition: 'width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', borderRadius: '3px' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '15px' }}>
                  <div style={{ flex: 1 }}>
                    <div className="water-controls" style={{ marginTop: 0 }}>
                      <HoldableWaterBtn className="water-btn primary-btn" amount={250} onAdd={handleAddWaterCustom} label="💧 +250ml" title="Hold to add water" />
                      <HoldableWaterBtn className="water-btn" amount={500} onAdd={handleAddWaterCustom} label="🌊 +500ml" title="Hold to add 500ml" />
                      <HoldableWaterBtn className="water-btn danger-btn" amount={-250} onAdd={handleAddWaterCustom} disabled={waterTotal <= 0} label="➖ -250ml" title="Hold to remove water" />
                      <button className="water-btn" onClick={handleResetWater} title="Reset hydration tracker">
                        🔄 Reset
                      </button>
                    </div>

                  </div>

                  {/* The Fluid Glass Tumbler */}
                  <div className="water-display" style={{ margin: 0, width: '70px', height: '90px', borderRadius: '4px 4px 24px 24px' }}>
                    <div
                      className="water-level"
                      style={{ height: `${pctWater}%` }}
                    >
                      <div className="water-wave" />
                      <div className="water-bubble" />
                      <div className="water-bubble" />
                    </div>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 6 }}>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: pctWater > 45 ? '#ffffff' : 'var(--text-primary)', textShadow: pctWater > 45 ? '0 1px 3px rgba(0,0,0,0.5)' : 'none' }}>
                        {pctWater}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Smart Add Food Form ── */}
      {!showAddForm ? (
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: 0, marginBottom: '24px', width: '100%', padding: '16px', fontSize: '1.1rem', background: 'var(--primary)', boxShadow: '0 4px 16px rgba(var(--primary-rgb), 0.25)' }}
        >
          ✨ Log Meal with AI
        </button>
      ) : (
        <div className="card glass" style={{ marginBottom: '24px', border: '2px solid var(--primary)', animation: 'fadeInUp 0.3s ease' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            ✨ Smart AI Logging
          </h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '20px' }}>Type naturally. E.g., "I had 2 scrambled eggs and a slice of avocado toast"</p>
          
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
              <textarea
                placeholder="What did you eat?"
                value={form.food_item}
                onChange={(e) => setForm({ ...form, food_item: e.target.value })}
                className="form-input"
                style={{ flex: 1, minHeight: '80px', resize: 'vertical', fontSize: '1rem', padding: '16px' }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={handleLookup}
                disabled={lookupLoading || !form.food_item.trim()}
                style={{ whiteSpace: 'nowrap', marginTop: 0, height: 'auto', background: 'var(--text-primary)', padding: '0 24px', alignSelf: 'stretch' }}
              >
                {lookupLoading ? '⏳ Analyzing...' : '🧠 Analyze'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px', background: 'rgba(255,255,255,0.4)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
              <div><label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Calories</label><input type="number" className="form-input" style={{ padding: '8px 12px' }} value={form.calories} onChange={e => setForm({ ...form, calories: parseFloat(e.target.value) || 0 })} min="0" step="0.1" /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Protein (g)</label><input type="number" className="form-input" style={{ padding: '8px 12px' }} value={form.protein_g} onChange={e => setForm({ ...form, protein_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Carbs (g)</label><input type="number" className="form-input" style={{ padding: '8px 12px' }} value={form.carbs_g} onChange={e => setForm({ ...form, carbs_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fat (g)</label><input type="number" className="form-input" style={{ padding: '8px 12px' }} value={form.fat_g} onChange={e => setForm({ ...form, fat_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" /></div>
              <div><label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Fiber (g)</label><input type="number" className="form-input" style={{ padding: '8px 12px' }} value={form.fiber_g} onChange={e => setForm({ ...form, fiber_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" /></div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Meal Slot</label>
                <select className="form-input" style={{ padding: '8px 12px' }} value={form.meal_slot} onChange={e => setForm({ ...form, meal_slot: e.target.value })}>
                  {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn-primary" style={{ marginTop: 0, flex: 1, padding: '12px' }}>
                ✅ Save Entry
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)} style={{ marginTop: 0, padding: '12px 24px' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Daily Log by Meal Slot ── */}
      {error && <div style={{ color: 'red', marginBottom: '16px' }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', margin: '20px 0' }}>Loading...</div>}

      {!loading && logs.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>No food logged for {selectedDate === new Date().toISOString().split('T')[0] ? 'today' : selectedDate}. Start by adding a food item!</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div style={{ marginBottom: '24px' }}>
          {MEAL_SLOTS.map(slot => {
            const slotLogs = logs.filter(l => l.meal_slot === slot);
            if (slotLogs.length === 0) return null;
            const slotEmoji = { Breakfast: '🌅', Lunch: '☀️', Dinner: '🌙', Snack: '🍿' }[slot];
            return (
              <div key={slot} className="card glass" style={{ marginBottom: '12px', padding: '16px 20px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{slotEmoji}</span> {slot}
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)', fontWeight: 400, fontFamily: 'var(--font)' }}>
                    {Math.round(slotLogs.reduce((s, l) => s + l.calories, 0))} kcal
                  </span>
                </h4>
                {slotLogs.map(log => (
                  <div key={log.id} className="tracker-log-item">
                    <div className="tracker-log-info">
                      <span className="tracker-log-name">{log.food_item}</span>
                      <span className="tracker-log-meta">
                        {log.quantity} {log.unit} · {log.calories} kcal · P:{log.protein_g}g · C:{log.carbs_g}g · F:{log.fat_g}g
                      </span>
                    </div>
                    <button className="tracker-log-delete" onClick={() => handleDelete(log.id)} title="Delete">✕</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Trend Analytics Overhaul (SVG Line Chart) ── */}
      {(() => {
        if (!token || summaryData.length === 0) return null;

        const width = 640;
        const height = 250;
        const paddingLeft = 55;
        const paddingRight = 30;
        const paddingTop = 45;
        const paddingBottom = 40;

        const totalDays = summaryData.length;
        const activeDays = summaryData.filter(d => (d.total_calories || 0) > 0);
        const activeCount = activeDays.length;

        const rawMax = Math.max(...summaryData.map(d => d.total_calories || 0), targets.calories || 0);
        const maxCal = Math.max(Math.ceil((rawMax * 1.25) / 500) * 500, 1000);

        const avgCals = activeCount > 0 
          ? Math.round(activeDays.reduce((acc, curr) => acc + (curr.total_calories || 0), 0) / activeCount) 
          : 0;
        const peakCals = Math.round(Math.max(0, ...summaryData.map(d => d.total_calories || 0)));
        const targetGoal = targets.calories || 2000;
        const onTrackCount = summaryData.filter(d => (d.total_calories || 0) >= targetGoal * 0.85 && (d.total_calories || 0) <= targetGoal * 1.15).length;
        const onTrackPct = activeCount > 0 ? Math.round((onTrackCount / activeCount) * 100) : 0;

        const points = summaryData.map((d, index) => {
          const x = paddingLeft + (index * (width - paddingLeft - paddingRight)) / (totalDays - 1 || 1);
          const y = height - paddingBottom - ((d.total_calories || 0) * (height - paddingTop - paddingBottom)) / maxCal;
          return { x, y, date: d.date, calories: d.total_calories || 0, hasData: d.hasData };
        });

        const targetY = height - paddingBottom - (targetGoal * (height - paddingTop - paddingBottom)) / maxCal;
        const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        
        const areaPath = points.length > 0 
          ? `${linePath} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z` 
          : '';

        const yTickValues = [0, Math.round(maxCal * 0.33 / 100) * 100, Math.round(maxCal * 0.66 / 100) * 100, maxCal];

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
                <h3 style={{ fontSize: '18px', margin: 0, fontWeight: '700' }}>Trend Analytics</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {summaryRange === 'month' ? '30-Day Monthly Calorie Intake' : '7-Day Calorie Intake'} & Goal Compliance
                </span>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className={`btn-secondary ${summaryRange === 'week' ? 'active' : ''}`}
                  onClick={() => { setSummaryRange('week'); setHoveredPoint(null); }}
                  style={{ fontSize: '12px', padding: '6px 14px', marginTop: 0, borderRadius: '20px', ...(summaryRange === 'week' ? { background: 'var(--accent-1)', color: '#fff', fontWeight: 'bold' } : {}) }}
                >
                  7 Days
                </button>
                <button
                  className={`btn-secondary ${summaryRange === 'month' ? 'active' : ''}`}
                  onClick={() => { setSummaryRange('month'); setHoveredPoint(null); }}
                  style={{ fontSize: '12px', padding: '6px 14px', marginTop: 0, borderRadius: '20px', ...(summaryRange === 'month' ? { background: 'var(--accent-1)', color: '#fff', fontWeight: 'bold' } : {}) }}
                >
                  30 Days
                </button>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Daily Avg (Active)</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '2px' }}>{avgCals} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>kcal</span></div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Goal Match</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#10b981', marginTop: '2px' }}>{onTrackPct}% <span style={{ fontSize: '11px', fontWeight: 'normal', color: 'var(--text-muted)' }}>({onTrackCount}/{activeCount || totalDays}d)</span></div>
              </div>
              <div style={{ flex: 1, minWidth: '120px', background: 'var(--bg-secondary)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
                <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>Peak Intake</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#f59e0b', marginTop: '2px' }}>{peakCals} <span style={{ fontSize: '11px', fontWeight: 'normal' }}>kcal</span></div>
              </div>
            </div>

            {activeCount === 0 && (
              <div style={{ textAlign: 'center', padding: '8px', marginBottom: '12px', fontSize: '12px', color: 'var(--text-muted)', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
                ℹ️ No logged meals found for this {summaryRange === 'month' ? '30-day window' : '7-day window'}. Log your meals to track your daily progress!
              </div>
            )}

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

                {/* Target Calorie Line */}
                <line 
                  x1={paddingLeft} y1={targetY} 
                  x2={width - paddingRight} y2={targetY} 
                  stroke="var(--accent-1)" 
                  strokeDasharray="5 4" 
                  strokeWidth="1.8" 
                />
                
                {/* Target Badge */}
                <rect 
                  x={width - paddingRight - 105} 
                  y={targetY - 14} 
                  width="105" 
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
                  🎯 Target: {targetGoal} kcal
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
                  const diff = p.calories - targetGoal;
                  const isNearTarget = p.calories > 0 && Math.abs(diff) <= targetGoal * 0.12;
                  const pointColor = p.calories === 0 ? 'var(--text-muted)' : (isNearTarget ? '#10b981' : (diff > 0 ? '#f59e0b' : '#3b82f6'));

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
                      {/* Point-wise kcal text label */}
                      {(isHovered || (summaryRange === 'week' && p.calories > 0)) && (
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
                            {Math.round(p.calories)}
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
                const diff = Math.round(hoveredPoint.calories - targetGoal);
                const diffText = hoveredPoint.calories === 0 
                  ? 'No intake logged'
                  : (diff > 0 ? `+${diff} kcal over target` : `${Math.abs(diff)} kcal remaining`);
                const diffColor = hoveredPoint.calories === 0 
                  ? 'var(--text-muted)'
                  : (Math.abs(diff) <= targetGoal * 0.12 ? '#10b981' : (diff > 0 ? '#f59e0b' : '#3b82f6'));
                const pctOfTarget = Math.round((hoveredPoint.calories / targetGoal) * 100);

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
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{Math.round(hoveredPoint.calories)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>kcal ({pctOfTarget}%)</span></div>
                    <div style={{ fontSize: '10px', color: diffColor, marginTop: '2px' }}>{diffText}</div>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
