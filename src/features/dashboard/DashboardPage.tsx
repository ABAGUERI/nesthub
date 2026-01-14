import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { GoogleTasksWidget } from './components/GoogleTasksWidget';
import { FinanceWidget } from './components/FinanceWidget';
import { StockTicker } from './components/StockTicker';
import { VehicleWidget } from './components/VehicleWidget';

import { useChildSelection } from './contexts/ChildSelectionContext';
import ChildTimeline, { ChildTimelineEvent } from './components/ChildTimeline';

import { supabase } from '@/shared/utils/supabase';
import { useChildEvents } from './hooks/useChildEvents';

import './Dashboard.css';

type ChildRow = {
  id: string;
  first_name: string;
};

const RANGE_DAYS = 28;

// const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const matchesSelectedChild = (title: string, childName: string) => {
  // Matching strict comme tu le veux: commence par "Prenom" ou contient "Prenom -"
  const t = (title || '').trim().toLowerCase();
  const n = (childName || '').trim().toLowerCase();
  return t.startsWith(n) || t.includes(`${n} -`);
};

const DashboardInner: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex } = useChildSelection();

  const [screenIndex, setScreenIndex] = useState(0);
  const screensCount = 4;

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [childrenError, setChildrenError] = useState<string | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const celebrationTimerRef = useRef<number | null>(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

  const { events, error: eventsError } = useChildEvents(user?.id, RANGE_DAYS);

  const goPrev = useCallback(() => {
    setScreenIndex((v) => (v - 1 + screensCount) % screensCount);
  }, [screensCount]);

  const goNext = useCallback(() => {
    setScreenIndex((v) => (v + 1) % screensCount);
  }, [screensCount]);

  const handleScrollToTimeline = useCallback(() => {
    timelineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCelebration = useCallback(() => {
    if (celebrationTimerRef.current) {
      window.clearTimeout(celebrationTimerRef.current);
    }
    setCelebrationActive(true);
    celebrationTimerRef.current = window.setTimeout(() => {
      setCelebrationActive(false);
      celebrationTimerRef.current = null;
    }, 900);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    return () => {
      if (celebrationTimerRef.current) {
        window.clearTimeout(celebrationTimerRef.current);
      }
    };
  }, []);

  const loadChildren = useCallback(async () => {
    if (!user) return;

    setChildrenError(null);

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, first_name')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (error) throw error;
      setChildren((data as ChildRow[]) || []);
    } catch (e: any) {
      console.error('Error loading children:', e);
      setChildren([]);
      setChildrenError('Impossible de charger la liste des enfants.');
    }
  }, [user]);

  // 1) Charger les enfants (pour obtenir le prénom réel de l’enfant sélectionné)
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const selectedChildName = useMemo(() => {
    return children[selectedChildIndex]?.first_name || '';
  }, [children, selectedChildIndex]);

  // 3) Timeline = STRICTEMENT l’enfant sélectionné
  const timelineEvents: ChildTimelineEvent[] = useMemo(() => {
    if (!selectedChildName) return [];

    const normalized: ChildTimelineEvent[] = (events || []).map((e) => ({
      id: e.id,
      title: e.summary || 'Sans titre',
      start: e.start.dateTime || e.start.date!,
      end: e.end?.dateTime || e.end?.date,
    }));

    return normalized
      .filter((e) => matchesSelectedChild(e.title, selectedChildName))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, selectedChildName]);

  const timelineBlockedMessage = useMemo(() => {
    if (childrenError) return childrenError;
    if (!selectedChildName) return "Sélectionnez un enfant pour afficher sa timeline.";
    if (eventsError) return eventsError;
    return null;
  }, [childrenError, selectedChildName, eventsError]);

  return (
    <div className="dashboard-container carousel-mode">
      <div className="dashboard-body">
        <section className="dashboard-carousel">
          <div className="dashboard-carousel-track" style={{ transform: `translateX(-${screenIndex * 100}%)` }}>
            {/* SCREEN 1 — Kids */}
            <div className="dashboard-screen" aria-label="Écran enfants">
              <div className="kids-screen-actions">
                <button type="button" className="kids-screen-link" onClick={handleScrollToTimeline}>
                  Voir événements
                </button>
              </div>
              <div className={`kids-celebration-toast${celebrationActive ? ' is-visible' : ''}`}>
                Bravo — 2 tâches aujourd&apos;hui
              </div>
              <section className="kids-layout">
                <div className="kids-top kids-goal">
                  <div className={`kids-celebration${celebrationActive ? ' is-active' : ''}`}>
                    {completedTodayCount >= 2 && (
                      <div className="kids-magic-badge" aria-live="polite">
                        Bravo — {completedTodayCount} tâches aujourd&apos;hui
                      </div>
                    )}
                    <ChildrenWidget />
                  </div>
                </div>
                <div className="kids-top kids-tasks">
                  <DailyTasksWidget
                    onMilestone={handleCelebration}
                    onCompletedTodayCountChange={setCompletedTodayCount}
                  />
                </div>

                {/* Timeline — enfant sélectionné uniquement */}
                <div ref={timelineRef} className="kids-timeline">
                  {timelineBlockedMessage ? (
                    <div className="timeline-card child-timeline">
                      <div className="timeline-empty">{timelineBlockedMessage}</div>
                    </div>
                  ) : (
                    <ChildTimeline childName={selectedChildName} events={timelineEvents} rangeDays={RANGE_DAYS} />
                  )}
                </div>
              </section>
            </div>

            {/* SCREEN 2 — Agenda */}
            <div className="dashboard-screen" aria-label="Écran agenda">
              <div className="screen-grid agenda-screen">
                <CalendarWidget />
                <GoogleTasksWidget />
              </div>
            </div>

            {/* SCREEN 3 — Finance */}
            <div className="dashboard-screen" aria-label="Écran finances">
              <div className="screen-grid mobility-screen">
                <FinanceWidget />
                <StockTicker />
              </div>
            </div>

            {/* SCREEN 4 — Mobility */}
            <div className="dashboard-screen" aria-label="Écran mobilité">
              <div className="screen-grid mobility-screen">
                <VehicleWidget />
                <div className="screen-card">
                  <div className="widget">
                    <div className="widget-header">
                      <div className="widget-title">Raccourcis</div>
                    </div>
                    <div className="widget-scroll">
                      <div className="empty-message">
                        Ajoutez ici vos raccourcis (ex: entretien, pneus, stationnement).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button className="screen-arrow left" onClick={goPrev} aria-label="Écran précédent" type="button">
            <span className="screen-arrow-icon">‹</span>
            <span className="screen-arrow-label">
              <span>ÉCRAN</span>
              <span>PRÉCÉDENT</span>
            </span>
          </button>
          <button className="screen-arrow right" onClick={goNext} aria-label="Écran suivant" type="button">
            <span className="screen-arrow-icon">›</span>
            <span className="screen-arrow-label">
              <span>ÉCRAN</span>
              <span>SUIVANT</span>
            </span>
          </button>

          <div className="screen-dots" role="tablist" aria-label="Navigation des écrans">
            {Array.from({ length: screensCount }).map((_, i) => (
              <button
                key={i}
                className={`screen-dot ${i === screenIndex ? 'active' : ''}`}
                onClick={() => setScreenIndex(i)}
                aria-label={`Aller à l'écran ${i + 1}`}
                type="button"
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  return <DashboardInner />;
};
