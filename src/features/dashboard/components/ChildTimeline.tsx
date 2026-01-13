import React, { useEffect, useMemo, useState } from 'react';
import { stripChildPrefix } from '../utils/dateHelpers';
import './ChildTimeline.css';

export type ChildTimelineEvent = {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
};

type Props = {
  childName: string;
  events: ChildTimelineEvent[];
  rangeDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

const startOfWeek = (d: Date) => {
  const day = d.getDay();
  const diff = (day + 6) % 7;
  return startOfDay(addDays(d, -diff));
};

const formatDateRange = (start: Date, end: Date) => {
  const format = (date: Date) =>
    date
      .toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
      })
      .replace('.', '')
      .toUpperCase();

  return `${format(start)} — ${format(end)}`;
};

const formatWeekdayLabel = (date: Date) => {
  const label = date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '');
  return label.toUpperCase();
};

const formatDayLabel = (date: Date) => {
  const day = date.toLocaleDateString('fr-FR', { day: 'numeric' });
  return `${formatWeekdayLabel(date)} ${day}`;
};

const formatRelativeLabel = (date: Date) => {
  const now = startOfDay(new Date());
  const diffDays = Math.round((startOfDay(date).getTime() - now.getTime()) / DAY_MS);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === -1) return 'Hier';
  return date
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' })
    .replace('.', '');
};

const formatTimeLabel = (date: Date) =>
  date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

const formatKey = (date: Date) => date.toISOString().slice(0, 10);

const cleanTitle = (title: string, childName: string) => {
  const stripped = stripChildPrefix(title, childName);
  return stripped.replace(/[\p{Extended_Pictographic}]/gu, '').trim();
};

const ChildTimeline: React.FC<Props> = ({ childName, events }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [dayEventIndex, setDayEventIndex] = useState(0);

  const weekBaseDate = useMemo(() => addDays(selectedDate, weekOffset * 7), [selectedDate, weekOffset]);
  const weekStart = useMemo(() => startOfWeek(weekBaseDate), [weekBaseDate]);
  const weekEnd = useMemo(() => endOfDay(addDays(weekStart, 6)), [weekStart]);

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const weekEvents = useMemo(() => {
    const sorted = [...(events || [])].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return sorted.filter((ev) => {
      const date = new Date(ev.start);
      return date.getTime() >= weekStart.getTime() && date.getTime() <= weekEnd.getTime();
    });
  }, [events, weekStart, weekEnd]);

  const eventsByDay = useMemo(() => {
    return weekEvents.reduce<Record<string, ChildTimelineEvent[]>>((acc, ev) => {
      const key = formatKey(startOfDay(new Date(ev.start)));
      if (!acc[key]) acc[key] = [];
      acc[key].push(ev);
      return acc;
    }, {});
  }, [weekEvents]);

  const selectedDisplayDate = useMemo(() => addDays(selectedDate, weekOffset * 7), [selectedDate, weekOffset]);
  const selectedKey = formatKey(startOfDay(selectedDisplayDate));
  const selectedDayIndex = useMemo(
    () => days.findIndex((day) => formatKey(day) === selectedKey),
    [days, selectedKey]
  );

  const selectedDayEvents = eventsByDay[selectedKey] || [];

  useEffect(() => {
    setDayEventIndex(0);
  }, [selectedKey]);

  const selectedEvent = selectedDayEvents[dayEventIndex] || null;

  const nextEvent = useMemo(() => {
    const now = new Date();
    return weekEvents.find((ev) => new Date(ev.start).getTime() >= now.getTime()) || weekEvents[0] || null;
  }, [weekEvents]);

  const detailsText = useMemo(() => {
    if (!nextEvent) return 'Aucun événement cette semaine.';
    const date = new Date(nextEvent.start);
    return `Prochain : ${cleanTitle(nextEvent.title, childName)} — ${formatRelativeLabel(date)}`;
  }, [nextEvent, childName]);

  const weekLabel = useMemo(() => formatDateRange(weekStart, weekEnd), [weekStart, weekEnd]);

  return (
    <div className="timeline-card child-timeline">
      <div className="timeline-header">
        <div className="timeline-header-left">
          <div className="timeline-header-title">ÉVÉNEMENTS — {childName}</div>
          <div className="timeline-info" aria-live="polite">
            {detailsText}
          </div>
        </div>
        <div className="timeline-header-right">
          <div className="timeline-week-label">CETTE SEMAINE ({weekLabel})</div>
          <div className="timeline-week-actions">
            <button
              type="button"
              className="timeline-week-icon"
              aria-label="Semaine précédente"
              onClick={() => {
                setWeekOffset((prev) => prev - 1);
              }}
            >
              ‹
            </button>
            <button
              type="button"
              className="timeline-week-icon"
              aria-label="Semaine suivante"
              onClick={() => {
                setWeekOffset((prev) => prev + 1);
              }}
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="timeline-rail-zone" aria-label="Timeline de la semaine">
        <div className="timeline-rail" />

        {days.map((day, index) => {
          const left = `${(index / 6) * 100}%`;
          const key = formatKey(day);
          const isSelected = key === selectedKey;
          const count = eventsByDay[key]?.length || 0;

          return (
            <div key={key} className="timeline-day" style={{ left }}>
              <button
                type="button"
                className={`timeline-dot${isSelected ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelectedDate(addDays(day, -weekOffset * 7));
                  setDayEventIndex(0);
                }}
                aria-label={`Jour ${formatDayLabel(day)}${count ? `, ${count} événement${count > 1 ? 's' : ''}` : ''}`}
              >
                <span className="timeline-dot-core" />
              </button>
            </div>
          );
        })}

        {selectedEvent && selectedDayIndex >= 0 && (
          <div className="timeline-event-bubble" style={{ left: `${(selectedDayIndex / 6) * 100}%` }}>
            <div className="timeline-event-pill">
              <div className="timeline-event-title">{cleanTitle(selectedEvent.title, childName)}</div>
              <div className="timeline-event-meta">{formatTimeLabel(new Date(selectedEvent.start))}</div>
            </div>
            {selectedDayEvents.length > 1 && (
              <button
                type="button"
                className="timeline-event-more"
                onClick={() =>
                  setDayEventIndex((prev) => (prev + 1) % (selectedDayEvents.length || 1))
                }
                aria-label="Voir les autres événements"
              >
                +{selectedDayEvents.length - 1}
              </button>
            )}
          </div>
        )}

        <div className="timeline-labels">
          {days.map((day, index) => {
            const left = `${(index / 6) * 100}%`;
            return (
              <div key={formatKey(day)} className="timeline-day-label" style={{ left }}>
                {formatDayLabel(day)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChildTimeline;
