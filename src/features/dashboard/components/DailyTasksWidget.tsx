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
  moneyValue: number;
  category: string;
  icon: string;
}

interface CompletedTask {
  id: string;
  taskId: string;
  completedAt: string;
}

export const DailyTasksWidget: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex } = useChildSelection();
  const [children, setChildren] = useState<Child[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    // Recharger les tâches complétées quand on change d'enfant
    if (children.length > 0) {
      loadCompletedTasks();
    }
  }, [selectedChildIndex, children]);

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
            moneyValue: t.money_value,
            category: t.category,
            icon: getCategoryIcon(t.category),
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
      { name: 'Ranger sa chambre', points: 10, money: 0.5, category: 'menage', icon: '🧹' },
      { name: 'Mettre la table', points: 5, money: 0.25, category: 'menage', icon: '🍽️' },
      { name: 'Vider et remplir le lave-vaisselle', points: 8, money: 0.4, category: 'menage', icon: '🧼' },
      { name: 'Faire ses devoirs', points: 15, money: 0.75, category: 'education', icon: '📚' },
      { name: 'Lire 20 minutes', points: 10, money: 0.5, category: 'education', icon: '📖' },
      { name: 'Brosser ses dents', points: 5, money: 0.25, category: 'hygiene', icon: '🪥' },
    ];

    const { data, error } = await supabase
      .from('available_tasks')
      .insert(
        defaultTasks.map((t) => ({
          user_id: user.id,
          name: t.name,
          points: t.points,
          money_value: t.money,
          category: t.category,
        }))
      )
      .select();

    if (!error && data) {
      setTasks(
        data.map((t: any) => ({
          id: t.id,
          name: t.name,
          points: t.points,
          moneyValue: t.money_value,
          category: t.category,
          icon: getCategoryIcon(t.category),
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

  const isTaskCompleted = (taskId: string, childId: string): boolean => {
    return completedTasks.some(
      (ct) => ct.taskId === taskId && ct.id.includes(childId)
    );
  };

  const completeTask = async (task: Task) => {
    if (children.length === 0) return;
    
    const activeChild = children[selectedChildIndex];
    if (!activeChild) return;

    try {
      // Créer la tâche complétée
      const { error: completedError } = await supabase
        .from('completed_tasks')
        .insert({
          child_id: activeChild.id,
          task_id: task.id,
          points_earned: task.points,
          money_earned: task.moneyValue,
          completed_at: new Date().toISOString(),
        });

      if (completedError) throw completedError;

      // Mettre à jour la progression de l'enfant
      const { data: progressData, error: progressError } = await supabase
        .from('child_progress')
        .select('total_points, money_balance')
        .eq('child_id', activeChild.id)
        .single();

      if (progressError) throw progressError;

      const { error: updateError } = await supabase
        .from('child_progress')
        .update({
          total_points: progressData.total_points + task.points,
          money_balance: progressData.money_balance + task.moneyValue,
        })
        .eq('child_id', activeChild.id);

      if (updateError) throw updateError;

      // Recharger les données
      await loadCompletedTasks();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getActiveChild = (): Child | undefined => {
    return children.find((c) => c.id === activeTab);
  };

  const getChildColor = (icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar'): string => {
    const colors = {
      bee: '#fbbf24',
      ladybug: '#f87171',
      butterfly: '#a78bfa',
      caterpillar: '#34d399',
    };
    return colors[icon] || '#fbbf24';
  };

  const getChildIcon = (icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar'): string => {
    const icons = {
      bee: '🐝',
      ladybug: '🐞',
      butterfly: '🦋',
      caterpillar: '🐛',
    };
    return icons[icon] || '🐝';
  };

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

  const activeChild = children[selectedChildIndex];

  return (
    <div className="widget daily-tasks-widget">
      <div className="widget-header">
        <div className="widget-title">⭐ Tâches du jour</div>
        <span className="refresh-btn" onClick={loadData}>
          🔄
        </span>
      </div>

      {/* Header avec nom de l'enfant actif */}
      <div className="tasks-header">
        <div className="tasks-child-name">
          <span style={{ color: getChildColor(activeChild.icon) }}>
            {getChildIcon(activeChild.icon)}
          </span>
          <span>{activeChild.firstName}</span>
        </div>
      </div>

      <div className="widget-scroll">
        {tasks.length === 0 ? (
          <div className="empty-message">Aucune tâche disponible</div>
        ) : (
          <div className="tasks-list">
            {tasks.map((task) => {
              const isCompleted = isTaskCompleted(task.id, activeChild.id);
              return (
                <div
                  key={task.id}
                  className={`task-row ${isCompleted ? 'completed' : ''}`}
                  onClick={() => !isCompleted && completeTask(task)}
                >
                  <div className="task-checkbox">
                    {isCompleted && <span className="checkmark">✓</span>}
                  </div>
                  <div className="task-icon">{task.icon}</div>
                  <div className="task-info">
                    <div className="task-name">{task.name}</div>
                    <div className="task-reward">
                      +{task.points} pts • +{task.moneyValue.toFixed(2)}$
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
