import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import {
  createTaskWithAuth,
  getGoogleConnection,
  getTasksWithAuth,
  GoogleTaskItem,
  GoogleTaskStatus,
  updateTaskStatusWithAuth,
} from '../services/google.service';
import { GroceryTask } from '@/shared/types/kitchen.types';

export const GroceryPanel: React.FC = () => {
  const { user } = useAuth();
  const { config } = useClientConfig();
  const [tasks, setTasks] = useState<GroceryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const resolvedListName = useMemo(() => {
    return config?.googleGroceryListName || 'Épicerie';
  }, [config?.googleGroceryListName]);

  useEffect(() => {
    loadGroceryTasks();
  }, [user, config?.googleGroceryListId]);

  const loadGroceryTasks = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const connection = await getGoogleConnection(user.id);
      const targetListId = connection?.groceryListId || config?.googleGroceryListId;

      if (!targetListId) {
        setError('Liste Épicerie non configurée');
        setTasks([]);
        setListId(null);
        setLoading(false);
        return;
      }

      setListId(targetListId);

      const remoteTasks = await getTasksWithAuth(user.id, targetListId);
      const normalized: GroceryTask[] = remoteTasks.map((task: GoogleTaskItem) => ({
        id: task.id,
        title: task.title,
        status: task.status as GoogleTaskStatus,
        completed: task.completed,
      }));

      setTasks(normalized);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      const isUnauthorized = message === 'unauthorized';
      setError(
        isUnauthorized
          ? 'Session Google expirée : reconnectez-vous dans Paramètres > Google.'
          : 'Échec de synchronisation'
      );
      console.error('Grocery tasks load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    if (!user || !listId) return;

    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;

    const nextStatus: GoogleTaskStatus =
      current.status === 'completed' ? 'needsAction' : 'completed';

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status: nextStatus,
              completed: nextStatus === 'completed' ? new Date().toISOString() : undefined,
            }
          : task
      )
    );

    try {
      const updated = await updateTaskStatusWithAuth(user.id, listId, taskId, nextStatus);
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
    } catch (err) {
      console.error('Toggle task failed:', err);
      setError('Échec de synchronisation');
      setTasks((prev) => prev.map((task) => (task.id === taskId ? current : task)));
    }
  };

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !listId) return;

    const trimmed = newItem.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticTask: GroceryTask = { id: tempId, title: trimmed, status: 'needsAction' };

    setTasks((prev) => [optimisticTask, ...prev]);
    setNewItem('');

    try {
      const created = await createTaskWithAuth(user.id, listId, trimmed);
      setTasks((prev) => prev.map((task) => (task.id === tempId ? created : task)));
    } catch (err) {
      console.error('Add task failed:', err);
      setError("Impossible d'ajouter cet item");
      setTasks((prev) => prev.filter((task) => task.id !== tempId));
    }
  };

  const handleRetry = () => {
    setRefreshing(true);
    loadGroceryTasks().finally(() => setRefreshing(false));
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="panel-loading">
          <div className="skeleton-line" />
          <div className="skeleton-line short" />
        </div>
      );
    }

    if (error) {
      return (
        <div className="panel-empty">
          <p>{error}</p>
          <button className="ghost-btn" onClick={handleRetry} disabled={refreshing}>
            {refreshing ? 'Rechargement...' : 'Réessayer'}
          </button>
        </div>
      );
    }

    if (!tasks.length) {
      return <div className="panel-empty">Liste vide</div>;
    }

    return (
      <div className="grocery-list">
        {tasks.map((task) => (
          <button
            key={task.id}
            className={`grocery-row ${task.status === 'completed' ? 'done' : ''}`}
            onClick={() => handleToggle(task.id)}
          >
            <span className="checkbox">{task.status === 'completed' ? '✓' : ''}</span>
            <span className="grocery-title">{task.title}</span>
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="kitchen-card">
      <div className="kitchen-card-header">
        <div>
          <h3>Épicerie — {resolvedListName}</h3>
        </div>
        <button className="ghost-btn" onClick={handleRetry} disabled={refreshing}>
          {refreshing ? '⏳' : '🔄'}
        </button>
      </div>

      <form className="grocery-form" onSubmit={handleAdd}>
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Ajouter un item"
          className="grocery-input"
          disabled={!listId}
        />
        <button type="submit" className="primary-btn" disabled={!listId || !newItem.trim()}>
          Ajouter
        </button>
      </form>

      <div className="panel-scroll">{renderContent()}</div>
    </div>
  );
};
