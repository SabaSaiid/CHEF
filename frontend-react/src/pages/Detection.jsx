import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function Detection() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setResults(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setResults(null);
      setError(null);
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

  return (
    <section className="page active">
      <div className="page-header">
        <h1>Food Detection (ML)</h1>
        <p className="subtitle">Upload a photo to detect food items using Computer Vision (YOLOv8)</p>
      </div>

      <div className="card glass">
        <input 
          type="file" 
          accept="image/*" 
          style={{display: 'none'}} 
          ref={fileInputRef}
          onChange={handleFileChange} 
        />
        <div 
          className="upload-area" 
          onDragOver={e => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={file ? { border: '2px solid var(--primary-color)' } : {}}
        >
          <span className="upload-icon">📸</span>
          <h3>Click or Drag to Upload</h3>
          <p className="upload-hint">Supports JPG, PNG (Max 5MB)</p>
          {file && <div className="selected-file">{file.name}</div>}
        </div>
        <button 
          className={`btn-primary btn-full ${loading ? 'loading' : ''}`} 
          onClick={handleDetect} 
          disabled={!file || loading}
          style={{marginTop: '15px'}}
        >
          Analyze Image
        </button>
      </div>

      <div className="results-area">
        {error && <div style={{color: 'red'}}>{error}</div>}
        {results && (
          <div>
            <h3 style={{marginBottom: '12px'}}>Detected Ingredients</h3>
            <div className="detection-card" style={{padding: '15px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px', marginBottom: '15px'}}>
              {results.detected_items && results.detected_items.length > 0 ? (
                <ul style={{listStyleType: 'disc', paddingLeft: '20px'}}>
                  {results.detected_items.map((item, idx) => (
                    <li key={idx} style={{textTransform: 'capitalize', padding: '4px 0'}}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p>No food items detected clearly.</p>
              )}
            </div>
            {results.detected_items && results.detected_items.length > 0 && (
              <div className="search-from-parsed">
                <button className="btn-secondary" onClick={() => navigate('/recipes', { state: { ingredients: results.detected_items.join(', ') } })}>
                  Search Recipes with these ingredients
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
