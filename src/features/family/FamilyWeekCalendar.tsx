import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  getCalendarEventsForRange,
  getGoogleConnection,
  initiateGoogleOAuth,
} from '@/features/google/google.service';
import { getChildren } from '@/shared/utils/children.service';
import { getAvatarUrl } from '@/features/config/services/avatar.service';
import { Child } from '@/shared/types';
import './FamilyWeekCalendar.css';

interface CalendarEvent {
  id: string;
  summary: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
  };
  calendarName?: string;
  calendarId?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
}

interface EventPerson {
  name: string;
  avatarUrl?: string | null;
  icon?: string;
}

const CHILD_ICON_MAP: Record<string, string> = {
  bee: '🐝',
  ladybug: '🐞',
  butterfly: '🦋',
  caterpillar: '🐛',
  default: '👤',
};

const startOfWeek = (date: Date) => {
  const day = (date.getDay() + 6) % 7; // Monday = 0
  const start = new Date(date);
  start.setDate(date.getDate() - day);
  start.setHours(0, 0, 0, 0);
  return start;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseEventDate = (value?: string) => {
  if (!value) return null;
  if (value.includes('T')) return new Date(value);
  return new Date(`${value}T00:00:00`);
};

const formatHourLabel = (hour: number) =>
  `${String(hour).padStart(2, '0')}:00`;

const formatRangeLabel = (start?: string, end?: string) => {
  if (!start) return '';
  const startDate = parseEventDate(start);
  const endDate = end ? parseEventDate(end) : null;

  if (!startDate) return '';
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
    });

  if (!endDate) return formatTime(startDate);
  return `${formatTime(startDate)} → ${formatTime(endDate)}`;
};

const formatEventDateTime = (event: CalendarEvent) => {
  const start = parseEventDate(event.start.dateTime || event.start.date);
  const end = parseEventDate(event.end?.dateTime || event.end?.date);

  if (!start) return '';
  const dateLabel = start.toLocaleDateString('fr-CA', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  if (!event.start.dateTime) {
    return `${dateLabel} · Toute la journée`;
  }

  const timeLabel = formatRangeLabel(
    event.start.dateTime,
    event.end?.dateTime || event.end?.date
  );
  return `${dateLabel} · ${timeLabel}`;
};

const formatWeekLabel = (start: Date) => {
  const end = addDays(start, 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const format = (date: Date) =>
    date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
    });

  if (sameMonth) {
    return `${start.getDate()}-${end.getDate()} ${end.toLocaleDateString('fr-CA', {
      month: 'long',
    })}`;
  }

  return `${format(start)} → ${format(end)}`;
};

const getEventTone = (event: CalendarEvent, people: EventPerson[]) => {
  const lowerSummary = event.summary?.toLowerCase() || '';
  const lowerCalendar = event.calendarName?.toLowerCase() || '';
  const name = people[0]?.name?.toLowerCase() || '';

  if (lowerSummary.includes('famille') || lowerCalendar.includes('famille')) {
    return 'tone-family';
  }
  if (name.includes('lucas') || lowerSummary.includes('lucas')) {
    return 'tone-lucas';
  }
  if (name.includes('sifaw') || lowerSummary.includes('sifaw')) {
    return 'tone-sifaw';
  }
  if (lowerCalendar.includes('travail')) {
    return 'tone-work';
  }

  return 'tone-default';
};

const START_HOUR = 7;
const END_HOUR = 20;

const HOUR_HEIGHT = 48; // Must match --hour-height in CSS

const getNowPosition = (startHour: number, endHour: number) => {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const gridStart = startHour * 60;
  const gridEnd = endHour * 60;

  if (currentMinutes < gridStart || currentMinutes > gridEnd) return null;

  return ((currentMinutes - gridStart) / 60) * HOUR_HEIGHT;
};

export const FamilyWeekCalendar: React.FC = () => {
  const { user } = useAuth();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cta, setCta] = useState<'connect' | 'reconnect' | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [calendarLabel, setCalendarLabel] = useState<string>('Calendrier');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [nowPosition, setNowPosition] = useState<number | null>(null);

  const startHour = START_HOUR;
  const endHour = END_HOUR;
  const totalHours = endHour - startHour;

  // Update "now" line position every minute
  useEffect(() => {
    const updateNow = () => {
      setNowPosition(getNowPosition(startHour, endHour));
    };
    updateNow();
    const interval = setInterval(updateNow, 60000);
    return () => clearInterval(interval);
  }, [startHour, endHour]);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  useEffect(() => {
    if (!user) return;

    const loadChildren = async () => {
      try {
        const data = await getChildren(user.id);
        setChildren(data);
      } catch (err) {
        console.error('Error loading family members:', err);
      }
    };

    loadChildren();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadEvents();
  }, [user, weekStart]);

  const loadEvents = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);
    setCta(null);

    try {
      const connection = await getGoogleConnection(user.id);
      if (!connection) {
        setError('Google non connecté.');
        setCta('connect');
        setLoading(false);
        return;
      }

      const calendarIds = [connection.selectedCalendarId || 'primary'];
      const timeMin = new Date(weekStart);
      const timeMax = addDays(weekStart, 7);

      const fetchedEvents = await getCalendarEventsForRange(
        user.id,
        calendarIds.filter(Boolean) as string[],
        timeMin.toISOString(),
        timeMax.toISOString(),
        200
      );

      const uniqueCalendars = Array.from(
        new Set(fetchedEvents.map((event) => event.calendarName).filter(Boolean))
      ) as string[];

      if (uniqueCalendars.length > 1) {
        setCalendarLabel(`Calendriers (${uniqueCalendars.length})`);
      } else if (uniqueCalendars.length === 1) {
        setCalendarLabel(uniqueCalendars[0]);
      } else {
        setCalendarLabel(connection.selectedCalendarName || 'Calendrier principal');
      }

      setEvents(fetchedEvents);
    } catch (err: any) {
      console.error('Error loading calendar events:', err);
      const status = (err as { status?: number }).status;
      const isUnauthorized =
        err?.message === 'unauthorized' ||
        err?.message?.includes?.('Reconnecter') ||
        status === 401;
      if (isUnauthorized) {
        setError('Session Google expirée : reconnectez-vous dans Paramètres > Google.');
        setCta('reconnect');
      } else {
        setError('Impossible de charger les événements Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventPeople = (event: CalendarEvent): EventPerson[] => {
    const summary = event.summary?.toLowerCase() || '';
    const calendarName = event.calendarName?.toLowerCase() || '';

    const matches = children.filter((child) => {
      const name = child.firstName.toLowerCase();
      return summary.includes(name) || calendarName.includes(name);
    });

    if (summary.includes('famille') || calendarName.includes('famille')) {
      return children.slice(0, 2).map((child) => ({
        name: child.firstName,
        avatarUrl: child.avatarUrl,
        icon: CHILD_ICON_MAP[child.icon] || CHILD_ICON_MAP.default,
      }));
    }

    return matches.slice(0, 2).map((child) => ({
      name: child.firstName,
      avatarUrl: child.avatarUrl,
      icon: CHILD_ICON_MAP[child.icon] || CHILD_ICON_MAP.default,
    }));
  };

  const allDayEventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    days.forEach((day) => map.set(toDateKey(day), []));

    events.forEach((event) => {
      if (event.start?.dateTime) return;
      const start = parseEventDate(event.start.date);
      if (!start) return;
      const end = parseEventDate(event.end?.date) || addDays(start, 1);

      days.forEach((day) => {
        const dayKey = toDateKey(day);
        if (day >= start && day < end) {
          map.get(dayKey)?.push(event);
        }
      });
    });

    return map;
  }, [days, events]);

  const timedEventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    days.forEach((day) => map.set(toDateKey(day), []));

    events.forEach((event) => {
      if (!event.start?.dateTime) return;
      const start = parseEventDate(event.start.dateTime);
      if (!start) return;
      const dayKey = toDateKey(start);
      if (map.has(dayKey)) {
        map.get(dayKey)?.push(event);
      }
    });

    map.forEach((value) =>
      value.sort((a, b) => {
        const aDate = parseEventDate(a.start.dateTime || a.start.date)?.getTime() || 0;
        const bDate = parseEventDate(b.start.dateTime || b.start.date)?.getTime() || 0;
        return aDate - bDate;
      })
    );

    return map;
  }, [days, events]);

  const renderAvatars = (people: EventPerson[]) => {
    const shown = people.length ? people : [{ name: 'Invité', icon: CHILD_ICON_MAP.default }];
    return (
      <div className="family-event-avatars">
        {shown.slice(0, 2).map((person) => {
          const avatarUrl = person.avatarUrl ? getAvatarUrl(person.avatarUrl) : null;
          return (
            <div key={person.name} className="family-event-avatar">
              {avatarUrl ? (
                <img src={avatarUrl} alt={`Avatar ${person.name}`} />
              ) : (
                <span>{person.icon || CHILD_ICON_MAP.default}</span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEventBlock = (event: CalendarEvent) => {
    const start = parseEventDate(event.start.dateTime || event.start.date);
    if (!start) return null;
    const end =
      parseEventDate(event.end?.dateTime || event.end?.date) ||
      new Date(start.getTime() + 60 * 60 * 1000);

    const startMinutes = start.getHours() * 60 + start.getMinutes();
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    const gridStart = startHour * 60;
    const gridEnd = endHour * 60;

    if (endMinutes <= gridStart || startMinutes >= gridEnd) {
      return null;
    }

    const clampedStart = Math.max(startMinutes, gridStart);
    const clampedEnd = Math.min(endMinutes, gridEnd);
    const durationMinutes = Math.max(clampedEnd - clampedStart, 30);
    const top = ((clampedStart - gridStart) / 60) * HOUR_HEIGHT;
    const height = (durationMinutes / 60) * HOUR_HEIGHT;

    const people = getEventPeople(event);
    const tone = getEventTone(event, people);

    return (
      <div
        key={event.id}
        className={`family-event-block ${tone}`}
        style={{ top: `${top}px`, height: `${height}px` }}
        onClick={() => setSelectedEvent(event)}
        title={event.summary || 'Sans titre'}
      >
        <div className="family-event-title">{event.summary || 'Sans titre'}</div>
        <div className="family-event-meta">
          {renderAvatars(people)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="family-week-calendar widget">
        <div className="widget-header family-week-header">
          <div className="family-week-header-info">
            <div className="family-week-calendar-name">{calendarLabel}</div>
            <div className="family-week-range">Semaine du {formatWeekLabel(weekStart)}</div>
          </div>
        </div>
        <div className="family-week-body">
          <div className="loading-message">Chargement...</div>
        </div>
      </div>
    );
  }

  const isCurrentWeek = toDateKey(weekStart) === toDateKey(startOfWeek(new Date()));

  {/* Compact header: title + period + today on same line */}
  return (
    <div className="family-week-calendar widget">
      <div className="widget-header family-week-header">
        <div className="family-week-header-main">
          <span className="family-week-title">Famille</span>
          <span className="family-week-separator">·</span>
          <span className="family-week-subtitle">Agenda partagé</span>
        </div>
        <div className="family-week-header-nav">
          <button
            type="button"
            className="family-week-nav-btn"
            onClick={() => setWeekStart((prev) => addDays(prev, -7))}
            aria-label="Semaine précédente"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="family-week-period">
            <span className="family-week-range">{formatWeekLabel(weekStart)}</span>
            <button
              type="button"
              className={`family-week-today-btn ${isCurrentWeek ? 'is-current' : ''}`}
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Aujourd'hui
            </button>
          </div>
          <button
            type="button"
            className="family-week-nav-btn"
            onClick={() => setWeekStart((prev) => addDays(prev, 7))}
            aria-label="Semaine suivante"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="family-week-body">
        {error ? (
          <div className="empty-message">
            <div>{error}</div>
            {cta && (
              <button
                type="button"
                className="ghost-btn"
                onClick={initiateGoogleOAuth}
              >
                {cta === 'connect' ? 'Connecter Google' : 'Reconnecter Google'}
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className="family-week-grid"
              style={{ '--total-hours': totalHours } as React.CSSProperties}
            >
              <div className="family-week-grid-header">
                <div className="family-time-header"></div>
                {days.map((day) => {
                  const isToday = toDateKey(day) === toDateKey(new Date());
                  return (
                    <div
                      key={day.toISOString()}
                      className={`family-day-header ${isToday ? 'today' : ''}`}
                    >
                      <div className="family-day-name">
                        {day.toLocaleDateString('fr-CA', { weekday: 'short' })}
                      </div>
                      <div className="family-day-date">
                        {day.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="family-all-day-row">
                <div className="family-time-label">Toute la journée</div>
                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const allDayEvents = allDayEventsByDay.get(dayKey) || [];
                  return (
                    <div key={dayKey} className="family-all-day-cell">
                      {allDayEvents.length === 0 ? (
                        <span className="family-all-day-empty">—</span>
                      ) : (
                        allDayEvents.map((event) => {
                          const people = getEventPeople(event);
                          const tone = getEventTone(event, people);
                          return (
                            <div key={event.id} className={`family-all-day-event ${tone}`}>
                              {renderAvatars(people)}
                              <span>{event.summary || 'Sans titre'}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="family-time-grid">
                <div className="family-time-column">
                  {Array.from({ length: totalHours + 1 }, (_, index) => {
                    const hour = startHour + index;
                    return (
                      <div key={hour} className="family-time-slot">
                        {formatHourLabel(hour)}
                      </div>
                    );
                  })}
                </div>

                {days.map((day) => {
                  const dayKey = toDateKey(day);
                  const isToday = dayKey === toDateKey(new Date());
                  const dayEvents = timedEventsByDay.get(dayKey) || [];
                  return (
                    <div key={dayKey} className={`family-day-column ${isToday ? 'today-column' : ''}`}>
                      <div className="family-day-grid">
                        {isToday && nowPosition !== null && (
                          <div
                            className="family-now-line"
                            style={{ top: `${nowPosition}px` }}
                          >
                            <span className="family-now-time">
                              {new Date().toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}
                        {dayEvents.map((event) => renderEventBlock(event))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="family-week-list">
              {days.map((day) => {
                const dayKey = toDateKey(day);
                const allDayEvents = allDayEventsByDay.get(dayKey) || [];
                const dayEvents = timedEventsByDay.get(dayKey) || [];

                return (
                  <div key={`list-${dayKey}`} className="family-week-list-day">
                    <div className="family-week-list-title">
                      {day.toLocaleDateString('fr-CA', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </div>
                    <div className="family-week-list-items">
                      {allDayEvents.map((event) => {
                        const people = getEventPeople(event);
                        const tone = getEventTone(event, people);
                        return (
                          <div
                            key={`allday-${event.id}`}
                            className={`family-week-list-item ${tone}`}
                            onClick={() => setSelectedEvent(event)}
                            title={event.summary || 'Sans titre'}
                          >
                            {renderAvatars(people)}
                            <div>
                              <div className="family-event-title">{event.summary || 'Sans titre'}</div>
                              <div className="family-event-time">Toute la journée</div>
                            </div>
                          </div>
                        );
                      })}

                      {dayEvents.map((event) => {
                        const people = getEventPeople(event);
                        const tone = getEventTone(event, people);
                        return (
                          <div
                            key={`timed-${event.id}`}
                            className={`family-week-list-item ${tone}`}
                            onClick={() => setSelectedEvent(event)}
                            title={event.summary || 'Sans titre'}
                          >
                            {renderAvatars(people)}
                            <div>
                              <div className="family-event-title">{event.summary || 'Sans titre'}</div>
                              <div className="family-event-time">
                                {formatRangeLabel(
                                  event.start.dateTime,
                                  event.end?.dateTime || event.end?.date
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {allDayEvents.length === 0 && dayEvents.length === 0 && (
                        <div className="family-week-list-empty">Aucun événement</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {selectedEvent && (
        <div className="family-event-modal" onClick={() => setSelectedEvent(null)}>
          <div className="family-event-modal-content" onClick={(event) => event.stopPropagation()}>
            <div className="family-event-modal-header">
              <div>
                <div className="family-event-modal-title">
                  {selectedEvent.summary || 'Sans titre'}
                </div>
                <div className="family-event-modal-subtitle">
                  {formatEventDateTime(selectedEvent)}
                </div>
              </div>
              <button
                type="button"
                className="family-event-modal-close"
                onClick={() => setSelectedEvent(null)}
              >
                ✕
              </button>
            </div>
            <div className="family-event-modal-body">
              <div className="family-event-modal-row">
                <span className="family-event-modal-label">Lieu</span>
                <span>{selectedEvent.location || 'Non précisé'}</span>
              </div>
              <div className="family-event-modal-row">
                <span className="family-event-modal-label">Description</span>
                <span>{selectedEvent.description || 'Aucune description'}</span>
              </div>
              {selectedEvent.htmlLink && (
                <a
                  href={selectedEvent.htmlLink}
                  target="_blank"
                  rel="noreferrer"
                  className="family-event-modal-link"
                >
                  Ouvrir dans Google
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
