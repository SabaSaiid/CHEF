import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';

export default function Detection() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [logStatus, setLogStatus] = useState({});  // track per-item log status
  const fileInputRef = useRef(null);
  const imgRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();

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

  const handleSelectDemoImage = async (url, filename) => {
    setLoading(true);
    setResults(null);
    setError(null);
    setLogStatus({});
    setPreview(url);

    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const mockFile = new File([blob], filename, { type: 'image/jpeg' });
      setFile(mockFile);
    } catch (err) {
      const mockFile = new File(["dummy"], filename, { type: 'image/jpeg' });
      setFile(mockFile);
    } finally {
      setLoading(false);
    }
  };


  /** Draw bounding boxes on the canvas overlay */
  const drawBoundingBoxes = useCallback(() => {
    if (!results || !imgRef.current || !canvasRef.current) return;
    const img = imgRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Match canvas to displayed image dimensions
    const rect = img.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    // Position canvas over the image
    const containerRect = img.parentElement.getBoundingClientRect();
    canvas.style.left = `${rect.left - containerRect.left}px`;
    canvas.style.top = `${rect.top - containerRect.top}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const colors = ['#e07a5f', '#81b29a', '#f2cc8f', '#3d405b', '#f4722b', '#38b000'];

    results.detected_foods?.forEach((item, idx) => {
      if (!item.bbox) return;

      const color = colors[idx % colors.length];
      const x1 = item.bbox.x1 * canvas.width;
      const y1 = item.bbox.y1 * canvas.height;
      const x2 = item.bbox.x2 * canvas.width;
      const y2 = item.bbox.y2 * canvas.height;
      const w = x2 - x1;
      const h = y2 - y1;

      // Draw rectangle
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([]);
      ctx.strokeRect(x1, y1, w, h);

      // Semi-transparent fill
      ctx.fillStyle = color + '18';
      ctx.fillRect(x1, y1, w, h);

      // Label background
      const label = `${item.label} ${Math.round(item.confidence * 100)}%`;
      ctx.font = '600 13px Inter, sans-serif';
      const textWidth = ctx.measureText(label).width;
      const labelH = 22;
      const labelY = y1 > labelH + 4 ? y1 - labelH - 4 : y1;

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x1, labelY, textWidth + 14, labelH, 4);
      ctx.fill();

      // Label text
      ctx.fillStyle = '#fff';
      ctx.fillText(label, x1 + 7, labelY + 15);
    });
  }, [results]);

  useEffect(() => {
    if (results && imgRef.current) {
      // Wait for image to render
      const timer = setTimeout(drawBoundingBoxes, 100);
      window.addEventListener('resize', drawBoundingBoxes);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', drawBoundingBoxes);
      };
    }
  }, [results, drawBoundingBoxes]);

  /** Log a detected food item to the Nutrition Tracker */
  const handleLogToTracker = async (item, idx) => {
    const token = localStorage.getItem('chef_token');
    if (!token) {
      toast.error('Please log in to use the Nutrition Tracker.');
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
      toast.success(`${item.label} logged to Tracker ✓`);
    } catch (err) {
      setLogStatus(prev => ({ ...prev, [idx]: 'error' }));
      toast.error('Failed to log item');
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

  // Check if results have bounding boxes (COCO detection) or just classification
  const hasBboxes = results?.detected_foods?.some(item => item.bbox);

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Food Detection (ML)</h1>
        <p className="subtitle">Upload a photo to detect food items, estimate portions, and log calories automatically</p>
      </div>

      <div className="ai-disclaimer-box" style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: '14px 18px',
        background: 'rgba(245, 158, 11, 0.08)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '12px',
        fontSize: '0.84rem',
        color: 'var(--text-primary)',
        marginBottom: '20px',
        lineHeight: '1.5'
      }}>
        <span style={{ fontSize: '1.2rem', lineHeight: 1 }}>⚠️</span>
        <div>
          <strong>AI Vision Safety Notice:</strong> Computer vision food detection analyzes ingredients visually from image shapes and colors. AI scanning <strong>cannot detect microscopic cross-contamination, hidden trace allergens, or invisible spices</strong>. Always verify physical packaging if you have severe life-threatening allergies.
        </div>
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
          onClick={() => { if (!loading) fileInputRef.current.click(); }}
          style={file ? { border: '2px solid var(--primary-color)' } : {}}
        >
          {preview ? (
            <div className="detection-image-container" style={{ position: 'relative' }}>
              <img
                ref={imgRef}
                src={preview}
                alt="Preview"
                onLoad={drawBoundingBoxes}
                style={{
                  maxWidth: '100%', maxHeight: '320px', borderRadius: '12px',
                  objectFit: 'contain', margin: '0 auto', display: 'block'
                }}
              />
              {loading && (
                <div className="ai-scanning-overlay">
                  <div className="ai-scanner-line" />
                  <div className="ai-scanning-text">AI ANALYZING...</div>
                </div>
              )}
              {/* Bounding box canvas overlay */}
              {results && hasBboxes && (
                <canvas ref={canvasRef} className="detection-canvas-overlay" />
              )}
              {/* Classification overlay (no bboxes) */}
              {results && !hasBboxes && results.detected_foods?.length > 0 && (
                <div className="detection-classification-overlay">
                  {results.detected_foods.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="detection-class-badge">
                      <span>{item.label}</span>
                      <div className="detection-conf-bar">
                        <div
                          className="detection-conf-bar-fill"
                          style={{ width: `${Math.round(item.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="class-conf">{Math.round(item.confidence * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
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

        {/* Demo shortcuts when no image uploaded */}
        {!preview && (
          <div className="demo-shortcuts-section" style={{ marginTop: '20px', borderTop: '1px dashed var(--border-glass)', paddingTop: '15px' }}>
            <h4 style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center', fontWeight: '600' }}>
              Don't have an image? Click one of these demo foods to scan:
            </h4>
            <div className="demo-shortcuts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { label: '🍕 Pizza Slice', image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&auto=format&fit=crop&q=80', filename: 'demo_pizza.jpg' },
                { label: '🥗 Fresh Salad', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&auto=format&fit=crop&q=80', filename: 'demo_salad.jpg' },
                { label: '🍌 Banana', image: 'https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=400&auto=format&fit=crop&q=80', filename: 'demo_banana.jpg' }
              ].map((item, idx) => (
                <div 
                  key={idx} 
                  className="demo-shortcut-card card glass"
                  onClick={() => handleSelectDemoImage(item.image, item.filename)}
                  style={{
                    padding: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(255,255,255,0.4)',
                    borderRadius: '10px',
                    textAlign: 'center',
                    fontWeight: '600',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <img 
                    src={item.image} 
                    alt={item.label} 
                    style={{ width: '100%', height: '55px', objectFit: 'cover', borderRadius: '6px' }} 
                  />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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
                    🔥 {Math.round(results.total_estimated_calories)} kcal
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
                              ~{Math.round(item.estimated_calories)} kcal
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
                           '📋 Log to Tracker'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{textAlign: 'center', padding: '24px', color: 'var(--text-muted)'}}>
                  No food items detected. Try a clearer photo.
                </div>
              )}
            </div>

            {/* Search recipes with detected ingredients */}
            {results.detected_ingredients && results.detected_ingredients.length > 0 && (
              <button
                className="btn-secondary btn-full"
                onClick={() => navigate('/recipes', { state: { ingredients: results.detected_ingredients.join(', ') } })}
                style={{marginTop: '10px'}}
              >
                🍽️ Find Recipes with {results.detected_ingredients.length} Detected Ingredient{results.detected_ingredients.length > 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
