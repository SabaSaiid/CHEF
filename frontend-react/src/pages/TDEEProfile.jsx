import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DIET_OPTIONS = [
  { value: 'non-vegetarian', label: 'Non-Veg',     emoji: '🍗' },
  { value: 'vegetarian',     label: 'Vegetarian',  emoji: '🥦' },
  { value: 'vegan',          label: 'Vegan',        emoji: '🌱' },
  { value: 'pescatarian',    label: 'Pescatarian', emoji: '🐟' },
  { value: 'keto',           label: 'Keto',         emoji: '🥑' },
  { value: 'gluten-free',    label: 'Gluten-Free', emoji: '🌾' },
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

  const selectStyle = { width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.6)' };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Calorie and Nutrition Profile</h1>
        <p className="subtitle">Calculate your personalized daily calorie and macro targets.</p>
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
                {p.diet_type && DIET_OPTIONS.find(d => d.value === p.diet_type)?.emoji}
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
                  {opt.emoji} {opt.label}
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
                      borderColor: isActive ? '#e74c3c' : 'var(--border-glass)', 
                      color: isActive ? '#e74c3c' : 'inherit',
                      background: isActive ? 'rgba(231, 76, 60, 0.08)' : 'transparent'
                    }}
                  >
                    ⚠️ {allg}
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

      {/* ── Results ── */}
      {results && (
        <div className="results-area">
          {results.bmr && (
            <div className="nutrition-card" style={{marginBottom: '16px'}}>
              <div className="nutrition-header">Diagnostic Breakdown</div>
              <div className="nutrition-grid">
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color:'#e67e22'}}>{results.bmr}</div>
                  <div className="nutrient-label">BMR</div>
                  <div className="nutrient-unit">kcal/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color:'#3498db'}}>{results.tdee_maintenance}</div>
                  <div className="nutrient-label">Maintenance</div>
                  <div className="nutrient-unit">kcal/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color: results.bmi >= 25 ? '#e74c3c' : results.bmi < 18.5 ? '#f39c12' : '#27ae60'}}>{results.bmi}</div>
                  <div className="nutrient-label">BMI</div>
                  <div className="nutrient-unit">{results.bmi_category || ''}</div>
                </div>
              </div>
            </div>
          )}

          <div className="nutrition-card">
            <div className="nutrition-header">Daily Targets</div>
            <div className="nutrition-source">Adjusted for your goal — protein at {results.protein_per_kg ? `${results.protein_per_kg} g/kg` : '—'} body weight</div>
            <div className="nutrition-grid">
              <div className="nutrient-box">
                <div className="nutrient-value calories">{results.target_calories}</div>
                <div className="nutrient-label">Calories</div>
                <div className="nutrient-unit">kcal</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_protein}</div>
                <div className="nutrient-label">Protein ({results.protein_pct || '—'}%)</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_carbs}</div>
                <div className="nutrient-label">Carbs ({results.carbs_pct || '—'}%)</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_fat}</div>
                <div className="nutrient-label">Fat ({results.fat_pct || '—'}%)</div>
                <div className="nutrient-unit">g</div>
              </div>
            </div>
          </div>

          {results.target_fiber_g && (
            <div className="nutrition-card" style={{marginTop: '16px'}}>
              <div className="nutrition-header">Additional Targets</div>
              <div className="nutrition-grid">
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color:'#8e44ad'}}>{results.target_fiber_g}</div>
                  <div className="nutrient-label">Fiber</div>
                  <div className="nutrient-unit">g/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color:'#2980b9'}}>{results.target_water_ml}</div>
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

