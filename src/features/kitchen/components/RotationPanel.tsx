import React, { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import './RotationPanel.css';

interface Child {
  id: string;
  name: string;
  icon: string;
  color: string;
  avatar_url?: string;
}

interface RotationTask {
  id: string;
  name: string;
  icon: string;
  category: string;
}

interface Assignment {
  child_id: string;
  task_id: string;
  assignment_id: string;
}

interface TaskWithCompletion {
  task: RotationTask;
  completed_today: boolean;
  assignment_id: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  'bee': '#22d3ee',
  'ladybug': '#10b981',
  'butterfly': '#a855f7',
  'caterpillar': '#fb923c'
};

export const RotationPanel: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Map<string, TaskWithCompletion[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      // 1. Charger les enfants
      const { data: childrenData, error: childrenError } = await supabase
        .from('family_members')
        .select('id, first_name, icon, avatar_url ')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (childrenError) throw childrenError;

      const childrenWithColors = (childrenData || []).map(child => ({
        id: child.id,
        name: child.first_name,
        icon: child.icon,
        avatar_url: child.avatar_url,
        color: DEFAULT_COLORS[child.icon] || '#64748b'
      }));

      setChildren(childrenWithColors);

      // 2. Charger rotation actuelle (semaine en cours)
      const { data: rotationData, error: rotationError } = await supabase
        .from('rotation_assignments')
        .select(`
          id,
          child_id,
          task_id,
          rotation_tasks (
            id,
            name,
            icon,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (rotationError) throw rotationError;

      // 3. Charger complétions du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: completionsData } = await supabase
        .from('rotation_completions')
        .select('child_id, task_id')
        .eq('user_id', user.id)
        .gte('completed_at', todayISO);

      const completionSet = new Set(
        (completionsData || []).map(c => `${c.child_id}-${c.task_id}`)
      );

      // 4. Organiser par enfant
      const assignmentsByChild = new Map<string, TaskWithCompletion[]>();

      (rotationData || []).forEach((assignment: any) => {
        if (!assignment.rotation_tasks) return;

        const childId = assignment.child_id;
        const task: RotationTask = {
          id: assignment.rotation_tasks.id,
          name: assignment.rotation_tasks.name,
          icon: assignment.rotation_tasks.icon || '📋',
          category: assignment.rotation_tasks.category || 'household'
        };

        const taskWithCompletion: TaskWithCompletion = {
          task,
          completed_today: completionSet.has(`${childId}-${task.id}`),
          assignment_id: assignment.id
        };

        if (!assignmentsByChild.has(childId)) {
          assignmentsByChild.set(childId, []);
        }
        assignmentsByChild.get(childId)!.push(taskWithCompletion);
      });

      setAssignments(assignmentsByChild);
    } catch (err) {
      console.error('Error loading rotation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (childId: string, task: RotationTask, currentlyCompleted: boolean) => {
    if (!user) return;

    // Optimistic update
    setAssignments(prev => {
      const newMap = new Map(prev);
      const childTasks = newMap.get(childId) || [];
      const updatedTasks = childTasks.map(t =>
        t.task.id === task.id
          ? { ...t, completed_today: !currentlyCompleted }
          : t
      );
      newMap.set(childId, updatedTasks);
      return newMap;
    });

    try {
      if (!currentlyCompleted) {
        // Marquer comme complété
        await supabase.from('rotation_completions').insert({
          user_id: user.id,
          child_id: childId,
          task_id: task.id,
          completed_at: new Date().toISOString()
        });
      } else {
        // Décocher (supprimer complétion du jour)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayISO = today.toISOString();

        await supabase
          .from('rotation_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('child_id', childId)
          .eq('task_id', task.id)
          .gte('completed_at', todayISO);
      }
    } catch (err) {
      console.error('Error toggling task:', err);
      // Rollback optimistic update
      setAssignments(prev => {
        const newMap = new Map(prev);
        const childTasks = newMap.get(childId) || [];
        const updatedTasks = childTasks.map(t =>
          t.task.id === task.id
            ? { ...t, completed_today: currentlyCompleted }
            : t
        );
        newMap.set(childId, updatedTasks);
        return newMap;
      });
    }
  };

  if (loading) {
    return (
      <div className="rotation-panel-columns">
        <div className="rotation-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="rotation-panel-columns">
      {children.map(child => {
        const childTasks = assignments.get(child.id) || [];

        return (
          <div key={child.id} className="rotation-column">
            <div 
              className="rotation-column-header"
              style={{ 
                '--child-color': child.color 
              } as React.CSSProperties}
            >
              <div className="rotation-avatar">
                {child.avatar_url ? (
                  <img 
                    src={child.avatar_url} 
                    alt={child.name}
                    className="rotation-avatar-img"
                  />
                ) : (
                  <div className="rotation-avatar-placeholder">
                    {child.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="rotation-name">{child.name}</div>
            </div>

            <div className="rotation-tasks-list">
              {childTasks.length === 0 ? (
                <div className="rotation-empty">
                  Aucune tâche assignée
                </div>
              ) : (
                childTasks.map(({ task, completed_today }) => (
                  <button
                    key={task.id}
                    className={`rotation-task-card ${completed_today ? 'completed' : ''}`}
                    onClick={() => toggleTask(child.id, task, completed_today)}
                    type="button"
                    style={{ 
                      '--child-color': child.color 
                    } as React.CSSProperties}
                  >
                    <div className="task-checkbox">
                      {completed_today && <span className="task-check">✓</span>}
                    </div>
                    <div className="task-icon">{task.icon}</div>
                    <div className="task-name">{task.name}</div>
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
