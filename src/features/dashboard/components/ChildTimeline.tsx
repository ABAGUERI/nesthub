import React, { useMemo, useState } from 'react';

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

type GroupedDate = {
  date: Date;
  dateKey: string;
  events: ChildTimelineEvent[];
  position: number;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const stripChildPrefix = (title: string, childName: string) => {
  const t = (title || '').trim();
  const n = (childName || '').trim();

  const candidates = [
    `${n} - `, `${n}- `, `${n} — `, `${n} – `, `${n}: `, `${n} `
  ];

  for (const p of candidates) {
    if (t.toLowerCase().startsWith(p.toLowerCase())) {
      return t.slice(p.length).trim();
    }
  }
  return t;
};

const formatDateAbove = (d: Date) => {
  return d.toLocaleDateString('fr-CA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).toUpperCase();
};

const formatLongDate = (d: Date) => {
  const date = d.toLocaleDateString('fr-CA', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  });
  const weekday = d.toLocaleDateString('fr-CA', { weekday: 'long' });
  return `${date} (${weekday})`;
};

const ChildTimeline: React.FC<Props> = ({ childName, events, rangeDays = 28 }) => {
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null);

  const { startRange, endRange } = useMemo(() => {
    const start = startOfDay(new Date());
    const end = new Date(start.getTime() + rangeDays * 24 * 60 * 60 * 1000);
    return { startRange: start, endRange: end };
  }, [rangeDays]);

  // Grouper les événements par date
  const groupedByDate = useMemo(() => {
    const sorted = [...(events || [])].sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const groups = new Map<string, ChildTimelineEvent[]>();
    
    sorted.forEach((ev) => {
      const d = startOfDay(new Date(ev.start));
      const key = d.toISOString();
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(ev);
    });

    const result: GroupedDate[] = [];
    groups.forEach((evts, key) => {
      const date = new Date(key);
      const pct = clamp01(
        (date.getTime() - startRange.getTime()) / 
        (endRange.getTime() - startRange.getTime())
      );
      result.push({
        date,
        dateKey: key,
        events: evts,
        position: pct * 100,
      });
    });

    return result.sort((a, b) => a.position - b.position);
  }, [events, startRange, endRange]);

  const nextDateKey = useMemo(() => {
    const now = new Date();
    const next = groupedByDate.find((g) => g.date.getTime() >= now.getTime());
    return next?.dateKey || null;
  }, [groupedByDate]);

  // Événement principal à afficher (le prochain) - NOM UNIQUEMENT
  const mainEventText = useMemo(() => {
    if (groupedByDate.length === 0) return null;
    
    const nextGroup = groupedByDate.find((g) => g.dateKey === nextDateKey);
    if (!nextGroup) return null;

    const firstEvent = nextGroup.events[0];
    const cleanTitle = stripChildPrefix(firstEvent.title, childName);
    const dateText = formatLongDate(nextGroup.date);
    
    if (nextGroup.events.length > 1) {
      return `${cleanTitle} — ${dateText} (+ ${nextGroup.events.length - 1} autre${nextGroup.events.length > 2 ? 's' : ''})`;
    }
    
    return `${cleanTitle} — ${dateText}`;
  }, [groupedByDate, nextDateKey, childName]);

  if (!groupedByDate || groupedByDate.length === 0) {
    return (
      <div className="timeline-card glassCard child-timeline fullWidth">
        <div className="timeline-title cardHeader">
          Événements à venir pour {childName}
        </div>
        <div className="timeline-empty">
          Aucun événement sur les 4 prochaines semaines.
        </div>
      </div>
    );
  }

  return (
    <div className="timeline-card glassCard child-timeline fullWidth">
      <div className="timeline-title cardHeader">
        Événements à venir pour {childName}
      </div>
      <div className="timeline-rail-wrap">
        <div className="timeline-rail" />
        
        {/* Aujourd'hui */}
        <div className="timeline-start">Aujourd&apos;hui</div>
        <div 
          className="timeline-dot-container" 
          style={{ left: '0%' }}
        >
          <button
            type="button"
            className="timeline-dot start"
            aria-label="Aujourd'hui"
          />
        </div>

        {/* Dots groupés */}
        {groupedByDate.map((group) => {
          const isNext = group.dateKey === nextDateKey;
          const isHovered = hoveredDateKey === group.dateKey;
          const isActive = activeDateKey === group.dateKey;
          const hasMultiple = group.events.length > 1;

          return (
            <div
              key={group.dateKey}
              className="timeline-dot-container"
              style={{ left: `${group.position}%` }}
              onMouseEnter={() => setHoveredDateKey(group.dateKey)}
              onMouseLeave={() => setHoveredDateKey(null)}
            >
              <div className="timeline-dot-date">
                {formatDateAbove(group.date)}
              </div>
              
              <button
                type="button"
                className={`timeline-dot ${isNext ? 'next' : ''}`}
                aria-label={`${group.events.length} événement${group.events.length > 1 ? 's' : ''} le ${formatLongDate(group.date)}`}
                onFocus={() => setHoveredDateKey(group.dateKey)}
                onBlur={() => setHoveredDateKey(null)}
                onClick={() => {
                  setActiveDateKey((prev) => (prev === group.dateKey ? null : group.dateKey));
                }}
              >
                {hasMultiple && (
                  <div className="timeline-dot-badge">
                    +{group.events.length - 1}
                  </div>
                )}
              </button>

              {(isHovered || isActive) && (
                <div className="timeline-tooltip">
                  {group.events.map((ev, idx) => (
                    <div key={ev.id} className="timeline-tooltip-event">
                      <div>{stripChildPrefix(ev.title, childName)}</div>
                      {idx === 0 && (
                        <div className="timeline-tooltip-date">
                          {formatLongDate(group.date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {mainEventText && (
        <div className="timeline-main-event">{mainEventText}</div>
      )}
    </div>
  );
};

export default ChildTimeline;
