import React from 'react';
import { createPortal } from 'react-dom';
import DOMPurify from 'dompurify';

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
  
  // Detect if there are section headers (lines starting with "—")
  const hasSections = lines.some(l => l.trim().startsWith('—'));

  return (
    <div className="modal-section" style={{marginTop: '15px'}}>
      <h3>Instructions</h3>
      <div className="instructions-steps">
        {lines.map((line, i) => {
          const trimmed = line.trim();
          
          // Section header (from Spoonacular multi-section recipes)
          if (trimmed.startsWith('—') && trimmed.endsWith('—')) {
            return (
              <div key={i} className="instruction-section-header">
                {trimmed.replace(/^—\s*/, '').replace(/\s*—$/, '')}
              </div>
            );
          }

          // Regular step — strip leading number
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

/* ── YouTube Embed Helper ─────────────────────────────────────── */
function VideoEmbed({ videoUrl, title }) {
  if (!videoUrl) return null;

  // Ensure the URL is in embed format
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

  return createPortal(
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">{recipe.title}</h2>
        {recipe.summary && <p style={{color: 'var(--text-secondary)', fontSize: '14px'}} dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(recipe.summary)}}></p>}
        
        {/* ── YouTube Video Embed ── */}
        <VideoEmbed videoUrl={recipe.video_url} title={recipe.title} />

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="modal-section" style={{marginTop: '15px'}}>
            <h3>Ingredients</h3>
            <ul>{recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
          </div>
        )}

        <InstructionSteps instructions={recipe.instructions} />

        {recipe.nutrition && (
          <div className="modal-section" style={{marginTop: '15px'}}>
            <h3>Nutrition</h3>
            <div className="nutrition-grid" style={{marginTop: '8px'}}>
              <div className="nutrient-box">
                <div className="nutrient-value calories">{recipe.nutrition.calories}<span className="nutrient-unit"> kcal</span></div>
                <div className="nutrient-label">Calories</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{recipe.nutrition.protein_g || recipe.protein_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Protein</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{recipe.nutrition.carbs_g || recipe.carbs_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Carbs</div>
              </div>
              <div className="nutrient-box">
                <div className="nutrient-value">{recipe.nutrition.fat_g || recipe.fat_g}<span className="nutrient-unit">g</span></div>
                <div className="nutrient-label">Fat</div>
              </div>
            </div>
          </div>
        )}

        {recipe.source_url && (
          <div style={{marginTop: '15px', textAlign: 'center'}}>
            <a href={recipe.source_url} target="_blank" rel="noopener noreferrer" 
               style={{color: 'var(--accent)', fontSize: '14px', textDecoration: 'underline'}}>
              View Original Recipe ↗
            </a>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
