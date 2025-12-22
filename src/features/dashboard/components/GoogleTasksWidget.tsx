import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import {
  getGoogleConnection,
  getTasks,
} from '@/features/google/google.service';
import './GoogleTasksWidget.css';

interface TaskList {
  id: string;
  google_task_list_id: string;
  name: string;
  type: string;
}

interface Task {
  id: string;
  title: string;
  status: string;
  completed?: string;
}

interface TaskListWithTasks extends TaskList {
  tasks: Task[];
  isOpen: boolean;
}

export const GoogleTasksWidget: React.FC = () => {
  const { user } = useAuth();
  const [taskLists, setTaskLists] = useState<TaskListWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      // Récupérer la connexion Google
      const connection = await getGoogleConnection(user.id);
      if (!connection || !connection.accessToken) {
        setError('Connectez ou reconnectez Google pour afficher vos tâches.');
        setLoading(false);
        return;
      }

      // Récupérer les listes de tâches depuis Supabase
      const { data: lists, error } = await supabase
        .from('task_lists')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      if (!lists || lists.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch tâches pour chaque liste
      const listsWithTasks: TaskListWithTasks[] = await Promise.all(
        lists.map(async (list) => {
          try {
            const tasks = await getTasks(
              connection.accessToken,
              list.google_task_list_id
            );

            return {
              ...list,
              tasks: tasks || [],
              isOpen: true, // Ouvrir par défaut
            };
          } catch (error) {
            console.error(`Error loading tasks for list ${list.name}:`, error);
            return {
              ...list,
              tasks: [],
              isOpen: false,
            };
          }
        })
      );

      setTaskLists(listsWithTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setError('Impossible de charger les tâches Google');
    } finally {
      setLoading(false);
    }
  };

  const toggleList = (listId: string) => {
    setTaskLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, isOpen: !list.isOpen } : list
      )
    );
  };

  const getListIcon = (type: string, name: string): string => {
    if (type === 'grocery') return '📝';
    if (name.toLowerCase().includes('familiale')) return '👨‍👩‍👧';
    if (name.toLowerCase().includes('sifaw')) return '🐝';
    if (name.toLowerCase().includes('lucas')) return '🐞';
    return '📋';
  };

  if (loading) {
    return (
      <div className="widget">
        <div className="widget-header">
          <div className="widget-title">📋 Pense à</div>
        </div>
        <div className="widget-scroll">
          <div className="loading-message">Chargement...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="widget">
      <div className="widget-header">
        <div className="widget-title">📋 Pense à</div>
        <span className="refresh-btn" onClick={loadTasks}>
          🔄
        </span>
      </div>

      <div className="widget-scroll">
        {error ? (
          <div className="empty-message">{error}</div>
        ) : taskLists.length === 0 ? (
          <div className="empty-message">📝 Aucune tâche</div>
        ) : (
          <>
            {taskLists.map((list) => {
              const incompleteTasks = list.tasks.filter(
                (t) => t.status !== 'completed'
              );

              if (incompleteTasks.length === 0) return null;

              return (
                <details
                  key={list.id}
                  className="gtask-group"
                  open={list.isOpen}
                >
                  <summary
                    className="gtask-summary"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleList(list.id);
                    }}
                  >
                    <span>
                      {getListIcon(list.type, list.name)} {list.name}
                    </span>
                    <span className="task-count">
                      {incompleteTasks.length}
                    </span>
                  </summary>

                  <div className="gtask-list">
                    {incompleteTasks.map((task) => (
                      <div key={task.id} className="gtask-row">
                        <div className="gtask-checkbox"></div>
                        <span>{task.title}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
};
