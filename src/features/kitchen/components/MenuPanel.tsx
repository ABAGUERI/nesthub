import React, { useEffect, useMemo, useState } from 'react';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import { getWeekMenu, saveWeekMenu, WeekMenu } from '../services/menu.service';

const days = [
  { label: 'Lun', offset: 0 },
  { label: 'Mar', offset: 1 },
  { label: 'Mer', offset: 2 },
  { label: 'Jeu', offset: 3 },
  { label: 'Ven', offset: 4 },
  { label: 'Sam', offset: 5 },
  { label: 'Dim', offset: 6 },
];

const getWeekStart = (reference?: Date): string => {
  const date = reference ? new Date(reference) : new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

const addDays = (isoDate: string, offset: number) => {
  const date = new Date(isoDate);
  const result = new Date(date);
  result.setDate(date.getDate() + offset);
  return result;
};

const getDayKey = (weekStart: string, offset: number) => addDays(weekStart, offset).toISOString();

export const MenuPanel: React.FC = () => {
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart());
  const [menu, setMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState<string[]>([]);

  const formattedWeek = useMemo(() => {
    const date = new Date(weekStart);
    const end = addDays(weekStart, 6);
    return `${date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })} → ${end.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`;
  }, [weekStart]);

  useEffect(() => {
    loadWeekMenu();
  }, [weekStart]);

  const loadWeekMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getWeekMenu(weekStart);
      const completeMenu: WeekMenu = { ...data };

      days.forEach((day) => {
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

  const openEditor = (dayKey: string) => {
    setEditingDay(dayKey);
    const existing = menu[dayKey] || [];
    setEditingMeals(existing.length ? existing : ['']);
  };

  const saveDay = async () => {
    if (!editingDay) return;
    const sanitizedMeals = editingMeals.map((meal) => meal.trim()).filter(Boolean);

    const updated: WeekMenu = {
      ...menu,
      [editingDay]: sanitizedMeals,
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingMeals([]);
    await saveWeekMenu(weekStart, updated);
  };

  const addMealField = () => setEditingMeals((prev) => [...prev, '']);

  const updateMealField = (index: number, value: string) => {
    setEditingMeals((prev) => prev.map((meal, i) => (i === index ? value : meal)));
  };

  const removeMealField = (index: number) => {
    setEditingMeals((prev) => prev.filter((_, i) => i !== index));
  };

  const changeWeek = (direction: -1 | 1) => {
    const delta = direction === -1 ? -7 : 7;
    const newStart = addDays(weekStart, delta);
    setWeekStart(newStart.toISOString());
  };

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
      return <div className="panel-empty">{error}</div>;
    }

    return (
      <div className="menu-grid mosaic">
        {days.map((day) => {
          const dayKey = getDayKey(weekStart, day.offset);
          const meals = menu[dayKey] || [];

          return (
            <div key={dayKey} className="menu-card" onClick={() => openEditor(dayKey)}>
              <div className="menu-card-header">
                <p className="menu-day-label">{day.label}</p>
                <button
                  className="ghost-btn ghost-btn-compact"
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditor(dayKey);
                  }}
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
          <button className="ghost-btn" onClick={() => changeWeek(-1)} aria-label="Semaine précédente">
            ←
          </button>
          <button className="ghost-btn" onClick={() => changeWeek(1)} aria-label="Semaine suivante">
            →
          </button>
        </div>
      </div>

      {renderContent()}

      {editingDay && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal-card">
            <p className="card-kicker">Repas</p>
            <div className="meal-editor">
              {editingMeals.map((meal, index) => {
                const emoji = getStableFoodEmoji(meal, `${editingDay}-${index}`);
                return (
                  <div key={`${editingDay}-${index}`} className="meal-editor-row">
                    <span className="menu-emoji small">{emoji}</span>
                    <input
                      autoFocus={index === editingMeals.length - 1}
                      className="grocery-input"
                      value={meal}
                      onChange={(e) => updateMealField(index, e.target.value)}
                      placeholder="Lasagnes, tacos..."
                    />
                    <button className="ghost-btn ghost-btn-compact" onClick={() => removeMealField(index)}>
                      ✕
                    </button>
                  </div>
                );
              })}

              <button className="ghost-btn" onClick={addMealField}>
                Ajouter un repas
              </button>
            </div>
            <div className="modal-actions">
              <button className="ghost-btn" onClick={() => setEditingDay(null)}>
                Annuler
              </button>
              <button className="primary-btn" onClick={saveDay}>
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
