import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import ChildTimeline, { ChildTimelineEvent } from './components/ChildTimeline';

import { supabase } from '@/shared/utils/supabase';
import { useChildEvents } from './hooks/useChildEvents';
import { useAuth } from '@/shared/hooks/useAuth';

// ✅ IMPORTANT : on lit la sélection enfant globale (gérée par ChildrenWidget)
import { useChildSelection } from './contexts/ChildSelectionContext';

import './Dashboard.css';

const RANGE_DAYS = 14;

type ChildRow = {
  id: string;
  first_name: string;
};

const normalize = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const matchesSelectedChild = (eventTitle: string, childFirstName: string) => {
  const t = normalize(eventTitle);
  const n = normalize(childFirstName);
  if (!n) return false;
  return t.includes(n);
};

const DashboardInner: React.FC = () => {
  const { user } = useAuth();

  // ✅ Sélection centralisée (vient de la zone "Vas-tu atteindre ton objectif ?")
  // Si ton hook s’appelle autrement, ajuste l’import et cette ligne.
  const { selectedChildIndex } = useChildSelection();

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  const celebrationTimerRef = useRef<number | null>(null);
  const [celebrationActive, setCelebrationActive] = useState(false);
  const [completedTodayCount, setCompletedTodayCount] = useState(0);

  const { events, error: eventsError } = useChildEvents(user?.id, RANGE_DAYS);

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

  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const normalizedEvents: ChildTimelineEvent[] = useMemo(() => {
    return (events || []).map((e: any) => ({
      id: e.id,
      title: e.summary || 'Sans titre',
      start: e.start?.dateTime || e.start?.date,
      end: e.end?.dateTime || e.end?.date,
    }));
  }, [events]);

  // Grouping utile, même si on n’affiche qu’un enfant à la fois
  const eventsByChild = useMemo(() => {
    return children.reduce<Record<string, ChildTimelineEvent[]>>((acc, child) => {
      const childEvents = normalizedEvents
        .filter((event) => matchesSelectedChild(event.title, child.first_name))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

      acc[child.id] = childEvents;
      return acc;
    }, {});
  }, [children, normalizedEvents]);

  // ✅ L’enfant sélectionné est le même que dans ChildrenWidget (bloc objectif)
  const selectedChild = useMemo(() => {
    if (children.length === 0) return null;

    const idx =
      typeof selectedChildIndex === 'number' && selectedChildIndex >= 0
        ? selectedChildIndex
        : 0;

    return children[idx] ?? children[0];
  }, [children, selectedChildIndex]);

  const selectedEvents = useMemo(() => {
    if (!selectedChild) return [];
    return eventsByChild[selectedChild.id] || [];
  }, [eventsByChild, selectedChild]);

  const timelineBlockedMessage = useMemo(() => {
    if (childrenError) return childrenError;
    if (children.length === 0) return 'Ajoutez un enfant pour afficher la timeline.';
    if (eventsError) return eventsError;
    return null;
  }, [children.length, childrenError, eventsError]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-body">
        <section className="kids-layout">
          <div className="kids-top kids-goal">
            <div className={`kids-celebration${celebrationActive ? ' is-active' : ''}`}>
              <ChildrenWidget />
            </div>
          </div>

          <div className="kids-top kids-tasks">
            <DailyTasksWidget
              onMilestone={handleCelebration}
              onCompletedTodayCountChange={setCompletedTodayCount}
            />
          </div>

          {/* ✅ Timeline : 1 seule timeline, alignée sur l’enfant sélectionné globalement */}
          <div className="kids-timeline">
            {timelineBlockedMessage ? (
              <div className="timeline-card child-timeline">
                <div className="timeline-empty">{timelineBlockedMessage}</div>
              </div>
            ) : selectedChild ? (
              <ChildTimeline
                childName={selectedChild.first_name}
                events={selectedEvents}
                rangeDays={RANGE_DAYS}
              />
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  return <DashboardInner />;
};
