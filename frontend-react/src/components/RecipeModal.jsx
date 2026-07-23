import React, { useState, useEffect, useContext } from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';
import { AlertTriangle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { calculateMacroPercentages } from '../utils/nutrition';
import { parseIngredient, formatIngredientForServings } from '../utils/ingredientParser';


function InstructionSteps({ instructions }) {
  if (!instructions) {
    return (
      <div className="modal-section" style={{marginTop: '15px'}}>
        <h3>Instructions</h3>
        <p style={{color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '14px'}}>
          No instructions available for this recipe. Try searching for this recipe online for detailed steps.
        </p>
      </div>
    );
  }

  const lines = instructions.split('\n').filter(s => s.trim());
  const hasSections = lines.some(l => l.trim().startsWith('—'));

  return (
    <div className="modal-section" style={{marginTop: '15px'}}>
      <h3>Instructions</h3>
      <div className="instructions-steps">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          
          if (trimmed.startsWith('—') && trimmed.endsWith('—')) {
            return (
              <div key={i} className="instruction-section-header">
                {trimmed.replace(/^—\s*/, '').replace(/\s*—$/, '')}
              </div>
            );
          }

          const stepText = trimmed.replace(/^\d+[\.\\)]\s*/, '');
          const stepNum = i + 1 - lines.slice(0, i).filter(l => l.trim().startsWith('—')).length;

          return (
            <div key={i} className="instruction-step">
              <div className="step-number">{stepNum}</div>
              <div className="step-text">{stepText}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VideoEmbed({ videoUrl, title }) {
  if (!videoUrl) return null;

  let embedUrl = videoUrl;
  if (videoUrl.includes('youtube.com/watch?v=')) {
    const videoId = new URL(videoUrl).searchParams.get('v');
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
  } else if (videoUrl.includes('youtu.be/')) {
    const videoId = videoUrl.split('youtu.be/')[1]?.split('?')[0];
    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
  }

  return (
    <div className="modal-video-section">
      <div className="modal-video-label">
        <span>🎥</span> Cooking Video
      </div>
      <div className="modal-video-wrapper">
        <iframe
          src={embedUrl}
          title={`${title || 'Recipe'} video`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

export default function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;

  const { token, activeProfile } = useContext(AuthContext);
  const toast = useToast();
  const [pantry, setPantry] = useState([]);
  const [substitution, setSubstitution] = useState({});
  const [loadingSub, setLoadingSub] = useState({});
  const [appliedSwaps, setAppliedSwaps] = useState({});

  const handleApplySwap = (originalIng, substituteItem) => {
    setAppliedSwaps(prev => ({
      ...prev,
      [originalIng]: substituteItem
    }));
    toast({
      title: "Swap Applied! 💡",
      description: `Replaced '${originalIng}' with '${substituteItem}' in your recipe view.`,
      status: "success",
      duration: 3000,
      isClosable: true,
    });
  };

  // Cooking Mode states
  const [isCookingMode, setIsCookingMode] = useState(false);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [isPlayingTTS, setIsPlayingTTS] = useState(false);

  // Timer states
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);

  // Auto-Deduct states
  const [showDeductModal, setShowDeductModal] = useState(false);
  const [deductList, setDeductList] = useState([]);

  // Servings state
  const [targetServings, setTargetServings] = useState(recipe.servings || 1);
  const defaultServings = recipe.servings || 1;
  const servingRatio = targetServings / defaultServings;

  useEffect(() => {
    if (recipe) {
      setTargetServings(recipe.servings || 1);
    }
  }, [recipe]);

  useEffect(() => {
    if (token) {
      api.get('/pantry')
        .then(data => setPantry(data))
        .catch(err => console.error("Error loading pantry", err));
    }
  }, [token]);

  // Timer effect
  useEffect(() => {
    let interval = null;
    if (timerActive && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [timerActive, timerSeconds]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  let videoUrl = recipe.video_url;
  if (!videoUrl && recipe.image_url && recipe.image_url.includes('img.youtube.com/vi/')) {
    const videoId = recipe.image_url.split('/vi/')[1].split('/')[0];
    videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  }

  // Parse instructions into steps
  const steps = recipe.instructions
    ? recipe.instructions.split('\n')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('—'))
    : [];

  // Allergen Checking
  const profileAllergens = activeProfile?.allergens
    ? activeProfile.allergens.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
    : [];
  
  const detectedAllergens = recipe.ingredients
    ? profileAllergens.filter(allergen => 
        recipe.ingredients.some(ing => ing.toLowerCase().includes(allergen))
      )
    : [];

  // Pantry check
  const getPantryStatus = (ingStr) => {
    const parsed = parseIngredient(ingStr);
    const targetName = (parsed.name || ingStr).toLowerCase().trim();
    const match = pantry.find(p => {
      const pNorm = p.ingredient_name.toLowerCase().trim();
      return targetName.includes(pNorm) || pNorm.includes(targetName);
    });
    return match ? { inStock: true, item: match } : { inStock: false };
  };

  const handleFinishCooking = () => {
    if (!token || !recipe.ingredients) {
      setIsCookingMode(false);
      return;
    }
    
    // Convert ingredients to checklist
    const list = (Array.isArray(recipe.ingredients) ? recipe.ingredients : [])
      .map(ingStr => {
        const parsed = parseIngredient(ingStr);
        const matchInfo = getPantryStatus(ingStr);
        const qtyToDeduct = (parsed.hasQuantity && parsed.qty) ? Number((parsed.qty * servingRatio).toFixed(2)) : 1.0;
        return {
          name: parsed.name || ingStr,
          qty: qtyToDeduct,
          checked: matchInfo.inStock
        };
      });

    setDeductList(list);
    setShowDeductModal(true);
  };

  const handleToggleDeduct = (idx) => {
    setDeductList(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
  };

  const handleAdjustDeductQty = (idx, delta) => {
    setDeductList(prev => prev.map((item, i) => i === idx ? { ...item, qty: Math.max(0, item.qty + delta) } : item));
  };

  const handleConfirmDeduct = async () => {
    const itemsToDeduct = deductList.filter(item => item.checked && item.qty > 0);
    if (itemsToDeduct.length > 0) {
      try {
        const response = await api.post('/pantry/deduct-recipe', {
          ingredients: itemsToDeduct.map(item => ({ name: item.name, qty: item.qty }))
        });
        toast.success(`Deducted ${response.deducted.length} ingredients from stock ✓`);
      } catch (err) {
        toast.error("Failed to deduct ingredients: " + err.message);
      }
    }
    setShowDeductModal(false);
    setIsCookingMode(false);
    // Reload pantry
    api.get('/pantry')
      .then(data => setPantry(data))
      .catch(err => console.error("Error reloading pantry", err));
  };

  const handleSuggestSubstitute = async (ingName) => {
    try {
      setLoadingSub(prev => ({ ...prev, [ingName]: true }));
      const parsed = parseIngredient(ingName);
      let queryName = parsed.name || ingName;
      const titleParam = recipe?.title ? `?recipe_title=${encodeURIComponent(recipe.title)}` : '';
      const res = await api.get(`/ingredients/substitutes/${encodeURIComponent(queryName)}${titleParam}`);
      
      const hasSub = res && Object.keys(res).some(k => res[k] && (!Array.isArray(res[k]) || res[k].length > 0) && k !== 'notes');
      
      if (hasSub) {
        setSubstitution(prev => ({
          ...prev,
          [ingName]: res
        }));
      } else {
        setSubstitution(prev => ({
          ...prev,
          [ingName]: { fallback: "Try using a similar alternative (e.g. olive oil for butter, tofu for meat) or search online." }
        }));
      }
    } catch (error) {
      console.error("Failed to fetch substitute", error);
      setSubstitution(prev => ({
        ...prev,
        [ingName]: { fallback: "Try using a similar alternative (e.g. olive oil for butter, tofu for meat) or search online." }
      }));
    } finally {
      setLoadingSub(prev => ({ ...prev, [ingName]: false }));
    }
  };

  // Cooking step TTS helper
  const handleSpeak = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (isPlayingTTS) {
        setIsPlayingTTS(false);
      } else {
        const textToSpeak = steps[currentStepIdx].replace(/^\d+[\.\\)]\s*/, '');
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.onend = () => setIsPlayingTTS(false);
        utterance.onerror = () => setIsPlayingTTS(false);
        window.speechSynthesis.speak(utterance);
        setIsPlayingTTS(true);
      }
    }
  };

  const changeStep = (dir) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingTTS(false);
    setCurrentStepIdx(prev => Math.min(Math.max(0, prev + dir), steps.length - 1));
    setTimerSeconds(0);
    setTimerActive(false);
  };

  // Timer helper
  const detectTimeInStep = (text) => {
    const matches = text.match(/(\d+)\s*(minutes|minute|mins|min)/i);
    return matches ? parseInt(matches[1], 10) : 0;
  };

  const currentStepText = steps[currentStepIdx] || "";
  const detectedTime = detectTimeInStep(currentStepText);

  const initTimer = () => {
    setTimerSeconds(detectedTime * 60);
    setTimerActive(true);
  };

  const formatTimer = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}m ${s < 10 ? '0' : ''}${s}s`;
  };

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: isCookingMode ? '700px' : '640px' }}>
        
        {isCookingMode ? (
          /* ── Cooking Mode Screen ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '380px', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '12px' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0, fontWeight: '800', color: 'var(--primary)' }}>
                🍳 Interactive Cooking Mode
              </h2>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                Step {currentStepIdx + 1} of {steps.length}
              </span>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px 10px', textAlign: 'center' }}>
              <p style={{ fontSize: '1.5rem', fontWeight: '500', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                {currentStepText.replace(/^\d+[\.\\)]\s*/, '')}
              </p>

              {/* TTS Button */}
              <button 
                className="water-btn" 
                onClick={handleSpeak}
                style={{ marginTop: '20px', maxWidth: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {isPlayingTTS ? '🔇 Mute Step' : '🔊 Read Aloud'}
              </button>

              {/* Timer Widget */}
              {detectedTime > 0 && (
                <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(242, 204, 143, 0.1)', borderRadius: '12px', border: '1px solid #f2cc8f', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '200px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>⏱️ STEP TIMER</span>
                  <span style={{ fontSize: '1.8rem', fontWeight: '800', margin: '8px 0', color: 'var(--text-primary)' }}>
                    {timerSeconds > 0 ? formatTimer(timerSeconds) : `${detectedTime} min`}
                  </span>
                  
                  {timerSeconds === 0 ? (
                    <button className="water-btn primary-btn" onClick={initTimer} style={{ width: '100%' }}>Start Timer</button>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                      <button className="water-btn" onClick={() => setTimerActive(!timerActive)} style={{ flex: 1 }}>
                        {timerActive ? 'Pause' : 'Resume'}
                      </button>
                      <button className="water-btn" onClick={() => { setTimerSeconds(0); setTimerActive(false); }} style={{ flex: 1 }}>
                        Reset
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-glass)', paddingTop: '15px' }}>
              <button 
                className="water-btn" 
                onClick={() => changeStep(-1)} 
                disabled={currentStepIdx === 0}
                style={{ maxWidth: '120px' }}
              >
                ◀ Previous
              </button>
              
              <button 
                className="water-btn" 
                onClick={() => setIsCookingMode(false)}
                style={{ maxWidth: '120px', color: 'red', borderColor: 'rgba(255,0,0,0.15)' }}
              >
                🚪 Exit
              </button>

              {currentStepIdx < steps.length - 1 ? (
                <button 
                  className="water-btn primary-btn" 
                  onClick={() => changeStep(1)}
                  style={{ maxWidth: '120px' }}
                >
                  Next ▶
                </button>
              ) : (
                <button 
                  className="water-btn primary-btn" 
                  onClick={handleFinishCooking}
                  style={{ maxWidth: '120px', background: '#27ae60', borderColor: '#27ae60' }}
                >
                  🎉 Finish
                </button>
              )}
            </div>
          </div>
        ) : (
          /* ── Standard Recipe View Screen ── */
          <>
            <button className="modal-close" onClick={onClose}>×</button>
            
            {/* Allergen Warning Banner */}
            {detectedAllergens.length > 0 && (
              <div className="allergen-warning-banner">
                <AlertTriangle size={18} className="allergen-icon" />
                <span className="allergen-text">
                  <strong>Allergen Caution:</strong> Contains {detectedAllergens.join(', ')} (violates active profile).
                </span>
              </div>
            )}

            <h2 className="modal-title">{recipe.title}</h2>
            {recipe.summary && <p style={{color: 'var(--text-secondary)', fontSize: '14px'}} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(recipe.summary)}}></p>}
            
            {/* ── YouTube Video Embed or Image ── */}
            {videoUrl ? (
              <VideoEmbed videoUrl={videoUrl} title={recipe.title} />
            ) : recipe.image_url ? (
              <img src={recipe.image_url} alt={recipe.title} style={{width: '100%', height: '250px', objectFit: 'cover', borderRadius: '12px', marginTop: '15px', marginBottom: '15px'}} />
            ) : null}

            {/* Servings Adjuster */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '15px', padding: '10px 15px', background: 'rgba(242, 204, 143, 0.1)', borderRadius: '10px' }}>
                <span style={{ fontWeight: '600', color: 'var(--text-primary)' }}>Servings:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button 
                    className="nav-btn" 
                    onClick={() => setTargetServings(prev => Math.max(1, prev - 1))}
                    style={{ padding: '4px 10px', fontSize: '14px' }}
                  >-</button>
                  <span style={{ fontWeight: '700', fontSize: '1.1rem', minWidth: '30px', textAlign: 'center' }}>{targetServings}</span>
                  <button 
                    className="nav-btn" 
                    onClick={() => setTargetServings(prev => prev + 1)}
                    style={{ padding: '4px 10px', fontSize: '14px' }}
                  >+</button>
                </div>
              </div>
            )}

            {/* Ingredients Check List */}
            {recipe.ingredients && recipe.ingredients.length > 0 && (
              <div className="modal-section" style={{marginTop: '15px'}}>
                <h3>Ingredients</h3>
                <ul style={{ listStyle: 'none', paddingLeft: 0, marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {recipe.ingredients.map((ing, i) => {
                    const check = getPantryStatus(ing);
                    return (
                      <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div className="recipe-ing-row">
                          <div className="recipe-ing-text">
                            <span style={{ color: check.inStock ? '#27ae60' : 'var(--text-primary)', fontWeight: check.inStock ? '600' : 'normal' }}>
                              {check.inStock ? '🟢' : '🔴'}{' '}
                              {appliedSwaps[ing] ? (
                                <span>
                                  <span style={{ textDecoration: 'line-through', opacity: 0.55, marginRight: '6px' }}>
                                    {formatIngredientForServings(ing, servingRatio, targetServings)}
                                  </span>
                                  <span style={{ color: '#059669', fontWeight: '700' }}>
                                    ✨ {appliedSwaps[ing]}
                                  </span>
                                </span>
                              ) : (
                                formatIngredientForServings(ing, servingRatio, targetServings)
                              )}{' '}
                              {check.inStock && <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>(In Pantry)</span>}
                            </span>
                          </div>
                          {!check.inStock && (
                            <button 
                              className={`swap-btn-trigger ${substitution[ing] ? 'active' : ''}`}
                              onClick={() => {
                                if (substitution[ing]) {
                                  setSubstitution(prev => {
                                    const next = { ...prev };
                                    delete next[ing];
                                    return next;
                                  });
                                } else {
                                  handleSuggestSubstitute(ing);
                                }
                              }}
                              disabled={loadingSub[ing]}
                            >
                              {loadingSub[ing] ? '⏳ Finding...' : substitution[ing] ? '✕ Close' : '💡 Suggest Swap'}
                            </button>
                          )}
                        </div>
                        {substitution[ing] && (
                          <div className="swap-glass-card">
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(249, 115, 22, 0.15)', paddingBottom: '6px' }}>
                              <div style={{ fontWeight: '700', fontSize: '0.9rem', color: 'var(--accent-1)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                💡 Ingredient Alternatives
                              </div>
                              <span style={{ fontSize: '0.75rem', opacity: 0.7, color: 'var(--text-muted)' }}>
                                Click any badge to apply swap
                              </span>
                            </div>

                            {substitution[ing].fallback ? (
                               <div style={{ fontSize: '0.86rem', color: 'var(--text-secondary)' }}>{substitution[ing].fallback}</div>
                            ) : (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                  {[
                                    { key: 'vegan', label: 'Vegan', emoji: '🌱', className: 'swap-pill-vegan' },
                                    { key: 'healthy', label: 'Healthy', emoji: '❤️', className: 'swap-pill-healthy' },
                                    { key: 'baking', label: 'Baking', emoji: '🍰', className: 'swap-pill-baking' },
                                    { key: 'gluten_free', label: 'Gluten-Free', emoji: '🌾', className: 'swap-pill-gluten_free' },
                                    { key: 'allergy_friendly', label: 'Allergy Friendly', emoji: '🛡️', className: 'swap-pill-allergy_friendly' },
                                    { key: 'general', label: 'General', emoji: '🧑‍🍳', className: 'swap-pill-general' },
                                  ].map(cat => {
                                    const items = substitution[ing][cat.key];
                                    if (!items || items.length === 0) return null;
                                    return (
                                      <div key={cat.key} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                                        <span style={{ fontSize: '0.78rem', fontWeight: '700', minWidth: '95px', color: 'var(--text-secondary)' }}>
                                          {cat.emoji} {cat.label}:
                                        </span>
                                        {items.map((subItem, sIdx) => (
                                          <span 
                                            key={sIdx} 
                                            className={`swap-badge-pill ${cat.className}`}
                                            onClick={() => handleApplySwap(ing, subItem)}
                                            title={`Click to substitute '${ing}' with '${subItem}'`}
                                          >
                                            {subItem}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })}

                                  {substitution[ing].notes && (
                                    <div className="swap-chef-note">
                                      <div style={{ fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '2px', color: '#d97706' }}>
                                        👨‍🍳 Chef Note & Dish Recommendation:
                                      </div>
                                      <div>{substitution[ing].notes}</div>
                                    </div>
                                  )}
                               </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            <InstructionSteps instructions={recipe.instructions} />

            {recipe.nutrition && (
              <div className="modal-section" style={{marginTop: '15px'}}>
                <h3>Nutrition (per {targetServings} serving{targetServings > 1 ? 's' : ''})</h3>
                
                {(() => {
                  const protein = recipe.nutrition.protein_g || recipe.protein_g || 0;
                  const carbs = recipe.nutrition.carbs_g || recipe.carbs_g || 0;
                  const fat = recipe.nutrition.fat_g || recipe.fat_g || 0;
                  const cals = recipe.nutrition.calories || 0;
                  const { proteinPct: pPct, carbsPct: cPct, fatPct: fPct } = calculateMacroPercentages(protein, carbs, fat, cals);
                  
                  return (
                    <>
                      <div style={{ display: 'flex', height: '12px', borderRadius: '6px', overflow: 'hidden', marginTop: '10px', marginBottom: '15px' }}>
                        {pPct > 0 && <div style={{ width: `${pPct}%`, background: '#e07a5f' }} title={`Protein: ${pPct}%`} />}
                        {cPct > 0 && <div style={{ width: `${cPct}%`, background: '#f2cc8f' }} title={`Carbs: ${cPct}%`} />}
                        {fPct > 0 && <div style={{ width: `${fPct}%`, background: '#81b29a' }} title={`Fat: ${fPct}%`} />}
                      </div>
                      <div className="nutrition-grid" style={{marginTop: '8px'}}>
                        <div className="nutrient-box">
                          <div className="nutrient-value calories">{Math.round((recipe.nutrition.calories || 0) * servingRatio)}<span className="nutrient-unit"> kcal</span></div>
                          <div className="nutrient-label">Calories</div>
                        </div>
                        <div className="nutrient-box">
                          <div className="nutrient-value" style={{ color: '#e07a5f' }}>{Math.round(protein * servingRatio)}<span className="nutrient-unit">g</span></div>
                          <div className="nutrient-label">Protein</div>
                        </div>
                        <div className="nutrient-box">
                          <div className="nutrient-value" style={{ color: '#e6a836' }}>{Math.round(carbs * servingRatio)}<span className="nutrient-unit">g</span></div>
                          <div className="nutrient-label">Carbs</div>
                        </div>
                        <div className="nutrient-box">
                          <div className="nutrient-value" style={{ color: '#81b29a' }}>{Math.round(fat * servingRatio)}<span className="nutrient-unit">g</span></div>
                          <div className="nutrient-label">Fat</div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <div style={{ display: 'flex', gap: '15px', marginTop: '24px', justifyContent: 'center' }}>
              {steps.length > 0 && (
                <button className="btn-primary" onClick={() => setIsCookingMode(true)} style={{ padding: '10px 24px', fontSize: '1rem', borderRadius: '10px' }}>
                  🍳 Start Cooking Mode
                </button>
              )}
              {recipe.source_url && (
                <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" 
                   className="water-btn"
                   style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'auto', padding: '10px 20px', textDecoration: 'none' }}>
                  View Original Recipe ↗
                </a>
              )}
            </div>
          </>
        )}

      {showDeductModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10000,
          padding: '20px'
        }}>
          <div className="card glass" style={{ padding: '24px', maxWidth: '450px', width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', border: '1px solid var(--border-glass)', boxShadow: 'var(--shadow-card)' }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{ fontSize: '2.5rem' }}>🍳</span>
              <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: '10px 0 5px 0', color: 'var(--text-primary)' }}>Meal Cooked!</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>Would you like to deduct these ingredients from your Smart Pantry inventory?</p>
            </div>

            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', padding: '5px' }}>
              {deductList.map((ing, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', flex: 1, color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={ing.checked} 
                      onChange={() => handleToggleDeduct(idx)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ textTransform: 'capitalize', fontSize: '14px', fontWeight: '600' }}>{ing.name}</span>
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button 
                      onClick={() => handleAdjustDeductQty(idx, -0.5)}
                      className="nav-btn"
                      style={{ padding: '2px 6px', fontSize: '12px' }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: '13px', fontWeight: '700', minWidth: '35px', textAlign: 'center', color: 'var(--text-primary)' }}>{ing.qty}</span>
                    <button 
                      onClick={() => handleAdjustDeductQty(idx, 0.5)}
                      className="nav-btn"
                      style={{ padding: '2px 6px', fontSize: '12px' }}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className="water-btn" 
                onClick={() => { setShowDeductModal(false); setIsCookingMode(false); }}
                style={{ flex: 1 }}
              >
                Skip
              </button>
              <button 
                className="water-btn primary-btn" 
                onClick={handleConfirmDeduct}
                style={{ flex: 1 }}
              >
                Deduct & Finish
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>,
    document.body
  );
}
