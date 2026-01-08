import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { ChildSelectionProvider, useChildSelection } from './contexts/ChildSelectionContext';
import ChildTimeline, { ChildTimelineEvent } from './components/ChildTimeline';
import './Dashboard.css';

// ⚠️ À BRANCHER sur ta vraie source Google (store / service)
type RawGoogleEvent = {
  id?: string;
  summary?: string;
  title?: string;
  start?: any;
  end?: any;
};

async function getEventsForDashboard(): Promise<RawGoogleEvent[]> {
  return [];
}

const RANGE_DAYS = 28;

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function matchesChildName(title: string, childName: string) {
  const t = (title || '').trim().toLowerCase();
  const n = (childName || '').trim().toLowerCase();
  if (!n) return false;
  return (
    t.startsWith(n) ||
    t.includes(`${n} -`) ||
    t.includes(`${n}-`) ||
    t.includes(`${n} :`) ||
    t.includes(`${n}:`)
  );
}

function normalizeEvents(raw: RawGoogleEvent[]): ChildTimelineEvent[] {
  return (raw || [])
    .map((e) => {
      const title = String(e.title ?? e.summary ?? '').trim();
      const start = e.start?.dateTime ?? e.start?.date ?? e.start ?? null;
      const end = e.end?.dateTime ?? e.end?.date ?? e.end ?? undefined;
      if (!title || !start) return null;

      return {
        id: String(e.id ?? crypto.randomUUID()),
        title,
        start,
        end,
      } as ChildTimelineEvent;
    })
    .filter(Boolean) as ChildTimelineEvent[];
}

const KidsScreen: React.FC = () => {
  const { selectedChildIndex } = useChildSelection();

  // Temporaire tant que Dashboard n’a pas accès aux prénoms depuis Supabase
  const childNames = ['Sifaw', 'Georges', 'Lucas'];
  const selectedChildName = childNames[selectedChildIndex] ?? childNames[0];

  const [rawEvents, setRawEvents] = useState<RawGoogleEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setEventsLoading(true);
      try {
        const ev = await getEventsForDashboard();
        setRawEvents(ev);
      } catch (e) {
        console.error('Dashboard events load failed:', e);
        setRawEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };
    load();
  }, []);

  const filteredChildEvents = useMemo(() => {
    const normalized = normalizeEvents(rawEvents);
    const now = startOfDay(new Date());
    const end = new Date(now);
    end.setDate(end.getDate() + RANGE_DAYS);

    return normalized
      .filter((ev) => {
        const d = new Date(ev.start);
        return d >= now && d <= end;
      })
      .filter((ev) => matchesChildName(ev.title, selectedChildName))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [rawEvents, selectedChildName]);

  return (
    <div className="screen-grid kids-screen">
      <ChildrenWidget />
      <DailyTasksWidget />

      <ChildTimeline childName={selectedChildName} events={filteredChildEvents} rangeDays={RANGE_DAYS} />

      {eventsLoading ? (
        <div style={{ gridColumn: '1 / -1', opacity: 0.45, fontSize: 12, fontWeight: 700 }}>
          Chargement des événements…
        </div>
      ) : null}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const [pageIndex, setPageIndex] = useState(0);
  const pagesCount = 3;

  const goPrev = () => setPageIndex((p) => (p - 1 + pagesCount) % pagesCount);
  const goNext = () => setPageIndex((p) => (p + 1) % pagesCount);

  return (
    <ChildSelectionProvider>
      <div className="dashboard-container carousel-mode">
        <AppHeader title="Tableau de bord" description="Vue globale des missions familiales, agendas et finances." />

        <div className="dashboard-body">
          <section className="dashboard-carousel">
            <button className="screen-arrow left" onClick={goPrev} type="button" aria-label="Page précédente">
              ‹
            </button>

            <div
              className="dashboard-carousel-track"
              style={{ transform: `translateX(-${pageIndex * 100}%)` }}
            >
              {/* PAGE 1: Kids */}
              <div className="dashboard-screen">
                <KidsScreen />
              </div>

              {/* PAGE 2: Agenda (remets tes widgets ici) */}
              <div className="dashboard-screen">
                <div className="screen-grid agenda-screen">
                  {/* Exemple:
                      <CalendarWidget />
                      <GoogleTasksWidget />
                  */}
                  <div className="screen-card">Agenda screen (remets tes widgets ici)</div>
                  <div className="screen-card">Tasks/Notes screen (remets tes widgets ici)</div>
                </div>
              </div>

              {/* PAGE 3: Finance / Mobilité (remets tes widgets ici) */}
              <div className="dashboard-screen">
                <div className="screen-grid mobility-screen">
                  {/* Exemple:
                      <FinanceWidget />
                      <VehicleWidget />
                  */}
                  <div className="screen-card">Finance screen (remets tes widgets ici)</div>
                  <div className="screen-card">Mobilité screen (remets tes widgets ici)</div>
                </div>
              </div>
            </div>

            <button className="screen-arrow right" onClick={goNext} type="button" aria-label="Page suivante">
              ›
            </button>

            <div className="screen-dots" role="tablist" aria-label="Navigation des pages">
              {Array.from({ length: pagesCount }).map((_, i) => (
                <button
                  key={i}
                  className={`screen-dot ${i === pageIndex ? 'active' : ''}`}
                  onClick={() => setPageIndex(i)}
                  type="button"
                  aria-label={`Aller à la page ${i + 1}`}
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </ChildSelectionProvider>
  );
};
