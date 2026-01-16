import { useEffect, useState } from 'react';
import { getCalendarEventsWithAuth, getGoogleConnection } from '@/features/google/google.service';

type CalendarEvent = {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  calendarName?: string;
  calendarId?: string;
};

type UseChildEventsResult = {
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
};

export const useChildEvents = (userId: string | undefined, rangeDays: number): UseChildEventsResult => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;

    let isActive = true;

    const loadEvents = async () => {
      setLoading(true);
      setError(null);

      try {
        const connection = await getGoogleConnection(userId);
        if (!connection) {
          if (!isActive) return;
          setError('Connecter Google pour afficher la timeline.');
          setEvents([]);
          return;
        }

        const calendarIds = [connection.selectedCalendarId || 'primary'];

        const fetchedEvents = await getCalendarEventsWithAuth(
          userId,
          calendarIds.filter(Boolean) as string[],
          80,
          rangeDays
        );

        const now = new Date();
        const horizon = new Date(now.getTime() + rangeDays * 24 * 60 * 60 * 1000);

        const withinRange = fetchedEvents.filter((event: CalendarEvent) => {
          const date = new Date(event.start.dateTime || event.start.date!);
          return date >= now && date <= horizon;
        });

        if (!isActive) return;
        setEvents(withinRange);
      } catch (loadError: any) {
        if (!isActive) return;
        console.error('Error loading calendar events (timeline):', loadError);
        const isUnauthorized =
          loadError?.message === 'unauthorized' ||
          loadError?.message === 'google_disconnected' ||
          loadError?.message?.includes?.('Reconnecter');
        setError(
          isUnauthorized
            ? 'Session Google expirée : reconnectez-vous dans Paramètres > Google.'
            : 'Impossible de charger les événements Google'
        );
        setEvents([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    loadEvents();

    return () => {
      isActive = false;
    };
  }, [userId, rangeDays]);

  return { events, loading, error };
};

export type { CalendarEvent };
