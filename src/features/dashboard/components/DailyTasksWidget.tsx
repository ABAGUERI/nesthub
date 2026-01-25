import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { supabase } from '@/shared/utils/supabase';
import { getChildrenWithProgress } from '@/shared/utils/children.service';
import { useChildSelection } from '../contexts/ChildSelectionContext';
import { addManualUsage } from '@/shared/utils/screenTimeService';
import './DailyTasksWidget.css';

interface Child {
  id: string;
  firstName: string;
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';
}

interface Task {
  id: string;
  name: string;
  points: number;
  category: string;
  icon: string;
}

interface CompletedTask {
  id: string;
  taskId: string;
  childId: string;
  completedAt: string;
}

type DailyTasksWidgetProps = {
  maxTasks?: number;
  showPagination?: boolean;
  onMilestone?: () => void;
  onCompletedTodayCountChange?: (count: number) => void;
};

export const DailyTasksWidget: React.FC<DailyTasksWidgetProps> = ({
  maxTasks,
  showPagination = true,
  onMilestone,
  onCompletedTodayCountChange,
}) => {
  const { user } = useAuth();
  const { config } = useClientConfig();
  const { selectedChildIndex } = useChildSelection();

  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);
  const [screenTimeModalOpen, setScreenTimeModalOpen] = useState(false);
  const [screenTimeMinutes, setScreenTimeMinutes] = useState(15);
  const [screenTimeError, setScreenTimeError] = useState<string | null>(null);
  const [screenTimeSaving, setScreenTimeSaving] = useState(false);

  // 3 colonnes x 2 lignes
  const defaultTasksPerPage = 6;
  const tasksPerPage = maxTasks ?? defaultTasksPerPage;

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    // Recharger les tâches complétées quand on change d'enfant
    if (children.length > 0) {
      const childId = children[selectedChildIndex]?.id;
      if (childId) {
        loadCompletedTasks(childId);
        void syncMonthlyProgress(childId).catch((error) => {
          console.error('Error syncing monthly progress:', error);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChildIndex, children]);

  useEffect(() => {
    setPageIndex(0);
  }, [selectedChildIndex, tasks.length, config?.moduleScreenTime, tasksPerPage]);

  const loadData = async () => {
    if (!user) return;

    try {
      // Charger enfants
      const childrenData = await getChildrenWithProgress(user.id);
      const formattedChildren = childrenData.map((c: any) => ({
        id: c.id,
        firstName: c.first_name,
        icon: c.icon,
      }));

      setChildren(formattedChildren);

      // Charger tâches disponibles
      const { data: tasksData, error: tasksError } = await supabase
        .from('available_tasks')
        .select('*')
        .eq('user_id', user.id);

      if (tasksError) throw tasksError;

      if (tasksData && tasksData.length > 0) {
        setTasks(
          tasksData.map((t: any) => ({
            id: t.id,
            name: t.name,
            points: t.points,
            category: t.category,
            icon: t.icon || getCategoryIcon(t.category),
          }))
        );
      } else {
        // Créer des tâches par défaut si aucune n'existe
        await createDefaultTasks();
      }

      // Charger tâches complétées
      const activeChildId = formattedChildren[selectedChildIndex]?.id;
      if (activeChildId) {
        await loadCompletedTasks(activeChildId);
        await syncMonthlyProgress(activeChildId);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedTasks = async (childId?: string) => {
    if (!user) return;

    const targetChildId = childId ?? children[selectedChildIndex]?.id;
    if (!targetChildId) return;

    try {
      // Charger tâches complétées aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { data: completedData, error: completedError } = await supabase
        .from('completed_tasks')
        .select('*')
        .eq('child_id', targetChildId)
        .gte('completed_at', `${today}T00:00:00`)
        .lte('completed_at', `${today}T23:59:59`);

      if (completedError) throw completedError;

      if (completedData) {
        setCompletedTasks(
          completedData.map((ct: any) => ({
            id: ct.id,
            taskId: ct.task_id,
            childId: ct.child_id,
            completedAt: ct.completed_at,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading completed tasks:', error);
    }
  };

  const createDefaultTasks = async () => {
    if (!user) return;

    const defaultTasks = [
      { name: 'Ranger sa chambre', points: 10, category: 'menage', icon: '🧹' },
      { name: 'Mettre la table', points: 5, category: 'menage', icon: '🍽️' },
      { name: 'Vider et remplir le lave-vaisselle', points: 8, category: 'menage', icon: '🧼' },
      { name: 'Faire ses devoirs', points: 15, category: 'education', icon: '📚' },
      { name: 'Lire 20 minutes', points: 10, category: 'education', icon: '📖' },
      { name: 'Brosser ses dents', points: 5, category: 'hygiene', icon: '🪥' },
    ];

    const { data, error } = await supabase
      .from('available_tasks')
      .insert(
        defaultTasks.map((t) => ({
          user_id: user.id,
          name: t.name,
          points: t.points,
          category: t.category,
          icon: t.icon,
        }))
      )
      .select();

    if (!error && data) {
      setTasks(
        data.map((t: any) => ({
          id: t.id,
          name: t.name,
          points: t.points,
          category: t.category,
          icon: t.icon || getCategoryIcon(t.category),
        }))
      );
    }
  };

  const getCategoryIcon = (category: string): string => {
    const icons: { [key: string]: string } = {
      menage: '🧹',
      education: '📚',
      hygiene: '🪥',
      sport: '⚽',
      autre: '✨',
    };
    return icons[category] || '✨';
  };

  const getCategoryTone = (category: string): string => {
    const tones: { [key: string]: string } = {
      menage: 'tone-blue',
      education: 'tone-violet',
      hygiene: 'tone-green',
      sport: 'tone-orange',
      autre: 'tone-cyan',
      'screen-time': 'tone-cyan',
    };
    return tones[category] || 'tone-cyan';
  };

  const isTaskCompleted = (taskId: string, childId: string): boolean => {
    return completedTasks.some((ct) => ct.taskId === taskId && ct.childId === childId);
  };

  const getMonthlyProgress = async (childId: string) => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const { data: monthlyTasks, error: monthlyError } = await supabase
      .from('completed_tasks')
      .select('points_earned')
      .eq('child_id', childId)
      .gte('completed_at', startOfMonth.toISOString())
      .lt('completed_at', startOfNextMonth.toISOString());

    if (monthlyError) throw monthlyError;

    const totalPoints = (monthlyTasks || []).reduce((sum, task) => sum + (task.points_earned || 0), 0);
    const totalTasksCompleted = (monthlyTasks || []).length;

    return { totalPoints, totalTasksCompleted };
  };

  const syncMonthlyProgress = async (childId: string) => {
    const { totalPoints, totalTasksCompleted } = await getMonthlyProgress(childId);

    const { error: updateError } = await supabase
      .from('child_progress')
      .update({
        total_points: totalPoints,
        total_tasks_completed: totalTasksCompleted,
      })
      .eq('child_id', childId);

    if (updateError) throw updateError;
  };

  const completeTask = async (task: Task) => {
    const activeChild = children[selectedChildIndex];
    if (!activeChild) return;

    try {
      // Vérifier si la tâche est déjà complétée
      const alreadyCompleted = completedTasks.find(
        (ct) => ct.taskId === task.id && ct.childId === activeChild.id
      );

      if (alreadyCompleted) {
        // DÉCOCHER : Supprimer la tâche complétée
        const { error: deleteError } = await supabase
          .from('completed_tasks')
          .delete()
          .eq('id', alreadyCompleted.id);

        if (deleteError) throw deleteError;
      } else {
        // COCHER : Créer la tâche complétée
        const { data: taskData, error: taskError } = await supabase
          .from('available_tasks')
          .select('id, name, points')
          .eq('id', task.id)
          .single();

        if (taskError) throw taskError;

        const resolvedTask = taskData
          ? {
              id: taskData.id,
              name: taskData.name,
              points: Number(taskData.points) || 0,
            }
          : {
              id: task.id,
              name: task.name,
              points: task.points,
            };

        const { error: completedError } = await supabase.from('completed_tasks').insert({
          id: crypto.randomUUID(),
          child_id: activeChild.id,
          task_id: resolvedTask.id,
          task_name: resolvedTask.name,
          points_earned: resolvedTask.points,
          completed_at: new Date().toISOString(),
        });

        if (completedError) throw completedError;
      }

      // Recalculer la progression dans les deux cas
      await syncMonthlyProgress(activeChild.id);
      await loadCompletedTasks();
    } catch (error) {
      console.error('Error completing/uncompleting task:', error);
    }
  };

  /**
   * IMPORTANT: Hooks toujours appelés, même si on "return" plus bas.
   * Sinon: "Rendered more hooks than during the previous render."
   */
  const activeChild = children[selectedChildIndex] ?? null;

  const completedTodayCount = useMemo(() => {
    if (!activeChild) return 0;
    return completedTasks.filter((ct) => ct.childId === activeChild.id).length;
  }, [activeChild, completedTasks]);

  useEffect(() => {
    onCompletedTodayCountChange?.(completedTodayCount);
  }, [completedTodayCount, onCompletedTodayCountChange]);

  // RENDUS CONDITIONNELS (après tous les hooks)
  if (loading) {
    return (
      <div className="widget">
        <div className="widget-header">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }  

  if (children.length === 0) {
    return (
      <div className="widget">
        <div className="widget-header">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="empty-message">Aucun enfant configuré</div>
      </div>
    );
  }

  if (!activeChild) {
    return (
      <div className="widget daily-tasks-widget">
        <div className="widget-header">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="empty-message">Aucun enfant sélectionné</div>
      </div>
    );
  }

  const screenTimeTask = config?.moduleScreenTime
    ? {
        id: 'screen-time',
        name: "Temps d'écran",
        points: 0,
        category: 'screen-time',
        icon: '⏱️',
        isScreenTime: true,
      }
    : null;

  const safeTasks = [
    ...(screenTimeTask ? [screenTimeTask] : []),
    ...tasks.map((task) => ({
      ...task,
      points: Number.isFinite(task.points) ? task.points : Number(task.points) || 0,
      isScreenTime: false,
    })),
  ];

  const totalPages = Math.max(1, Math.ceil(safeTasks.length / tasksPerPage));
  const paginatedTasks = safeTasks.slice(pageIndex * tasksPerPage, pageIndex * tasksPerPage + tasksPerPage);
  const shouldShowPagination = showPagination && safeTasks.length > tasksPerPage;

  const handleTaskClick = (task: Task & { isScreenTime?: boolean }, isCompleted: boolean) => {
    if (task.isScreenTime) {
      setScreenTimeError(null);
      setScreenTimeMinutes(15);
      setScreenTimeModalOpen(true);
      return;
    }

    // "moment magique" déclenché quand l'enfant vient de valider sa 2e tâche du jour
    // (donc il avait 1 tâche complétée, et clique sur une nouvelle tâche non complétée)
    if (!isCompleted && completedTodayCount === 1) {
      onMilestone?.();
    }
    void completeTask(task);
  };

  const handleScreenTimeQuickAdd = (increment: number) => {
    setScreenTimeMinutes((prev) => Math.max(0, prev + increment));
  };

  const handleScreenTimeSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!activeChild) return;
    const minutes = Math.floor(Number(screenTimeMinutes));

    if (!Number.isFinite(minutes) || minutes <= 0) {
      setScreenTimeError('Veuillez saisir un nombre de minutes valide.');
      return;
    }

    setScreenTimeSaving(true);
    setScreenTimeError(null);

    try {
      await addManualUsage(activeChild.id, minutes);
      setScreenTimeModalOpen(false);
      window.dispatchEvent(new CustomEvent('screen-time-updated', { detail: { childId: activeChild.id } }));
    } catch (error) {
      console.error('Error saving screen time session:', error);
      setScreenTimeError('Impossible de sauvegarder pour le moment.');
    } finally {
      setScreenTimeSaving(false);
    }
  };

  return (
    <div className="widget daily-tasks-widget">
      <div className="widget-header">
        <div className="widget-title">⭐ Tâches du jour</div>
        <span className="refresh-btn" onClick={loadData} role="button" tabIndex={0}>
          🔄
        </span>
      </div>

      <div className="widget-scroll">
        {safeTasks.length === 0 ? (
          <div className="empty-message">Aucune tâche disponible</div>
        ) : (
          <div className="tasks-list">
            {paginatedTasks.map((task) => {
              const isCompleted = task.isScreenTime ? false : isTaskCompleted(task.id, activeChild.id);
              return (
                <div
                  key={task.id}
                  className={`task-row ${isCompleted ? 'completed is-done' : ''} ${getCategoryTone(
                    task.category
                  )}`}
                  onClick={() => handleTaskClick(task, isCompleted)}
                  aria-label={`${task.name}${isCompleted ? ' (validée)' : ''}`}
                >
                  <div className="task-icon">{task.icon}</div>
                  <div className="task-name">{task.name}</div>
                  {isCompleted && (
                    <div className="task-done-badge" aria-hidden="true">
                      ✓ Validé
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {shouldShowPagination && (
        <div className="tasks-navigation">
          <button
            className="tasks-nav-btn"
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={pageIndex === 0}
            aria-label="Tâches précédentes"
            title="Tâches précédentes"
          >
            ‹
          </button>

          <div className="tasks-nav-indicator">
            Tâches {pageIndex + 1} / {totalPages}
          </div>

          <button
            className="tasks-nav-btn"
            onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))}
            disabled={pageIndex >= totalPages - 1}
            aria-label="Tâches suivantes"
            title="Tâches suivantes"
          >
            ›
          </button>
        </div>
      )}

      {screenTimeModalOpen && (
        <div
          className="screen-time-modal-overlay"
          role="dialog"
          aria-modal="true"
          onClick={() => setScreenTimeModalOpen(false)}
        >
          <div className="screen-time-modal" onClick={(event) => event.stopPropagation()}>
            <div className="screen-time-modal-header">
              <h3>Temps d'écran</h3>
              <button
                type="button"
                className="screen-time-modal-close"
                onClick={() => setScreenTimeModalOpen(false)}
                aria-label="Fermer"
              >
                ×
              </button>
            </div>
            <form className="screen-time-modal-body" onSubmit={handleScreenTimeSubmit}>
              <label className="screen-time-label" htmlFor="screen-time-minutes">
                Minutes à ajouter
              </label>
              <input
                id="screen-time-minutes"
                type="number"
                min={1}
                step={1}
                className="screen-time-input"
                value={screenTimeMinutes}
                onChange={(event) => setScreenTimeMinutes(Number(event.target.value))}
              />
              <div className="screen-time-quick-actions">
                {[5, 10, 15, 30].map((increment) => (
                  <button
                    key={increment}
                    type="button"
                    className="screen-time-quick-btn"
                    onClick={() => handleScreenTimeQuickAdd(increment)}
                  >
                    +{increment}
                  </button>
                ))}
              </div>
              {screenTimeError && <div className="screen-time-error">{screenTimeError}</div>}
              <div className="screen-time-modal-actions">
                <button
                  type="button"
                  className="screen-time-secondary"
                  onClick={() => setScreenTimeModalOpen(false)}
                >
                  Annuler
                </button>
                <button type="submit" className="screen-time-primary" disabled={screenTimeSaving}>
                  {screenTimeSaving ? 'Enregistrement...' : 'Valider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
