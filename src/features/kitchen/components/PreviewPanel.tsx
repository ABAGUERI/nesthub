// src/features/kitchen/components/PreviewPanel.tsx
// COMPACT - Design serré pour voir tous les jours + boutons

import React, { useState } from 'react';
import type { WeekMenu } from '@/shared/types/kitchen.types';
import type { Recipe, RecipesByDay } from '../types/ai-menu.types';
import './PreviewPanel.css';

interface PreviewPanelProps {
  menu: WeekMenu;
  recipes: RecipesByDay;
  onConfirm: (menu: WeekMenu) => void;
  onRegenerate: () => void;
  onCancel: () => void;
}

const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  menu,
  recipes,
  onConfirm,
  onRegenerate,
  onCancel,
}) => {
  const [editedMenu, setEditedMenu] = useState<WeekMenu>(menu);
  const [draggedItem, setDraggedItem] = useState<{ dateKey: string; mealIndex: number } | null>(null);

  const weekDates = Object.keys(menu).sort();

  const handleDragStart = (dateKey: string, mealIndex: number) => {
    setDraggedItem({ dateKey, mealIndex });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetDateKey: string) => {
    if (!draggedItem) return;

    const { dateKey: sourceDateKey, mealIndex } = draggedItem;
    
    const sourceMeals = [...(editedMenu[sourceDateKey] || [])];
    const [movedMeal] = sourceMeals.splice(mealIndex, 1);

    const targetMeals = [...(editedMenu[targetDateKey] || []), movedMeal];

    setEditedMenu({
      ...editedMenu,
      [sourceDateKey]: sourceMeals,
      [targetDateKey]: targetMeals,
    });

    setDraggedItem(null);
  };

  const handleEditMeal = (dateKey: string, mealIndex: number) => {
    const currentMeal = editedMenu[dateKey]?.[mealIndex];
    const newName = prompt('Nom du repas :', currentMeal);
    
    if (newName && newName.trim()) {
      const meals = [...(editedMenu[dateKey] || [])];
      meals[mealIndex] = newName.trim();
      
      setEditedMenu({
        ...editedMenu,
        [dateKey]: meals,
      });
    }
  };

  const handleRemoveMeal = (dateKey: string, mealIndex: number) => {
    const meals = [...(editedMenu[dateKey] || [])];
    meals.splice(mealIndex, 1);
    
    setEditedMenu({
      ...editedMenu,
      [dateKey]: meals,
    });
  };

  const handleConfirm = () => {
    onConfirm(editedMenu);
  };

  return (
    <div className="preview-panel-compact">
      {/* Header COMPACT */}
      <div className="preview-header-compact">
        <h3 className="preview-title-compact">
          👁️ Aperçu du menu
        </h3>
      </div>

      {/* Grid COMPACT - 7 jours visibles */}
      <div className="preview-grid-compact">
        {weekDates.map((dateKey, index) => {
          const date = new Date(dateKey);
          const dayNumber = date.getDate();
          const dayName = DAY_NAMES[index];
          const meals = editedMenu[dateKey] || [];

          return (
            <div
              key={dateKey}
              className="preview-day-compact"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(dateKey)}
            >
              {/* Header jour */}
              <div className="day-header-compact">
                <span className="day-name-compact">{dayName}</span>
                <span className="day-num-compact">{dayNumber}</span>
              </div>

              {/* Repas */}
              {meals.length > 0 ? (
                meals.map((meal, mealIndex) => (
                  <div
                    key={mealIndex}
                    className="meal-compact"
                    draggable
                    onDragStart={() => handleDragStart(dateKey, mealIndex)}
                  >
                    <span className="meal-text-compact">{meal}</span>
                    <div className="meal-actions-compact">
                      <button
                        className="action-btn-compact edit"
                        onClick={() => handleEditMeal(dateKey, mealIndex)}
                        type="button"
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      <button
                        className="action-btn-compact remove"
                        onClick={() => handleRemoveMeal(dateKey, mealIndex)}
                        type="button"
                        title="Supprimer"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-compact">📭</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions STICKY BOTTOM */}
      <div className="preview-actions-compact">
        <button className="preview-btn-compact cancel" onClick={onCancel} type="button">
          Annuler
        </button>
        <button className="preview-btn-compact regenerate" onClick={onRegenerate} type="button">
          🔄 Regénérer
        </button>
        <button className="preview-btn-compact confirm" onClick={handleConfirm} type="button">
          ✅ Confirmer
        </button>
      </div>
    </div>
  );
};
