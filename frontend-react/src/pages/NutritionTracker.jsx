import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

/* ── Macro Donut Chart (Pure SVG) ───────────────────────────── */
function MacroDonut({ protein, carbs, fat }) {
  const proteinCal = protein * 4;
  const carbsCal = carbs * 4;
  const fatCal = fat * 9;
  const total = proteinCal + carbsCal + fatCal;

  if (total === 0) return null;

  const proteinPct = Math.round((proteinCal / total) * 100);
  const carbsPct = Math.round((carbsCal / total) * 100);
  const fatPct = 100 - proteinPct - carbsPct;

  const radius = 45;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { label: 'Protein', value: protein, pct: proteinPct, color: '#81b29a', cal: proteinCal },
    { label: 'Carbs', value: carbs, pct: carbsPct, color: '#f2cc8f', cal: carbsCal },
    { label: 'Fat', value: fat, pct: fatPct, color: '#e07a5f', cal: fatCal },
  ];

  let offset = 0;

  return (
    <div className="macro-donut-card">
      <div className="macro-donut-svg-wrap">
        <svg className="macro-donut-svg" viewBox="0 0 120 120">
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
                stroke={seg.color}
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
            <span>{seg.label}</span>
            <span className="macro-legend-value">{Math.round(seg.value)}g</span>
            <span className="macro-legend-pct">{seg.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function NutritionTracker() {
  const { token, activeProfile } = useContext(AuthContext);
  const toast = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
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

  const fetchSummary = async () => {
    if (!token) return;
    const end = new Date(selectedDate);
    const start = new Date(selectedDate);
    if (summaryRange === 'week') {
      start.setDate(start.getDate() - 6);
    } else {
      start.setDate(start.getDate() - 29);
    }
    try {
      const data = await api.get(`/nutrition/log/summary?start_date=${start.toISOString().split('T')[0]}&end_date=${end.toISOString().split('T')[0]}`);
      setSummaryData(data);
    } catch {
      // silently ignore summary errors
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
      await api.post('/nutrition/log', { ...form, date: selectedDate });
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
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/nutrition/log/${id}`);
      toast.success('Entry removed');
      fetchLogs();
      fetchSummary();
      fetchCoachInsights();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddWater = async () => {
    if (token) {
      try {
        await api.post('/nutrition/log/water', { amount_ml: 250, date: selectedDate });
        fetchLogs();
        fetchSummary();
        fetchCoachInsights();
        toast.success("💧 Hydration logged!");
      } catch (err) {
        toast.error(err.message);
      }
    } else {
      const newTotal = (parseInt(localStorage.getItem('chef_guest_water')) || 0) + 250;
      localStorage.setItem('chef_guest_water', newTotal);
      setWaterTotal(newTotal);
      toast.success("Logged 250ml water (demo mode) 💧");
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
    protein_g: activeProfile?.target_protein || 150,
    carbs_g: activeProfile?.target_carbs || 250,
    fat_g: activeProfile?.target_fat || 65,
  };

  const pct = (val, target) => Math.min(Math.round((val / target) * 100), 100);

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

      {/* ── AI Coach Insights Card ── */}
      {coachData && coachData.insights && coachData.insights.length > 0 && (
        <div className="card glass fade-in-up" style={{ 
          marginBottom: '20px', 
          padding: '24px', 
          borderLeft: '4px solid transparent',
          borderImage: 'linear-gradient(to bottom, var(--accent-1), var(--accent-2)) 1',
          background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0) 100%)',
          '--delay': '50ms' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: '1.5rem', filter: 'drop-shadow(0 0 8px rgba(var(--primary-rgb), 0.4))' }}>💡</span>
              <span style={{ position: 'absolute', top: '-2px', right: '-2px', width: '8px', height: '8px', background: 'var(--accent-1)', borderRadius: '50%', boxShadow: '0 0 10px var(--accent-1)', animation: 'pulse 2s infinite' }}></span>
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', background: 'linear-gradient(90deg, var(--text-primary), var(--accent-2))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
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
      <div className="card glass" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', margin: 0 }}>Daily Progress</h3>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : selectedDate}
          </span>
        </div>
        <div className="tracker-progress-grid">
          {[
            { label: 'Calories', value: totals.calories, target: targets.calories, unit: 'kcal', color: '#e07a5f' },
            { label: 'Protein', value: totals.protein_g, target: targets.protein_g, unit: 'g', color: '#81b29a' },
            { label: 'Carbs', value: totals.carbs_g, target: targets.carbs_g, unit: 'g', color: '#f2cc8f' },
            { label: 'Fat', value: totals.fat_g, target: targets.fat_g, unit: 'g', color: '#e07a5f' },
            { label: 'Fiber', value: totals.fiber_g, target: (activeProfile?.target_fiber_g || 30), unit: 'g', color: '#3b82f6' },
          ].map(({ label, value, target, unit, color }) => (
            <div key={label} className="tracker-ring-card">
              <div className="tracker-ring" style={{ '--ring-pct': pct(value, target), '--ring-color': color }}>
                <svg viewBox="0 0 36 36" className="tracker-ring-svg">
                  <path
                    className="tracker-ring-bg"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="tracker-ring-fill"
                    strokeDasharray={`${pct(value, target)}, 100`}
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    style={{ stroke: color }}
                  />
                </svg>
                <div className="tracker-ring-text">
                  <span className="tracker-ring-value">{Math.round(value)}</span>
                  <span className="tracker-ring-unit">{unit}</span>
                </div>
              </div>
              <div className="tracker-ring-label">{label}</div>
              <div className="tracker-ring-target">of {target}{unit}</div>
            </div>
          ))}
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
        
        <div className="card glass" style={{ flex: '1', minWidth: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h3 style={{ margin: 0, color: '#0369a1', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>💧 Hydration</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#0ea5e9', fontWeight: '500' }}>
                {waterTotal} ml / {activeProfile?.target_water_ml || 2500} ml ({Math.round(waterTotal / 250)} glasses)
              </p>
            </div>
            <button className="btn-primary" style={{ background: '#38bdf8', color: 'white', padding: '12px 20px', margin: 0, boxShadow: '0 4px 12px rgba(56, 189, 248, 0.3)' }} onClick={handleAddWater}>+1 Glass</button>
          </div>
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

      {/* ── 30-Day Consistency Heatmap ── */}
      {summaryData.length > 0 && (
        <div className="card glass" style={{ marginTop: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '18px', margin: 0 }}>30-Day Consistency</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`btn-secondary ${summaryRange === 'week' ? 'active' : ''}`}
                onClick={() => setSummaryRange('week')}
                style={{ fontSize: '12px', padding: '6px 12px', marginTop: 0, ...(summaryRange === 'week' ? { background: 'rgba(var(--primary-rgb),0.1)', borderColor: 'var(--primary)', color: 'var(--primary)' } : {}) }}
              >
                7 Days
              </button>
              <button
                className={`btn-secondary ${summaryRange === 'month' ? 'active' : ''}`}
                onClick={() => setSummaryRange('month')}
                style={{ fontSize: '12px', padding: '6px 12px', marginTop: 0, ...(summaryRange === 'month' ? { background: 'rgba(var(--primary-rgb),0.1)', borderColor: 'var(--primary)', color: 'var(--primary)' } : {}) }}
              >
                30 Days
              </button>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: `repeat(${summaryRange === 'month' ? 10 : 7}, 1fr)`, 
            gap: '8px',
            animation: 'fadeInUp 0.4s ease forwards' 
          }}>
            {summaryData.map(day => {
              const dateObj = new Date(day.date + 'T12:00:00'); // avoid timezone offset issues
              const calPct = pct(day.total_calories, targets.calories);
              let color = 'var(--bg-secondary)'; // empty/low
              let title = `${day.date}: ${Math.round(day.total_calories)} kcal`;
              let textColor = 'var(--text-muted)';
              
              if (calPct > 0) {
                color = 'rgba(129, 178, 154, 0.2)'; // slight
              }
              if (calPct > 50) {
                color = 'rgba(129, 178, 154, 0.5)'; // half
              }
              if (calPct >= 90 && calPct <= 110) {
                color = '#81b29a'; // perfect
                textColor = 'white';
              }
              if (calPct > 110) {
                color = 'rgba(224, 122, 95, 0.8)'; // over
                textColor = 'white';
              }
              
              return (
                <div 
                  key={day.date} 
                  title={title}
                  style={{ 
                    aspectRatio: '1', 
                    background: color, 
                    borderRadius: '8px', 
                    border: '1px solid rgba(0,0,0,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: summaryRange === 'month' ? '0.75rem' : '0.9rem',
                    fontWeight: '600',
                    color: textColor,
                    cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}
                  onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                  onClick={() => setSelectedDate(day.date)}
                >
                  {dateObj.getDate()}
                </div>
              );
            })}
          </div>
          
          <div style={{ display: 'flex', gap: '16px', marginTop: '20px', fontSize: '0.8rem', color: 'var(--text-muted)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: 'var(--bg-secondary)', borderRadius: '4px' }}/> No Data</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: 'rgba(129, 178, 154, 0.5)', borderRadius: '4px' }}/> Logged</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: '#81b29a', borderRadius: '4px' }}/> Perfect (±10%)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '14px', height: '14px', background: 'rgba(224, 122, 95, 0.8)', borderRadius: '4px' }}/> Over</div>
          </div>
        </div>
      )}
    </section>
  );
}
