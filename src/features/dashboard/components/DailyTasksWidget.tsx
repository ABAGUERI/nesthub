import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { getChildrenWithProgress } from '@/shared/utils/children.service';
import { useChildSelection } from '../contexts/ChildSelectionContext';
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

export const DailyTasksWidget: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex } = useChildSelection();
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageIndex, setPageIndex] = useState(0);

  // 3 colonnes x 2 lignes
  const tasksPerPage = 6;

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recharger les tâches complétées quand on change d'enfant
    if (children.length > 0) {
      loadCompletedTasks();
    }
  }, [selectedChildIndex, children]);

  useEffect(() => {
    setPageIndex(0);
  }, [selectedChildIndex, tasks.length]);

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
      await loadCompletedTasks();
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedTasks = async () => {
    if (!user) return;

    try {
      // Charger tâches complétées aujourd'hui
      const today = new Date().toISOString().split('T')[0];
      const { data: completedData, error: completedError } = await supabase
        .from('completed_tasks')
        .select('*')
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
    };
    return tones[category] || 'tone-cyan';
  };

  const isTaskCompleted = (taskId: string, childId: string): boolean => {
    return completedTasks.some((ct) => ct.taskId === taskId && ct.childId === childId);
  };

  const completeTask = async (task: Task) => {
    if (children.length === 0) return;

    const activeChild = children[selectedChildIndex];
    if (!activeChild) return;

    try {
      // Créer la tâche complétée
      const { error: completedError } = await supabase.from('completed_tasks').insert({
        id: crypto.randomUUID(),
        child_id: activeChild.id,
        task_id: task.id,
        task_name: task.name,
        points_earned: task.points,
        completed_at: new Date().toISOString(),
      });

      if (completedError) throw completedError;

      // Mettre à jour la progression de l'enfant
      const { data: progressData, error: progressError } = await supabase
        .from('child_progress')
        .select('total_points')
        .eq('child_id', activeChild.id)
        .single();

      if (progressError) throw progressError;

      const { error: updateError } = await supabase
        .from('child_progress')
        .update({
          total_points: progressData.total_points + task.points,
        })
        .eq('child_id', activeChild.id);

      if (updateError) throw updateError;

      await loadCompletedTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (loading) {
    return (
      <div className="widget glassCard">
        <div className="widget-header cardHeader">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="widget glassCard">
        <div className="widget-header cardHeader">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="empty-message">Aucun enfant configuré</div>
      </div>
    );
  }

  const activeChild = children[selectedChildIndex];
  if (!activeChild) {
    return (
      <div className="widget glassCard daily-tasks-widget">
        <div className="widget-header cardHeader">
          <div className="widget-title">⭐ Tâches du jour</div>
        </div>
        <div className="empty-message">Aucun enfant sélectionné</div>
      </div>
    );
  }

  const safeTasks = tasks.map((task) => ({
    ...task,
    points: Number.isFinite(task.points) ? task.points : Number(task.points) || 0,
  }));

  const totalPages = Math.max(1, Math.ceil(safeTasks.length / tasksPerPage));
  const paginatedTasks = safeTasks.slice(pageIndex * tasksPerPage, pageIndex * tasksPerPage + tasksPerPage);
  const showPagination = safeTasks.length > tasksPerPage;

  return (
    <div className="widget glassCard daily-tasks-widget">
      <div className="widget-header cardHeader">
        <div className="widget-title">⭐ Tâches du jour</div>
        <span className="refresh-btn" onClick={loadData}>
          🔄
        </span>
      </div>

      <div className="widget-scroll cardBody">
        {safeTasks.length === 0 ? (
          <div className="empty-message">Aucune tâche disponible</div>
        ) : (
          <div className="tasks-list">
            {paginatedTasks.map((task) => {
              const isCompleted = isTaskCompleted(task.id, activeChild.id);
              return (
                <div
                  key={task.id}
                  className={`task-row ${isCompleted ? 'completed' : ''} ${getCategoryTone(task.category)}`}
                  onClick={() => !isCompleted && completeTask(task)}
                >
                  <div className="task-icon">{task.icon}</div>
                  <div className="task-name">{task.name}</div>
                  {isCompleted && <div className="task-status">Terminé</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showPagination && (
        <div className="tasks-navigation cardFooter">
          <button
            className="tasks-nav-btn"
            onClick={() => setPageIndex((prev) => Math.max(prev - 1, 0))}
            disabled={pageIndex === 0}
            aria-label="Tâches précédentes"
          >
            ‹
          </button>
          <div className="tasks-nav-indicator">
            Page {pageIndex + 1} / {totalPages}
          </div>
          <button
            className="tasks-nav-btn"
            onClick={() => setPageIndex((prev) => Math.min(prev + 1, totalPages - 1))}
            disabled={pageIndex >= totalPages - 1}
            aria-label="Tâches suivantes"
          >
            ›
          </button>
        </div>
      )}
    </div>
  );
};
