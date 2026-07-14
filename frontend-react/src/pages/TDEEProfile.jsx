import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DIET_OPTIONS = [
  { value: 'non-vegetarian', label: 'Non-Veg' },
  { value: 'vegetarian',     label: 'Vegetarian' },
  { value: 'vegan',          label: 'Vegan' },
  { value: 'pescatarian',    label: 'Pescatarian' },
  { value: 'keto',           label: 'Keto' },
  { value: 'gluten-free',    label: 'Gluten-Free' },
];

const EMPTY_FORM = {
  profile_name: 'My Profile',
  display_name: '',
  diet_type: 'non-vegetarian',
  allergens: '',
  age: '',
  gender: 'male',
  weight_kg: '',
  height_cm: '',
  activity_level: 'sedentary',
  goal: 'maintain',
  goal_intensity: 'moderate',
  body_fat_percent: '',
};

export default function TDEEProfile() {
  const { token, refreshActiveProfile } = useContext(AuthContext);
  const toast = useToast();

  const [profiles, setProfiles] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [weightInput, setWeightInput] = useState('');
  const [adaptiveLoading, setAdaptiveLoading] = useState(false);

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

  useEffect(() => { loadProfiles(); }, [token]);

  const computeResults = (p) => {
    const cal = p.target_calories;
    const prot = p.target_protein || 0;
    const carb = p.target_carbs || 0;
    const fat = p.target_fat || 0;
    const wt = p.weight_kg || 70;
    const protPct = cal > 0 ? Math.round((prot * 4 / cal) * 100) : 0;
    const carbPct = cal > 0 ? Math.round((carb * 4 / cal) * 100) : 0;
    const fatPct  = cal > 0 ? Math.round((fat  * 9 / cal) * 100) : 0;
    const bmiVal  = p.bmi || (wt > 0 ? Math.round((wt / ((p.height_cm / 100) ** 2)) * 10) / 10 : 0);
    let bmiCat = 'Normal';
    if (bmiVal < 18.5) bmiCat = 'Underweight';
    else if (bmiVal >= 30) bmiCat = 'Obese';
    else if (bmiVal >= 25) bmiCat = 'Overweight';
    return {
      target_calories: cal, target_protein: prot, target_carbs: carb, target_fat: fat,
      bmr: p.bmr, tdee_maintenance: p.tdee_maintenance,
      bmi: bmiVal, bmi_category: p.bmi_category || bmiCat,
      formula_used: p.formula_used || 'Mifflin-St Jeor',
      target_fiber_g: p.target_fiber_g, target_water_ml: p.target_water_ml,
      protein_pct: p.protein_pct || protPct, carbs_pct: p.carbs_pct || carbPct, fat_pct: p.fat_pct || fatPct,
      protein_per_kg: p.protein_per_kg || (wt > 0 ? (prot / wt).toFixed(1) : '2.0'),
    };
  };

  const populateForm = (profile) => {
    setFormData({
      profile_name:     profile.profile_name || 'My Profile',
      display_name:     profile.display_name || '',
      diet_type:        profile.diet_type || 'non-vegetarian',
      allergens:        profile.allergens || '',
      age:              profile.age || '',
      gender:           profile.gender || 'male',
      weight_kg:        profile.weight_kg || '',
      height_cm:        profile.height_cm || '',
      activity_level:   profile.activity_level || 'sedentary',
      goal:             profile.goal || 'maintain',
      goal_intensity:   profile.goal_intensity || 'moderate',
      body_fat_percent: profile.body_fat_percent || '',
    });
    setResults(profile.target_calories ? computeResults(profile) : null);
  };

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleDiet   = (val) => setFormData({ ...formData, diet_type: val });
  const handleAllergenToggle = (allergen) => {
    const list = formData.allergens ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : [];
    let newList;
    if (list.includes(allergen)) {
      newList = list.filter(item => item !== allergen);
    } else {
      newList = [...list, allergen];
    }
    setFormData({ ...formData, allergens: newList.join(',') });
  };

  const handleSelectProfile = async (profile) => {
    setSelectedId(profile.id);
    setShowNewForm(false);
    populateForm(profile);
    if (!profile.is_active) {
      try {
        await api.post(`/profiles/${profile.id}/activate`);
        await refreshActiveProfile();
        loadProfiles();
      } catch { /* non-fatal */ }
    }
  };

  const handleDeleteProfile = async (e, profileId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this profile?')) return;
    try {
      await api.delete(`/profiles/${profileId}`);
      toast.success('Profile deleted.');
      setSelectedId(null);
      setResults(null);
      setFormData({ ...EMPTY_FORM });
      loadProfiles();
      refreshActiveProfile();
    } catch (err) { toast.error(err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
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
          toast.success('Profile updated.');
        } else {
          saved = await api.post('/profiles/', payload);
          setSelectedId(saved.id);
          setShowNewForm(false);
          toast.success('Profile created.');
        }
        if (saved.target_calories) setResults(computeResults(saved));
        loadProfiles();
        refreshActiveProfile();
      } else {
        const data = await api.post('/tdee/calculate', payload);
        setResults(data);
      }
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  const handleLogWeight = async (e) => {
    e.preventDefault();
    if (!weightInput) return;
    try {
      await api.post('/weight/log', { weight_kg: parseFloat(weightInput) });
      toast.success('Weight logged for today!');
      setWeightInput('');
    } catch (err) { toast.error(err.message); }
  };

  const handleAdaptiveCalculate = async () => {
    setAdaptiveLoading(true);
    try {
      const data = await api.post('/tdee/adaptive/calculate');
      toast.success(data.message);
      loadProfiles();
      refreshActiveProfile();
    } catch (err) {
      toast.error(err.detail || err.message);
    } finally {
      setAdaptiveLoading(false);
    }
  };

  const selectStyle = { width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.6)' };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Profile Settings</h1>
        <p className="subtitle">Configure your personalized daily calorie and nutrition targets.</p>
      </div>

      {/* ── Profile Switcher ── */}
      {token && (
        <div className="profile-switcher-row">
          {profiles.map(p => (
            <div
              key={p.id}
              className={`profile-switcher-card ${p.is_active ? 'active' : ''}`}
              onClick={() => handleSelectProfile(p)}
            >
              <div className="ps-card-name">{p.profile_name}</div>
              <div className="ps-card-meta">
                {p.diet_type && DIET_OPTIONS.find(d => d.value === p.diet_type)?.label}
                {p.target_calories ? ` · ${p.target_calories} kcal` : ' · Not set'}
              </div>
              {p.is_active && <div className="ps-active-badge">Active</div>}
              <button className="ps-delete-btn" onClick={(e) => handleDeleteProfile(e, p.id)} title="Delete">✕</button>
            </div>
          ))}
          <button
            className={`profile-switcher-card new-card ${showNewForm && !selectedId ? 'active' : ''}`}
            onClick={() => { setShowNewForm(true); setSelectedId(null); setFormData({ ...EMPTY_FORM }); setResults(null); }}
          >
            <div className="ps-card-name">+ New Profile</div>
          </button>
        </div>
      )}

      {/* ── Profile Form ── */}
      <div className="card glass">
        <form onSubmit={handleSubmit}>

          {token && (
            <div className="input-row">
              <div className="form-group" style={{flex: 1}}>
                <label>Profile Label</label>
                <input type="text" name="profile_name" value={formData.profile_name} onChange={handleChange}
                  className="form-input" placeholder="e.g. Cut Phase, Bulk 2024" maxLength={100} required />
              </div>
              <div className="form-group" style={{flex: 1}}>
                <label>Display Name <span style={{opacity:0.5,fontSize:'0.8em'}}>(shown across the app)</span></label>
                <input type="text" name="display_name" value={formData.display_name} onChange={handleChange}
                  className="form-input" placeholder="Your first name" maxLength={100} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label>Dietary Preference</label>
            <div className="diet-pill-selector">
              {DIET_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  className={`diet-pill ${formData.diet_type === opt.value ? 'active' : ''}`}
                  onClick={() => handleDiet(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginTop: '15px' }}>
            <label>Allergies & Dietary Restrictions</label>
            <div className="diet-pill-selector" style={{ marginTop: '5px' }}>
              {['Peanut', 'Gluten', 'Dairy', 'Soy', 'Egg', 'Shellfish', 'Fish', 'Tree Nuts'].map(allg => {
                const list = formData.allergens ? formData.allergens.split(',').map(s => s.trim()) : [];
                const isActive = list.includes(allg);
                return (
                  <button key={allg} type="button"
                    className={`diet-pill ${isActive ? 'active' : ''}`}
                    onClick={() => handleAllergenToggle(allg)}
                    style={{ 
                      borderColor: isActive ? 'var(--accent-1)' : 'var(--border-glass)', 
                      color: isActive ? 'var(--accent-1)' : 'inherit',
                      background: isActive ? 'rgba(var(--primary-rgb), 0.08)' : 'transparent'
                    }}
                  >
                    {allg}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="profile-form-divider">Physical Details</div>

          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Age (years)</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} min="15" max="100" className="form-input" required />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Biological Sex</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>

          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Weight (kg)</label>
              <input type="number" name="weight_kg" value={formData.weight_kg} onChange={handleChange} min="30" max="300" step="0.1" className="form-input" required />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Height (cm)</label>
              <input type="number" name="height_cm" value={formData.height_cm} onChange={handleChange} min="100" max="250" className="form-input" required />
            </div>
          </div>

          <div className="input-row">
            <div className="form-group" style={{flex: 2}}>
              <label>Activity Level</label>
              <select name="activity_level" value={formData.activity_level} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="sedentary">Sedentary (desk job, little exercise)</option>
                <option value="lightly_active">Lightly active (1–3 days/week)</option>
                <option value="moderately_active">Moderately active (3–5 days/week)</option>
                <option value="very_active">Very active (6–7 days/week)</option>
                <option value="extra_active">Extra active (physical job + training)</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Body Fat % <span style={{opacity:0.5,fontSize:'0.8em'}}>(optional)</span></label>
              <input type="number" name="body_fat_percent" value={formData.body_fat_percent} onChange={handleChange} min="3" max="60" step="0.1" className="form-input" placeholder="e.g. 20" />
            </div>
          </div>

          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Goal</label>
              <select name="goal" value={formData.goal} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Intensity</label>
              <select name="goal_intensity" value={formData.goal_intensity} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="mild">Mild (~0.25 kg/week)</option>
                <option value="moderate">Moderate (~0.5 kg/week)</option>
                <option value="aggressive">Aggressive (~0.7 kg/week)</option>
              </select>
            </div>
          </div>

          <button type="submit" className={`btn-primary btn-full ${loading ? 'loading' : ''}`} disabled={loading} style={{marginTop: '18px'}}>
            {loading ? 'Calculating...' : (token ? 'Calculate & Save' : 'Calculate')}
          </button>
          {token && (
            <p style={{fontSize:'12px', color:'var(--text-secondary)', textAlign:'center', marginTop:'8px'}}>
              Results are saved to this profile automatically.
            </p>
          )}
        </form>
      </div>

      {/* ── Adaptive TDEE Tools ── */}
      {token && selectedId && !showNewForm && (
        <div className="card glass" style={{ marginTop: '20px' }}>
          <div className="nutrition-header" style={{ marginBottom: '16px' }}>Adaptive TDEE Tracking</div>
          <p style={{fontSize:'13px', color:'var(--text-secondary)', marginBottom:'16px'}}>
            Log your weight daily. The algorithm will cross-reference it with your food logs to calculate your true, 100% precise metabolic rate.
          </p>
          <form onSubmit={handleLogWeight} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
            <input 
              type="number" 
              value={weightInput} 
              onChange={(e) => setWeightInput(e.target.value)} 
              step="0.1" 
              min="30" 
              max="300" 
              placeholder="Today's Weight (kg)" 
              className="form-input" 
              required 
            />
            <button type="submit" className="btn-primary" style={{ whiteSpace: 'nowrap' }}>Log Weight</button>
          </form>

          <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <button 
              type="button" 
              onClick={handleAdaptiveCalculate} 
              className={`btn-primary btn-full ${adaptiveLoading ? 'loading' : ''}`}
              disabled={adaptiveLoading}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              {adaptiveLoading ? 'Calculating...' : 'Recalculate True Adaptive TDEE'}
            </button>
            <p style={{fontSize:'11px', color:'var(--text-secondary)', textAlign:'center', marginTop:'8px'}}>
              Requires at least 7-14 days of combined food and weight logs.
            </p>
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {results && (
        <div className="results-area">
          {results.bmr && (
            <div className="nutrition-card" style={{ marginBottom: '16px', padding: '20px' }}>
              <div className="nutrition-header" style={{ marginBottom: '16px' }}>Diagnostic Breakdown</div>
              <div className="nutrition-grid" style={{ marginBottom: '20px' }}>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.bmr}</div>
                  <div className="nutrient-label">BMR</div>
                  <div className="nutrient-unit">kcal/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.tdee_maintenance}</div>
                  <div className="nutrient-label">Maintenance</div>
                  <div className="nutrient-unit">kcal/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.bmi}</div>
                  <div className="nutrient-label">BMI ({results.bmi_category || ''})</div>
                  <div className="nutrient-unit">Index</div>
                </div>
              </div>

              {/* BMI Custom SVG Slider Scale */}
              {(() => {
                const bmi = results.bmi || 22;
                const minBmi = 15;
                const maxBmi = 35;
                const posPct = Math.max(0, Math.min(100, ((bmi - minBmi) / (maxBmi - minBmi)) * 100));
                return (
                  <div style={{ padding: '0 10px', marginTop: '20px' }}>
                    <div style={{ position: 'relative', height: '10px', width: '100%', borderRadius: '5px', background: 'linear-gradient(90deg, #3b82f6 0%, #10b981 35%, #f59e0b 65%, #ef4444 100%)' }}>
                      <div style={{
                        position: 'absolute',
                        left: `${posPct}%`,
                        top: '-4px',
                        width: '18px',
                        height: '18px',
                        background: 'var(--text-primary)',
                        border: '3px solid var(--bg-primary)',
                        borderRadius: '50%',
                        transform: 'translateX(-50%)',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', fontWeight: 'bold', color: 'var(--text-muted)', marginTop: '8px' }}>
                      <span>15 (Underweight)</span>
                      <span>20</span>
                      <span>25 (Overweight)</span>
                      <span>30</span>
                      <span>35 (Obese)</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="nutrition-card" style={{ padding: '20px' }}>
            <div className="nutrition-header">Daily Targets</div>
            <div className="nutrition-source" style={{ marginBottom: '16px' }}>Adjusted for your goal — protein at {results.protein_per_kg ? `${results.protein_per_kg} g/kg` : '—'} body weight</div>
            
            {/* Custom Stacked Macro Bar */}
            {(() => {
              const protPct = results.protein_pct || 30;
              const carbPct = results.carbs_pct || 40;
              const fatPct = results.fat_pct || 30;
              return (
                <div style={{ marginBottom: '24px' }}>
                  <div style={{ height: '14px', width: '100%', borderRadius: '7px', overflow: 'hidden', display: 'flex' }}>
                    <div style={{ width: `${protPct}%`, background: '#81b29a', height: '100%', transition: 'width 0.5s' }} />
                    <div style={{ width: `${carbPct}%`, background: '#f2cc8f', height: '100%', transition: 'width 0.5s' }} />
                    <div style={{ width: `${fatPct}%`, background: '#e07a5f', height: '100%', transition: 'width 0.5s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 'bold', marginTop: '8px', color: 'var(--text-muted)' }}>
                    <span style={{ color: '#81b29a' }}>Protein: {protPct}%</span>
                    <span style={{ color: '#f2cc8f' }}>Carbs: {carbPct}%</span>
                    <span style={{ color: '#e07a5f' }}>Fat: {fatPct}%</span>
                  </div>
                </div>
              );
            })()}

            <div className="nutrition-grid">
              <div className="nutrient-box">
                <div className="nutrient-value calories" style={{ color: 'var(--text-primary)' }}>{results.target_calories}</div>
                <div className="nutrient-label">Calories</div>
                <div className="nutrient-unit">kcal</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.target_protein}</div>
                <div className="nutrient-label">Protein</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.target_carbs}</div>
                <div className="nutrient-label">Carbs</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value" style={{ color: 'var(--text-primary)' }}>{results.target_fat}</div>
                <div className="nutrient-label">Fat</div>
                <div className="nutrient-unit">g</div>
              </div>
            </div>
          </div>

          {results.target_fiber_g && (
            <div className="nutrition-card" style={{ marginTop: '16px', padding: '20px' }}>
              <div className="nutrition-header">Additional Targets</div>
              <div className="nutrition-grid">
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{ color: '#8e44ad' }}>{results.target_fiber_g}</div>
                  <div className="nutrient-label">Fiber</div>
                  <div className="nutrient-unit">g/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{ color: '#2980b9' }}>{results.target_water_ml}</div>
                  <div className="nutrient-label">Water</div>
                  <div className="nutrient-unit">ml/day ({(results.target_water_ml / 1000).toFixed(1)} L)</div>
                </div>
              </div>
            </div>
          )}

          {/* Collapsible methodology */}
          <div className="methodology-accordion" style={{marginTop:'16px'}}>
            <button className="accordion-toggle" type="button" onClick={() => setAccordionOpen(o => !o)}>
              <span>How is this calculated?</span>
              <span className="accordion-arrow">{accordionOpen ? '▾' : '▸'}</span>
            </button>
            {accordionOpen && (
              <div className="accordion-body">
                <p><strong>Formula used:</strong> {results.formula_used || 'Mifflin-St Jeor'}</p>
                <p>When body fat % is provided, the more precise <strong>Katch-McArdle</strong> formula is applied. Otherwise, <strong>Mifflin-St Jeor (1990)</strong> is used — the most clinically validated formula for the general population.</p>
                <p>TDEE is derived by multiplying BMR by an activity factor. Goal adjustments use a percentage-based deficit/surplus for accuracy across body sizes. Protein targets follow <strong>ISSN position stand</strong> guidelines (1.2–2.2 g/kg).</p>
                <p style={{opacity:0.6, fontSize:'0.85em', marginTop:'8px'}}>References: Mifflin et al. (1990) · Katch-McArdle (1996) · ISSN protein stand · WHO BMI classification</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

