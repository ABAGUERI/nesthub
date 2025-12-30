import React, { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import { getWeekMenu, saveWeekMenu } from '../services/menu.service';
import { WeekMenu, WEEK_DAYS } from '@/shared/types/kitchen.types';

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

const formatWeekRange = (weekStart: string): string => {
  const start = new Date(weekStart);
  const end = addDays(weekStart, 6);
  const startMonth = start.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  const endMonth = end.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
  
  if (startMonth === endMonth) {
    return `${start.getDate()} - ${end.getDate()} ${startMonth}`;
  }
  return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`;
};

export const MenuPanel: React.FC = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart());
  const [menu, setMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState<string[]>(['']);
  const [editingDayLabel, setEditingDayLabel] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadWeekMenu();
  }, [weekStart, user]);

  const loadWeekMenu = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getWeekMenu(user.id, weekStart);
      const completeMenu: WeekMenu = { ...data };
      WEEK_DAYS.forEach((day) => {
        const key = getDayKey(weekStart, day.offset);
        if (!completeMenu[key]) completeMenu[key] = [];
      });
      setMenu(completeMenu);
    } catch (err) {
      console.error('Menu load failed', err);
      setError('Menu indisponible');
    } finally {
      setLoading(false);
    }
  };

  const changeWeek = (direction: -1 | 1) => {
    const currentDate = new Date(weekStart);
    currentDate.setDate(currentDate.getDate() + direction * 7);
    setWeekStart(getWeekStart(currentDate));
  };

  const openEditor = (dayKey: string, dayLabel: string) => {
    setEditingDay(dayKey);
    setEditingDayLabel(dayLabel);
    const existing = menu[dayKey] || [];
    setEditingMeals(existing.length > 0 ? [...existing] : ['']);
  };

  const saveDay = async () => {
    if (!editingDay || !user) return;

    // Filtrer les repas vides et limiter à 24 caractères
    const sanitizedMeals = editingMeals
      .map((meal) => meal.trim())
      .filter(Boolean)
      .map(meal => meal.substring(0, 24)); // Limite à 24 caractères

    const updated: WeekMenu = {
      ...menu,
      [editingDay]: sanitizedMeals,
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingMeals([]);

    setSaving(true);
    try {
      await saveWeekMenu(user.id, weekStart, updated);
    } catch (err) {
      console.error('Save failed:', err);
      setError('Erreur de sauvegarde');
      setTimeout(() => loadWeekMenu(), 1000);
    } finally {
      setSaving(false);
    }
  };

  const addMealField = () => {
    setEditingMeals((prev) => [...prev, '']);
  };

  const updateMealField = (index: number, value: string) => {
    const newValue = value.substring(0, 24); // Limite à 24 caractères
    setEditingMeals((prev) => prev.map((meal, i) => (i === index ? newValue : meal)));
  };

  const removeMealField = (index: number) => {
    setEditingMeals((prev) => prev.filter((_, i) => i !== index));
  };

  const isToday = (dayKey: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayDate = new Date(dayKey);
    dayDate.setHours(0, 0, 0, 0);
    return today.getTime() === dayDate.getTime();
  };

  return (
    <div className="kitchen-card-enhanced">
      <div className="card-header">
        <div>
          <h2 className="card-title">Menu de la semaine</h2>
          <p className="card-subtitle">Planifiez vos repas</p>
        </div>
      </div>

      <div className="menu-week-info">
        <div className="week-display">
          {formatWeekRange(weekStart)}
        </div>
        <div className="week-nav-buttons">
          <button 
            className="ghost-btn week-nav-btn" 
            onClick={() => changeWeek(-1)}
            type="button"
            aria-label="Semaine précédente"
          >
            ←
          </button>
          <button 
            className="ghost-btn week-nav-btn" 
            onClick={() => changeWeek(1)}
            type="button"
            aria-label="Semaine suivante"
          >
            →
          </button>
        </div>
      </div>

      <div className="menu-week-grid-enhanced">
        {WEEK_DAYS.map((day) => {
          const dayKey = getDayKey(weekStart, day.offset);
          const dayDate = new Date(dayKey);
          const meals = menu[dayKey] || [];
          const today = isToday(dayKey);
          const dayName = day.fullLabel.substring(0, 3).toUpperCase();

          return (
            <div
              key={dayKey}
              className={`menu-day-card-enhanced ${today ? 'today' : ''}`}
              onClick={() => openEditor(dayKey, `${day.fullLabel} ${dayDate.getDate()}`)}
              role="button"
              tabIndex={0}
            >
              <div className="day-header">
                <span className="day-name">{dayName}</span>
                <span className="day-number">{dayDate.getDate()}</span>
              </div>

              <div className="day-meals">
                {meals.length === 0 ? (
                  <div className="meal-item" style={{ justifyContent: 'center', opacity: 0.5 }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Aucun repas
                    </span>
                  </div>
                ) : (
                  meals.slice(0, 2).map((meal, index) => {
                    const emoji = getStableFoodEmoji(meal, `${dayKey}-${index}`);
                    return (
                      <div key={`${dayKey}-${index}`} className="meal-item">
                        <span className="meal-emoji">{emoji}</span>
                        <div className="meal-text-container">
                          <div className="meal-text" title={meal}>
                            {meal}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                {meals.length > 2 && (
                  <div className="meal-item" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                    <span className="meal-emoji">+</span>
                    <div className="meal-text-container">
                      <div className="meal-text">
                        {meals.length - 2} repas supplémentaires
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editingDay && (
        <div className="modal-backdrop" onClick={() => setEditingDay(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>{editingDayLabel}</h3>
            
            <div className="meal-editor" style={{ margin: '20px 0' }}>
              {editingMeals.map((meal, index) => {
                const charCount = meal.length;
                const emoji = getStableFoodEmoji(meal, `${editingDay}-${index}`);
                
                return (
                  <div key={`edit-${index}`} className="meal-editor-row">
                    <span className="meal-emoji" style={{ marginRight: '12px' }}>{emoji}</span>
                    <div style={{ flex: 1 }}>
                      <input
                        autoFocus={index === editingMeals.length - 1}
                        className="grocery-input-enhanced"
                        value={meal}
                        onChange={(e) => updateMealField(index, e.target.value)}
                        placeholder="Ex: Spaghetti bolognaise..."
                        maxLength={24}
                        style={{ width: '100%' }}
                      />
                      <div className={`char-counter ${charCount > 20 ? 'warning' : ''} ${charCount >= 24 ? 'error' : ''}`}>
                        {charCount}/24 caractères
                      </div>
                    </div>
                    <button
                      className="ghost-btn ghost-btn-compact"
                      type="button"
                      onClick={() => removeMealField(index)}
                      aria-label="Supprimer ce repas"
                      style={{ marginLeft: '10px' }}
                    >
                      ✕
                    </button>
                  </div>
                );
              })}

              {editingMeals.length < 4 && (
                <button 
                  className="ghost-btn" 
                  type="button" 
                  onClick={addMealField}
                  style={{ marginTop: '16px', width: '100%' }}
                >
                  + Ajouter un repas
                </button>
              )}
            </div>

            <div className="modal-actions">
              <button 
                className="ghost-btn" 
                type="button" 
                onClick={() => setEditingDay(null)} 
                disabled={saving}
              >
                Annuler
              </button>
              <button 
                className="primary-btn" 
                type="button" 
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