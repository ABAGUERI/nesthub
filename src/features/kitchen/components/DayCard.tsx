// src/features/kitchen/components/DayCard.tsx
// Carte jour avec flip : menu (avant) ↔ recettes (arrière)

import React, { useState } from 'react';
import { RecipeModal } from './RecipeModal';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import { formatRecipeTime } from '../utils/recipe.utils';
import type { Recipe } from '../types/ai-menu.types';
import './DayCard.css';

interface DayCardProps {
  dayName: string;
  dayNumber: number;
  meals: string[];
  recipes: Recipe[];
  onAddMeal?: () => void;
  onRemoveMeal?: (index: number) => void;
}

export const DayCard: React.FC<DayCardProps> = ({
  dayName,
  dayNumber,
  meals,
  recipes,
  onAddMeal,
  onRemoveMeal,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleOpenRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
  };

  const handleCloseRecipe = () => {
    setSelectedRecipe(null);
  };

  return (
    <>
      <div className={`day-card ${isFlipped ? 'flipped' : ''}`}>
        <div className="card-inner">
          {/* FACE AVANT : Menu */}
          <div className="card-front">
            {/* Header */}
            <div className="day-card-header">
              <div className="day-info">
                <h3 className="day-name">{dayName}</h3>
                <span className="day-number">{dayNumber}</span>
              </div>
              <button
                className="flip-btn"
                onClick={handleFlip}
                type="button"
                title="Voir recettes"
              >
                🔄
              </button>
            </div>

            {/* Meals */}
            <div className="meals-list">
              {meals.map((meal, index) => {
                const emoji = getStableFoodEmoji(meal, `${dayName}-${index}`);
                return (
                  <div key={index} className="meal-item">
                    <span className="meal-emoji">{emoji}</span>
                    <span className="meal-name">{meal}</span>
                    {onRemoveMeal && (
                      <button
                        className="remove-meal-icon"
                        onClick={() => onRemoveMeal(index)}
                        type="button"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}

              {onAddMeal && meals.length < 4 && (
                <button className="add-meal-card-btn" onClick={onAddMeal} type="button">
                  + Ajouter repas
                </button>
              )}
            </div>
          </div>

          {/* FACE ARRIÈRE : Recettes */}
          <div className="card-back">
            {/* Header */}
            <div className="day-card-header">
              <div className="day-info">
                <h3 className="day-name">Recettes {dayName}</h3>
              </div>
              <button
                className="flip-btn"
                onClick={handleFlip}
                type="button"
                title="Voir menu"
              >
                🔄
              </button>
            </div>

            {/* Recettes */}
            <div className="recipes-list">
              {recipes.length > 0 ? (
                recipes.map((recipe, index) => (
                  <div key={index} className="recipe-preview">
                    <div className="recipe-preview-header">
                      <h4 className="recipe-preview-name">{recipe.name}</h4>
                      <span className="recipe-preview-time">
                        ⏱️ {formatRecipeTime(recipe.time)}
                      </span>
                    </div>
                    <div className="recipe-preview-ingredients">
                      {recipe.ingredients.slice(0, 2).map((ing, i) => (
                        <span key={i} className="ingredient-tag">
                          • {ing}
                        </span>
                      ))}
                      {recipe.ingredients.length > 2 && (
                        <span className="ingredient-more">
                          +{recipe.ingredients.length - 2}
                        </span>
                      )}
                    </div>
                    <button
                      className="view-recipe-btn"
                      onClick={() => handleOpenRecipe(recipe)}
                      type="button"
                    >
                      🔍 Voir recette
                    </button>
                  </div>
                ))
              ) : (
                <div className="no-recipes">
                  <p>Aucune recette disponible</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal recette */}
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          isOpen={!!selectedRecipe}
          onClose={handleCloseRecipe}
        />
      )}
    </>
  );
};
