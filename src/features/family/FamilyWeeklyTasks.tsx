import React, { useEffect, useMemo, useRef, useState } from 'react';
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

const getTaskPriority = (task: TaskItem): 'urgent' | 'soon' | 'normal' => {
  if (!task.due) return 'normal';
  const dueDate = new Date(task.due);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 'urgent';
  if (diffDays <= 2) return 'soon';
  return 'normal';
};

/* Get icon based on task title keywords */
const getTaskIcon = (title: string): string => {
  const lower = title.toLowerCase();
  if (lower.includes('appel') || lower.includes('téléphone')) return '📞';
  if (lower.includes('impôt') || lower.includes('tax')) return '🔥';
  if (lower.includes('chaussure') || lower.includes('foot') || lower.includes('sport')) return '👟';
  if (lower.includes('cuisine') || lower.includes('coller') || lower.includes('réparer')) return '🔧';
  if (lower.includes('inscription') || lower.includes('camp')) return '📝';
  if (lower.includes('livre') || lower.includes('école')) return '📚';
  if (lower.includes('patin') || lower.includes('hockey')) return '⛸️';
  if (lower.includes('nouvelle') || lower.includes('contact')) return '💬';
  if (lower.includes('achat') || lower.includes('acheter')) return '🛒';
  if (lower.includes('rdv') || lower.includes('rendez-vous') || lower.includes('médecin')) return '🏥';
  return '📌';
};

export const FamilyWeeklyTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cta, setCta] = useState<'connect' | 'reconnect' | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmTask, setConfirmTask] = useState<TaskItem | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [completingTaskIds, setCompletingTaskIds] = useState<Set<string>>(new Set());
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user]);

  useEffect(() => {
    if (confirmTask) {
      setIsModalOpen(false);
      const timer = window.setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [confirmTask]);

  useEffect(() => {
    if (!confirmTask) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!isConfirming) {
          setConfirmTask(null);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmTask, isConfirming]);

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
      // Sort by priority first
      const priorityOrder = { urgent: 0, soon: 1, normal: 2 };
      const aPriority = priorityOrder[getTaskPriority(a)];
      const bPriority = priorityOrder[getTaskPriority(b)];
      if (aPriority !== bPriority) return aPriority - bPriority;

      // Then by due date
      if (a.due && b.due) {
        return new Date(a.due).getTime() - new Date(b.due).getTime();
      }
      if (a.due) return -1;
      if (b.due) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [tasks]);

  // Show max 8 tasks in horizontal layout
  const maxVisible = 8;
  const visibleTasks = sortedTasks.slice(0, maxVisible);
  const overflowCount = Math.max(0, sortedTasks.length - maxVisible);

  const formatDueDate = (due?: string) => {
    if (!due) return null;
    const date = new Date(due);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.getTime() < today.getTime()) return "En retard";
    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === tomorrow.toDateString()) return "Demain";

    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
    });
  };

  const confirmAndCompleteTask = async (task: TaskItem) => {
    if (!user || isConfirming) return;

    setIsConfirming(true);

    try {
      setCompletingTaskIds((prev) => new Set(prev).add(task.id));

      await new Promise((resolve) => window.setTimeout(resolve, 300));

      await updateTaskStatusWithAuth(user.id, task.listId, task.id, 'completed');
      setTasks((prev) => prev.filter((item) => item.id !== task.id));
    } catch (err) {
      console.error('Error updating task status:', err);
    } finally {
      setCompletingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      setIsConfirming(false);
      setConfirmTask(null);
    }
  };

  {/* Loading state */}
  if (loading) {
    return (
      <div className="family-weekly-tasks widget">
        <div className="widget-header">
          <div className="widget-title">
            À faire prochainement
          </div>
        </div>
        <div className="family-weekly-body">
          <div className="loading-message">Chargement...</div>
        </div>
      </div>
    );
  }

  {/* Main render - Grid card layout matching mockup */}
  return (
    <div className="family-weekly-tasks widget">
      <div className="widget-header">
        <div className="widget-title">
          À faire prochainement
          {sortedTasks.length > 0 && (
            <span className="widget-title__count">{sortedTasks.length} tâches</span>
          )}
        </div>
        <div className="widget-actions">
          {sortedTasks.length > maxVisible && (
            <button
              type="button"
              className="tasks-view-all-btn"
              onClick={() => setIsModalOpen(true)}
            >
              Voir tout
            </button>
          )}
        </div>
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
          <div className="tasks-empty-state">
            <span className="tasks-empty-state__icon">✨</span>
            <span className="tasks-empty-state__text">Aucune tâche en attente</span>
          </div>
        ) : (
          <div className="tasks-cards-grid">
            {visibleTasks.map((task) => {
              const priority = getTaskPriority(task);
              const isCompleting = completingTaskIds.has(task.id);
              const icon = getTaskIcon(task.title);

              return (
                <button
                  key={task.id}
                  type="button"
                  className={`task-card task-card--${priority} ${isCompleting ? 'is-completing' : ''}`}
                  onClick={() => setConfirmTask(task)}
                  disabled={isCompleting}
                >
                  <span className="task-card__icon">{icon}</span>
                  <div className="task-card__content">
                    <span className="task-card__title">{task.title}</span>
                    <span className="task-card__meta">
                      {formatDueDate(task.due) || 'Cette semaine'}
                      {task.listName && task.listName !== 'Famille' && ` · ${task.listName}`}
                    </span>
                  </div>
                  <span className="task-card__chevron">›</span>
                </button>
              );
            })}
            {overflowCount > 0 && (
              <button
                type="button"
                className="task-card task-card--overflow"
                onClick={() => setIsModalOpen(true)}
              >
                <span className="task-card__icon">📋</span>
                <div className="task-card__content">
                  <span className="task-card__title">+{overflowCount} autres tâches</span>
                  <span className="task-card__meta">Voir tout</span>
                </div>
                <span className="task-card__chevron">›</span>
              </button>
            )}
          </div>
        )}
      </div>

      {confirmTask && (
        <div
          className="family-confirm-modal"
          onClick={() => {
            if (!isConfirming) {
              setConfirmTask(null);
            }
          }}
        >
          <div
            className="family-confirm-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="family-confirm-title"
            aria-describedby="family-confirm-description"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="family-confirm-modal-header">
              <div>
                <div className="family-confirm-modal-title" id="family-confirm-title">
                  Marquer comme terminée ?
                </div>
              </div>
            </div>
            <div className="family-confirm-modal-body">
              <div className="family-confirm-task-title">{confirmTask.title}</div>
              {(confirmTask.due || confirmTask.listName) && (
                <div className="family-confirm-task-meta">
                  {confirmTask.due
                    ? formatDueDate(confirmTask.due)
                    : confirmTask.listName}
                </div>
              )}
            </div>
            <div className="family-confirm-modal-actions">
              <button
                type="button"
                className="family-confirm-btn family-confirm-btn--secondary"
                onClick={() => setConfirmTask(null)}
                disabled={isConfirming}
              >
                Annuler
              </button>
              <button
                ref={confirmButtonRef}
                type="button"
                className="family-confirm-btn family-confirm-btn--primary"
                onClick={() => confirmAndCompleteTask(confirmTask)}
                disabled={isConfirming}
              >
                {isConfirming ? '✓' : 'Valider'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  {sortedTasks.length} tâche{sortedTasks.length > 1 ? 's' : ''} en attente
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
              {sortedTasks.map((task) => {
                const priority = getTaskPriority(task);
                return (
                  <div
                    key={`modal-${task.id}`}
                    className={`family-tasks-modal-row family-tasks-modal-row--${priority}`}
                    onClick={() => {
                      setIsModalOpen(false);
                      setConfirmTask(task);
                    }}
                  >
                    <span className="family-tasks-modal-indicator" />
                    <div className="family-tasks-modal-info">
                      <span className="family-tasks-modal-task">{task.title}</span>
                      <span className="family-tasks-modal-meta">
                        {task.due ? formatDueDate(task.due) : task.listName}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
