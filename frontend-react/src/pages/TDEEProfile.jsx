import React, { useState, useEffect, useContext, useMemo } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { calculateMacroPercentages } from '../utils/nutrition';
import { CHEF_EVENTS, dispatchChefEvent, getLocalDateString } from '../utils/dateUtils';
import {
  kgToLbs,
  lbsToKg,
  cmToFtIn,
  ftInToCm,
  MACRO_PRESETS,
  CLINICAL_INSIGHTS,
  computeLiveTDEE,
  calculateGoalTimeline,
} from '../utils/profileUtils';
import {
  Target,
  Salad,
  Scale,
  Award,
  HeartPulse,
  Sparkles,
  Plus,
  Trash2,
  Printer,
  Download,
  Info,
  Flame,
  Droplets,
  Calendar,
  UserCheck,
  Dumbbell,
  Copy,
  ChevronDown,
  ChevronUp,
  X,
  TrendingDown,
  Sliders,
  Edit3,
  User,
  Activity,
  Layers,
} from 'lucide-react';

const DIET_OPTIONS = [
  { value: 'non-vegetarian', label: 'Non-Veg', icon: '🍗' },
  { value: 'vegetarian',     label: 'Vegetarian', icon: '🥦' },
  { value: 'vegan',          label: 'Vegan', icon: '🌱' },
  { value: 'pescatarian',    label: 'Pescatarian', icon: '🐟' },
  { value: 'keto',           label: 'Keto', icon: '🥑' },
  { value: 'gluten-free',    label: 'Gluten-Free', icon: '🌾' },
];

const HEALTH_CONDITIONS = [
  { value: 'diabetes', label: 'Diabetes (Type 2)', icon: '🩸' },
  { value: 'hypertension', label: 'High BP', icon: '❤️‍🔥' },
  { value: 'hypotension', label: 'Low BP', icon: '💙' },
  { value: 'high_cholesterol', label: 'High Cholesterol', icon: '🫀' },
  { value: 'pcos', label: 'PCOS', icon: '🔬' },
  { value: 'kidney_disease', label: 'Kidney Disease', icon: '🫘' },
  { value: 'thyroid', label: 'Thyroid', icon: '🦋' },
  { value: 'anemia', label: 'Anemia', icon: '🩺' },
];

const TASTE_PREFERENCES = [
  { value: 'spicy', label: 'Spicy 🌶️' },
  { value: 'mild', label: 'Mild 🌿' },
  { value: 'sweet', label: 'Sweet 🍯' },
  { value: 'savory', label: 'Savory 🧄' },
  { value: 'tangy', label: 'Tangy 🍋' },
  { value: 'smoky', label: 'Smoky 🔥' },
];

const COMMON_ALLERGENS = ['Peanut', 'Gluten', 'Dairy', 'Soy', 'Egg', 'Shellfish', 'Fish', 'Tree Nuts'];

const EMPTY_FORM = {
  profile_name: 'My Profile',
  display_name: '',
  diet_type: 'non-vegetarian',
  allergens: '',
  health_conditions: '',
  taste_preferences: '',
  age: '28',
  gender: 'male',
  weight_kg: '75',
  goal_weight_kg: '70',
  height_cm: '175',
  activity_level: 'moderately_active',
  goal: 'lose',
  goal_intensity: 'moderate',
  body_fat_percent: '',
};

export default function TDEEProfile() {
  const { token, username, userProfile, activeProfile, refreshActiveProfile } = useContext(AuthContext);
  const toast = useToast();

  // ── Navigation State ──────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('overview'); // overview | biometrics | diets | weight | hub
  const [unitSystem, setUnitSystem] = useState('metric'); // metric (kg, cm) | imperial (lbs, ft/in)

  // ── Multi-profile State ───────────────────────────────────────
  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });

  // ── Imperial Display State ────────────────────────────────────
  const [imperialHeight, setImperialHeight] = useState({ feet: '5', inches: '9' });
  const [imperialWeight, setImperialWeight] = useState('165');
  const [imperialGoalWeight, setImperialGoalWeight] = useState('154');

  // ── Macro Customization State ─────────────────────────────────
  const [macroPreset, setMacroPreset] = useState('high_protein');
  const [customMacro, setCustomMacro] = useState({ proteinPct: 40, carbsPct: 35, fatPct: 25 });

  // ── Weight History & Adaptive State ───────────────────────────
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightSummary, setWeightSummary] = useState(null);
  const [adaptiveStatus, setAdaptiveStatus] = useState(null);
  const [weightInput, setWeightInput] = useState('');
  const [weightDateInput, setWeightDateInput] = useState(getLocalDateString());
  const [weightFilterRange, setWeightFilterRange] = useState('all'); // 7 | 14 | 30 | all
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // ── Custom Allergen Input ─────────────────────────────────────
  const [customAllergenInput, setCustomAllergenInput] = useState('');

  // ── Async Action Loading States ───────────────────────────────
  const [loading, setLoading] = useState(false);
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);
  const [dietPlanLoading, setDietPlanLoading] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // ── Saved Results State ───────────────────────────────────────
  const [savedResults, setSavedResults] = useState(null);

  // ── Load User Profiles & Telemetry ────────────────────────────
  const loadProfiles = async () => {
    if (!token) return;
    try {
      const data = await api.get('/profiles/');
      setProfiles(data);
      const active = data.find(p => p.is_active);
      if (active) {
        setSelectedId(active.id);
        populateForm(active);
        setShowNewForm(false);
      } else if (data.length === 0) {
        setShowNewForm(true);
      }
    } catch { /* non-fatal */ }
  };

  const loadWeightData = async () => {
    if (!token) return;
    try {
      const [logs, summary, status] = await Promise.allSettled([
        api.get('/weight/logs?limit=60'),
        api.get('/weight/summary'),
        api.get('/tdee/adaptive/status'),
      ]);
      if (logs.status === 'fulfilled') setWeightLogs(logs.value);
      if (summary.status === 'fulfilled') setWeightSummary(summary.value);
      if (status.status === 'fulfilled') setAdaptiveStatus(status.value);
    } catch { /* non-fatal */ }
  };

  useEffect(() => {
    loadProfiles();
    loadWeightData();
  }, [token]);

  // Sync imperial fields when form data changes
  const syncImperialFromMetric = (wtKg, htCm, goalKg) => {
    if (wtKg) setImperialWeight(kgToLbs(wtKg));
    if (htCm) setImperialHeight(cmToFtIn(htCm));
    if (goalKg) setImperialGoalWeight(kgToLbs(goalKg));
  };

  const populateForm = (profile) => {
    const newForm = {
      profile_name:      profile.profile_name || 'My Profile',
      display_name:      profile.display_name || username || '',
      diet_type:         profile.diet_type || 'non-vegetarian',
      allergens:         profile.allergens || '',
      health_conditions: profile.health_conditions || '',
      taste_preferences: profile.taste_preferences || '',
      age:               profile.age ? profile.age.toString() : '28',
      gender:            profile.gender || 'male',
      weight_kg:         profile.weight_kg ? profile.weight_kg.toString() : '75',
      goal_weight_kg:    profile.goal_weight_kg ? profile.goal_weight_kg.toString() : '70',
      height_cm:         profile.height_cm ? profile.height_cm.toString() : '175',
      activity_level:    profile.activity_level || 'moderately_active',
      goal:              profile.goal || 'lose',
      goal_intensity:    profile.goal_intensity || 'moderate',
      body_fat_percent:  profile.body_fat_percent ? profile.body_fat_percent.toString() : '',
    };
    setFormData(newForm);
    syncImperialFromMetric(newForm.weight_kg, newForm.height_cm, newForm.goal_weight_kg);

    if (profile.target_calories) {
      setSavedResults({
        target_calories: profile.target_calories,
        target_protein:  profile.target_protein || 0,
        target_carbs:    profile.target_carbs || 0,
        target_fat:      profile.target_fat || 0,
        bmr:             profile.bmr,
        tdee_maintenance: profile.tdee_maintenance,
        bmi:             profile.bmi,
        bmi_category:    profile.bmi_category,
        formula_used:    profile.formula_used || 'Mifflin-St Jeor',
        target_fiber_g:  profile.target_fiber_g,
        target_water_ml: profile.target_water_ml,
        protein_pct:     profile.protein_pct || 30,
        carbs_pct:       profile.carbs_pct || 45,
        fat_pct:         profile.fat_pct || 25,
      });
    }
  };

  // ── Form Handlers ─────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      if (name === 'weight_kg' || name === 'height_cm' || name === 'goal_weight_kg') {
        syncImperialFromMetric(next.weight_kg, next.height_cm, next.goal_weight_kg);
      }
      return next;
    });
  };

  const handleImperialWeightChange = (e) => {
    const lbs = e.target.value;
    setImperialWeight(lbs);
    const kg = lbsToKg(lbs);
    setFormData(prev => ({ ...prev, weight_kg: kg ? kg.toString() : '' }));
  };

  const handleImperialGoalWeightChange = (e) => {
    const lbs = e.target.value;
    setImperialGoalWeight(lbs);
    const kg = lbsToKg(lbs);
    setFormData(prev => ({ ...prev, goal_weight_kg: kg ? kg.toString() : '' }));
  };

  const handleImperialHeightFeetChange = (e) => {
    const feet = e.target.value;
    setImperialHeight(prev => {
      const next = { ...prev, feet };
      const cm = ftInToCm(next.feet, next.inches);
      setFormData(f => ({ ...f, height_cm: cm ? cm.toString() : '' }));
      return next;
    });
  };

  const handleImperialHeightInchesChange = (e) => {
    const inches = e.target.value;
    setImperialHeight(prev => {
      const next = { ...prev, inches };
      const cm = ftInToCm(next.feet, next.inches);
      setFormData(f => ({ ...f, height_cm: cm ? cm.toString() : '' }));
      return next;
    });
  };

  const handleDiet = (val) => setFormData(prev => ({ ...prev, diet_type: val }));

  const handleAllergenToggle = (allergen) => {
    const list = formData.allergens ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : [];
    const newList = list.includes(allergen) ? list.filter(item => item !== allergen) : [...list, allergen];
    setFormData(prev => ({ ...prev, allergens: newList.join(',') }));
  };

  const handleAddCustomAllergen = (e) => {
    e.preventDefault();
    if (!customAllergenInput.trim()) return;
    const clean = customAllergenInput.trim();
    const list = formData.allergens ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (!list.includes(clean)) {
      setFormData(prev => ({ ...prev, allergens: [...list, clean].join(',') }));
      toast.success(`Added "${clean}" to allergy exclusions.`);
    }
    setCustomAllergenInput('');
  };

  const handleToggle = (field, value) => {
    const list = formData[field] ? formData[field].split(',').map(s => s.trim()).filter(Boolean) : [];
    const newList = list.includes(value) ? list.filter(item => item !== value) : [...list, value];
    setFormData(prev => ({ ...prev, [field]: newList.join(',') }));
  };

  // ── Live Calculation Compute ──────────────────────────────────
  const liveResults = useMemo(() => {
    return computeLiveTDEE(formData, macroPreset, customMacro);
  }, [formData, macroPreset, customMacro]);

  const displayedResults = liveResults || savedResults;

  // ── Goal Timeline Forecast ────────────────────────────────────
  const goalForecast = useMemo(() => {
    if (!displayedResults) return null;
    return calculateGoalTimeline(
      formData.weight_kg,
      formData.goal_weight_kg,
      displayedResults.target_calories,
      displayedResults.tdee_maintenance
    );
  }, [formData.weight_kg, formData.goal_weight_kg, displayedResults]);

  // ── Multi-profile Management ──────────────────────────────────
  const handleSelectProfile = async (profile) => {
    setSelectedId(profile.id);
    setShowNewForm(false);
    populateForm(profile);
    if (!profile.is_active) {
      try {
        await api.post(`/profiles/${profile.id}/activate`);
        await refreshActiveProfile();
        loadProfiles();
        dispatchChefEvent(CHEF_EVENTS.PROFILE_UPDATED);
        toast.success(`Switched to active profile: "${profile.profile_name}"`);
      } catch { /* non-fatal */ }
    }
  };

  const handleCloneProfile = async (e, profile) => {
    e.stopPropagation();
    try {
      const clonePayload = {
        ...profile,
        profile_name: `${profile.profile_name} (Copy)`,
      };
      delete clonePayload.id;
      delete clonePayload.user_id;
      delete clonePayload.created_at;
      delete clonePayload.updated_at;
      const created = await api.post('/profiles/', clonePayload);
      toast.success(`Cloned profile as "${created.profile_name}"`);
      loadProfiles();
    } catch (err) {
      toast.error('Failed to clone profile: ' + err.message);
    }
  };

  const handleDeleteProfile = async (e, profileId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this profile?')) return;
    try {
      await api.delete(`/profiles/${profileId}`);
      toast.success('Profile deleted.');
      setSelectedId(null);
      setSavedResults(null);
      setFormData({ ...EMPTY_FORM });
      loadProfiles();
      refreshActiveProfile();
      dispatchChefEvent(CHEF_EVENTS.PROFILE_UPDATED);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        age:              parseInt(formData.age, 10)        || null,
        weight_kg:        parseFloat(formData.weight_kg)    || null,
        height_cm:        parseFloat(formData.height_cm)    || null,
        body_fat_percent: formData.body_fat_percent ? parseFloat(formData.body_fat_percent) : null,
      };

      if (token) {
        let saved;
        if (selectedId && !showNewForm) {
          saved = await api.put(`/profiles/${selectedId}`, payload);
          toast.success('Nutrition & Health profile updated!');
        } else {
          saved = await api.post('/profiles/', payload);
          setSelectedId(saved.id);
          setShowNewForm(false);
          toast.success(`Profile "${saved.profile_name}" created & activated!`);
        }
        if (saved) populateForm(saved);
        loadProfiles();
        refreshActiveProfile();
        dispatchChefEvent(CHEF_EVENTS.PROFILE_UPDATED);
      } else {
        // Guest mode
        const data = await api.post('/tdee/calculate', payload);
        setSavedResults(data);
        localStorage.setItem('chef_guest_profile', JSON.stringify({ ...payload, results: data }));
        toast.success('Targets calculated and saved locally.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  // ── Weight Logging & Actions ──────────────────────────────────
  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!weightInput) return;
    try {
      const wtKg = unitSystem === 'metric' ? parseFloat(weightInput) : lbsToKg(weightInput);
      await api.post('/weight/log', { weight_kg: wtKg, date: weightDateInput });
      toast.success(`Weight logged for ${weightDateInput}!`);
      setWeightInput('');
      loadWeightData();
      if (weightDateInput === getLocalDateString()) {
        setFormData(prev => ({ ...prev, weight_kg: wtKg.toString() }));
        syncImperialFromMetric(wtKg.toString(), formData.height_cm, formData.goal_weight_kg);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to log weight');
    }
  };

  const handleDeleteWeightLog = async (logId) => {
    try {
      await api.delete(`/weight/logs/${logId}`);
      toast.success('Weight log deleted.');
      loadWeightData();
    } catch (err) {
      toast.error('Failed to delete log: ' + err.message);
    }
  };

  const handleAdaptiveCalculate = async () => {
    setAdaptiveLoading(true);
    try {
      const data = await api.post('/tdee/adaptive/calculate');
      toast.success(data.message || 'Adaptive TDEE calculated successfully!');
      loadProfiles();
      loadWeightData();
      refreshActiveProfile();
    } catch (err) {
      toast.error(err.detail || err.message);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const handleGenerateDietPlan = async () => {
    setDietPlanLoading(true);
    try {
      const data = await api.post('/diet-plan/generate');
      toast.success(data.message || '7-Day Meal Plan generated successfully!');
    } catch (err) {
      toast.error(err.detail || err.message);
    } finally {
      setDietPlanLoading(false);
    }
  };

  // ── Filtered Weight Logs for Chart ────────────────────────────
  const filteredWeightLogs = useMemo(() => {
    if (!weightLogs || weightLogs.length === 0) return [];
    const asc = [...weightLogs].sort((a, b) => a.date.localeCompare(b.date));
    if (weightFilterRange === '7') return asc.slice(-7);
    if (weightFilterRange === '14') return asc.slice(-14);
    if (weightFilterRange === '30') return asc.slice(-30);
    return asc;
  }, [weightLogs, weightFilterRange]);

  // ── Render SVG Weight Chart ───────────────────────────────────
  const renderWeightChart = () => {
    if (filteredWeightLogs.length === 0) {
      return (
        <div className="profile-chart-empty-state">
          <Scale size={36} className="empty-icon" style={{ opacity: 0.4 }} />
          <p style={{ fontWeight: 600, margin: '8px 0 4px 0' }}>No weight logs recorded yet</p>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Log your daily weight above to generate your metabolic trend curve.
          </span>
        </div>
      );
    }

    const width = 800;
    const height = 240;
    const padding = { top: 25, right: 30, bottom: 40, left: 50 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const values = filteredWeightLogs.map(l => (unitSystem === 'metric' ? l.weight_kg : parseFloat(kgToLbs(l.weight_kg))));
    const minVal = Math.floor(Math.min(...values) - 1);
    const maxVal = Math.ceil(Math.max(...values) + 1);
    const range = maxVal - minVal || 1;

    const points = filteredWeightLogs.map((log, i) => {
      const val = unitSystem === 'metric' ? log.weight_kg : parseFloat(kgToLbs(log.weight_kg));
      const x = padding.left + (filteredWeightLogs.length === 1 ? chartW / 2 : (i / (filteredWeightLogs.length - 1)) * chartW);
      const y = padding.top + chartH - ((val - minVal) / range) * chartH;
      return { x, y, val, date: log.date, rawKg: log.weight_kg };
    });

    const pathD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
    const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

    const movingAvgPoints = points.map((p, i) => {
      const startIdx = Math.max(0, i - 6);
      const windowPoints = points.slice(startIdx, i + 1);
      const avgY = windowPoints.reduce((sum, item) => sum + item.y, 0) / windowPoints.length;
      return { x: p.x, y: avgY };
    });
    const movingAvgD = movingAvgPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');

    return (
      <div className="profile-svg-chart-wrapper">
        <svg viewBox={`0 0 ${width} ${height}`} className="profile-weight-svg">
          <defs>
            <linearGradient id="weightAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-1)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--accent-1)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padding.top + chartH * pct;
            const gridVal = (maxVal - pct * range).toFixed(1);
            return (
              <g key={idx}>
                <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border-glass)" strokeDasharray="3 3" />
                <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                  {gridVal}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaD} fill="url(#weightAreaGrad)" />

          {/* 7-Day Moving Avg Line */}
          {filteredWeightLogs.length > 2 && (
            <path d={movingAvgD} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeDasharray="4 4" opacity="0.85" />
          )}

          {/* Main Weight Line */}
          <path d={pathD} fill="none" stroke="var(--accent-1)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} onMouseEnter={() => setHoveredPoint(p)} onMouseLeave={() => setHoveredPoint(null)} style={{ cursor: 'pointer' }}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredPoint && hoveredPoint.date === p.date ? 7 : 4.5}
                fill="var(--bg-primary)"
                stroke="var(--accent-1)"
                strokeWidth="2.5"
                className="chart-dot"
              />
              {(i === 0 || i === Math.floor(points.length / 2) || i === points.length - 1) && (
                <text x={p.x} y={height - 12} textAnchor="middle" fontSize="11" fill="var(--text-muted)">
                  {p.date.slice(5)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Hover Tooltip */}
        {hoveredPoint && (
          <div
            className="chart-hover-tooltip"
            style={{
              left: `${(hoveredPoint.x / width) * 100}%`,
              top: `${(hoveredPoint.y / height) * 100}%`,
            }}
          >
            <div style={{ fontWeight: 700 }}>{hoveredPoint.val} {unitSystem === 'metric' ? 'kg' : 'lbs'}</div>
            <div style={{ fontSize: '10px', opacity: 0.8 }}>{hoveredPoint.date}</div>
          </div>
        )}
      </div>
    );
  };

  const activeConditions = useMemo(() => {
    if (!formData.health_conditions) return [];
    return formData.health_conditions.split(',').map(s => s.trim()).filter(Boolean);
  }, [formData.health_conditions]);

  const activeProfileName = activeProfile?.profile_name || formData.profile_name || 'My Profile';
  const effectiveDisplayName = formData.display_name || username || 'Chef';
  const userInitial = effectiveDisplayName.charAt(0).toUpperCase();

  return (
    <section className="page active profile-command-center">
      
      {/* ── 1. EXECUTIVE CHEF HERO BANNER (Full-width, Synchronized) ── */}
      <div className="profile-hero-banner glass">
        <div className="hero-banner-main">
          {/* Avatar with Gradient Border */}
          <div className="hero-avatar-ring">
            <div className="hero-avatar">
              {userInitial}
            </div>
          </div>

          {/* User Details */}
          <div className="hero-user-details">
            <div className="hero-title-row">
              <h1 className="hero-display-name">{effectiveDisplayName}</h1>
              {username && <span className="hero-username-handle">@{username}</span>}
              <span className="hero-role-pill">CHEF Culinary Member</span>
            </div>

            <div className="hero-meta-badges">
              <span className="hero-active-profile-tag">
                🎯 {activeProfileName} · {displayedResults?.target_calories || 2000} kcal
              </span>
              <span className="hero-diet-tag">
                {DIET_OPTIONS.find(d => d.value === formData.diet_type)?.icon || '🥗'}{' '}
                {DIET_OPTIONS.find(d => d.value === formData.diet_type)?.label || 'Non-Veg'}
              </span>
              {displayedResults?.bmi && (
                <span className={`hero-bmi-tag ${displayedResults.bmi_category?.toLowerCase() || 'normal'}`}>
                  BMI {displayedResults.bmi} ({displayedResults.bmi_category})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Hero Actions: Unit Switcher & Prescription Export */}
        <div className="hero-banner-actions">
          <div className="unit-toggle-segmented" role="group" aria-label="Unit system selection">
            <button
              type="button"
              className={`unit-toggle-btn ${unitSystem === 'metric' ? 'active' : ''}`}
              onClick={() => setUnitSystem('metric')}
            >
              Metric (kg, cm)
            </button>
            <button
              type="button"
              className={`unit-toggle-btn ${unitSystem === 'imperial' ? 'active' : ''}`}
              onClick={() => setUnitSystem('imperial')}
            >
              Imperial (lbs, ft)
            </button>
          </div>

          <button
            type="button"
            className="profile-export-trigger-btn"
            onClick={() => setIsExportModalOpen(true)}
            title="Export or Print Nutrition Prescription Card"
          >
            <Printer size={15} />
            <span>Prescription Card</span>
          </button>
        </div>
      </div>

      {/* ── 2. STREAMLINED TAB NAVIGATION BAR ── */}
      <div className="profile-nav-tabs">
        <button
          className={`profile-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <Activity size={14} />
          <span>Overview & Targets</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'biometrics' ? 'active' : ''}`}
          onClick={() => setActiveTab('biometrics')}
        >
          <Target size={14} />
          <span>Edit Biometrics</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'diets' ? 'active' : ''}`}
          onClick={() => setActiveTab('diets')}
        >
          <Salad size={14} />
          <span>Diet & Health</span>
          {activeConditions.length > 0 && (
            <span className="profile-tab-badge">{activeConditions.length}</span>
          )}
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'weight' ? 'active' : ''}`}
          onClick={() => setActiveTab('weight')}
        >
          <Scale size={14} />
          <span>Weight & TDEE</span>
        </button>

        <button
          className={`profile-tab-btn ${activeTab === 'hub' ? 'active' : ''}`}
          onClick={() => setActiveTab('hub')}
        >
          <Award size={14} />
          <span>Profiles</span>
        </button>
      </div>

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── TAB 1: OVERVIEW & TARGETS (Full-Width, High Impact) ──── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && displayedResults && (
        <div className="profile-tab-content community-animate-card">
          
          {/* Top 4 Key Macro Target Glass Cards */}
          <div className="overview-macro-cards-grid">
            <div className="overview-macro-card calories">
              <div className="macro-card-top">
                <span className="icon">🔥</span>
                <span className="label">Daily Calorie Target</span>
              </div>
              <div className="macro-card-value">
                {displayedResults.target_calories} <span className="unit">kcal</span>
              </div>
              <div className="macro-card-subtitle">
                {displayedResults.tdee_maintenance && (
                  <span>Maintenance: {displayedResults.tdee_maintenance} kcal</span>
                )}
              </div>
            </div>

            <div className="overview-macro-card protein">
              <div className="macro-card-top">
                <span className="icon">🥩</span>
                <span className="label">Protein ({displayedResults.protein_pct}%)</span>
              </div>
              <div className="macro-card-value">
                {displayedResults.target_protein} <span className="unit">g</span>
              </div>
              <div className="macro-card-subtitle">
                <span>{displayedResults.protein_per_kg || '2.0'} g/kg body mass</span>
              </div>
            </div>

            <div className="overview-macro-card carbs">
              <div className="macro-card-top">
                <span className="icon">🌾</span>
                <span className="label">Carbohydrates ({displayedResults.carbs_pct}%)</span>
              </div>
              <div className="macro-card-value">
                {displayedResults.target_carbs} <span className="unit">g</span>
              </div>
              <div className="macro-card-subtitle">
                <span>{displayedResults.target_carbs * 4} energy kcal</span>
              </div>
            </div>

            <div className="overview-macro-card fat">
              <div className="macro-card-top">
                <span className="icon">🥑</span>
                <span className="label">Healthy Fats ({displayedResults.fat_pct}%)</span>
              </div>
              <div className="macro-card-value">
                {displayedResults.target_fat} <span className="unit">g</span>
              </div>
              <div className="macro-card-subtitle">
                <span>{displayedResults.target_fat * 9} energy kcal</span>
              </div>
            </div>
          </div>

          {/* Full-Width Stacked Macro Distribution Bar */}
          <div className="card glass" style={{ padding: '24px', marginTop: '24px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge">
                <Layers size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Macronutrient Energy Distribution</h3>
                <span className="profile-card-subtitle">
                  Balanced proportional split for optimal metabolic performance
                </span>
              </div>
            </div>

            <div className="macro-stacked-bar-wrapper">
              <div className="macro-stacked-bar">
                <div
                  className="macro-segment protein"
                  style={{ width: `${displayedResults.protein_pct}%` }}
                  title={`Protein: ${displayedResults.protein_pct}%`}
                />
                <div
                  className="macro-segment carbs"
                  style={{ width: `${displayedResults.carbs_pct}%` }}
                  title={`Carbs: ${displayedResults.carbs_pct}%`}
                />
                <div
                  className="macro-segment fat"
                  style={{ width: `${displayedResults.fat_pct}%` }}
                  title={`Fat: ${displayedResults.fat_pct}%`}
                />
              </div>
              <div className="macro-legend-row">
                <span className="macro-legend-item protein">
                  🥩 Protein: {displayedResults.protein_pct}% ({displayedResults.target_protein}g · {displayedResults.target_protein * 4} kcal)
                </span>
                <span className="macro-legend-item carbs">
                  🌾 Carbs: {displayedResults.carbs_pct}% ({displayedResults.target_carbs}g · {displayedResults.target_carbs * 4} kcal)
                </span>
                <span className="macro-legend-item fat">
                  🥑 Fat: {displayedResults.fat_pct}% ({displayedResults.target_fat}g · {displayedResults.target_fat * 9} kcal)
                </span>
              </div>
            </div>

            {/* Quick Macro Preset Switcher */}
            <div className="profile-macro-preset-section">
              <label className="profile-sub-heading">
                <Sliders size={14} /> Quick Macro Preset Selection
              </label>
              <div className="profile-preset-grid">
                {MACRO_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`profile-preset-card ${macroPreset === preset.id ? 'active' : ''}`}
                    onClick={() => {
                      setMacroPreset(preset.id);
                      toast.success(`Macro preset applied: ${preset.label}`);
                    }}
                  >
                    <div className="preset-card-top">
                      <span>{preset.icon}</span>
                      <span className="preset-card-label">{preset.label}</span>
                    </div>
                    <div className="preset-card-desc">{preset.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Diagnostic Breakdown: BMI Gauge & Fiber/Water Targets */}
          <div className="overview-diagnostics-grid" style={{ marginTop: '24px' }}>
            {/* BMI Diagnostic Card */}
            <div className="card glass" style={{ padding: '24px' }}>
              <div className="profile-card-header">
                <div className="profile-header-icon-badge scale">
                  <Scale size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">Body Mass Index (BMI)</h3>
                  <span className="profile-card-subtitle">WHO Clinical Weight Classification</span>
                </div>
              </div>

              <div className="bmi-gauge-section">
                <div className="bmi-gauge-header">
                  <span className="bmi-gauge-title">BMI Index: {displayedResults.bmi}</span>
                  <span className={`bmi-category-badge ${displayedResults.bmi_category?.toLowerCase() || 'normal'}`}>
                    {displayedResults.bmi_category || 'Normal'}
                  </span>
                </div>

                {(() => {
                  const bmi = displayedResults.bmi || 22;
                  const minBmi = 15;
                  const maxBmi = 35;
                  const posPct = Math.max(0, Math.min(100, ((bmi - minBmi) / (maxBmi - minBmi)) * 100));
                  return (
                    <div className="bmi-track-wrapper">
                      <div className="bmi-gradient-track">
                        <div
                          className="bmi-indicator-needle"
                          style={{ left: `${posPct}%` }}
                        />
                      </div>
                      <div className="bmi-track-labels">
                        <span>15 Under</span>
                        <span>18.5 Normal</span>
                        <span>25 Over</span>
                        <span>30 Obese</span>
                        <span>35+</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Fiber & Water Targets */}
            <div className="card glass" style={{ padding: '24px' }}>
              <div className="profile-card-header">
                <div className="profile-header-icon-badge salad">
                  <Salad size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">Essential Daily Targets</h3>
                  <span className="profile-card-subtitle">Fiber minimums and cellular hydration</span>
                </div>
              </div>

              <div className="profile-micronutrient-row" style={{ marginTop: '10px', borderTop: 'none', paddingTop: 0 }}>
                <div className="micronutrient-pill fiber">
                  <Salad size={22} />
                  <div>
                    <strong>{displayedResults.target_fiber_g} g</strong>
                    <span>Daily Dietary Fiber</span>
                  </div>
                </div>
                <div className="micronutrient-pill water">
                  <Droplets size={22} />
                  <div>
                    <strong>{(displayedResults.target_water_ml / 1000).toFixed(1)} Liters</strong>
                    <span>Hydration Target</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Goal Milestone Forecast Card */}
          {goalForecast && (
            <div className="goal-forecast-card glass" style={{ marginTop: '24px' }}>
              <div className="forecast-header">
                <TrendingDown size={20} style={{ color: 'var(--accent-1)' }} />
                <span className="forecast-title">Target Milestone Forecast</span>
              </div>
              <p className="forecast-body">
                To {goalForecast.isLoss ? 'lose' : 'gain'} <strong>{goalForecast.deltaKg} kg</strong> (
                {unitSystem === 'imperial' ? `${kgToLbs(goalForecast.deltaKg)} lbs` : ''}) at your current
                intensity ({goalForecast.weeklyRateKg} kg/week), you are on track to achieve your goal by:
              </p>
              <div className="forecast-date-highlight">
                <span>📅 {goalForecast.targetDateStr}</span>
                <span className="forecast-weeks-tag">~{goalForecast.weeksNeeded} Weeks</span>
              </div>
            </div>
          )}

          {/* Edit CTA Banner */}
          <div className="overview-edit-cta-banner glass" style={{ marginTop: '24px' }}>
            <div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Want to adjust your physical metrics or goals?
              </h4>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                Update weight, height, activity level, or dietary condition protocols in real-time.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary"
              onClick={() => setActiveTab('biometrics')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <Edit3 size={16} />
              <span>Edit Biometrics</span>
            </button>
          </div>

          {/* Methodology Accordion */}
          <div className="methodology-accordion" style={{ marginTop: '24px' }}>
            <button
              className="accordion-toggle"
              type="button"
              onClick={() => setAccordionOpen(o => !o)}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} /> Scientific Calculation Methodology
              </span>
              {accordionOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {accordionOpen && (
              <div className="accordion-body">
                <p><strong>Primary Formula:</strong> {displayedResults.formula_used}</p>
                <p>
                  When Body Fat % is provided, the clinical <strong>Katch-McArdle</strong> formula calculates BMR from Lean Body Mass. Otherwise, <strong>Mifflin-St Jeor (1990)</strong> is applied.
                </p>
                <p>
                  Protein distributions adhere to <strong>International Society of Sports Nutrition (ISSN)</strong> position standards (1.4–2.2 g/kg). Water requirements dynamically scale at 35 ml/kg plus metabolic activity additions.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── TAB 2: EDIT BIOMETRICS & GOALS (Spacious Setup) ──────── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'biometrics' && (
        <div className="profile-tab-content community-animate-card">
          <div className="card glass" style={{ padding: '28px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge">
                <Dumbbell size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Physical Metrics & Goals Setup</h3>
                <span className="profile-card-subtitle">
                  Configure physical parameters for {activeProfileName}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ marginTop: '16px' }}>
              {token && (
                <div className="input-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Profile Label Name</label>
                    <input
                      type="text"
                      name="profile_name"
                      value={formData.profile_name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="e.g. Cut Phase, Bulk 2026"
                      maxLength={100}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Display Name <span className="profile-label-hint">(shown across app)</span></label>
                    <input
                      type="text"
                      name="display_name"
                      value={formData.display_name}
                      onChange={handleChange}
                      className="form-input"
                      placeholder="Your name"
                      maxLength={100}
                    />
                  </div>
                </div>
              )}

              <div className="input-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Age (years)</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleChange}
                    min="15"
                    max="105"
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Biological Sex</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
              </div>

              {/* Dual Height & Weight Inputs */}
              <div className="input-row">
                {unitSystem === 'metric' ? (
                  <>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Current Weight (kg)</label>
                      <input
                        type="number"
                        name="weight_kg"
                        value={formData.weight_kg}
                        onChange={handleChange}
                        min="30"
                        max="300"
                        step="0.1"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Height (cm)</label>
                      <input
                        type="number"
                        name="height_cm"
                        value={formData.height_cm}
                        onChange={handleChange}
                        min="100"
                        max="250"
                        className="form-input"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Current Weight (lbs)</label>
                      <input
                        type="number"
                        value={imperialWeight}
                        onChange={handleImperialWeightChange}
                        min="66"
                        max="660"
                        step="0.5"
                        className="form-input"
                        required
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Height (ft & in)</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="number"
                          placeholder="ft"
                          value={imperialHeight.feet}
                          onChange={handleImperialHeightFeetChange}
                          min="3"
                          max="8"
                          className="form-input"
                          required
                        />
                        <input
                          type="number"
                          placeholder="in"
                          value={imperialHeight.inches}
                          onChange={handleImperialHeightInchesChange}
                          min="0"
                          max="11"
                          className="form-input"
                          required
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="input-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Target Goal Weight <span className="profile-label-hint">({unitSystem === 'metric' ? 'kg' : 'lbs'})</span></label>
                  {unitSystem === 'metric' ? (
                    <input
                      type="number"
                      name="goal_weight_kg"
                      value={formData.goal_weight_kg}
                      onChange={handleChange}
                      min="30"
                      max="300"
                      step="0.1"
                      className="form-input"
                      placeholder="e.g. 70"
                    />
                  ) : (
                    <input
                      type="number"
                      value={imperialGoalWeight}
                      onChange={handleImperialGoalWeightChange}
                      min="66"
                      max="660"
                      step="0.5"
                      className="form-input"
                      placeholder="e.g. 154"
                    />
                  )}
                </div>

                <div className="form-group" style={{ flex: 1 }}>
                  <label>Body Fat % <span className="profile-label-hint">(Katch-McArdle)</span></label>
                  <input
                    type="number"
                    name="body_fat_percent"
                    value={formData.body_fat_percent}
                    onChange={handleChange}
                    min="3"
                    max="60"
                    step="0.5"
                    className="form-input"
                    placeholder="e.g. 18"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Activity Level</label>
                <select
                  name="activity_level"
                  value={formData.activity_level}
                  onChange={handleChange}
                  className="form-input"
                  required
                >
                  <option value="sedentary">Sedentary (desk job, minimal exercise)</option>
                  <option value="lightly_active">Lightly Active (1–3 training sessions/week)</option>
                  <option value="moderately_active">Moderately Active (3–5 training sessions/week)</option>
                  <option value="very_active">Very Active (6–7 heavy workouts/week)</option>
                  <option value="extra_active">Extra Active (physical occupation + dual training)</option>
                </select>
              </div>

              <div className="input-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>Primary Goal</label>
                  <select
                    name="goal"
                    value={formData.goal}
                    onChange={handleChange}
                    className="form-input"
                    required
                  >
                    <option value="lose">Lose Body Fat</option>
                    <option value="maintain">Maintain Current Weight</option>
                    <option value="gain">Build Lean Muscle</option>
                  </select>
                </div>

                {(() => {
                  const isMaintain = (formData.goal || '').toLowerCase().includes('maintain');
                  return (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ opacity: isMaintain ? 0.6 : 1 }}>
                        Intensity {isMaintain && <span className="profile-label-hint">(N/A for Maintenance)</span>}
                      </label>
                      <select
                        name="goal_intensity"
                        value={isMaintain ? 'moderate' : formData.goal_intensity}
                        onChange={handleChange}
                        className="form-input"
                        disabled={isMaintain}
                        required
                      >
                        {isMaintain ? (
                          <option value="moderate">Neutral Calorie Balance</option>
                        ) : (
                          <>
                            <option value="mild">Mild (~0.25 kg / ~0.5 lb / wk)</option>
                            <option value="moderate">Moderate (~0.5 kg / ~1.1 lb / wk)</option>
                            <option value="aggressive">Aggressive (~0.75 kg / ~1.6 lb / wk)</option>
                          </>
                        )}
                      </select>
                    </div>
                  );
                })()}
              </div>

              {/* Live Preview Summary Bar */}
              {liveResults && (
                <div className="biometrics-live-preview-bar">
                  <div className="preview-stat">
                    <span className="label">Live BMR</span>
                    <span className="val">{liveResults.bmr} kcal</span>
                  </div>
                  <div className="preview-stat">
                    <span className="label">Live Maintenance</span>
                    <span className="val">{liveResults.tdee_maintenance} kcal</span>
                  </div>
                  <div className="preview-stat highlight">
                    <span className="label">Live Target</span>
                    <span className="val">{liveResults.target_calories} kcal</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`btn-primary btn-full ${loading ? 'loading' : ''}`}
                disabled={loading}
                style={{ marginTop: '24px' }}
              >
                {loading ? 'Saving Targets...' : (token ? '💾 Save & Activate Biometrics' : '⚡ Calculate Live Targets')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── TAB 3: DIETS, ALLERGENS & CLINICAL HEALTH ─────────────── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'diets' && (
        <div className="profile-tab-content community-animate-card">
          <div className="card glass" style={{ padding: '28px', marginBottom: '24px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge salad">
                <Salad size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Dietary Style & Restrictions</h3>
                <span className="profile-card-subtitle">Enforces recipe filtering and culinary recommendations</span>
              </div>
            </div>

            {/* Diet Type Selector */}
            <div className="form-group" style={{ marginTop: '16px' }}>
              <label className="profile-sub-heading">Dietary Philosophy</label>
              <div className="diet-pill-selector">
                {DIET_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`diet-pill ${formData.diet_type === opt.value ? 'active' : ''}`}
                    onClick={() => handleDiet(opt.value)}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies Matrix */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="profile-sub-heading">Allergies & Ingredient Exclusions</label>
              <div className="diet-pill-selector">
                {COMMON_ALLERGENS.map(allg => {
                  const list = formData.allergens ? formData.allergens.split(',').map(s => s.trim()) : [];
                  const isActive = list.includes(allg);
                  return (
                    <button
                      key={allg}
                      type="button"
                      className={`diet-pill ${isActive ? 'active danger' : ''}`}
                      onClick={() => handleAllergenToggle(allg)}
                    >
                      <span>🚫</span>
                      <span>{allg}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Allergen Input */}
              <form onSubmit={handleAddCustomAllergen} className="profile-custom-input-row" style={{ marginTop: '12px' }}>
                <input
                  type="text"
                  placeholder="Add custom exclusion (e.g. Sesame, Mustard, Cilantro)"
                  value={customAllergenInput}
                  onChange={(e) => setCustomAllergenInput(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button type="submit" className="action-btn primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Plus size={15} /> Add Exclusion
                </button>
              </form>
            </div>

            {/* Taste Preferences */}
            <div className="form-group" style={{ marginTop: '24px' }}>
              <label className="profile-sub-heading">Culinary Taste Profile</label>
              <div className="diet-pill-selector">
                {TASTE_PREFERENCES.map(taste => {
                  const list = formData.taste_preferences ? formData.taste_preferences.split(',').map(s => s.trim()) : [];
                  const isActive = list.includes(taste.value);
                  return (
                    <button
                      key={taste.value}
                      type="button"
                      className={`diet-pill ${isActive ? 'active warning' : ''}`}
                      onClick={() => handleToggle('taste_preferences', taste.value)}
                    >
                      {taste.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Clinical Health Conditions Section */}
          <div className="card glass" style={{ padding: '28px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge heart">
                <HeartPulse size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Clinical Health Protocol</h3>
                <span className="profile-card-subtitle">
                  Proactively adjusts sodium, carbohydrate ceilings, and fiber targets
                </span>
              </div>
            </div>

            <div className="diet-pill-selector" style={{ marginTop: '16px' }}>
              {HEALTH_CONDITIONS.map(cond => {
                const list = formData.health_conditions ? formData.health_conditions.split(',').map(s => s.trim()) : [];
                const isActive = list.includes(cond.value);
                return (
                  <button
                    key={cond.value}
                    type="button"
                    className={`diet-pill ${isActive ? 'active clinical' : ''}`}
                    onClick={() => handleToggle('health_conditions', cond.value)}
                  >
                    <span>{cond.icon}</span>
                    <span>{cond.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Proactive Clinical Insights Cards */}
            {activeConditions.length > 0 && (
              <div className="clinical-insights-container" style={{ marginTop: '24px' }}>
                <h4 className="clinical-insights-title">
                  <HeartPulse size={16} /> Active Clinical Dietary Adjustments
                </h4>
                <div className="clinical-cards-grid">
                  {activeConditions.map(condKey => {
                    const info = CLINICAL_INSIGHTS[condKey];
                    if (!info) return null;
                    return (
                      <div key={condKey} className="clinical-detail-card" style={{ borderLeftColor: info.color }}>
                        <div className="clinical-card-top">
                          <span className="clinical-icon">{info.icon}</span>
                          <span className="clinical-name" style={{ color: info.color }}>{info.name}</span>
                        </div>
                        <p className="clinical-guidance">{info.guidance}</p>
                        <span className="clinical-note">💡 {info.clinical_note}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSubmit}
              className="btn-primary"
              style={{ marginTop: '24px', width: '100%' }}
            >
              💾 Save Dietary & Clinical Preferences
            </button>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── TAB 4: WEIGHT & ADAPTIVE TDEE ─────────────────────────── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'weight' && (
        <div className="profile-tab-content community-animate-card">
          
          {/* Quick Weight Logger Bar */}
          <div className="card glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge scale">
                <Scale size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Daily Weight Logger</h3>
                <span className="profile-card-subtitle">Feeds into your True Adaptive TDEE metabolic algorithm</span>
              </div>
            </div>

            <form onSubmit={handleLogWeight} className="profile-weight-log-form" style={{ marginTop: '16px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Log Date</label>
                <input
                  type="date"
                  value={weightDateInput}
                  onChange={(e) => setWeightDateInput(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group" style={{ flex: 1 }}>
                <label>Weight ({unitSystem === 'metric' ? 'kg' : 'lbs'})</label>
                <input
                  type="number"
                  placeholder={`e.g. ${unitSystem === 'metric' ? '74.8' : '165'}`}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  step="0.1"
                  min={unitSystem === 'metric' ? '30' : '66'}
                  max={unitSystem === 'metric' ? '300' : '660'}
                  className="form-input"
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ height: '42px', alignSelf: 'flex-end', whiteSpace: 'nowrap' }}>
                <Plus size={16} /> Log Entry
              </button>
            </form>
          </div>

          {/* SVG Weight History Chart */}
          <div className="card glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <div className="profile-chart-header-row">
              <div>
                <h3 className="profile-card-title">Weight Journey Curve</h3>
                <span className="profile-card-subtitle">
                  {weightSummary && weightSummary.total_logs > 0
                    ? `${weightSummary.total_logs} entries recorded · Latest: ${weightSummary.current_weight} kg`
                    : 'Track daily weight to unlock metabolic trends'}
                </span>
              </div>

              {/* Chart Filter Range */}
              <div className="chart-range-buttons">
                {['7', '14', '30', 'all'].map(rng => (
                  <button
                    key={rng}
                    type="button"
                    className={`range-btn ${weightFilterRange === rng ? 'active' : ''}`}
                    onClick={() => setWeightFilterRange(rng)}
                  >
                    {rng === 'all' ? 'All Time' : `${rng}D`}
                  </button>
                ))}
              </div>
            </div>

            {renderWeightChart()}

            {weightSummary && weightSummary.total_logs > 0 && (
              <div className="weight-summary-pills-row">
                <div className="summary-stat-pill">
                  <span className="label">Current</span>
                  <span className="val">
                    {unitSystem === 'metric' ? `${weightSummary.current_weight} kg` : `${kgToLbs(weightSummary.current_weight)} lbs`}
                  </span>
                </div>
                <div className="summary-stat-pill">
                  <span className="label">7-Day Avg</span>
                  <span className="val">
                    {weightSummary.avg_7day
                      ? (unitSystem === 'metric' ? `${weightSummary.avg_7day} kg` : `${kgToLbs(weightSummary.avg_7day)} lbs`)
                      : '—'}
                  </span>
                </div>
                <div className="summary-stat-pill">
                  <span className="label">Lowest</span>
                  <span className="val">
                    {unitSystem === 'metric' ? `${weightSummary.lowest_weight} kg` : `${kgToLbs(weightSummary.lowest_weight)} lbs`}
                  </span>
                </div>
                <div className="summary-stat-pill">
                  <span className="label">30-Day Delta</span>
                  <span className={`val ${weightSummary.delta_30day && weightSummary.delta_30day <= 0 ? 'good' : ''}`}>
                    {weightSummary.delta_30day != null ? `${weightSummary.delta_30day > 0 ? '+' : ''}${weightSummary.delta_30day} kg` : '—'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Adaptive TDEE Readiness & Diagnostics */}
          <div className="card glass" style={{ padding: '24px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge flame">
                <Sparkles size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Adaptive TDEE Diagnostics</h3>
                <span className="profile-card-subtitle">
                  Cross-references 14 days of logged nutrition intake against weight deltas
                </span>
              </div>
            </div>

            {adaptiveStatus && (
              <div className="adaptive-readiness-grid" style={{ marginTop: '18px' }}>
                <div className="readiness-box">
                  <div className="readiness-box-top">
                    <span className="icon">🥑</span>
                    <span className="title">Nutrition Logs</span>
                  </div>
                  <div className="readiness-progress-bar">
                    <div
                      className="readiness-progress-fill"
                      style={{ width: `${Math.min(100, (adaptiveStatus.nutrition_days_count / 7) * 100)}%` }}
                    />
                  </div>
                  <div className="readiness-footer">
                    <span>{adaptiveStatus.nutrition_days_count} / 7 days</span>
                    <span>{adaptiveStatus.nutrition_days_count >= 7 ? '✓ Ready' : `Need ${adaptiveStatus.days_needed_nutrition} more`}</span>
                  </div>
                </div>

                <div className="readiness-box">
                  <div className="readiness-box-top">
                    <span className="icon">⚖️</span>
                    <span className="title">Weight Logs</span>
                  </div>
                  <div className="readiness-progress-bar">
                    <div
                      className="readiness-progress-fill"
                      style={{ width: `${Math.min(100, (adaptiveStatus.weight_days_count / 7) * 100)}%` }}
                    />
                  </div>
                  <div className="readiness-footer">
                    <span>{adaptiveStatus.weight_days_count} / 7 days</span>
                    <span>{adaptiveStatus.weight_days_count >= 7 ? '✓ Ready' : `Need ${adaptiveStatus.days_needed_weight} more`}</span>
                  </div>
                </div>
              </div>
            )}

            <div style={{ marginTop: '20px' }}>
              <button
                type="button"
                onClick={handleAdaptiveCalculate}
                className={`btn-primary btn-full ${adaptiveLoading ? 'loading' : ''}`}
                disabled={adaptiveLoading || (adaptiveStatus && !adaptiveStatus.is_ready)}
                style={{
                  background: (adaptiveStatus && adaptiveStatus.is_ready)
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : 'var(--bg-secondary)',
                  opacity: (adaptiveStatus && !adaptiveStatus.is_ready) ? 0.6 : 1,
                  cursor: (adaptiveStatus && !adaptiveStatus.is_ready) ? 'not-allowed' : 'pointer',
                }}
              >
                {adaptiveLoading ? (
                  'Analyzing Metabolic Data...'
                ) : adaptiveStatus && adaptiveStatus.is_ready ? (
                  '✨ Calculate True Adaptive TDEE'
                ) : (
                  '🔒 Adaptive TDEE Locked (Requires 7 Days of Logs)'
                )}
              </button>
            </div>

            {/* Weight Logs Table with Delete Action */}
            {weightLogs.length > 0 && (
              <div className="weight-history-table-container" style={{ marginTop: '24px' }}>
                <h4 className="table-sub-heading">Recent Logged Weights</h4>
                <div className="weight-history-table">
                  <div className="table-row header">
                    <span>Date</span>
                    <span>Weight</span>
                    <span style={{ textAlign: 'right' }}>Action</span>
                  </div>
                  {weightLogs.slice(0, 10).map(log => (
                    <div key={log.id} className="table-row">
                      <span>📅 {log.date}</span>
                      <span style={{ fontWeight: 600 }}>
                        {unitSystem === 'metric' ? `${log.weight_kg} kg` : `${kgToLbs(log.weight_kg)} lbs`}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="table-delete-btn"
                          onClick={() => handleDeleteWeightLog(log.id)}
                          title="Delete log"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── TAB 5: PROFILES & ACHIEVEMENT BADGES ─────────────────── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {activeTab === 'hub' && (
        <div className="profile-tab-content community-animate-card">
          
          {/* Multi-Profile Switcher & Manager */}
          {token && (
            <div className="card glass" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="profile-card-header">
                <div className="profile-header-icon-badge">
                  <UserCheck size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">Named Profiles Manager</h3>
                  <span className="profile-card-subtitle">
                    Manage multiple profiles for different phases (e.g. Cut, Bulk, Marathon Prep)
                  </span>
                </div>
              </div>

              <div className="profile-switcher-grid" style={{ marginTop: '16px' }}>
                {profiles.map(p => (
                  <div
                    key={p.id}
                    className={`profile-manage-card ${p.is_active ? 'active' : ''}`}
                    onClick={() => handleSelectProfile(p)}
                  >
                    <div className="card-top-row">
                      <span className="p-title">{p.profile_name}</span>
                      {p.is_active && <span className="active-tag">Active</span>}
                    </div>

                    <div className="card-meta-row">
                      <span>{p.diet_type || 'General'}</span>
                      <span>{p.target_calories ? `${p.target_calories} kcal` : 'No targets'}</span>
                    </div>

                    <div className="card-action-bar">
                      <button
                        type="button"
                        className="p-action-btn"
                        onClick={(e) => handleCloneProfile(e, p)}
                        title="Clone Profile"
                      >
                        <Copy size={13} />
                        <span>Clone</span>
                      </button>
                      <button
                        type="button"
                        className="p-action-btn delete"
                        onClick={(e) => handleDeleteProfile(e, p.id)}
                        title="Delete Profile"
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  className="profile-add-card"
                  onClick={() => {
                    setShowNewForm(true);
                    setSelectedId(null);
                    setFormData({ ...EMPTY_FORM, profile_name: `Phase ${profiles.length + 1}` });
                    setSavedResults(null);
                    setActiveTab('biometrics');
                    toast.info('Creating a new profile. Fill biometrics and save.');
                  }}
                >
                  <Plus size={20} />
                  <span>Create New Profile</span>
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Badges & Achievements Cabinet */}
          <div className="card glass" style={{ padding: '24px', marginBottom: '24px' }}>
            <div className="profile-card-header">
              <div className="profile-header-icon-badge">
                <Award size={18} />
              </div>
              <div>
                <h3 className="profile-card-title">Culinary Achievements & Badges</h3>
                <span className="profile-card-subtitle">
                  Unlocked milestones across nutrition, logging, and culinary execution
                </span>
              </div>
            </div>

            <div className="profile-badges-grid" style={{ marginTop: '18px' }}>
              <div className={`badge-cabinet-card ${displayedResults?.protein_per_kg >= 1.8 ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">🥩</span>
                <div className="badge-details">
                  <span className="badge-name">High-Protein Master</span>
                  <span className="badge-desc">Target ≥ 1.8 g/kg body weight</span>
                  <span className="badge-status">
                    {displayedResults?.protein_per_kg >= 1.8 ? '✓ Unlocked' : '🔒 Target not met'}
                  </span>
                </div>
              </div>

              <div className={`badge-cabinet-card ${displayedResults?.target_fiber_g >= 30 ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">🥗</span>
                <div className="badge-details">
                  <span className="badge-name">Nutri-Score Champion</span>
                  <span className="badge-desc">High Fiber Target (≥30g/day)</span>
                  <span className="badge-status">
                    {displayedResults?.target_fiber_g >= 30 ? '✓ Unlocked' : '🔒 Target < 30g'}
                  </span>
                </div>
              </div>

              <div className={`badge-cabinet-card ${displayedResults?.target_water_ml >= 2500 ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">💧</span>
                <div className="badge-details">
                  <span className="badge-name">Hydration Hero</span>
                  <span className="badge-desc">Daily Water Target ≥ 2.5 Liters</span>
                  <span className="badge-status">
                    {displayedResults?.target_water_ml >= 2500 ? '✓ Unlocked' : '🔒 Target < 2.5L'}
                  </span>
                </div>
              </div>

              <div className={`badge-cabinet-card ${adaptiveStatus?.is_ready ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">⚖️</span>
                <div className="badge-details">
                  <span className="badge-name">Metabolic Pioneer</span>
                  <span className="badge-desc">7+ Days Food & Weight Logged</span>
                  <span className="badge-status">
                    {adaptiveStatus?.is_ready ? '✓ Unlocked' : '🔒 7 days required'}
                  </span>
                </div>
              </div>

              <div className={`badge-cabinet-card ${formData.diet_type && formData.diet_type !== 'non-vegetarian' ? 'unlocked' : 'locked'}`}>
                <span className="badge-icon">🥑</span>
                <div className="badge-details">
                  <span className="badge-name">Dietary Specialist</span>
                  <span className="badge-desc">Plant-based, Keto, or Specialized Diet</span>
                  <span className="badge-status">
                    {formData.diet_type && formData.diet_type !== 'non-vegetarian' ? '✓ Unlocked' : '🔒 Default Diet'}
                  </span>
                </div>
              </div>

              <div className="badge-cabinet-card unlocked">
                <span className="badge-icon">👨‍🍳</span>
                <div className="badge-details">
                  <span className="badge-name">CHEF Executive</span>
                  <span className="badge-desc">Active CHEF Culinary Member</span>
                  <span className="badge-status">✓ Active Status</span>
                </div>
              </div>
            </div>
          </div>

          {/* 1-Click Auto Diet Plan Generator */}
          {token && selectedId && (
            <div className="card glass" style={{ padding: '24px', marginBottom: '24px' }}>
              <div className="profile-card-header">
                <div className="profile-header-icon-badge">
                  <Calendar size={18} />
                </div>
                <div>
                  <h3 className="profile-card-title">Auto Weekly Meal Plan</h3>
                  <span className="profile-card-subtitle">
                    Generates a full 7-day culinary plan from our 5,250+ recipe database
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '12px 0 16px 0', lineHeight: 1.6 }}>
                Synthesizes your daily calorie ceiling ({displayedResults?.target_calories || 2000} kcal),
                macronutrient distribution, clinical health adjustments, and taste preferences into a weekly calendar.
              </p>

              <button
                type="button"
                onClick={handleGenerateDietPlan}
                className={`btn-primary btn-full ${dietPlanLoading ? 'loading' : ''}`}
                disabled={dietPlanLoading}
                style={{ background: 'linear-gradient(135deg, #8e44ad 0%, #9b59b6 100%)' }}
              >
                {dietPlanLoading ? 'Synthesizing Recipes...' : '✨ Generate 7-Day Meal Plan'}
              </button>
            </div>
          )}

        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════ */}
      {/* ── PRINT / EXPORT PRESCRIPTION CARD MODAL ──────────────── */}
      {/* ═════════════════════════════════════════════════════════════ */}
      {isExportModalOpen && (
        <div className="community-lightbox-backdrop" onClick={() => setIsExportModalOpen(false)}>
          <div
            className="profile-export-modal-card glass"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '640px', width: '90%', padding: '32px', borderRadius: '18px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>👨‍🍳</span>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.4rem' }}>CHEF Nutrition Prescription</h2>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Verified Biometric & Clinical Protocol</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsExportModalOpen(false)}
                className="modal-close-btn"
                style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="prescription-print-content" id="printable-prescription">
              <div className="prescription-user-strip">
                <div>
                  <strong>Profile:</strong> {formData.profile_name || 'My Profile'}
                </div>
                <div>
                  <strong>Date:</strong> {getLocalDateString()}
                </div>
              </div>

              <div className="prescription-grid">
                <div className="prescription-box">
                  <span className="title">Daily Energy Target</span>
                  <span className="value" style={{ color: 'var(--accent-1)' }}>{displayedResults?.target_calories || 2000} kcal</span>
                </div>
                <div className="prescription-box">
                  <span className="title">Protein Target</span>
                  <span className="value">{displayedResults?.target_protein || 0} g</span>
                </div>
                <div className="prescription-box">
                  <span className="title">Carbohydrates</span>
                  <span className="value">{displayedResults?.target_carbs || 0} g</span>
                </div>
                <div className="prescription-box">
                  <span className="title">Healthy Fats</span>
                  <span className="value">{displayedResults?.target_fat || 0} g</span>
                </div>
                <div className="prescription-box">
                  <span className="title">Dietary Fiber</span>
                  <span className="value">{displayedResults?.target_fiber_g || 28} g</span>
                </div>
                <div className="prescription-box">
                  <span className="title">Hydration</span>
                  <span className="value">{displayedResults?.target_water_ml ? (displayedResults.target_water_ml / 1000).toFixed(1) : 2.5} L</span>
                </div>
              </div>

              {formData.allergens && (
                <div className="prescription-section">
                  <strong>Exclusions & Allergens:</strong> {formData.allergens}
                </div>
              )}

              {activeConditions.length > 0 && (
                <div className="prescription-section">
                  <strong>Clinical Focus:</strong> {activeConditions.map(c => CLINICAL_INSIGHTS[c]?.name || c).join(', ')}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => window.print()}
                style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Printer size={16} /> Print / Save PDF
              </button>
              <button
                type="button"
                className="action-btn secondary"
                onClick={() => {
                  const jsonStr = JSON.stringify({ formData, results: displayedResults }, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `chef-profile-${getLocalDateString()}.json`;
                  a.click();
                  toast.success('Profile backup JSON downloaded!');
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={16} /> Export JSON
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
}
