import React, { useEffect, useMemo, useRef, useState } from "react";

export type ChildTimelineEvent = {
  id: string;
  title: string;
  start: string | Date;
  end?: string | Date;
};

type Props = {
  childName: string;
  events: ChildTimelineEvent[];
  rangeDays?: number; // default 28
};

function toDate(d: string | Date): Date {
  return d instanceof Date ? d : new Date(d);
}

function startOfDay(date: Date): Date {
  const x = new Date(date);
  x.setHours(0, 0, 0, 0);
  return x;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// "SAM 10 Janv."
function formatShortFR(date: Date): string {
  const fmt = new Intl.DateTimeFormat("fr-CA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });

  // ex: "sam. 10 janv."
  const raw = fmt.format(date).replace(".", "");
  const parts = raw.split(" ");
  const weekday = (parts[0] ?? "").toUpperCase();
  const day = parts[1] ?? "";
  const monthRaw = parts[2] ?? "";
  const month = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  return `${weekday} ${day} ${month}`;
}

// "samedi 10 janvier 2026"
function formatLongFR(date: Date): string {
  return new Intl.DateTimeFormat("fr-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function stripChildPrefix(title: string, childName: string): string {
  const t = title.trim();
  const dash1 = `${childName} - `;
  const dash2 = `${childName}-`;
  if (t.toLowerCase().startsWith(dash1.toLowerCase())) return t.slice(dash1.length).trim();
  if (t.toLowerCase().startsWith(dash2.toLowerCase())) return t.slice(dash2.length).trim();
  return t;
}

export default function ChildTimeline({ childName, events, rangeDays = 28 }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const startRange = useMemo(() => startOfDay(new Date()), []);
  const endRange = useMemo(() => {
    const d = new Date(startRange);
    d.setDate(d.getDate() + rangeDays);
    return d;
  }, [startRange, rangeDays]);

  const prepared = useMemo(() => {
    const startMs = startRange.getTime();
    const endMs = endRange.getTime();
    const todayMs = startOfDay(new Date()).getTime();

    const inRange = events
      .map((e) => {
        const start = toDate(e.start);
        const ms = start.getTime();
        const pct = clamp01((ms - startMs) / (endMs - startMs));
        return {
          ...e,
          start,
          ms,
          pct,
          shortTitle: stripChildPrefix(e.title, childName),
        };
      })
      .filter((e) => e.ms >= startMs && e.ms <= endMs)
      .sort((a, b) => a.ms - b.ms);

    const next = inRange.find((e) => e.ms >= todayMs) ?? inRange[0];
    return { inRange, next };
  }, [events, childName, startRange, endRange]);

  // close tooltip when clicking outside (mobile tap)
  useEffect(() => {
    if (!openId) return;
    const onDown = (ev: MouseEvent | TouchEvent) => {
      const el = rootRef.current;
      if (!el) return;
      if (!el.contains(ev.target as Node)) setOpenId(null);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [openId]);

  const label = useMemo(() => {
    if (!prepared.next) return null;
    return `${formatShortFR(prepared.next.start)} — ${prepared.next.shortTitle}`;
  }, [prepared.next]);

  return (
    <div className="timeline-card" ref={rootRef} role="region" aria-label={`Événements à venir pour ${childName}`}>
      <div className="timeline-label" title={label ?? ""}>
        {label ?? `Aucun événement pour ${childName} sur les 4 prochaines semaines`}
      </div>

      <div className="timeline-rail-wrap">
        <div className="timeline-rail" />

        {prepared.inRange.map((e) => {
          const isNext = prepared.next?.id === e.id;
          const left = `${(e.pct * 100).toFixed(2)}%`;
          const open = openId === e.id;

          return (
            <button
              key={e.id}
              type="button"
              className={`timeline-dot${isNext ? " next" : ""}`}
              style={{ left }}
              aria-label={`${e.shortTitle} — ${formatLongFR(e.start)}`}
              data-open={open ? "true" : "false"}
              onClick={() => setOpenId((cur) => (cur === e.id ? null : e.id))}
              onKeyDown={(ev) => {
                if (ev.key === "Escape") setOpenId(null);
              }}
            >
              <div className="timeline-tooltip" role="tooltip">
                <div className="timeline-tooltip-title">{e.shortTitle}</div>
                <div className="timeline-tooltip-date">{formatLongFR(e.start)}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
