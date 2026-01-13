import React, { useMemo, useState } from 'react';
import { getPctInRange, stripChildPrefix } from '../utils/dateHelpers';
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

const formatWeekRange = (start: Date, end: Date) => {
  const startLabel = start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  const endLabel = end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  return `Semaine du ${startLabel}–${endLabel}`;
};

const formatWeekdayDate = (date: Date) =>
  date.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  });

const getRelativeLabel = (date: Date, now: Date) => {
  const diffDays = Math.round((startOfDay(date).getTime() - startOfDay(now).getTime()) / DAY_MS);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays > 1) return `Dans ${diffDays} jours`;
  if (diffDays === -1) return 'Hier';
  return `Il y a ${Math.abs(diffDays)} jours`;
};

const cleanTitle = (title: string, childName: string) => {
  const stripped = stripChildPrefix(title, childName);
  return stripped.replace(/[\p{Extended_Pictographic}]/gu, '').trim();
};

const ChildTimeline: React.FC<Props> = ({ childName, events }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { startRange, endRange } = useMemo(() => {
    const today = startOfDay(new Date());
    const start = addDays(today, weekOffset * 7);
    const end = addDays(start, 6);
    return { startRange: start, endRange: endOfDay(end) };
  }, [weekOffset]);

  const windowLabel = useMemo(() => {
    if (weekOffset === 0) return 'Cette semaine';
    return formatWeekRange(startRange, endRange);
  }, [weekOffset, startRange, endRange]);

  const windowEvents = useMemo(() => {
    const sorted = [...(events || [])].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return sorted.filter((ev) => {
      const date = new Date(ev.start);
      return date.getTime() >= startRange.getTime() && date.getTime() <= endRange.getTime();
    });
  }, [events, startRange, endRange]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    return windowEvents.find((ev) => new Date(ev.start).getTime() >= now.getTime()) || null;
  }, [windowEvents]);

  const visibleEvents = windowEvents.slice(0, 6);
  const remainingEvents = windowEvents.slice(6);
  const remainingCount = remainingEvents.length;

  const selectedEvent = useMemo(() => {
    if (!selectedEventId || selectedEventId === 'overflow') return null;
    return windowEvents.find((ev) => ev.id === selectedEventId) || null;
  }, [selectedEventId, windowEvents]);

  const detailsText = useMemo(() => {
    if (windowEvents.length === 0) {
      return 'Aucun événement cette semaine.';
    }

    if (selectedEventId === 'overflow' && remainingEvents.length > 0) {
      const list = remainingEvents.map((ev) => cleanTitle(ev.title, childName)).join(' · ');
      return `Autres événements: ${list}`;
    }

    const baseEvent = selectedEvent || nextEvent || windowEvents[0];
    if (!baseEvent) return 'Aucun événement cette semaine.';

    const date = new Date(baseEvent.start);
    const relative = getRelativeLabel(date, new Date());
    const label = `${cleanTitle(baseEvent.title, childName)} — ${formatWeekdayDate(date)} (${relative})`;
    if (selectedEvent) return label;

    return `Prochain: ${label}`;
  }, [windowEvents, selectedEvent, selectedEventId, remainingEvents, childName, nextEvent]);

  if (!windowEvents || windowEvents.length === 0) {
    return (
      <div className="timeline-card child-timeline">
        <div className="timeline-header">
          <div className="timeline-title">Timeline enfant — {childName}</div>
          <div className="timeline-week-nav">
            <button
              type="button"
              className="timeline-week-button"
              aria-label="Semaine précédente"
              onClick={() => {
                setWeekOffset((prev) => prev - 1);
                setSelectedEventId(null);
              }}
            >
              ← Semaine précédente
            </button>
            <div className="timeline-week-label">{windowLabel}</div>
            <button
              type="button"
              className="timeline-week-button"
              aria-label="Semaine suivante"
              onClick={() => {
                setWeekOffset((prev) => prev + 1);
                setSelectedEventId(null);
              }}
            >
              Semaine suivante →
            </button>
          </div>
        </div>
        <div className="timeline-empty">Aucun événement cette semaine.</div>
      </div>
    );
  }

  return (
    <div className="timeline-card child-timeline">
      <div className="timeline-header">
        <div className="timeline-title">Timeline enfant — {childName}</div>
        <div className="timeline-week-nav">
          <button
            type="button"
            className="timeline-week-button"
            aria-label="Semaine précédente"
            onClick={() => {
              setWeekOffset((prev) => prev - 1);
              setSelectedEventId(null);
            }}
          >
            ← Semaine précédente
          </button>
          <div className="timeline-week-label">{windowLabel}</div>
          <button
            type="button"
            className="timeline-week-button"
            aria-label="Semaine suivante"
            onClick={() => {
              setWeekOffset((prev) => prev + 1);
              setSelectedEventId(null);
            }}
          >
            Semaine suivante →
          </button>
        </div>
      </div>

      <div className="timeline-rail-zone" aria-label="Timeline des 7 prochains jours">
        <div className="timeline-rail" />
        {weekOffset === 0 && (
          <div className="timeline-today-marker" style={{ left: '0%' }}>
            <span className="timeline-today-line" />
            <span className="timeline-today-label">AUJOURD&apos;HUI</span>
          </div>
        )}

        {visibleEvents.map((event, index) => {
          const eventDate = new Date(event.start);
          const position = getPctInRange(eventDate, startRange, endRange) * 100;
          const isNext = nextEvent?.id === event.id;
          const relative = getRelativeLabel(eventDate, new Date());
          const weekdayDate = formatWeekdayDate(eventDate);
          const title = cleanTitle(event.title, childName);

          return (
            <div
              key={event.id}
              className={`timeline-event ${index % 2 === 0 ? 'is-top' : 'is-bottom'}${
                isNext ? ' is-next' : ''
              }`}
              style={{ left: `${position}%` }}
            >
              <button
                type="button"
                className="timeline-event-button"
                onClick={() => {
                  setSelectedEventId((prev) => (prev === event.id ? null : event.id));
                }}
                aria-label={`Événement: ${title}, ${weekdayDate}, ${relative}. Appuyer pour détails.`}
              >
                <span className="timeline-event-pill">
                  {isNext && <span className="timeline-next-badge">PROCHAIN</span>}
                  <span className="timeline-event-title">{title}</span>
                </span>
              </button>
            </div>
          );
        })}

        {remainingCount > 0 && (
          <div className="timeline-event is-bottom timeline-overflow" style={{ left: '100%' }}>
            <button
              type="button"
              className="timeline-event-button"
              onClick={() => setSelectedEventId('overflow')}
              aria-label={`Afficher les ${remainingCount} autres événements`}
            >
              <span className="timeline-event-pill timeline-overflow-pill">+{remainingCount}</span>
            </button>
          </div>
        )}
      </div>

      <div className="timeline-details" aria-live="polite">
        {detailsText}
      </div>
    </div>
  );
};

export default ChildTimeline;
