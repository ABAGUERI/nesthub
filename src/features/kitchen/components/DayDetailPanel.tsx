// src/features/kitchen/components/DayDetailPanel.tsx
// Panel overlay pour afficher recette complète

import React from 'react';
import type { Recipe } from '../types/ai-menu.types';
import './DayDetailPanel.css';

interface DayDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  dayName: string;
  dayNumber: number;
  meal: string;
  recipe: Recipe | null;
}

export const DayDetailPanel: React.FC<DayDetailPanelProps> = ({
  isOpen,
  onClose,
  dayName,
  dayNumber,
  meal,
  recipe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="day-detail-overlay" onClick={onClose}>
      <div className="day-detail-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="day-detail-header">
          <div className="header-content">
            <p className="day-detail-title">
              {dayName} {dayNumber}
            </p>
            <h2 className="meal-title">{meal || 'Aucun repas'}</h2>
          </div>
          <button
            className="detail-close-btn"
            onClick={onClose}
            type="button"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="day-detail-content">
          {recipe ? (
            <>
              {/* Meta info */}
              <div className="recipe-meta">
                {recipe.prepTime && (
                  <div className="meta-item">
                    <span className="meta-icon">⏱️</span>
                    <span className="meta-text">{recipe.prepTime} min</span>
                  </div>
                )}
                {recipe.servings && (
                  <div className="meta-item">
                    <span className="meta-icon">👥</span>
                    <span className="meta-text">{recipe.servings} personnes</span>
                  </div>
                )}
              </div>

              {/* Badges */}
              {recipe.tags && recipe.tags.length > 0 && (
                <div className="detail-badges">
                  {recipe.tags.map((tag, index) => (
                    <span key={index} className="detail-badge">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Ingrédients */}
              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">Ingrédients</h3>
                  <ul className="ingredients-list">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index} className="ingredient-item">
                        {ingredient}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Étapes */}
              {recipe.steps && recipe.steps.length > 0 && (
                <div className="detail-section">
                  <h3 className="section-title">Préparation</h3>
                  <ol className="steps-list">
                    {recipe.steps.map((step, index) => (
                      <li key={index} className="step-item">
                        <span className="step-number">{index + 1}</span>
                        <span className="step-text">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </>
          ) : (
            <div className="no-recipe">
              <span className="no-recipe-icon">📝</span>
              <p className="no-recipe-text">Aucune recette disponible</p>
              <p className="no-recipe-subtext">
                Générez un menu avec l'IA pour obtenir des recettes détaillées
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="day-detail-footer">
          <button
            className="detail-close-footer-btn"
            onClick={onClose}
            type="button"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

export default DayDetailPanel;
