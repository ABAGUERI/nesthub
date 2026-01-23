import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { supabase } from '@/shared/utils/supabase';
import { GoogleConnectPanel } from '@/features/google/components/GoogleConnectPanel';
import { useGoogleConnection } from '@/features/google/hooks/useGoogleConnection';
import {
  createTaskInList,
  createTaskList,
  fetchCalendarEvents,
  fetchTasksList,
  updateTaskInList,
} from '@/features/google/google-edge.service';
import { getTaskListsWithAuth, GoogleTaskList } from '@/features/google/google.service';
import './FamilyPage.css';

type TabKey = 'tasks' | 'agenda';

type GoogleTask = {
  id: string;
  title: string;
  status: string;
  due?: string;
  completed?: string;
};

type CalendarEvent = {
  id: string;
  summary?: string;
  start: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  location?: string;
};

const resolveTab = (tab: string | null): TabKey => {
  if (tab === 'agenda') return 'agenda';
  return 'tasks';
};

const formatDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
};

const formatTime = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' });
};

export const FamilyPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabKey>(resolveTab(searchParams.get('tab')));
  const { connection, loading: connectionLoading } = useGoogleConnection();

  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [taskListsLoading, setTaskListsLoading] = useState(false);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [creatingList, setCreatingList] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  const [agendaFilter, setAgendaFilter] = useState<'today' | '7' | '30'>('today');
  const [agendaEvents, setAgendaEvents] = useState<CalendarEvent[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(false);
  const [agendaError, setAgendaError] = useState<string | null>(null);

  const needsGoogleReconnect = (message?: string | null) =>
    Boolean(message && message.toLowerCase().includes('reconnectez'));

  useEffect(() => {
    const nextTab = resolveTab(searchParams.get('tab'));
    setActiveTab(nextTab);
  }, [searchParams]);

  const handleTabChange = (tab: TabKey) => {
    setSearchParams({ tab });
  };

  const loadTaskLists = useCallback(async () => {
    if (!user || !connection) return;

    setTaskListsLoading(true);
    setTaskError(null);

    try {
      const lists = await getTaskListsWithAuth(user.id);
      setTaskLists(lists);

      if (lists.length === 0) {
        setSelectedListId(null);
        setTasks([]);
        return;
      }

      const preferred =
        lists.find((list) => /famille/i.test(list.title)) ?? lists[0];
      setSelectedListId((prev) => prev ?? preferred.id);
    } catch (error: any) {
      const status = (error as { status?: number }).status;
      const isUnauthorized =
        error?.message === 'unauthorized' ||
        error?.message?.includes?.('Reconnecter') ||
        status === 401;
      setTaskError(
        isUnauthorized
          ? 'Session Google expirée : reconnectez-vous.'
          : 'Impossible de charger les listes Google Tasks.'
      );
      setTaskLists([]);
    } finally {
      setTaskListsLoading(false);
    }
  }, [connection, user]);

  const loadTasks = useCallback(
    async (listId: string) => {
      if (!user || !connection) return;

      setTasksLoading(true);
      setTaskError(null);

      try {
        const data = await fetchTasksList(listId);
        const items = (data?.items ?? []) as GoogleTask[];
        setTasks(items);
      } catch (error: any) {
        const status = (error as { status?: number }).status;
        const isUnauthorized =
          error?.message === 'unauthorized' ||
          error?.message?.includes?.('Reconnecter') ||
          status === 401;
        setTaskError(
          isUnauthorized
            ? 'Session Google expirée : reconnectez-vous.'
            : 'Impossible de charger les tâches.'
        );
        setTasks([]);
      } finally {
        setTasksLoading(false);
      }
    },
    [connection, user]
  );

  useEffect(() => {
    if (!connection) {
      setTaskLists([]);
      setSelectedListId(null);
      setTasks([]);
      return;
    }

    void loadTaskLists();
  }, [connection, loadTaskLists]);

  useEffect(() => {
    if (selectedListId) {
      void loadTasks(selectedListId);
    }
  }, [loadTasks, selectedListId]);

  const handleCreateList = async () => {
    if (!user) return;
    setCreatingList(true);
    setTaskError(null);
    try {
      const created = await createTaskList('Famille');
      const { error } = await supabase.from('task_lists').insert({
        user_id: user.id,
        google_task_list_id: created.id,
        name: created.title,
        type: 'custom',
      });
      if (error) throw error;
      await loadTaskLists();
      setSelectedListId(created.id);
    } catch (error: any) {
      setTaskError(error?.message || 'Impossible de créer la liste.');
    } finally {
      setCreatingList(false);
    }
  };

  const handleCreateTask = async () => {
    if (!selectedListId || !newTaskTitle.trim()) return;
    setCreatingTask(true);
    setTaskError(null);
    try {
      await createTaskInList(selectedListId, newTaskTitle.trim());
      setNewTaskTitle('');
      await loadTasks(selectedListId);
    } catch (error: any) {
      setTaskError(error?.message || 'Impossible de créer la tâche.');
    } finally {
      setCreatingTask(false);
    }
  };

  const handleToggleTask = async (task: GoogleTask) => {
    if (!selectedListId) return;
    const nextStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    setUpdatingTaskId(task.id);
    setTaskError(null);
    try {
      await updateTaskInList(selectedListId, task.id, nextStatus);
      setTasks((prev) =>
        prev.map((item) =>
          item.id === task.id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error: any) {
      setTaskError(error?.message || 'Impossible de mettre à jour la tâche.');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const resolveAgendaRange = (filter: 'today' | '7' | '30') => {
    const now = new Date();
    if (filter === 'today') {
      const start = new Date(now);
      start.setHours(0, 0, 0, 0);
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      return { timeMin: start.toISOString(), timeMax: end.toISOString() };
    }

    const days = filter === '7' ? 7 : 30;
    const timeMax = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return { timeMin: now.toISOString(), timeMax: timeMax.toISOString() };
  };

  const loadAgendaEvents = useCallback(async () => {
    if (!connection) return;

    setAgendaLoading(true);
    setAgendaError(null);

    try {
      const { timeMin, timeMax } = resolveAgendaRange(agendaFilter);
      const data = await fetchCalendarEvents({
        timeMin,
        timeMax,
        maxResults: 60,
        calendarId: connection.selectedCalendarId ?? undefined,
      });
      const items = (data?.items ?? []) as CalendarEvent[];
      setAgendaEvents(items);
    } catch (error: any) {
      const status = (error as { status?: number }).status;
      const isUnauthorized =
        error?.message === 'unauthorized' ||
        error?.message?.includes?.('Reconnecter') ||
        status === 401;
      setAgendaError(
        isUnauthorized
          ? 'Session Google expirée : reconnectez-vous.'
          : 'Impossible de charger les événements.'
      );
      setAgendaEvents([]);
    } finally {
      setAgendaLoading(false);
    }
  }, [agendaFilter, connection]);

  useEffect(() => {
    if (connection) {
      void loadAgendaEvents();
    }
  }, [connection, loadAgendaEvents]);

  const groupedEvents = useMemo(() => {
    const groups = new Map<string, { label: string; events: CalendarEvent[] }>();
    agendaEvents.forEach((event) => {
      const start = event.start?.dateTime || event.start?.date;
      if (!start) return;
      const startDate = new Date(start);
      const key = startDate.toISOString().split('T')[0];
      const label = startDate.toLocaleDateString('fr-CA', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
      });
      if (!groups.has(key)) {
        groups.set(key, { label, events: [] });
      }
      groups.get(key)?.events.push(event);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, value]) => value);
  }, [agendaEvents]);

  return (
    <div className="family-page">
      <div className="family-tabs" role="tablist">
        <button
          type="button"
          className={`family-tab${activeTab === 'tasks' ? ' is-active' : ''}`}
          onClick={() => handleTabChange('tasks')}
          role="tab"
          aria-selected={activeTab === 'tasks'}
        >
          Tâches
        </button>
        <button
          type="button"
          className={`family-tab${activeTab === 'agenda' ? ' is-active' : ''}`}
          onClick={() => handleTabChange('agenda')}
          role="tab"
          aria-selected={activeTab === 'agenda'}
        >
          Agenda
        </button>
      </div>

      {activeTab === 'tasks' && (
        <section className="family-panel">
          {connectionLoading ? (
            <div className="family-skeleton">Chargement de Google…</div>
          ) : !connection ? (
            <GoogleConnectPanel
              title="Connectez Google pour accéder aux tâches."
              description="Liez votre compte Google pour afficher et gérer les listes de tâches."
            />
          ) : needsGoogleReconnect(taskError) ? (
            <GoogleConnectPanel
              title="Reconnectez Google pour récupérer vos tâches."
              description={taskError ?? undefined}
              ctaLabel="Reconnecter Google"
            />
          ) : (
            <div className="family-card">
              <div className="family-card-header">
                <h2>Google Tasks</h2>
                <Button variant="secondary" onClick={loadTaskLists} isLoading={taskListsLoading}>
                  Rafraîchir
                </Button>
              </div>

              {taskError && <div className="family-alert">{taskError}</div>}

              {taskListsLoading ? (
                <div className="family-skeleton">Chargement des listes…</div>
              ) : taskLists.length === 0 ? (
                <div className="family-empty">
                  <p>Aucune liste détectée.</p>
                  <Button onClick={handleCreateList} isLoading={creatingList}>
                    Créer une liste “Famille”
                  </Button>
                </div>
              ) : (
                <>
                  <label className="family-field">
                    <span>Liste sélectionnée</span>
                    <select
                      value={selectedListId ?? ''}
                      onChange={(event) => setSelectedListId(event.target.value)}
                    >
                      {taskLists.map((list) => (
                        <option key={list.id} value={list.id}>
                          {list.title}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="family-task-input">
                    <input
                      type="text"
                      value={newTaskTitle}
                      onChange={(event) => setNewTaskTitle(event.target.value)}
                      placeholder="Ajouter une tâche…"
                    />
                    <Button onClick={handleCreateTask} isLoading={creatingTask} disabled={!newTaskTitle.trim()}>
                      Ajouter
                    </Button>
                  </div>

                  {tasksLoading ? (
                    <div className="family-skeleton">Chargement des tâches…</div>
                  ) : tasks.length === 0 ? (
                    <div className="family-empty">Aucune tâche pour cette liste.</div>
                  ) : (
                    <ul className="family-task-list">
                      {tasks.map((task) => (
                        <li key={task.id} className={task.status === 'completed' ? 'is-done' : ''}>
                          <button
                            type="button"
                            className="task-toggle"
                            onClick={() => handleToggleTask(task)}
                            disabled={updatingTaskId === task.id}
                            aria-label={
                              task.status === 'completed'
                                ? 'Marquer comme non terminée'
                                : 'Marquer comme terminée'
                            }
                          >
                            {task.status === 'completed' ? '✔' : '○'}
                          </button>
                          <div className="task-details">
                            <div className="task-title">{task.title}</div>
                            {task.due && <div className="task-due">Échéance : {formatDate(task.due)}</div>}
                          </div>
                          <span className="task-status">
                            {task.status === 'completed' ? 'Terminée' : 'À faire'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          )}
        </section>
      )}

      {activeTab === 'agenda' && (
        <section className="family-panel">
          {connectionLoading ? (
            <div className="family-skeleton">Chargement de Google…</div>
          ) : !connection ? (
            <GoogleConnectPanel
              title="Connectez Google pour voir l’agenda."
              description="Synchronisez Google Calendar pour afficher les prochains événements."
            />
          ) : needsGoogleReconnect(agendaError) ? (
            <GoogleConnectPanel
              title="Reconnectez Google pour récupérer l’agenda."
              description={agendaError ?? undefined}
              ctaLabel="Reconnecter Google"
            />
          ) : (
            <div className="family-card">
              <div className="family-card-header">
                <h2>Agenda</h2>
                <Button variant="secondary" onClick={loadAgendaEvents} isLoading={agendaLoading}>
                  Rafraîchir
                </Button>
              </div>

              <div className="family-filter">
                {[
                  { value: 'today', label: "Aujourd’hui" },
                  { value: '7', label: '7 jours' },
                  { value: '30', label: '30 jours' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`filter-btn${agendaFilter === option.value ? ' is-active' : ''}`}
                    onClick={() => setAgendaFilter(option.value as 'today' | '7' | '30')}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {agendaError && <div className="family-alert">{agendaError}</div>}

              {agendaLoading ? (
                <div className="family-skeleton">Chargement des événements…</div>
              ) : agendaEvents.length === 0 ? (
                <div className="family-empty">Aucun événement sur cette période.</div>
              ) : (
                <div className="family-agenda-list">
                  {groupedEvents.map((group) => (
                    <div key={group.label} className="agenda-group">
                      <div className="agenda-day">{group.label}</div>
                      <ul>
                        {group.events.map((event) => {
                          const start = event.start?.dateTime || event.start?.date;
                          const end = event.end?.dateTime || event.end?.date;
                          return (
                            <li key={event.id}>
                              <div className="agenda-time">
                                {start ? formatTime(start) : '—'}{end ? ` – ${formatTime(end)}` : ''}
                              </div>
                              <div className="agenda-details">
                                <div className="agenda-title">{event.summary || 'Sans titre'}</div>
                                {event.location && <div className="agenda-location">{event.location}</div>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
};
