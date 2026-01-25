import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import {
  getGoogleConnection,
  getTasksWithAuth,
  initiateGoogleOAuth,
  updateTaskStatusWithAuth,
} from '@/features/google/google.service';
import './FamilyWeeklyTasks.css';

interface TaskList {
  id: string;
  google_task_list_id: string;
  name: string;
  type: string;
}

interface TaskItem {
  id: string;
  title: string;
  status: string;
  due?: string;
  listName?: string;
  listId: string;
}

export const FamilyWeeklyTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cta, setCta] = useState<'connect' | 'reconnect' | null>(null);
  const [columns, setColumns] = useState(6);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const [clickedTaskId, setClickedTaskId] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user]);

  useEffect(() => {
    const updateColumns = () => {
      if (window.innerWidth <= 700) {
        setColumns(2);
      } else if (window.innerWidth <= 1100) {
        setColumns(4);
      } else {
        setColumns(6);
      }
    };

    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  const loadTasks = async () => {
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

      const { data: lists, error: listError } = await supabase
        .from('task_lists')
        .select('*')
        .eq('user_id', user.id);

      if (listError) throw listError;
      if (!lists || lists.length === 0) {
        setLoading(false);
        return;
      }

      const familyLists = lists.filter((list: TaskList) => {
        const name = list.name.toLowerCase();
        return (
          list.type === 'family' ||
          name.includes('famille') ||
          name.includes('familiale')
        );
      });

      const selectedLists = familyLists.length > 0 ? familyLists : lists;

      const tasksByList = await Promise.all(
        selectedLists.map(async (list: TaskList) => {
          try {
            const items = await getTasksWithAuth(user.id, list.google_task_list_id);
            return (items || []).map((task: TaskItem) => ({
              ...task,
              listName: list.name,
              listId: list.google_task_list_id,
            }));
          } catch (err: any) {
            const status = (err as { status?: number }).status;
            const isUnauthorized =
              err?.message === 'unauthorized' ||
              err?.message?.includes?.('Reconnecter') ||
              status === 401;
            if (isUnauthorized) {
              setError('Session Google expirée : reconnectez-vous dans Paramètres > Google.');
              setCta('reconnect');
            }
            console.error(`Error loading tasks for list ${list.name}:`, err);
            return [];
          }
        })
      );

      const flattened = tasksByList.flat();
      const incomplete = flattened.filter((task) => task.status === 'needsAction');
      setTasks(incomplete);
    } catch (err: any) {
      console.error('Error loading tasks:', err);
      const status = (err as { status?: number }).status;
      const isUnauthorized =
        err?.message === 'unauthorized' ||
        err?.message?.includes?.('Reconnecter') ||
        status === 401;
      if (isUnauthorized) {
        setError('Session Google expirée : reconnectez-vous dans Paramètres > Google.');
        setCta('reconnect');
      } else {
        setError('Impossible de charger les tâches Google');
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      if (a.due && b.due) {
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      }
      if (a.due) return -1;
      if (b.due) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  const slotsCount = columns * 2;
  const visibleTasks = sortedTasks.slice(0, slotsCount);
  const hasOverflow = sortedTasks.length > slotsCount;

  const formatDueDate = (due?: string) => {
    if (!due) return null;
    const date = new Date(due);
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
    });
  };

  const handleToggleTask = async (task: TaskItem) => {
    if (!user) return;

    try {
      setCompletingTaskIds((prev) => new Set(prev).add(task.id));
      setClickedTaskId(task.id);

      window.setTimeout(() => {
        setClickedTaskId((prev) => (prev === task.id ? null : prev));
      }, 200);

      window.setTimeout(async () => {
        try {
          await updateTaskStatusWithAuth(user.id, task.listId, task.id, 'completed');
          setTasks((prev) => prev.filter((item) => item.id !== task.id));
        } catch (error) {
          console.error('Error updating task status:', error);
        } finally {
          setCompletingTaskIds((prev) => {
            const next = new Set(prev);
            next.delete(task.id);
            return next;
          });
        }
      }, 300);
    } catch (err) {
      console.error('Error updating task status:', err);
    }
  };

  if (loading) {
    return (
      <div className="family-weekly-tasks widget">
        <div className="widget-header">
          <div className="widget-title">🗒️ Pensez à</div>
        </div>
        <div className="family-weekly-body">
          <div className="loading-message">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="family-weekly-tasks widget">
      <div className="widget-header">
        <div className="widget-title">🗒️ Pensez à</div>
        <span className="refresh-btn" onClick={loadTasks}>
          🔄
        </span>
      </div>

      <div className="family-weekly-body">
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
        ) : sortedTasks.length === 0 ? (
          <div className="family-tasks-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: slotsCount }, (_, index) => (
              <div key={`placeholder-${index}`} className="task-tile task-tile--placeholder"></div>
            ))}
          </div>
        ) : (
          <div className="family-tasks-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
            {Array.from({ length: slotsCount }, (_, index) => {
              if (hasOverflow && index === slotsCount - 1) {
                return (
                  <button
                    key="view-all"
                    type="button"
                    className="task-tile task-tile--view-all"
                    aria-label={`Voir toutes les tâches (${sortedTasks.length})`}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <span>Voir tout ({sortedTasks.length})</span>
                  </button>
                );
              }

              const task = visibleTasks[index];
              if (!task) {
                return (
                  <div key={`placeholder-${index}`} className="task-tile task-tile--placeholder"></div>
                );
              }

              return (
                <div
                  key={task.id}
                  className={`task-tile${completingTaskIds.has(task.id) ? ' is-completing' : ''}${
                    clickedTaskId === task.id ? ' is-clicked' : ''
                  }`}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleToggleTask(task)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleToggleTask(task);
                    }
                  }}
                >
                  <div className="task-tile-content">
                    <div className="task-title" title={task.title}>{task.title}</div>
                    {(task.due || task.listName) && (
                      <div className="task-due">
                        {task.due ? `Échéance ${formatDueDate(task.due)}` : task.listName}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="family-tasks-modal" onClick={() => setIsModalOpen(false)}>
          <div
            className="family-tasks-modal-content"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="family-tasks-modal-header">
              <div>
                <div className="family-tasks-modal-title">Toutes les tâches</div>
                <div className="family-tasks-modal-subtitle">
                  {sortedTasks.length} tâches en attente
                </div>
              </div>
              <button
                type="button"
                className="family-tasks-modal-close"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="family-tasks-modal-body">
              {sortedTasks.map((task) => (
                <div key={`modal-${task.id}`} className="family-tasks-modal-row">
                  <span className="family-tasks-modal-task">{task.title}</span>
                  <span className="family-tasks-modal-meta">
                    {task.due ? `Échéance ${formatDueDate(task.due)}` : task.listName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
