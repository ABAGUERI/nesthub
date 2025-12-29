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
  const [editingValue, setEditingValue] = useState('');

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
          completeMenu[key] = '';
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
    setEditingValue(menu[dayKey] || '');
  };

  const saveDay = async () => {
    if (!editingDay) return;
    const updated: WeekMenu = {
      ...menu,
      [editingDay]: editingValue.trim(),
    };

    setMenu(updated);
    setEditingDay(null);
    setEditingValue('');
    await saveWeekMenu(weekStart, updated);
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
      <div className="menu-grid">
        {days.map((day) => {
          const dayKey = getDayKey(weekStart, day.offset);
          const meal = menu[dayKey] || '';
          const emoji = getStableFoodEmoji(meal, dayKey);

          return (
            <button key={dayKey} className="menu-row" onClick={() => openEditor(dayKey)}>
              <div className="menu-day">
                <span className="menu-emoji">{emoji}</span>
                <div>
                  <p className="menu-day-label">{day.label}</p>
                  <p className="menu-meal">{meal || 'Ajouter un repas'}</p>
                </div>
              </div>
              <span className="menu-edit">✏️</span>
            </button>
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
            <input
              autoFocus
              className="grocery-input"
              value={editingValue}
              onChange={(e) => setEditingValue(e.target.value)}
              placeholder="Lasagnes, tacos..."
            />
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
