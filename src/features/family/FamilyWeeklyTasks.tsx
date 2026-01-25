import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import {
  getGoogleConnection,
  getTasksWithAuth,
  initiateGoogleOAuth,
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
}

export const FamilyWeeklyTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cta, setCta] = useState<'connect' | 'reconnect' | null>(null);

  useEffect(() => {
    loadTasks();
  }, [user]);

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

  const formatDueDate = (due?: string) => {
    if (!due) return null;
    const date = new Date(due);
    return date.toLocaleDateString('fr-CA', {
      day: 'numeric',
      month: 'short',
    });
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
          <div className="empty-message">📝 Aucune tâche en attente</div>
        ) : (
          <div className="family-weekly-list">
            {sortedTasks.map((task) => (
              <div key={task.id} className="family-weekly-row">
                <div className="family-weekly-checkbox"></div>
                <div className="family-weekly-content">
                  <div className="family-weekly-title">{task.title}</div>
                  <div className="family-weekly-meta">
                    {task.listName && <span>{task.listName}</span>}
                    {task.due && <span>Échéance {formatDueDate(task.due)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
