import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Detection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [logStatus, setLogStatus] = useState({});  // track per-item log status
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResults(null);
      setError(null);
      setLogStatus({});
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      setFile(dropped);
      setPreview(URL.createObjectURL(dropped));
      setResults(null);
      setError(null);
      setLogStatus({});
    }
  };

  const handleDetect = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('chef_token');
    const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

    try {
      const res = await fetch('/api/detect/image', {
        method: 'POST',
        headers: headers,
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Request failed (${res.status})`);
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /** Log a detected food item to the Nutrition Tracker */
  const handleLogToTracker = async (item, idx) => {
    const token = localStorage.getItem('chef_token');
    if (!token) {
      setError('Please log in to use the Nutrition Tracker.');
      return;
    }

    setLogStatus(prev => ({ ...prev, [idx]: 'logging' }));

    try {
      const today = new Date().toISOString().split('T')[0];
      await api.post('/nutrition/log', {
        food_item: item.label,
        calories: item.estimated_calories || 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        quantity: 1,
        unit: `${item.estimated_portion_g || 200}g`,
        meal_slot: 'Snack',
        date: today,
      });

      setLogStatus(prev => ({ ...prev, [idx]: 'done' }));
    } catch (err) {
      setLogStatus(prev => ({ ...prev, [idx]: 'error' }));
    }
  };

  /** Log ALL detected items at once */
  const handleLogAll = () => {
    if (!results?.detected_foods?.length) return;
    results.detected_foods.forEach((item, idx) => {
      if (logStatus[idx] !== 'done') {
        handleLogToTracker(item, idx);
      }
    });
  };

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Food Detection (ML)</h1>
        <p className="subtitle">Upload a photo to detect food items, estimate portions, and log calories automatically</p>
      </div>

      <div className="card glass">
        <input 
          type="file" 
          accept="image/*" 
          style={{display: 'none'}} 
          ref={fileInputRef}
          onClick={(e) => { e.target.value = null; }}
          onChange={handleFileChange} 
        />
        <div 
          className="upload-area" 
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={file ? { border: '2px solid var(--primary-color)' } : {}}
        >
          {preview ? (
            <img src={preview} alt="Preview" style={{
              maxWidth: '100%', maxHeight: '280px', borderRadius: '12px',
              objectFit: 'contain', margin: '0 auto', display: 'block'
            }} />
          ) : (
            <>
              <span className="upload-icon">📸</span>
              <h3>Click or Drag to Upload</h3>
              <p className="upload-hint">Supports JPG, PNG, WebP (Max 10MB)</p>
            </>
          )}
          {file && <div className="selected-file" style={{marginTop: '10px'}}>{file.name}</div>}
        </div>
        <button 
          className={`btn-primary btn-full ${loading ? 'loading' : ''}`} 
          onClick={handleDetect} 
          disabled={!file || loading}
          style={{marginTop: '15px'}}
        >
          {loading ? '🔍 Analyzing...' : '🔍 Analyze Image'}
        </button>
      </div>

      <div className="results-area">
        {error && <div style={{color: '#ff6b6b', padding: '12px', background: 'rgba(255,107,107,0.1)', borderRadius: '10px', marginBottom: '15px'}}>{error}</div>}
        {results && (
          <div>
            {/* Header with model info */}
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px'}}>
              <h3 style={{margin: 0}}>Detected Food Items</h3>
              <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                <span className="source-badge" style={{display: 'inline-block', fontSize: '11px'}}>
                  Model: {results.model_version === 'food101' ? '🍽️ Food-101 (101 classes)' : '📦 Basic (10 classes)'}
                </span>
                <span className="source-badge" style={{display: 'inline-block', fontSize: '11px'}}>
                  {results.message}
                </span>
              </div>
            </div>

            {/* Total estimated calories banner */}
            {results.total_estimated_calories > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, rgba(255,154,0,0.15), rgba(255,80,80,0.1))',
                border: '1px solid rgba(255,154,0,0.3)',
                borderRadius: '12px', padding: '16px', marginBottom: '15px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px'
              }}>
                <div>
                  <div style={{fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px'}}>Total Estimated Calories</div>
                  <div style={{fontSize: '28px', fontWeight: 700, color: 'var(--primary-color)'}}>
                    🔥 {results.total_estimated_calories} kcal
                  </div>
                </div>
                {localStorage.getItem('chef_token') && results.detected_foods?.length > 0 && (
                  <button className="btn-primary" onClick={handleLogAll} style={{fontSize: '13px', padding: '8px 18px'}}>
                    📋 Log All to Tracker
                  </button>
                )}
              </div>
            )}

            {/* Detection results list */}
            <div style={{padding: '0', marginBottom: '15px'}}>
              {results.detected_foods && results.detected_foods.length > 0 ? (
                <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                  {results.detected_foods.map((item, idx) => (
                    <div key={idx} style={{
                      background: 'var(--bg-card)', border: '1px solid var(--border-glass)',
                      borderRadius: '12px', padding: '14px 18px',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      flexWrap: 'wrap', gap: '10px',
                      transition: 'transform 0.15s ease',
                    }}>
                      {/* Left: food info */}
                      <div style={{flex: '1 1 200px'}}>
                        <div style={{fontWeight: 600, fontSize: '16px', textTransform: 'capitalize', marginBottom: '6px'}}>
                          {item.label}
                        </div>
                        <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px'}}>
                          <span className="match-badge">{Math.round(item.confidence * 100)}% confidence</span>
                          {item.estimated_portion_g && (
                            <span style={{
                              background: 'rgba(0,200,150,0.12)', color: '#00c896',
                              padding: '3px 10px', borderRadius: '20px', fontWeight: 500
                            }}>
                              ~{item.estimated_portion_g}g portion
                            </span>
                          )}
                          {item.estimated_calories && (
                            <span style={{
                              background: 'rgba(255,154,0,0.12)', color: '#ff9a00',
                              padding: '3px 10px', borderRadius: '20px', fontWeight: 500
                            }}>
                              ~{item.estimated_calories} kcal
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Log button */}
                      {localStorage.getItem('chef_token') && (
                        <button
                          onClick={() => handleLogToTracker(item, idx)}
                          disabled={logStatus[idx] === 'logging' || logStatus[idx] === 'done'}
                          style={{
                            background: logStatus[idx] === 'done' ? 'rgba(0,200,150,0.15)' : 'rgba(255,255,255,0.08)',
                            border: logStatus[idx] === 'done' ? '1px solid rgba(0,200,150,0.4)' : '1px solid var(--border-glass)',
                            borderRadius: '8px', padding: '6px 14px',
                            cursor: logStatus[idx] === 'done' ? 'default' : 'pointer',
                            fontSize: '12px', fontWeight: 500,
                            color: logStatus[idx] === 'done' ? '#00c896' : 'var(--text-secondary)',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {logStatus[idx] === 'logging' ? '⏳ Logging...' :
                           logStatus[idx] === 'done' ? '✅ Logged' :
                           logStatus[idx] === 'error' ? '❌ Retry' :
                           '📋 Log'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{color: 'var(--text-muted)', textAlign: 'center', padding: '20px'}}>No food items detected. Try a clearer image with visible food.</p>
              )}
            </div>

            {/* Action buttons */}
            {results.ingredients && results.ingredients.length > 0 && (
              <div style={{display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                <button className="btn-secondary" onClick={() => navigate('/recipes', { state: { ingredients: results.ingredients.map(i => i.replace(/_/g, ' ')).join(', ') } })}>
                  🍽️ Search Recipes with these ingredients
                </button>
                <button className="btn-secondary" onClick={() => navigate('/tracker')}>
                  📊 View Nutrition Tracker
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
