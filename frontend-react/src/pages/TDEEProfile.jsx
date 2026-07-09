import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

export default function TDEEProfile() {
  const { token, userProfile } = useContext(AuthContext);
  const [formData, setFormData] = useState({
    age: '',
    gender: 'male',
    weight_kg: '',
    height_cm: '',
    activity_level: 'sedentary',
    goal: 'maintain',
    goal_intensity: 'moderate',
    body_fat_percent: ''
  });
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If the user profile is already loaded with values, pre-populate
    if (userProfile && userProfile.age) {
      setFormData({
        age: userProfile.age || '',
        gender: userProfile.gender || 'male',
        weight_kg: userProfile.weight_kg || '',
        height_cm: userProfile.height_cm || '',
        activity_level: userProfile.activity_level || 'sedentary',
        goal: userProfile.goal || 'maintain',
        goal_intensity: userProfile.goal_intensity || 'moderate',
        body_fat_percent: userProfile.body_fat_percent || ''
      });
      if (userProfile.target_calories) {
        const cal = userProfile.target_calories;
        const prot = userProfile.target_protein || 0;
        const carb = userProfile.target_carbs || 0;
        const fat = userProfile.target_fat || 0;
        const wt = userProfile.weight_kg || 70;
        
        // Calculate derived fields on the fly if missing from DB schema
        const protPct = cal > 0 ? Math.round((prot * 4 / cal) * 100) : 0;
        const carbPct = cal > 0 ? Math.round((carb * 4 / cal) * 100) : 0;
        const fatPct = cal > 0 ? Math.round((fat * 9 / cal) * 100) : 0;
        
        const bmiVal = userProfile.bmi || (wt > 0 ? Math.round((wt / ((userProfile.height_cm / 100) ** 2)) * 10) / 10 : 0);
        let bmiCat = 'Normal';
        if (bmiVal < 18.5) bmiCat = 'Underweight';
        else if (bmiVal >= 30) bmiCat = 'Obese';
        else if (bmiVal >= 25) bmiCat = 'Overweight';

        setResults({
          target_calories: cal,
          target_protein: prot,
          target_carbs: carb,
          target_fat: fat,
          bmr: userProfile.bmr,
          tdee_maintenance: userProfile.tdee_maintenance,
          bmi: bmiVal,
          bmi_category: userProfile.bmi_category || bmiCat,
          formula_used: userProfile.formula_used || 'Mifflin-St Jeor',
          target_fiber_g: userProfile.target_fiber_g,
          target_water_ml: userProfile.target_water_ml,
          protein_pct: userProfile.protein_pct || protPct,
          carbs_pct: userProfile.carbs_pct || carbPct,
          fat_pct: userProfile.fat_pct || fatPct,
          protein_per_kg: userProfile.protein_per_kg || (wt > 0 ? (prot / wt).toFixed(1) : '2.0')
        });
      }
    }
  }, [userProfile]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...formData,
        age: parseInt(formData.age, 10),
        weight_kg: parseFloat(formData.weight_kg),
        height_cm: parseFloat(formData.height_cm),
        body_fat_percent: formData.body_fat_percent ? parseFloat(formData.body_fat_percent) : null
      };
      const endpoint = token ? '/tdee/save' : '/tdee/calculate';
      const data = await api.post(endpoint, payload);
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectStyle = {
    width: '100%',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.6)'
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>TDEE Calculator</h1>
        <p className="subtitle">Clinically accurate caloric and macro targets powered by Mifflin-St Jeor & Katch-McArdle formulas.</p>
        <div className="source-badge">
          {token ? "Calculations will be saved automatically to your profile." : "Guest Mode: Calculations won't be saved. Log in to personalize."}
        </div>
      </div>

      <div className="card glass">
        <h3 style={{ fontSize: '15px', marginBottom: '18px', color: 'var(--text-secondary)' }}>Profile Details</h3>
        <form onSubmit={handleSubmit}>
          {/* Row 1: Age + Gender */}
          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Age (years)</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} min="15" max="100" className="form-input" required />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          
          {/* Row 2: Weight + Height */}
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
          
          {/* Row 3: Activity Level + Body Fat % (optional) */}
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
              <label>Body Fat % <span style={{opacity: 0.5, fontSize: '0.8em'}}>(optional)</span></label>
              <input type="number" name="body_fat_percent" value={formData.body_fat_percent} onChange={handleChange} min="3" max="60" step="0.1" className="form-input" placeholder="e.g. 20" />
            </div>
          </div>

          {/* Row 4: Goal + Goal Intensity */}
          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Goal</label>
              <select name="goal" value={formData.goal} onChange={handleChange} className="form-input" style={selectStyle} required>
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
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
          
          {error && <div style={{color: 'red', marginTop: '10px'}}>{error}</div>}
          <button type="submit" className={`btn-primary btn-full ${loading ? 'loading' : ''}`} disabled={loading} style={{marginTop: '15px'}}>
            Calculate {token ? '& Save' : ''}
          </button>
        </form>
      </div>

      {results && (
        <div className="results-area">
          {/* ── Diagnostic Summary ── */}
          {results.bmr && (
            <div className="nutrition-card" style={{marginBottom: '16px'}}>
              <div className="nutrition-header">📊 Diagnostic Breakdown</div>
              <div className="nutrition-source">Formula: {results.formula_used || 'Mifflin-St Jeor'}</div>
              <div className="nutrition-grid">
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color: '#e67e22'}}>{results.bmr}</div>
                  <div className="nutrient-label">BMR</div>
                  <div className="nutrient-unit">kcal/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color: '#3498db'}}>{results.tdee_maintenance}</div>
                  <div className="nutrient-label">Maintenance TDEE</div>
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

          {/* ── Daily Targets (primary) ── */}
          <div className="nutrition-card">
            <div className="nutrition-header">🎯 Your Daily Targets</div>
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

          {/* ── Fiber & Water ── */}
          {results.target_fiber_g && (
            <div className="nutrition-card" style={{marginTop: '16px'}}>
              <div className="nutrition-header">💧 Additional Targets</div>
              <div className="nutrition-grid">
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color: '#8e44ad'}}>{results.target_fiber_g}</div>
                  <div className="nutrient-label">Fiber</div>
                  <div className="nutrient-unit">g/day</div>
                </div>
                <div className="nutrient-box">
                  <div className="nutrient-value" style={{color: '#2980b9'}}>{results.target_water_ml}</div>
                  <div className="nutrient-label">Water</div>
                  <div className="nutrient-unit">ml/day ({(results.target_water_ml / 1000).toFixed(1)} L)</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
