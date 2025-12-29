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
 * Composant MenuPanel
 * Affiche et permet d'éditer le menu de la semaine
 */
export const MenuPanel: React.FC = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart());
  const [menu, setMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Formatage de la semaine pour affichage
  const formattedWeek = useMemo(() => {
    const date = new Date(weekStart);
    const end = addDays(weekStart, 6);
    return `${date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} → ${end.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`;
  }, [weekStart]);

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
   * Ouvrir l'éditeur pour un jour
   */
  const openEditor = (dayKey: string) => {
    setEditingDay(dayKey);
    const existing = menu[dayKey] || [];
    setEditingMeals(existing.length ? [...existing] : ['']);
  };

  /**
   * Sauvegarder les modifications d'un jour
   */
  const saveDay = async () => {
    if (!editingDay || !user) return;

    const sanitizedMeals = editingMeals
      .map((meal) => meal.trim())
      .filter(Boolean);

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
      // Recharger pour éviter les incohérences
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

  /**
   * Changer de semaine
   */
  const changeWeek = (direction: -1 | 1) => {
    const delta = direction === -1 ? -7 : 7;
    const newStart = addDays(weekStart, delta);
    setWeekStart(newStart.toISOString());
  };

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
      <div className="menu-grid">
        {WEEK_DAYS.map((day) => {
          const dayKey = getDayKey(weekStart, day.offset);
          const meals = menu[dayKey] || [];
          const dayDate = new Date(dayKey);
          const dayLabel = `${day.label} ${dayDate.getDate()}`;

          return (
            <div
              key={dayKey}
              className="menu-card"
              onClick={() => openEditor(dayKey)}
              role="button"
              tabIndex={0}
              aria-label={`Éditer le menu du ${day.fullLabel}`}
            >
              <div className="menu-card-header">
                <p className="menu-day-label">{dayLabel}</p>
                <button
                  className="ghost-btn ghost-btn-compact"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditor(dayKey);
                  }}
                  aria-label={`Ajouter un repas pour ${day.fullLabel}`}
                >
                  ➕
                </button>
              </div>

              <div className="menu-meals">
                {meals.length === 0 ? (
                  <div className="menu-meal-empty">Ajouter un repas</div>
                ) : (
                  meals.map((meal, index) => {
                    const emoji = getStableFoodEmoji(meal, `${dayKey}-${index}`);
                    return (
                      <div key={`${dayKey}-${index}`} className="menu-meal-chip">
                        <span className="menu-emoji">{emoji}</span>
                        <span className="menu-meal-text">{meal}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <p className="card-kicker">Planification</p>
          <h3>Menu de la semaine</h3>
          <p className="card-caption">{formattedWeek}</p>
        </div>
        <div className="week-switch">
          <button
            className="ghost-btn"
            onClick={() => changeWeek(-1)}
            aria-label="Semaine précédente"
            disabled={saving}
          >
            ←
          </button>
          <button
            className="ghost-btn"
            onClick={() => changeWeek(1)}
            aria-label="Semaine suivante"
            disabled={saving}
          >
            →
          </button>
        </div>
      </div>

      {renderContent()}

      {/* Modal d'édition */}
      {editingDay && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setEditingDay(null)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="card-kicker">Repas</p>
            <h3 style={{ marginTop: '4px', marginBottom: '12px' }}>
              {WEEK_DAYS[new Date(editingDay).getDay() === 0 ? 6 : new Date(editingDay).getDay() - 1]?.fullLabel || 'Jour'}
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
              <button
                className="ghost-btn"
                onClick={() => setEditingDay(null)}
                disabled={saving}
              >
                Annuler
              </button>
              <button
                className="primary-btn"
                onClick={saveDay}
                disabled={saving}
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
