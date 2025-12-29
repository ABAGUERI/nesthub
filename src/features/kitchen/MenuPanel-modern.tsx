import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import { getWeekMenu, saveWeekMenu } from '../services/menu.service';
import { WeekMenu, WEEK_DAYS } from '@/shared/types/kitchen.types';

/**
 * Utilitaires de manipulation de dates
 */
const getWeekStart = (reference?: Date): string => {
  const date = reference ? new Date(reference) : new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const addDays = (isoDate: string, offset: number): Date => {
  const date = new Date(isoDate);
  const result = new Date(date);
  result.setDate(date.getDate() + offset);
  return result;
};

const getDayKey = (weekStart: string, offset: number): string => {
  return addDays(weekStart, offset).toISOString();
};

/**
 * MenuPanel - Version moderne verticale
 * Affiche UN jour à la fois en grand format
 */
export const MenuPanel: React.FC = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart());
  const [menu, setMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialiser le jour courant (aujourd'hui de la semaine)
  useEffect(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Lun=0, Dim=6
    setCurrentDayIndex(mondayIndex);
  }, []);

  // Charger le menu au montage et quand la semaine change
  useEffect(() => {
    loadWeekMenu();
  }, [weekStart, user]);

  /**
   * Charger le menu depuis Supabase
   */
  const loadWeekMenu = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getWeekMenu(user.id, weekStart);

      // Initialiser tous les jours même si vides
      const completeMenu: WeekMenu = { ...data };
      WEEK_DAYS.forEach((day) => {
        const key = getDayKey(weekStart, day.offset);
        if (!completeMenu[key]) {
          completeMenu[key] = [];
        }
      });

      setMenu(completeMenu);
    } catch (err) {
      console.error('Week menu load failed', err);
      setError('Menu indisponible');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Changer de jour (navigation)
   */
  const changeDay = (direction: -1 | 1) => {
    const newIndex = currentDayIndex + direction;
    if (newIndex >= 0 && newIndex < WEEK_DAYS.length) {
      setCurrentDayIndex(newIndex);
    }
  };

  /**
   * Ouvrir l'éditeur pour le jour courant
   */
  const openEditor = () => {
    const dayKey = getDayKey(weekStart, WEEK_DAYS[currentDayIndex].offset);
    setEditingDay(dayKey);
    const existing = menu[dayKey] || [];
    setEditingMeals(existing.length ? [...existing] : ['']);
  };

  /**
   * Sauvegarder les modifications
   */
  const saveDay = async () => {
    if (!editingDay || !user) return;

    const sanitizedMeals = editingMeals.map((meal) => meal.trim()).filter(Boolean);

    const updated: WeekMenu = {
      ...menu,
      [editingDay]: sanitizedMeals,
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingMeals([]);

    // Sauvegarder en background
    setSaving(true);
    try {
      await saveWeekMenu(user.id, weekStart, updated);
    } catch (err) {
      console.error('Failed to save menu:', err);
      setError('Erreur lors de la sauvegarde');
      setTimeout(() => loadWeekMenu(), 1000);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Ajouter un champ de repas
   */
  const addMealField = () => {
    setEditingMeals((prev) => [...prev, '']);
  };

  /**
   * Mettre à jour un champ de repas
   */
  const updateMealField = (index: number, value: string) => {
    setEditingMeals((prev) => prev.map((meal, i) => (i === index ? value : meal)));
  };

  /**
   * Supprimer un champ de repas
   */
  const removeMealField = (index: number) => {
    setEditingMeals((prev) => prev.filter((_, i) => i !== index));
  };

  // Jour courant
  const currentDay = WEEK_DAYS[currentDayIndex];
  const dayKey = getDayKey(weekStart, currentDay.offset);
  const dayDate = new Date(dayKey);
  const meals = menu[dayKey] || [];

  /**
   * Rendu du contenu principal
   */
  const renderContent = () => {
    if (loading) {
      return (
        <div className="panel-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
          <div className="skeleton-line" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="panel-empty">
          <p>{error}</p>
          <button className="ghost-btn" onClick={loadWeekMenu}>
            Réessayer
          </button>
        </div>
      );
    }

    return (
      <div className="menu-carousel-container">
        {/* Header avec navigation */}
        <div className="menu-day-header">
          <div className="menu-day-display">
            <span className="menu-day-label-large">{currentDay.fullLabel}</span>
            <span className="menu-day-date">{dayDate.getDate()}</span>
          </div>

          <div className="week-switch">
            <button
              className="ghost-btn"
              onClick={() => changeDay(-1)}
              disabled={currentDayIndex === 0 || saving}
              aria-label="Jour précédent"
            >
              ←
            </button>
            <button
              className="ghost-btn"
              onClick={() => changeDay(1)}
              disabled={currentDayIndex === WEEK_DAYS.length - 1 || saving}
              aria-label="Jour suivant"
            >
              →
            </button>
          </div>
        </div>

        {/* Liste des repas */}
        <div className="menu-meals-vertical">
          {meals.length === 0 ? (
            <div className="menu-meal-empty-large">Aucun repas prévu</div>
          ) : (
            meals.map((meal, index) => {
              const emoji = getStableFoodEmoji(meal, `${dayKey}-${index}`);
              return (
                <div key={`${dayKey}-${index}`} className="menu-meal-card">
                  <span className="menu-emoji-large">{emoji}</span>
                  <span className="menu-meal-text-large">{meal}</span>
                </div>
              );
            })
          )}
        </div>

        {/* Bouton d'ajout */}
        <button
          className="menu-add-meal-btn"
          onClick={openEditor}
          disabled={saving}
          aria-label="Modifier le menu"
        >
          <span>✏️</span>
          <span>Modifier le menu</span>
        </button>
      </div>
    );
  };

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <h3>Menu de la semaine</h3>
        </div>
      </div>

      {renderContent()}

      {/* Modal d'édition */}
      {editingDay && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" onClick={() => setEditingDay(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>
              {WEEK_DAYS[currentDayIndex]?.fullLabel || 'Jour'} {dayDate.getDate()}
            </h3>

            <div className="meal-editor">
              {editingMeals.map((meal, index) => {
                const emoji = getStableFoodEmoji(meal, `${editingDay}-${index}`);
                return (
                  <div key={`edit-${index}`} className="meal-editor-row">
                    <span className="menu-emoji small">{emoji}</span>
                    <input
                      autoFocus={index === editingMeals.length - 1}
                      className="grocery-input"
                      value={meal}
                      onChange={(e) => updateMealField(index, e.target.value)}
                      placeholder="Lasagnes, tacos, salade..."
                    />
                    <button
                      className="ghost-btn ghost-btn-compact"
                      onClick={() => removeMealField(index)}
                      aria-label="Supprimer ce repas"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              <button className="ghost-btn" onClick={addMealField}>
                + Ajouter un repas
              </button>
            </div>

            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setEditingDay(null)} disabled={saving}>
                Annuler
              </button>
              <button className="primary-btn" onClick={saveDay} disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
