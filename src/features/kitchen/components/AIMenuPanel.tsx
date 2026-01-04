// src/features/kitchen/components/AIMenuPanel.tsx
// Panneau génération menu + épicerie IA avec preview éditable

import React, { useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { generateMenuAndGrocery } from '../services/ai-menu.service';
import { saveWeekMenu } from '../services/menu.service';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import type { WeekMenu } from '@/shared/types/kitchen.types';
import type { GroceryList, GroceryCategory } from '../types/ai-menu.types';
import './AIMenuPanel.css';

// États du composant
type PanelState = 'idle' | 'generating' | 'preview' | 'success' | 'error';

// Calculer lundi de la semaine
const getWeekStart = (): string => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

// Noms de jours
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const AIMenuPanel: React.FC = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PanelState>('idle');
  const [error, setError] = useState<string | null>(null);
  
  // Données preview éditables
  const [previewMenu, setPreviewMenu] = useState<WeekMenu>({});
  const [previewGrocery, setPreviewGrocery] = useState<GroceryList | null>(null);
  const [weekStart, setWeekStart] = useState<string>('');

  // Lancer génération
  const handleGenerate = async () => {
    if (!user) {
      setError('Utilisateur non connecté');
      setState('error');
      return;
    }

    setState('generating');
    setError(null);

    try {
      console.log('🤖 Début génération menu + épicerie...');

      const currentWeekStart = getWeekStart();
      setWeekStart(currentWeekStart);

      // Appeler service (un seul appel API)
      const result = await generateMenuAndGrocery(user.id, currentWeekStart, 5);

      console.log('✅ Génération réussie');
      console.log('Menu:', result.menu);
      console.log('Épicerie:', result.grocery);
      console.log('Coût:', `$${result.usage.estimated_cost_usd.toFixed(6)}`);

      // Passer en mode preview
      setPreviewMenu(result.menu);
      setPreviewGrocery(result.grocery);
      setState('preview');

    } catch (err) {
      console.error('❌ Erreur génération:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setState('error');
    }
  };

  // Confirmer et sauvegarder
  const handleConfirm = async () => {
    if (!user || !weekStart) return;

    try {
      console.log('💾 Sauvegarde menu + épicerie...');

      // Sauvegarder menu dans MenuPanel
      await saveWeekMenu(user.id, weekStart, previewMenu);

      // Sauvegarder épicerie dans GroceryPanel
      if (previewGrocery) {
        await saveGroceryList(user.id, previewGrocery);
      }

      console.log('✅ Sauvegarde réussie');
      
      setState('success');
      setTimeout(() => setState('idle'), 5000);

    } catch (err) {
      console.error('❌ Erreur sauvegarde:', err);
      setError(err instanceof Error ? err.message : 'Erreur sauvegarde');
      setState('error');
    }
  };

  // Annuler
  const handleCancel = () => {
    setPreviewMenu({});
    setPreviewGrocery(null);
    setState('idle');
  };

  // Éditer repas
  const handleEditMeal = (dayKey: string, index: number, value: string) => {
    setPreviewMenu((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey]?.map((meal, i) => (i === index ? value : meal)) || [],
    }));
  };

  // Supprimer repas
  const handleRemoveMeal = (dayKey: string, index: number) => {
    setPreviewMenu((prev) => ({
      ...prev,
      [dayKey]: prev[dayKey]?.filter((_, i) => i !== index) || [],
    }));
  };

  // Ajouter repas
  const handleAddMeal = (dayKey: string) => {
    setPreviewMenu((prev) => ({
      ...prev,
      [dayKey]: [...(prev[dayKey] || []), ''],
    }));
  };

  // Éditer item épicerie
  const handleEditGroceryItem = (category: GroceryCategory, index: number, value: string) => {
    if (!previewGrocery) return;
    
    setPreviewGrocery((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].map((item, i) => 
          i === index ? { ...item, name: value } : item
        ),
      };
    });
  };

  // Supprimer item épicerie
  const handleRemoveGroceryItem = (category: GroceryCategory, index: number) => {
    if (!previewGrocery) return;
    
    setPreviewGrocery((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: prev[category].filter((_, i) => i !== index),
      };
    });
  };

  // Ajouter item épicerie
  const handleAddGroceryItem = (category: GroceryCategory) => {
    if (!previewGrocery) return;
    
    setPreviewGrocery((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: [...prev[category], { name: '', checked: false }],
      };
    });
  };

  // Render selon état
  return (
    <div className="ai-menu-panel">
      {/* Header */}
      <div className="ai-menu-header">
        <h2 className="ai-menu-title">
          <span className="ai-icon">🤖</span>
          Menu IA
        </h2>
        <p className="ai-menu-subtitle">
          Génération automatique menu + épicerie
        </p>
      </div>

      {/* Content */}
      <div className="ai-menu-content">
        {/* État IDLE */}
        {state === 'idle' && (
          <>
            <div className="ai-feature-list">
              <div className="ai-feature-item">
                <span className="feature-icon">✨</span>
                <span className="feature-text">Menu 7 jours équilibrés</span>
              </div>
              <div className="ai-feature-item">
                <span className="feature-icon">🛒</span>
                <span className="feature-text">Liste épicerie complète</span>
              </div>
              <div className="ai-feature-item">
                <span className="feature-icon">✏️</span>
                <span className="feature-text">Modifiable avant validation</span>
              </div>
            </div>

            <button
              className="ai-generate-btn"
              onClick={handleGenerate}
              disabled={!user}
            >
              <span className="btn-icon">✨</span>
              <span className="btn-text">Générer menu et épicerie</span>
            </button>
          </>
        )}

        {/* État GENERATING */}
        {state === 'generating' && (
          <div className="ai-loading">
            <div className="loading-spinner"></div>
            <p className="loading-text">Génération en cours...</p>
            <p className="loading-subtext">
              Claude génère votre menu et liste d'épicerie
            </p>
          </div>
        )}

        {/* État PREVIEW */}
        {state === 'preview' && (
          <div className="ai-preview-container">
            {/* Preview Menu */}
            <div className="menu-preview-section">
              <div className="preview-header">
                <h3 className="preview-title">🍽️ Menu de la semaine</h3>
              </div>
              <p className="preview-subtitle">
                Modifiez les repas si nécessaire
              </p>

              {Object.keys(previewMenu).map((dayKey, dayIndex) => {
                const meals = previewMenu[dayKey] || [];
                const dayName = DAY_NAMES[dayIndex];

                return (
                  <div key={dayKey} className="preview-day-card">
                    <div className="preview-day-header">{dayName}</div>
                    <div className="preview-meals-list">
                      {meals.map((meal, mealIndex) => {
                        const emoji = getStableFoodEmoji(meal, `${dayKey}-${mealIndex}`);
                        return (
                          <div key={mealIndex} className="preview-meal-row">
                            <span className="meal-emoji-preview">{emoji}</span>
                            <input
                              className="preview-meal-input"
                              value={meal}
                              onChange={(e) => handleEditMeal(dayKey, mealIndex, e.target.value)}
                              placeholder="Nom du repas"
                              maxLength={24}
                            />
                            <button
                              className="remove-meal-btn"
                              onClick={() => handleRemoveMeal(dayKey, mealIndex)}
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        );
                      })}
                      {meals.length < 4 && (
                        <button
                          className="add-meal-btn-preview"
                          onClick={() => handleAddMeal(dayKey)}
                          type="button"
                        >
                          + Ajouter repas
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Preview Épicerie */}
            {previewGrocery && (
              <div className="grocery-preview-section">
                <div className="preview-header">
                  <h3 className="preview-title">🛒 Liste d'épicerie</h3>
                </div>
                <p className="preview-subtitle">
                  Modifiez les ingrédients si nécessaire
                </p>

                {(Object.keys(previewGrocery) as GroceryCategory[]).map((category) => {
                  const items = previewGrocery[category] || [];
                  if (items.length === 0) return null;

                  return (
                    <div key={category} className="grocery-category-block">
                      <div className="grocery-category-title">{category}</div>
                      <div className="grocery-items-list">
                        {items.map((item, index) => (
                          <div key={index} className="grocery-item-row">
                            <input
                              type="checkbox"
                              className="grocery-checkbox"
                              checked={item.checked}
                              readOnly
                            />
                            <input
                              className="preview-grocery-input"
                              value={item.name}
                              onChange={(e) => handleEditGroceryItem(category, index, e.target.value)}
                              placeholder="Nom ingrédient"
                            />
                            <button
                              className="remove-item-btn"
                              onClick={() => handleRemoveGroceryItem(category, index)}
                              type="button"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                        <button
                          className="add-item-btn-preview"
                          onClick={() => handleAddGroceryItem(category)}
                          type="button"
                        >
                          + Ajouter item
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Actions */}
            <div className="preview-actions">
              <button className="cancel-btn" onClick={handleCancel} type="button">
                Annuler
              </button>
              <button className="confirm-btn" onClick={handleConfirm} type="button">
                ✅ Confirmer menu + épicerie
              </button>
            </div>
          </div>
        )}

        {/* État SUCCESS */}
        {state === 'success' && (
          <div className="ai-success">
            <div className="success-icon">✅</div>
            <p className="success-text">Menu et épicerie sauvegardés !</p>
            <p className="success-subtext">
              Consultez le menu et la liste d'épicerie
            </p>
          </div>
        )}

        {/* État ERROR */}
        {state === 'error' && (
          <div className="ai-error">
            <div className="error-icon">❌</div>
            <p className="error-text">Erreur de génération</p>
            <p className="error-details">{error}</p>
            <button className="retry-btn" onClick={handleGenerate} type="button">
              Réessayer
            </button>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="ai-info">
        <p className="info-text">
          💰 Coût estimé : ~$0.004 par génération
        </p>
      </div>
    </div>
  );
};

// Helper: Sauvegarder épicerie dans Supabase
async function saveGroceryList(userId: string, grocery: GroceryList): Promise<void> {
  // Flatten la liste pour Supabase
  const items: Array<{ name: string; checked: boolean; category: string }> = [];
  
  (Object.keys(grocery) as GroceryCategory[]).forEach((category) => {
    grocery[category].forEach((item) => {
      if (item.name.trim()) {
        items.push({
          name: item.name,
          checked: item.checked,
          category,
        });
      }
    });
  });

  // TODO: Implémenter sauvegarde Supabase
  // Pour l'instant, log seulement
  console.log('🛒 Épicerie à sauvegarder:', items);
  
  // À implémenter:
  // await supabase.from('grocery_list').upsert(items.map(i => ({ ...i, user_id: userId })))
}
