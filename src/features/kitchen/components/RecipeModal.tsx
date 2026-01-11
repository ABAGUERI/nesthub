// src/features/kitchen/components/RecipeModal.tsx
// Modal popup pour afficher recette complète

import React from 'react';
import type { Recipe } from '../types/ai-menu.types';
import { formatRecipeTime, formatServings, getDietaryBadges } from '../utils/recipe.utils';
import './RecipeModal.css';

interface RecipeModalProps {
  recipe: Recipe;
  isOpen: boolean;
  onClose: () => void;
}

export const RecipeModal: React.FC<RecipeModalProps> = ({ recipe, isOpen, onClose }) => {
  if (!isOpen) return null;

  const badges = getDietaryBadges(recipe);

  return (
    <div className="recipe-modal-overlay" onClick={onClose}>
      <div className="recipe-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="recipe-modal-header">
          <button className="modal-close-btn" onClick={onClose} type="button">
            ✕
          </button>
          <h2 className="recipe-modal-title">{recipe.name}</h2>
        </div>

        {/* Meta info */}
        <div className="recipe-meta">
          <div className="meta-item">
            <span className="meta-icon">⏱️</span>
            <span className="meta-text">{formatRecipeTime(recipe.time)}</span>
          </div>
          <div className="meta-item">
            <span className="meta-icon">👥</span>
            <span className="meta-text">{formatServings(recipe.servings)}</span>
          </div>
          {recipe.difficulty && (
            <div className="meta-item">
              <span className="meta-icon">📊</span>
              <span className="meta-text">{recipe.difficulty}</span>
            </div>
          )}
        </div>

        {/* Badges restrictions */}
        {badges.length > 0 && (
          <div className="recipe-badges">
            {badges.map((badge, index) => (
              <span key={index} className="badge">
                {badge}
              </span>
            ))}
          </div>
        )}

        {/* Ingrédients */}
        <div className="recipe-section">
          <h3 className="section-title">📋 INGRÉDIENTS</h3>
          <ul className="ingredients-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={index} className="ingredient-item">
                • {ingredient}
              </li>
            ))}
          </ul>
        </div>

        {/* Étapes */}
        <div className="recipe-section">
          <h3 className="section-title">👨‍🍳 ÉTAPES</h3>
          <ol className="steps-list">
            {recipe.steps.map((step, index) => (
              <li key={index} className="step-item">
                <span className="step-number">{index + 1}.</span>
                <span className="step-text">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Footer */}
        <div className="recipe-modal-footer">
          <button className="close-btn" onClick={onClose} type="button">
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
