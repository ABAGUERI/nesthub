import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getGoogleConnection,
  getCalendarEventsWithAuth,
} from '@/features/google/google.service';
import './CalendarWidget.css';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  calendarName: string;
  calendarId: string;
}

export const CalendarWidget: React.FC = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, [user]);

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Récupérer la connexion Google
      const connection = await getGoogleConnection(user.id);
      if (!connection || !connection.accessToken) {
        setError('Connectez ou reconnectez Google pour afficher l’agenda.');
        setLoading(false);
        return;
      }

      // TODO: Récupérer les IDs de TOUS les calendriers sélectionnés
      // Pour l'instant, on utilise juste le principal
      const calendarIds = [connection.selectedCalendarId || 'primary'];

      // Fetch événements
      const fetchedEvents = await getCalendarEventsWithAuth(
        user.id,
        calendarIds.filter(Boolean) as string[],
        20
      );

      setEvents(fetchedEvents);
    } catch (error: any) {
      console.error('Error loading calendar events:', error);
      const isUnauthorized = error?.message === 'unauthorized';
      setError(
        isUnauthorized
          ? 'Session Google expirée : reconnectez-vous dans Paramètres > Google.'
          : 'Impossible de charger les événements Google'
      );
    } finally {
      setLoading(false);
    }
  };

  const groupEventsByDay = () => {
    const grouped: { [key: string]: CalendarEvent[] } = {};

    events.forEach((event) => {
      const date = new Date(event.start.dateTime || event.start.date!);
      const dayStr = date.toLocaleDateString('fr-CA', {
        weekday: 'long',
        day: 'numeric',
      });

      if (!grouped[dayStr]) {
        grouped[dayStr] = [];
      }

      grouped[dayStr].push(event);
    });

    return grouped;
  };

  const getUrgencyClass = (event: CalendarEvent): string => {
    const now = new Date();
    const eventDate = new Date(event.start.dateTime || event.start.date!);
    const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    if (eventDate.toDateString() === now.toDateString()) {
      return 'urgent'; // Aujourd'hui = rouge
    } else if (eventDate < twoDaysFromNow) {
      return 'soon'; // Dans 2 jours = jaune
    }
    return 'future'; // Plus tard = bleu
  };

  const formatTime = (event: CalendarEvent): string => {
    if (!event.start.dateTime) {
      return 'Toute la journée';
    }

    const date = new Date(event.start.dateTime);
    return date.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDayLabel = (dayStr: string): string => {
    const now = new Date();
    const eventDate = events.find((e) => {
      const date = new Date(e.start.dateTime || e.start.date!);
      return (
        date.toLocaleDateString('fr-CA', {
          weekday: 'long',
          day: 'numeric',
        }) === dayStr
      );
    });

    if (!eventDate) return dayStr;

    const date = new Date(eventDate.start.dateTime || eventDate.start.date!);

    if (date.toDateString() === now.toDateString()) {
      return "Aujourd'hui";
    }

    return dayStr;
  };

  if (loading) {
    return (
      <div className="widget">
        <div className="widget-header">
          <div className="widget-title">📅 Agenda</div>
        </div>
        <div className="widget-scroll">
          <div className="loading-message">Chargement...</div>
        </div>
      </div>
    );
  }

  const groupedEvents = groupEventsByDay();

  return (
    <div className="widget">
      <div className="widget-header">
        <div className="widget-title">📅 Agenda</div>
        <span className="refresh-btn" onClick={loadEvents}>
          🔄
        </span>
      </div>

      <div className="widget-scroll timeline-container">
        {error ? (
          <div className="empty-message">{error}</div>
        ) : events.length === 0 ? (
          <div className="empty-message">📅 Aucun événement prévu</div>
        ) : (
          <>
            {Object.entries(groupedEvents).map(([day, dayEvents]) => (
              <div key={day} className="timeline-group">
                <div className="timeline-header">{getDayLabel(day)}</div>

                {dayEvents.map((event) => (
                  <div
                    key={event.id}
                    className={`event-card ${getUrgencyClass(event)}`}
                  >
                    <div className="event-time">{formatTime(event)}</div>
                    <div className="event-content">
                      <div className="event-title">{event.summary || 'Sans titre'}</div>
                      <div className="event-calendar">
                        📅 {event.calendarName || 'Calendrier'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};
