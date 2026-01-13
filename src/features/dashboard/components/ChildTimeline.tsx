import React, { useEffect, useMemo, useState } from 'react';
import './ChildTimeline.css';

export type ChildTimelineEvent = {
  id: string;
  title: string;
  start: string; // ISO
  end?: string;  // ISO
};

type Props = {
  childName: string;
  events: ChildTimelineEvent[];
  rangeDays?: number; // conservé pour compat
};

const DAY_COUNT = 7;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function dayKey(d: Date) {
  // YYYY-MM-DD (local)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${da}`;
}

function formatWeekRange(start: Date, end: Date) {
  const fmt = new Intl.DateTimeFormat('fr-CA', { day: '2-digit', month: 'short' });
  // ex: "13 janv." / "19 janv."
  return `CETTE SEMAINE (${fmt.format(start)} — ${fmt.format(end)})`.toUpperCase();
}

function formatDayLabel(d: Date) {
  const wd = new Intl.DateTimeFormat('fr-CA', { weekday: 'short' }).format(d).replace('.', '');
  const dd = new Intl.DateTimeFormat('fr-CA', { day: '2-digit' }).format(d);
  return { wd: wd.toUpperCase(), dd };
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function ChildTimeline({ childName, events }: Props) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string>('');

  const today = useMemo(() => startOfDay(new Date()), []);
  const windowStart = useMemo(() => addDays(today, weekOffset * DAY_COUNT), [today, weekOffset]);
  const windowEnd = useMemo(() => addDays(windowStart, DAY_COUNT - 1), [windowStart]);

  const days = useMemo(() => {
    return Array.from({ length: DAY_COUNT }, (_, i) => addDays(windowStart, i));
  }, [windowStart]);

  const eventsInWindow = useMemo(() => {
    const start = windowStart.getTime();
    const end = addDays(windowEnd, 1).getTime(); // inclusif fin de journée
    return (events || [])
      .map((e) => ({ ...e, _t: new Date(e.start).getTime() }))
      .filter((e) => e._t >= start && e._t < end)
      .sort((a, b) => a._t - b._t);
  }, [events, windowStart, windowEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ChildTimelineEvent[]>();
    for (const e of eventsInWindow) {
      const d = startOfDay(new Date(e.start));
      const k = dayKey(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [eventsInWindow]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return (events || [])
      .map((e) => ({ ...e, _t: new Date(e.start).getTime() }))
      .filter((e) => e._t >= now)
      .sort((a, b) => a._t - b._t)[0];
  }, [events]);

  // initialisation sélection (jour du prochain event si dans la fenêtre, sinon aujourd’hui)
  useEffect(() => {
    const defaultDay = dayKey(today);
    const nextDay = nextEvent ? dayKey(startOfDay(new Date(nextEvent.start))) : defaultDay;

    // si nextDay est dans la fenêtre, on le prend, sinon today
    const inWindow = days.some((d) => dayKey(d) === nextDay);
    setSelectedDay(inWindow ? nextDay : defaultDay);
  }, [today, nextEvent, days]);

  const selectedEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsByDay.get(selectedDay) || [];
  }, [eventsByDay, selectedDay]);

  const selectedMainEvent = selectedEvents[0];

  const headerRangeLabel = useMemo(() => formatWeekRange(windowStart, windowEnd), [windowStart, windowEnd]);

  const subtitle = useMemo(() => {
    if (!selectedMainEvent) return 'Aucun événement cette semaine.';
    const d = startOfDay(new Date(selectedMainEvent.start));
    const when = isSameDay(d, today)
      ? "Aujourd'hui"
      : isSameDay(d, addDays(today, 1))
        ? 'Demain'
        : new Intl.DateTimeFormat('fr-CA', { weekday: 'long' }).format(d);
    return `Prochain : ${selectedMainEvent.title} — ${when}`;
  }, [selectedMainEvent, today]);

  return (
    <div className="child-timeline">
      <div className="ct-head">
        <div className="ct-title">
          <span className="ct-dot" />
          <span>ÉVÉNEMENTS — {childName.toUpperCase()}</span>
        </div>

        <div className="ct-range">
          <span className="ct-range-label">{headerRangeLabel}</span>
          <div className="ct-range-actions">
            <button
              className="ct-icon-btn"
              onClick={() => setWeekOffset((v) => v - 1)}
              aria-label="Semaine précédente"
              title="Semaine précédente"
            >
              ‹
            </button>
            <button
              className="ct-icon-btn"
              onClick={() => setWeekOffset((v) => v + 1)}
              aria-label="Semaine suivante"
              title="Semaine suivante"
            >
              ›
            </button>
          </div>
        </div>
      </div>

      <div className="ct-sub">{subtitle}</div>

      <div className="ct-rail">
        <div className="ct-line" />

        <div className="ct-days">
          {days.map((d) => {
            const k = dayKey(d);
            const { wd, dd } = formatDayLabel(d);
            const has = (eventsByDay.get(k) || []).length > 0;
            const isSel = k === selectedDay;

            return (
              <button
                key={k}
                className={`ct-day ${isSel ? 'is-selected' : ''} ${has ? 'has-event' : ''}`}
                onClick={() => setSelectedDay(k)}
                aria-label={`${wd} ${dd}${has ? ' (événement)' : ''}`}
                title={`${wd} ${dd}`}
              >
                {isSel && selectedMainEvent && (
                  <div className="ct-bubble">
                    <span className="ct-bubble-text">{selectedMainEvent.title}</span>
                    <span className="ct-bubble-caret">▾</span>
                  </div>
                )}

                <div className="ct-dot-wrap">
                  <span className="ct-mark" />
                </div>

                <div className="ct-labels">
                  <div className="ct-wd">{wd}</div>
                  <div className="ct-dd">{dd}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* petit indicateur d’événements multiples (optionnel) */}
        {selectedEvents.length > 1 && (
          <div className="ct-multi">
            + {selectedEvents.length - 1}
          </div>
        )}
      </div>
    </div>
  );
}
