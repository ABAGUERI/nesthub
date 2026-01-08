import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/shared/hooks/useAuth';
import { useChildSelection } from '../contexts/ChildSelectionContext';
import './DailyTasksWidget.css';

interface AvailableTask {
  id: string;
  name: string;
  icon: string;
  points: number;
  money_cents: number;
  tone: string;
}

interface TaskCompletion {
  id: string;
  task_id: string;
  child_id: string;
  completed_at: string;
}

export const DailyTasksWidget: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildId } = useChildSelection();

  const [availableTasks, setAvailableTasks] = useState<AvailableTask[]>([]);
  const [completions, setCompletions] = useState<TaskCompletion[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);

  // Calcul des pages
  const tasksPerPage = 6;
  const totalPages = Math.ceil(availableTasks.length / tasksPerPage);
  const startIndex = currentPage * tasksPerPage;
  const endIndex = startIndex + tasksPerPage;
  const visibleTasks = availableTasks.slice(startIndex, endIndex);

  // Fetch available tasks
  const fetchTasks = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('available_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setAvailableTasks(data || []);
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  }, [user]);

  // Fetch today's completions
  const fetchCompletions = useCallback(async () => {
    if (!user || !selectedChildId) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('hub_task_completions')
        .select('*')
        .eq('user_id', user.id)
        .eq('child_id', selectedChildId)
        .gte('completed_at', `${today}T00:00:00`)
        .lt('completed_at', `${today}T23:59:59`);

      if (error) throw error;
      setCompletions(data || []);
    } catch (err) {
      console.error('Error fetching completions:', err);
    }
  }, [user, selectedChildId]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchTasks(), fetchCompletions()]);
      setLoading(false);
    };
    loadData();
  }, [fetchTasks, fetchCompletions]);

  // Reset to last valid page if current page becomes empty
  useEffect(() => {
    if (currentPage > 0 && visibleTasks.length === 0 && availableTasks.length > 0) {
      setCurrentPage(Math.max(0, totalPages - 1));
    }
  }, [availableTasks.length, currentPage, visibleTasks.length, totalPages]);

  // Realtime subscription for completions
  useEffect(() => {
    if (!user || !selectedChildId) return;

    const channel = supabase
      .channel('daily-tasks-completions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'hub_task_completions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchCompletions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedChildId, fetchCompletions]);

  // Navigation handlers
  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  // Check if task is completed
  const isTaskCompleted = (taskId: string): boolean => {
    return completions.some((c) => c.task_id === taskId);
  };

  // Handle task click
  const handleTaskClick = async (task: AvailableTask) => {
    if (!user || !selectedChildId) return; // Pas d'interaction sans enfant sélectionné
    if (isTaskCompleted(task.id)) return;

    try {
      const { error } = await supabase.from('hub_task_completions').insert({
        user_id: user.id,
        child_id: selectedChildId,
        task_id: task.id,
        points_earned: task.points,
        money_earned_cents: task.money_cents,
        completed_at: new Date().toISOString(),
      });

      if (error) throw error;

      // Refresh completions
      await fetchCompletions();
    } catch (err) {
      console.error('Error completing task:', err);
    }
  };

  if (loading) {
    return (
      <div className="widget daily-tasks-widget">
        <div className="widget-header">
          <h2 className="widget-title">📋 Tâches du jour</h2>
        </div>
        <div className="loading-message">Chargement des tâches...</div>
      </div>
    );
  }

  if (availableTasks.length === 0) {
    return (
      <div className="widget daily-tasks-widget">
        <div className="widget-header">
          <h2 className="widget-title">📋 Tâches du jour</h2>
        </div>
        <div className="empty-message">
          {!selectedChildId 
            ? 'Sélectionne un enfant dans le widget ci-dessus pour suivre ses tâches'
            : 'Aucune tâche disponible'}
        </div>
      </div>
    );
  }

  return (
    <div className="widget daily-tasks-widget">
      <div className="widget-header">
        <h2 className="widget-title">📋 Tâches du jour</h2>
        <button className="refresh-btn" onClick={fetchTasks} aria-label="Rafraîchir">
          🔄
        </button>
      </div>

      {!selectedChildId && (
        <div style={{ 
          padding: '12px', 
          background: 'rgba(251, 191, 36, 0.1)', 
          borderRadius: '12px', 
          margin: '0 0 12px 0',
          fontSize: '13px',
          color: '#fbbf24',
          textAlign: 'center',
          fontWeight: 600
        }}>
          👆 Sélectionne un enfant ci-dessus pour activer les tâches
        </div>
      )}

      <div className="widget-scroll">
        <div className="tasks-list">
          {visibleTasks.map((task) => {
            const completed = isTaskCompleted(task.id);
            const interactive = selectedChildId && !completed;
            
            return (
              <div
                key={task.id}
                className={`task-row ${completed ? 'completed' : ''} ${!selectedChildId ? 'disabled' : ''} tone-${task.tone}`}
                onClick={() => interactive && handleTaskClick(task)}
                role="button"
                tabIndex={interactive ? 0 : -1}
                aria-label={`${task.name} - ${completed ? 'Complétée' : 'Non complétée'}`}
                style={!selectedChildId ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <div className="task-icon">{task.icon}</div>
                <div className="task-name">{task.name}</div>
                {completed && <div className="task-status">✓ Complétée</div>}
              </div>
            );
          })}
        </div>

        {totalPages > 1 && (
          <div className="tasks-navigation">
            <button
              className="tasks-nav-btn"
              onClick={goToPrevPage}
              disabled={currentPage === 0}
              aria-label="Page précédente"
            >
              ‹
            </button>
            <span className="tasks-nav-indicator">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              className="tasks-nav-btn"
              onClick={goToNextPage}
              disabled={currentPage === totalPages - 1}
              aria-label="Page suivante"
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
