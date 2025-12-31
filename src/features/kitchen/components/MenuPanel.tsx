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
      const completeMenu: WeekMenu = {};
      
      // Initialiser tous les jours avec les données chargées ou tableau vide
      WEEK_DAYS.forEach((day) => {
        const key = getDayKey(weekStart, day.offset);
        completeMenu[key] = data[key] || [];
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

  const openEditor = (dayKey: string, dayLabel: string, e: React.MouseEvent) => {
    e.stopPropagation();
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
      .map(meal => meal.substring(0, 24));

    const updated: WeekMenu = {
      ...menu,
      [editingDay]: sanitizedMeals,
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingMeals(['']);

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
    if (editingMeals.length < 4) {
      setEditingMeals((prev) => [...prev, '']);
    }
  };

  const updateMealField = (index: number, value: string) => {
    const newValue = value.substring(0, 24);
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
    <div className="menu-panel">
      {/* Header avec période à droite - TITRE UNIQUE */}
      <div className="menu-header-with-period">
        <h2 className="menu-title">Menu de la semaine</h2>
        
        <div className="week-period-navigation">
          <div className="week-period-text">
            {formatWeekRange(weekStart)}
          </div>
          <div className="week-nav-arrows">
            <button 
              onClick={() => changeWeek(-1)}
              className="week-arrow-btn"
              type="button"
              aria-label="Semaine précédente"
            >
              ←
            </button>
            <button 
              onClick={() => changeWeek(1)}
              className="week-arrow-btn"
              type="button"
              aria-label="Semaine suivante"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Grille des jours */}
      <div className="menu-days-grid">
        {WEEK_DAYS.map((day) => {
          const dayKey = getDayKey(weekStart, day.offset);
          const dayDate = new Date(dayKey);
          const meals = menu[dayKey] || [];
          const today = isToday(dayKey);
          const dayName = day.fullLabel.substring(0, 3).toUpperCase();

          return (
            <div
              key={dayKey}
              className={`menu-day-card ${today ? 'today' : ''}`}
            >
              {/* Header jour compact (nom + date) */}
              <div className="day-header-compact">
                <div className="day-name-text">{dayName}</div>
                <div className="day-number-text">{dayDate.getDate()}</div>
              </div>

              {/* Liste repas */}
              <div className="day-meals">
                {meals.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px 0',
                    color: '#64748b',
                    fontSize: '12px',
                    fontStyle: 'italic'
                  }}>
                    Aucun repas
                  </div>
                ) : (
                  meals.map((meal, index) => {
                    const emoji = getStableFoodEmoji(meal, `${dayKey}-${index}`);
                    return (
                      <div key={`${dayKey}-${index}`} className="meal-item-compact">
                        <div className="meal-icon">{emoji}</div>
                        <div className="meal-title-compact" title={meal}>
                          {meal}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Bouton ajouter */}
              <button 
                className="add-meal-btn-compact"
                onClick={(e) => openEditor(dayKey, `${day.fullLabel} ${dayDate.getDate()}`, e)}
                type="button"
              >
                + Ajouter
              </button>
            </div>
          );
        })}
      </div>

      {/* Modal éditeur */}
      {editingDay && (
        <div className="modal-backdrop" onClick={() => setEditingDay(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', color: '#f8fafc' }}>{editingDayLabel}</h3>
            
            <div className="meal-editor">
              {editingMeals.map((meal, index) => {
                const charCount = meal.length;
                const emoji = getStableFoodEmoji(meal, `${editingDay}-edit-${index}`);
                
                return (
                  <div key={`edit-${index}`} className="meal-editor-row">
                    <span className="meal-emoji" style={{ marginRight: '12px', fontSize: '24px' }}>
                      {emoji}
                    </span>
                    <div style={{ flex: 1 }}>
                      <input
                        autoFocus={index === editingMeals.length - 1}
                        className="grocery-input-enhanced"
                        value={meal}
                        onChange={(e) => updateMealField(index, e.target.value)}
                        placeholder="Ex: Spaghetti bolognaise"
                        maxLength={24}
                        style={{ width: '100%' }}
                      />
                      <div 
                        className={`char-counter ${charCount > 20 ? 'warning' : ''} ${charCount >= 24 ? 'error' : ''}`}
                        style={{ 
                          fontSize: '11px', 
                          color: charCount >= 24 ? '#ef4444' : charCount > 20 ? '#f59e0b' : '#64748b',
                          marginTop: '4px'
                        }}
                      >
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

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button 
                className="ghost-btn" 
                type="button" 
                onClick={() => {
                  setEditingDay(null);
                  setEditingMeals(['']);
                }} 
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
