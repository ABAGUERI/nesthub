import React, { useEffect, useMemo, useState, useRef } from 'react';
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
import './GroceryPanel.css';

export const GroceryPanel: React.FC = () => {
  const { user } = useAuth();
  const { config } = useClientConfig();
  const [tasks, setTasks] = useState<GroceryTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItem, setNewItem] = useState('');
  const [listId, setListId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    loadGroceryTasks();
  }, [user, config?.googleGroceryListId]);

  useEffect(() => {
    checkScroll();
  }, [tasks]);

  const checkScroll = () => {
    if (listRef.current) {
      const { scrollHeight, clientHeight } = listRef.current;
      const hasScroll = scrollHeight > clientHeight;
      setShowScrollHint(hasScroll);
      
      // Ajoute/retire la classe pour l'indicateur de scroll
      if (hasScroll) {
        listRef.current.classList.add('has-scroll');
      } else {
        listRef.current.classList.remove('has-scroll');
      }
    }
  };

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
        setError('Liste non configurée');
        setTasks([]);
        setListId(null);
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
      setError(message === 'unauthorized' ? 'Google non connecté' : 'Erreur de synchronisation');
      console.error('Erreur de chargement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setRefreshing(true);
    loadGroceryTasks().finally(() => setRefreshing(false));
  };

  const handleToggle = async (taskId: string) => {
    if (!user || !listId) return;
    const current = tasks.find((task) => task.id === taskId);
    if (!current) return;
    const nextStatus: GoogleTaskStatus = current.status === 'completed' ? 'needsAction' : 'completed';

    setTasks((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, status: nextStatus, completed: nextStatus === 'completed' ? new Date().toISOString() : undefined }
          : task
      )
    );

    try {
      await updateTaskStatusWithAuth(user.id, listId, taskId, nextStatus);
    } catch (err) {
      console.error('Échec du toggle:', err);
      setError('Synchronisation échouée');
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
      console.error('Échec d\'ajout:', err);
      setError("Impossible d'ajouter l'item");
      setTasks((prev) => prev.filter((task) => task.id !== tempId));
    }
  };

  return (
    <div className="kitchen-card-enhanced">
      <div className="grocery-header-section">
        <div>
          <h2 className="card-title">Épicerie</h2>
          <p className="card-subtitle">Liste de courses</p>
        </div>
        <div className="grocery-stats-enhanced">
          {tasks.length} item{tasks.length !== 1 ? 's' : ''}
        </div>
      </div>

      <div className="grocery-input-section-fixed">
        <form className="grocery-input-wrapper-fixed" onSubmit={handleAdd}>
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Ajouter un item..."
            className="grocery-input-enhanced"
            disabled={!listId}
          />
          <button type="submit" className="primary-btn" disabled={!listId || !newItem.trim()}>
            Ajouter
          </button>
        </form>
      </div>

      <div 
        ref={listRef}
        className="grocery-list-fixed"
        onScroll={checkScroll}
      >
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px 0' }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="skeleton-line" style={{ height: '56px', borderRadius: '12px' }}></div>
            ))}
          </div>
        ) : error ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            padding: '40px 20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '16px', fontWeight: '700' }}>
              {error}
            </div>
            <button className="ghost-btn" onClick={handleRetry} disabled={refreshing} type="button">
              {refreshing ? '⏳ Rechargement...' : '🔄 Réessayer'}
            </button>
          </div>
        ) : tasks.length === 0 ? (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center',
            flex: 1,
            padding: '40px 20px',
            color: '#94a3b8',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }}>🛒</div>
            <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px' }}>
              Liste vide
            </div>
            <div style={{ fontSize: '12px' }}>
              Ajoutez vos premiers items
            </div>
          </div>
        ) : (
          <>
            {tasks.map((task) => (
              <button
                key={task.id}
                className={`grocery-item-fixed ${task.status === 'completed' ? 'done' : ''}`}
                onClick={() => handleToggle(task.id)}
                type="button"
              >
                <span className="checkbox-fixed">
                  {task.status === 'completed' ? '✓' : ''}
                </span>
                <span className="item-content-fixed" title={task.title}>
                  {task.title}
                </span>
              </button>
            ))}
            
            {showScrollHint && (
              <div className="scroll-indicator-fixed">
                <div className="scroll-hint-fixed">
                  <span>↓ Défiler pour voir plus</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};