import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const MEAL_SLOTS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

export default function NutritionTracker() {
  const { token, userProfile } = useContext(AuthContext);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [logs, setLogs] = useState([]);
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

  const fetchLogs = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.get(`/nutrition/log?date=${selectedDate}`);
      setLogs(data);
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
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/nutrition/log/${id}`);
      fetchLogs();
      fetchSummary();
    } catch (err) {
      alert(err.message);
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
    calories: userProfile?.target_calories || 2000,
    protein_g: userProfile?.target_protein || 150,
    carbs_g: userProfile?.target_carbs || 250,
    fat_g: userProfile?.target_fat || 65,
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

      {/* ── Add Food Button & Form ── */}
      {!showAddForm ? (
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
          style={{ marginTop: 0, marginBottom: '20px', width: '100%' }}
        >
          ➕ Log Food
        </button>
      ) : (
        <div className="card glass" style={{ marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '14px' }}>Log Food Item</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="Food name (e.g., chicken breast)"
                value={form.food_item}
                onChange={(e) => setForm({ ...form, food_item: e.target.value })}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={handleLookup}
                disabled={lookupLoading || !form.food_item.trim()}
                style={{ whiteSpace: 'nowrap', marginTop: 0 }}
              >
                {lookupLoading ? '...' : '🔍 Lookup'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px', marginBottom: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Calories</label>
                <input type="number" value={form.calories} onChange={e => setForm({ ...form, calories: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Protein (g)</label>
                <input type="number" value={form.protein_g} onChange={e => setForm({ ...form, protein_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Carbs (g)</label>
                <input type="number" value={form.carbs_g} onChange={e => setForm({ ...form, carbs_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Fat (g)</label>
                <input type="number" value={form.fat_g} onChange={e => setForm({ ...form, fat_g: parseFloat(e.target.value) || 0 })} min="0" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quantity</label>
                <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: parseFloat(e.target.value) || 1 })} min="0.1" step="0.1" />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meal</label>
                <select value={form.meal_slot} onChange={e => setForm({ ...form, meal_slot: e.target.value })} style={{ width: '100%', padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(180,140,100,0.15)', background: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font)', fontSize: '15px', color: 'var(--text-primary)' }}>
                  {MEAL_SLOTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" style={{ marginTop: 0, flex: 1 }}>
                ✅ Add Entry
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowAddForm(false)} style={{ marginTop: 0 }}>
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

      {/* ── Weekly/Monthly Summary ── */}
      {summaryData.length > 0 && (
        <div className="card glass">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '16px', margin: 0 }}>History</h3>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                className={`btn-secondary ${summaryRange === 'week' ? 'active' : ''}`}
                onClick={() => setSummaryRange('week')}
                style={{ fontSize: '12px', padding: '6px 12px', marginTop: 0, ...(summaryRange === 'week' ? { background: 'rgba(224,122,95,0.1)', borderColor: 'var(--accent-1)', color: 'var(--accent-1)' } : {}) }}
              >
                7 Days
              </button>
              <button
                className={`btn-secondary ${summaryRange === 'month' ? 'active' : ''}`}
                onClick={() => setSummaryRange('month')}
                style={{ fontSize: '12px', padding: '6px 12px', marginTop: 0, ...(summaryRange === 'month' ? { background: 'rgba(224,122,95,0.1)', borderColor: 'var(--accent-1)', color: 'var(--accent-1)' } : {}) }}
              >
                30 Days
              </button>
            </div>
          </div>

          <div className="tracker-history-chart">
            {summaryData.map((day, i) => {
              const maxCal = Math.max(...summaryData.map(d => d.total_calories), targets.calories);
              const barHeight = maxCal > 0 ? (day.total_calories / maxCal) * 100 : 0;
              const isToday = day.date === new Date().toISOString().split('T')[0];
              const overTarget = day.total_calories > targets.calories;
              return (
                <div key={day.date} className="tracker-bar-col" title={`${day.date}: ${Math.round(day.total_calories)} kcal`}>
                  <div className="tracker-bar-wrapper">
                    <div
                      className="tracker-bar"
                      style={{
                        height: `${barHeight}%`,
                        background: overTarget
                          ? 'linear-gradient(to top, #ef4444, #f87171)'
                          : isToday
                            ? 'var(--gradient-primary)'
                            : 'linear-gradient(to top, var(--accent-2), #a8d5ba)',
                        animationDelay: `${i * 0.04}s`,
                      }}
                    />
                    {/* Target line */}
                    <div
                      className="tracker-target-line"
                      style={{ bottom: `${(targets.calories / maxCal) * 100}%` }}
                    />
                  </div>
                  <span className="tracker-bar-label">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'narrow' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            <span>🟢 Under target</span>
            <span>🔴 Over target</span>
            <span style={{ borderTop: '2px dashed var(--accent-1)', width: '20px', display: 'inline-block', verticalAlign: 'middle' }}></span>
            <span>Target ({targets.calories} kcal)</span>
          </div>
        </div>
      )}
    </section>
  );
}
