import React, { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getStableFoodEmoji } from '@/shared/utils/emoji';
import { getWeekMenu, saveWeekMenu } from '../services/menu.service';
import { WeekMenu, WEEK_DAYS } from '@/shared/types/kitchen.types';
import { TimerCard } from './TimerCard';
import './MenuPanel.css';

interface MealDraft {
  label: string;
  emoji: string;
  useCustomEmoji?: boolean;
}

const parseMeal = (meal: string): MealDraft => {
  const trimmed = meal.trim();

  const emojiMatch = trimmed.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic})(?:\uFE0F)?[\s-]*(.*)$/u);

  if (emojiMatch) {
    return {
      emoji: emojiMatch[1] ?? '',
      label: emojiMatch[2]?.trim() || '',
      useCustomEmoji: false,
    };
  }

  return { label: trimmed, emoji: '', useCustomEmoji: false };
};

const buildMealString = (meal: MealDraft): string => {
  const safeLabel = meal.label.trim().substring(0, 24);
  const safeEmoji = meal.emoji.trim().slice(0, 4);

  if (!safeLabel) return '';

  return safeEmoji ? `${safeEmoji} ${safeLabel}` : safeLabel;
};

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

interface MenuPanelProps {
  onShowAIMenu?: () => void;
  onShowGrocery?: () => void;
}

export const MenuPanel: React.FC<MenuPanelProps> = ({ onShowAIMenu, onShowGrocery }) => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState<string>(() => getWeekStart());
  const [menu, setMenu] = useState<WeekMenu>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingMeals, setEditingMeals] = useState<MealDraft[]>([{ label: '', emoji: '', useCustomEmoji: false }]);
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
    setEditingMeals(existing.length > 0 ? existing.map(meal => {
      const parsed = parseMeal(meal);
      return { ...parsed, useCustomEmoji: parsed.emoji ? !MEAL_EMOJI_OPTIONS.includes(parsed.emoji) : false };
    }) : [{ label: '', emoji: '', useCustomEmoji: false }]);
  };

  const saveDay = async () => {
    if (!editingDay || !user) return;

    // Filtrer les repas vides et limiter à 24 caractères
    const sanitizedMeals = editingMeals
      .map((meal) => ({
        label: meal.label.trim().substring(0, 24),
        emoji: meal.emoji.trim().slice(0, 4),
      }))
      .filter((meal) => Boolean(meal.label))
      .map(buildMealString);

    const updated: WeekMenu = {
      ...menu,
      [editingDay]: sanitizedMeals,
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingMeals([{ label: '', emoji: '', useCustomEmoji: false }]);

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
      setEditingMeals((prev) => [...prev, { label: '', emoji: '', useCustomEmoji: false }]);
    }
  };

  const updateMealField = (index: number, value: Partial<MealDraft>) => {
    setEditingMeals((prev) => prev.map((meal, i) => (i === index ? { ...meal, ...value } : meal)));
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

  const MEAL_EMOJI_OPTIONS = [
    '🍕', '🍔', '🍝', '🥪', '🍣', '🥞', '🍗', '🥘', '🍲', '🥟', '🍤', '🍛', '🥯', '🌮', '🌯', '🍖', '🥩', '🍜', '🍱', '🍙', '🍚'
  ];

  return (
    <div className="menu-panel">
      {/* Header V2 - Titre + Boutons + Navigation sur 1 ligne */}
      <div className="menu-header-with-period">
        {/* Zone gauche : Titre + Boutons */}
        <div className="menu-header-left">
          <h2 className="menu-title">Menu de la semaine</h2>
          
          <div className="menu-action-btns">
            <button
              className="menu-action-btn"
              onClick={onShowAIMenu}
              type="button"
              title="Menu IA"
            >
              🍽️
            </button>
            
            <button
              className="menu-action-btn"
              onClick={onShowGrocery}
              type="button"
              title="Épicerie"
            >
              🛒
            </button>
          </div>
        </div>
        
        {/* Zone droite : Navigation semaine */}
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

      {/* Grille des jours + Minuteurs (8 éléments) */}
      <div className="menu-days-grid">
        {/* 7 jours de la semaine */}
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
                    const parsed = parseMeal(meal);
                    const emoji = parsed.emoji || getStableFoodEmoji(parsed.label || meal, `${dayKey}-${index}`);
                    const label = parsed.label || meal;

                    return (
                      <div key={`${dayKey}-${index}`} className="meal-item-compact">
                        <div className="meal-icon" aria-hidden>{emoji}</div>
                        <div className="meal-title-compact" title={label}>
                          {label}
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
                Ajouter
              </button>
            </div>
          );
        })}

        {/* 8ème élément : Minuteurs */}
        <TimerCard />
      </div>

      {/* Modal éditeur */}
      {editingDay && (
        <div className="modal-backdrop" onClick={() => setEditingDay(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginBottom: '20px', color: '#f8fafc' }}>{editingDayLabel}</h3>
            
            <div className="meal-editor">
              {editingMeals.map((meal, index) => {
                const charCount = meal.label.length;
                const emoji = meal.emoji || getStableFoodEmoji(meal.label, `${editingDay}-edit-${index}`);
                const selectValue = MEAL_EMOJI_OPTIONS.includes(meal.emoji)
                  ? meal.emoji
                  : meal.useCustomEmoji
                    ? 'custom'
                    : (meal.emoji ? 'custom' : '');
                const showCustomEmojiField = selectValue === 'custom';

                return (
                  <div key={`edit-${index}`} className="meal-editor-row">
                    <span className="meal-emoji" style={{ marginRight: '12px', fontSize: '24px' }}>
                      {emoji}
                    </span>
                    <div className="meal-editor-fields">
                      <div className="emoji-input-group">
                        <label className="emoji-input-label" htmlFor={`emoji-${index}`}>
                          Emoji
                        </label>
                        <div className="emoji-selector">
                          <select
                            id={`emoji-${index}`}
                            className="emoji-select"
                            value={selectValue}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value === 'custom') {
                                updateMealField(index, {
                                  emoji: meal.emoji && !MEAL_EMOJI_OPTIONS.includes(meal.emoji) ? meal.emoji : '',
                                  useCustomEmoji: true,
                                });
                                return;
                              }
                              updateMealField(index, { emoji: value, useCustomEmoji: false });
                            }}
                          >
                            <option value="">Choisir un emoji</option>
                            {MEAL_EMOJI_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="custom">Autre emoji</option>
                          </select>

                          {showCustomEmojiField && (
                            <input
                              className="emoji-input"
                              value={meal.emoji}
                              onChange={(e) => updateMealField(index, { emoji: e.target.value })}
                              placeholder="🍽️"
                              maxLength={4}
                              style={{ width: '100%' }}
                            />
                          ) : null}
                        </div>
                      </div>
                      <div className="meal-label-group">
                        <label className="emoji-input-label" htmlFor={`meal-${index}`}>
                          Nom du repas
                        </label>
                        <input
                          id={`meal-${index}`}
                          autoFocus={index === editingMeals.length - 1}
                          className="grocery-input-enhanced"
                          value={meal.label}
                          onChange={(e) => updateMealField(index, { label: e.target.value })}
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
                  setEditingMeals([{ label: '', emoji: '', useCustomEmoji: false }]);
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
