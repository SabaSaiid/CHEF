import React from 'react';

export default function RecipeModal({ recipe, onClose }) {
  if (!recipe) return null;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2 className="modal-title">{recipe.title}</h2>
        {recipe.summary && <p style={{color: 'var(--text-secondary)', fontSize: '14px'}} dangerouslySetInnerHTML={{__html: recipe.summary}}></p>}
        
        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <div className="modal-section" style={{marginTop: '15px'}}>
            <h3>Ingredients</h3>
            <ul>{recipe.ingredients.map((ing, i) => <li key={i}>{ing}</li>)}</ul>
          </div>
        )}

        {recipe.instructions && (
          <div className="modal-section" style={{marginTop: '15px'}}>
            <h3>Instructions</h3>
            <ol className="instructions-list">
              {recipe.instructions.split('\n').filter(s => s.trim()).map((step, i) => (
                <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
              ))}
            </ol>
          </div>
        )}

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
      </div>
    </div>
  );
}
