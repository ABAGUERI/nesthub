import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';

import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
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

  // 1) Charger les enfants (pour obtenir le prénom réel de l’enfant sélectionné)
  useEffect(() => {
    loadChildren();
  }, [loadChildren]);

  const normalizedEvents: ChildTimelineEvent[] = useMemo(() => {
    return (events || []).map((e) => ({
      id: e.id,
      title: e.summary || 'Sans titre',
      start: e.start.dateTime || e.start.date!,
      end: e.end?.dateTime || e.end?.date,
    }));
  }, [events]);

  // 3) Timeline = multi-enfants
  const eventsByChild = useMemo(() => {
    return children.reduce<Record<string, ChildTimelineEvent[]>>((acc, child) => {
      const childEvents = normalizedEvents
        .filter((event) => matchesSelectedChild(event.title, child.first_name))
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
      acc[child.id] = childEvents;
      return acc;
    }, {});
  }, [children, normalizedEvents]);

  const timelineBlockedMessage = useMemo(() => {
    if (childrenError) return childrenError;
    if (children.length === 0) return "Ajoutez un enfant pour afficher la timeline.";
    if (eventsError) return eventsError;
    return null;
  }, [children.length, childrenError, eventsError]);

  return (
    <div className="dashboard-container">
      <div className="dashboard-body">
        <section className="kids-layout">
          <div className="kids-top kids-goal">
            <div className={`kids-celebration${celebrationActive ? ' is-active' : ''}`}>
              {/* {completedTodayCount >= 2 && (
                <div className="kids-magic-badge" aria-live="polite">
                  Bravo — {completedTodayCount} tâches aujourd&apos;hui
                </div>
              )} */}
              <ChildrenWidget />
            </div>
          </div>
          <div className="kids-top kids-tasks">
            <DailyTasksWidget
              onMilestone={handleCelebration}
              onCompletedTodayCountChange={setCompletedTodayCount}
            />
          </div>

          {/* Timeline — multi-enfants */}
          <div className="kids-timeline">
            {timelineBlockedMessage ? (
              <div className="timeline-card child-timeline">
                <div className="timeline-empty">{timelineBlockedMessage}</div>
              </div>
            ) : (
              <div className="kids-timeline-list">
                {children.map((child) => (
                  <ChildTimeline
                    key={child.id}
                    childName={child.first_name}
                    events={eventsByChild[child.id] || []}
                    rangeDays={RANGE_DAYS}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  return <DashboardInner />;
};
