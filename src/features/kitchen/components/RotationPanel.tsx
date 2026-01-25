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

interface TaskWithCompletion {
  task: RotationTask;
  completed_today: boolean;
  assignment_id: string; // identifiant unique par ligne d'assignation
}

const DEFAULT_COLORS: Record<string, string> = {
  bee: '#22d3ee',
  ladybug: '#10b981',
  butterfly: '#a855f7',
  caterpillar: '#fb923c',
};

type RotationRow = {
  id: string;
  child_id: string;
  task_id: string;
  week_start?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  sort_order?: number | null;
  task_end_date?: string | null; // ✅ nouvelle colonne
  rotation_tasks?: {
    id: string;
    name: string;
    icon?: string | null;
    category?: string | null;
  } | null;
};

const getWeekStartISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);

  // ISO week start (Monday 00:00)
  const day = d.getDay(); // 0=Sunday
  const diffToMonday = (day === 0 ? -6 : 1) - day;

  d.setDate(d.getDate() + diffToMonday);
  return d.toISOString();
};

const getWeekEndISOFromStart = (weekStartISO: string) => {
  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(start.getDate() + 7);
  end.setHours(0, 0, 0, 0);
  return end.toISOString();
};

const dedupeLatestByChildTask = (rows: RotationRow[]) => {
  // garde 1 ligne par (child_id, task_id), la plus récente via updated_at (fallback created_at)
  const map = new Map<string, RotationRow>();

  for (const r of rows) {
    if (!r.rotation_tasks) continue;

    const key = `${r.child_id}-${r.task_id}`;
    const prev = map.get(key);

    if (!prev) {
      map.set(key, r);
      continue;
    }

    const prevTs = prev.updated_at
      ? Date.parse(prev.updated_at)
      : prev.created_at
        ? Date.parse(prev.created_at)
        : 0;

    const curTs = r.updated_at ? Date.parse(r.updated_at) : r.created_at ? Date.parse(r.created_at) : 0;

    if (curTs >= prevTs) map.set(key, r);
  }

  return Array.from(map.values());
};

export const RotationPanel: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Map<string, TaskWithCompletion[]>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // 1) Charger les enfants
      const { data: childrenData, error: childrenError } = await supabase
        .from('family_members')
        .select('id, first_name, icon, avatar_url')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (childrenError) throw childrenError;

      const childrenWithColors: Child[] = (childrenData || []).map((child: any) => ({
        id: child.id,
        name: child.first_name,
        icon: child.icon,
        avatar_url: child.avatar_url,
        color: DEFAULT_COLORS[child.icon] || '#64748b',
      }));

      setChildren(childrenWithColors);

      // 2) Charger rotation actuelle - uniquement semaine courante
      // ✅ + ne sélectionner que les lignes non terminées (task_end_date IS NULL)
      // ✅ + fenêtre semaine: [weekStart, weekEnd)
      const weekStartISO = getWeekStartISO();
      const weekEndISO = getWeekEndISOFromStart(weekStartISO);

      const { data: rotationData, error: rotationError } = await supabase
        .from('rotation_assignments')
        .select(
          `
          id,
          child_id,
          task_id,
          week_start,
          updated_at,
          created_at,
          sort_order,
          task_end_date,
          rotation_tasks (
            id,
            name,
            icon,
            category
          )
        `
        )
        .eq('user_id', user.id)
        .gte('week_start', weekStartISO)
        .lt('week_start', weekEndISO)
        .is('task_end_date', null) // ✅ uniquement les assignations actives
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('sort_order', { ascending: true });

      if (rotationError) throw rotationError;

      const rotationRows = dedupeLatestByChildTask((rotationData || []) as RotationRow[]);

      // 3) Charger complétions du jour
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const { data: completionsData, error: completionsError } = await supabase
        .from('rotation_completions')
        .select('child_id, task_id')
        .eq('user_id', user.id)
        .gte('completed_at', todayISO);

      if (completionsError) throw completionsError;

      const completionSet = new Set((completionsData || []).map((c: any) => `${c.child_id}-${c.task_id}`));

      // 4) Organiser par enfant
      const assignmentsByChild = new Map<string, TaskWithCompletion[]>();

      rotationRows.forEach((assignment) => {
        if (!assignment.rotation_tasks) return;

        const childId = assignment.child_id;

        const task: RotationTask = {
          id: assignment.rotation_tasks.id,
          name: assignment.rotation_tasks.name,
          icon: assignment.rotation_tasks.icon || '📋',
          category: assignment.rotation_tasks.category || 'household',
        };

        const taskWithCompletion: TaskWithCompletion = {
          task,
          completed_today: completionSet.has(`${childId}-${task.id}`),
          assignment_id: assignment.id, // ✅ clé unique par ligne
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
    setAssignments((prev) => {
      const newMap = new Map(prev);
      const childTasks = newMap.get(childId) || [];
      const updatedTasks = childTasks.map((t) =>
        t.task.id === task.id ? { ...t, completed_today: !currentlyCompleted } : t
      );
      newMap.set(childId, updatedTasks);
      return newMap;
    });

    try {
      if (!currentlyCompleted) {
        await supabase.from('rotation_completions').insert({
          user_id: user.id,
          child_id: childId,
          task_id: task.id,
          completed_at: new Date().toISOString(),
        });
      } else {
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

      // Rollback
      setAssignments((prev) => {
        const newMap = new Map(prev);
        const childTasks = newMap.get(childId) || [];
        const updatedTasks = childTasks.map((t) =>
          t.task.id === task.id ? { ...t, completed_today: currentlyCompleted } : t
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
      {children.map((child) => {
        const childTasks = assignments.get(child.id) || [];

        return (
          <div key={child.id} className="rotation-column">
            <div className="rotation-column-header" style={{ '--child-color': child.color } as React.CSSProperties}>
              <div className="rotation-avatar">
                {child.avatar_url ? (
                  <img src={child.avatar_url} alt={child.name} className="rotation-avatar-img" />
                ) : (
                  <div className="rotation-avatar-placeholder">{child.name.charAt(0)}</div>
                )}
              </div>
              <div className="rotation-name">{child.name}</div>
            </div>

            <div className="rotation-tasks-list">
              {childTasks.length === 0 ? (
                <div className="rotation-empty">Aucune tâche assignée</div>
              ) : (
                childTasks.map(({ task, completed_today, assignment_id }) => (
                  <button
                    key={assignment_id}
                    className={`rotation-task-card ${completed_today ? 'completed' : ''}`}
                    onClick={() => toggleTask(child.id, task, completed_today)}
                    type="button"
                    style={{ '--child-color': child.color } as React.CSSProperties}
                  >
                    <div className="task-checkbox">{completed_today && <span className="task-check">✓</span>}</div>
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
