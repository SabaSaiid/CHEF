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
    goal: 'maintain'
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
        goal: userProfile.goal || 'maintain'
      });
      if (userProfile.target_calories) {
        setResults({
          target_calories: userProfile.target_calories,
          target_protein: userProfile.target_protein,
          target_carbs: userProfile.target_carbs,
          target_fat: userProfile.target_fat
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
        height_cm: parseFloat(formData.height_cm)
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

  return (
    <section className="page active">
      <div className="page-header">
        <h1>TDEE Calculator</h1>
        <p className="subtitle">Personalized caloric and macro targets based on your goals.</p>
        <div className="source-badge">
          {token ? "Calculations will be saved automatically to your profile." : "Guest Mode: Calculations won't be saved. Log in to personalize."}
        </div>
      </div>

      <div className="card glass">
        <form onSubmit={handleSubmit}>
          <div className="input-row">
            <div className="form-group" style={{flex: 1}}>
              <label>Age (years)</label>
              <input type="number" name="age" value={formData.age} onChange={handleChange} min="15" max="100" className="form-input" required />
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Gender</label>
              <select name="gender" value={formData.gender} onChange={handleChange} className="form-input" style={{width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.6)'}} required>
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
            <div className="form-group" style={{flex: 1}}>
              <label>Activity Level</label>
              <select name="activity_level" value={formData.activity_level} onChange={handleChange} className="form-input" style={{width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.6)'}} required>
                <option value="sedentary">Sedentary (little to no exercise)</option>
                <option value="lightly_active">Lightly active (1-3 days/week)</option>
                <option value="moderately_active">Moderately active (3-5 days/week)</option>
                <option value="very_active">Very active (6-7 days/week)</option>
                <option value="extra_active">Extra active (physical job/training)</option>
              </select>
            </div>
            <div className="form-group" style={{flex: 1}}>
              <label>Goal</label>
              <select name="goal" value={formData.goal} onChange={handleChange} className="form-input" style={{width: '100%', borderRadius: '10px', background: 'rgba(255,255,255,0.6)'}} required>
                <option value="lose">Lose Weight</option>
                <option value="maintain">Maintain Weight</option>
                <option value="gain">Gain Weight</option>
              </select>
            </div>
          </div>
          
          {error && <div style={{color: 'red', marginTop: '10px'}}>{error}</div>}
          <button type="submit" className={`btn-primary btn-full ${loading ? 'loading' : ''}`} disabled={loading} style={{marginTop: '15px'}}>
            Calculate & Save
          </button>
        </form>
      </div>

      {results && (
        <div className="results-area">
          <div className="nutrition-card">
            <div className="nutrition-header">Your Daily Targets</div>
            <div className="nutrition-source">Based on Mifflin-St Jeor equation</div>
            <div className="nutrition-grid">
              <div className="nutrient-box">
                <div className="nutrient-value calories">{results.target_calories}</div>
                <div className="nutrient-label">Calories</div>
                <div className="nutrient-unit">kcal</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_protein}</div>
                <div className="nutrient-label">Protein</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_carbs}</div>
                <div className="nutrient-label">Carbs</div>
                <div className="nutrient-unit">g</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{results.target_fat}</div>
                <div className="nutrient-label">Fat</div>
                <div className="nutrient-unit">g</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
