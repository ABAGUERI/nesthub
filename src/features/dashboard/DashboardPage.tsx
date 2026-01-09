import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import { useAuth } from '@/shared/hooks/useAuth';

import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { GoogleTasksWidget } from './components/GoogleTasksWidget';
import { FinanceWidget } from './components/FinanceWidget';
import { StockTicker } from './components/StockTicker';
import { VehicleWidget } from './components/VehicleWidget';

import { ChildSelectionProvider, useChildSelection } from './contexts/ChildSelectionContext';
import ChildTimeline, { ChildTimelineEvent } from './components/ChildTimeline';

import { getGoogleConnection, getCalendarEventsWithAuth } from '@/features/google/google.service';
import { supabase } from '@/shared/utils/supabase';

import './Dashboard.css';

type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  calendarName?: string;
  calendarId?: string;
};

type ChildRow = {
  id: string;
  first_name: string;
};

const RANGE_DAYS = 28;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

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

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);

  const goPrev = () => setScreenIndex((v) => (v - 1 + screensCount) % screensCount);
  const goNext = () => setScreenIndex((v) => (v + 1) % screensCount);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 1) Charger les enfants (pour obtenir le prénom réel de l’enfant sélectionné)
  useEffect(() => {
    const loadChildren = async () => {
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
    };

    loadChildren();
  }, [user]);

  const selectedChildName = useMemo(() => {
    return children[selectedChildIndex]?.first_name || '';
  }, [children, selectedChildIndex]);

  // 2) Charger les événements Google (même logique que CalendarWidget)
  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    setEventsError(null);

    try {
      const connection = await getGoogleConnection(user.id);
      if (!connection || !connection.accessToken) {
        setEventsError('Connectez ou reconnectez Google pour afficher la timeline.');
        setEvents([]);
        return;
      }

      const calendarIds = [connection.selectedCalendarId || 'primary'];

      const fetchedEvents = await getCalendarEventsWithAuth(
        user.id,
        calendarIds.filter(Boolean) as string[],
        80,
        RANGE_DAYS
      );

      const now = new Date();
      const horizon = new Date(now.getTime() + RANGE_DAYS * 24 * 60 * 60 * 1000);

      const withinRange = fetchedEvents.filter((event: CalendarEvent) => {
        const date = new Date(event.start.dateTime || event.start.date!);
        return date >= now && date <= horizon;
      });

      setEvents(withinRange);
    } catch (error: any) {
      console.error('Error loading calendar events (timeline):', error);
      const isUnauthorized = error?.message === 'unauthorized';
      setEventsError(
        isUnauthorized
          ? 'Session Google expirée : reconnectez-vous dans Paramètres > Google.'
          : 'Impossible de charger les événements Google'
      );
      setEvents([]);
    }
  };

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
      <AppHeader title="Tableau de bord" description="Vue globale des missions familiales, agendas et finances." />

      <div className="dashboard-body">
        <section className="dashboard-carousel">
          <div className="dashboard-carousel-track" style={{ transform: `translateX(-${screenIndex * 100}%)` }}>
            {/* SCREEN 1 — Kids */}
            <div className="dashboard-screen" aria-label="Écran enfants">
              <div className="screen-grid kids-screen">
                <ChildrenWidget />
                <DailyTasksWidget />

                {/* Timeline — enfant sélectionné uniquement */}
                {timelineBlockedMessage ? (
                  <div className="timeline-card glassCard child-timeline fullWidth">
                    <div className="timeline-title cardHeader">
                      Événements à venir pour {selectedChildName || 'votre enfant'}
                    </div>
                    <div className="timeline-empty">{timelineBlockedMessage}</div>
                  </div>
                ) : (
                  <ChildTimeline childName={selectedChildName} events={timelineEvents} rangeDays={RANGE_DAYS} />
                )}
              </div>
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
            ‹
          </button>
          <button className="screen-arrow right" onClick={goNext} aria-label="Écran suivant" type="button">
            ›
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
  return (
    <ChildSelectionProvider>
      <DashboardInner />
    </ChildSelectionProvider>
  );
};
