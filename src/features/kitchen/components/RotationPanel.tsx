import React, { useEffect, useState } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { getAvatarUrl } from '../../config/services/avatar.service';
import './RotationPanel.css';

interface FamilyMember {
  id: string;
  name: string;
  icon: string;
  color: string;
  avatar_url?: string | null;
  role?: 'child' | 'adult';
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
  assignment_id: string;
}

const DEFAULT_COLORS: Record<string, string> = {
  bee: '#22d3ee',
  ladybug: '#10b981',
  butterfly: '#a855f7',
  caterpillar: '#fb923c',
};

const ICON_EMOJIS: Record<string, string> = {
  bee: '🐝',
  ladybug: '🐞',
  butterfly: '🦋',
  caterpillar: '🐛',
};

type RotationRow = {
  id: string;
  child_id: string;
  task_id: string;
  week_start?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
  sort_order?: number | null;
  task_end_date?: string | null;
  rotation_tasks?: {
    id: string;
    name: string;
    icon?: string | null;
    category?: string | null;
  } | null;
};

/**
 * Utilitaire: crée un ISO en UTC à 00:00:00Z pour une date "locale" (Y/M/D)
 * (évite les décalages bizarres liés à toISOString() sur une date locale)
 */
const utcMidnightIsoFromLocalYMD = (y: number, m0: number, d: number) => {
  // m0 = month 0-based
  return new Date(Date.UTC(y, m0, d, 0, 0, 0, 0)).toISOString();
};

/**
 * Calcule le début de semaine selon le jour de reset:
 * resetDay: 0=dimanche, 1=lundi, ..., 4=jeudi, ..., 6=samedi
 * Exemple: resetDay=4 => la semaine commence jeudi 00:00.
 */
const getWeekStartISOWithResetDay = (resetDay: number) => {
  const now = new Date();

  // Date locale à minuit (on raisonne en "jour" local)
  const localMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  const todayDow = localMidnight.getDay(); // 0..6

  // Combien de jours remonter pour atteindre le dernier resetDay (incluant aujourd’hui si même jour)
  const diff = (todayDow - resetDay + 7) % 7;

  const startLocal = new Date(localMidnight);
  startLocal.setDate(startLocal.getDate() - diff);

  // Convertir ce jour local (Y/M/D) en "00:00Z" stable
  return utcMidnightIsoFromLocalYMD(startLocal.getFullYear(), startLocal.getMonth(), startLocal.getDate());
};

const getWeekEndISOFromStart = (weekStartISO: string) => {
  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);
  end.setUTCHours(0, 0, 0, 0);
  return end.toISOString();
};

const dedupeLatestByMemberTask = (rows: RotationRow[]) => {
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
  const [members, setMembers] = useState<FamilyMember[]>([]);
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
      // 0) Charger config client (rotation_reset_day)
      //    Hypothèse: rotation_reset_day stocké en 0..6 (0=dimanche ... 4=jeudi)
      const { data: cfg, error: cfgError } = await supabase
        .from('client_config')
        .select('rotation_reset_day, rotation_participants')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cfgError) throw cfgError;

      const rotationResetDayRaw = cfg?.rotation_reset_day;
      const rotationResetDay =
        typeof rotationResetDayRaw === 'number' && rotationResetDayRaw >= 0 && rotationResetDayRaw <= 6
          ? rotationResetDayRaw
          : 1; // fallback: lundi

      const rotationParticipants = Array.isArray(cfg?.rotation_participants) ? cfg?.rotation_participants : null;
      const hasSelectedParticipants = Boolean(rotationParticipants && rotationParticipants.length > 0);

      // 1) Charger les membres
      let membersQuery = supabase
        .from('family_members')
        .select('id, first_name, icon, avatar_url, role')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (hasSelectedParticipants) {
        membersQuery = membersQuery.in('id', rotationParticipants);
      } else {
        membersQuery = membersQuery.eq('role', 'child');
      }

      const { data: membersData, error: membersError } = await membersQuery;

      if (membersError) throw membersError;

      const membersWithColors: FamilyMember[] = (membersData || []).map((member: any) => ({
        id: member.id,
        name: member.first_name,
        icon: member.icon,
        avatar_url: member.avatar_url,
        role: member.role,
        color: DEFAULT_COLORS[member.icon] || '#64748b',
      }));

      setMembers(membersWithColors);

      // 2) Fenêtre semaine basée sur rotation_reset_day
      const weekStartISO = getWeekStartISOWithResetDay(rotationResetDay);
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
        .is('task_end_date', null)
        .order('updated_at', { ascending: false, nullsFirst: false })
        .order('sort_order', { ascending: true });

      if (rotationError) throw rotationError;

      const rotationRows = dedupeLatestByMemberTask((rotationData || []) as RotationRow[]);

      // 3) Charger complétions du jour (début de journée locale → converti en UTC 00:00Z du jour local)
      const now = new Date();
      const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const todayISO = utcMidnightIsoFromLocalYMD(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());

      const { data: completionsData, error: completionsError } = await supabase
        .from('rotation_completions')
        .select('child_id, task_id')
        .eq('user_id', user.id)
        .gte('completed_at', todayISO);

      if (completionsError) throw completionsError;

      const completionSet = new Set((completionsData || []).map((c: any) => `${c.child_id}-${c.task_id}`));

      // 4) Organiser par enfant
      const assignmentsByMember = new Map<string, TaskWithCompletion[]>();

      rotationRows.forEach((assignment) => {
        if (!assignment.rotation_tasks) return;

        const memberId = assignment.child_id;

        const task: RotationTask = {
          id: assignment.rotation_tasks.id,
          name: assignment.rotation_tasks.name,
          icon: assignment.rotation_tasks.icon || '📋',
          category: assignment.rotation_tasks.category || 'household',
        };

        const taskWithCompletion: TaskWithCompletion = {
          task,
          completed_today: completionSet.has(`${memberId}-${task.id}`),
          assignment_id: assignment.id,
        };

        if (!assignmentsByMember.has(memberId)) assignmentsByMember.set(memberId, []);
        assignmentsByMember.get(memberId)!.push(taskWithCompletion);
      });

      setAssignments(assignmentsByMember);
    } catch (err) {
      console.error('Error loading rotation data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTask = async (memberId: string, task: RotationTask, currentlyCompleted: boolean) => {
    if (!user) return;

    // Optimistic update
    setAssignments((prev) => {
      const newMap = new Map(prev);
      const memberTasks = newMap.get(memberId) || [];
      const updatedTasks = memberTasks.map((t) =>
        t.task.id === task.id ? { ...t, completed_today: !currentlyCompleted } : t
      );
      newMap.set(memberId, updatedTasks);
      return newMap;
    });

    try {
      if (!currentlyCompleted) {
        const { error } = await supabase.from('rotation_completions').insert({
          user_id: user.id,
          child_id: memberId,
          task_id: task.id,
          completed_at: new Date().toISOString(),
        });
        if (error) throw error;
      } else {
        const now = new Date();
        const todayLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        const todayISO = utcMidnightIsoFromLocalYMD(todayLocal.getFullYear(), todayLocal.getMonth(), todayLocal.getDate());

        const { error } = await supabase
          .from('rotation_completions')
          .delete()
          .eq('user_id', user.id)
          .eq('child_id', memberId)
          .eq('task_id', task.id)
          .gte('completed_at', todayISO);

        if (error) throw error;
      }
    } catch (err) {
      console.error('Error toggling task:', err);

      // Rollback
      setAssignments((prev) => {
        const newMap = new Map(prev);
        const memberTasks = newMap.get(memberId) || [];
        const updatedTasks = memberTasks.map((t) =>
          t.task.id === task.id ? { ...t, completed_today: currentlyCompleted } : t
        );
        newMap.set(memberId, updatedTasks);
        return newMap;
      });
    }
  };

  const getInitials = (name: string) =>
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();

  if (loading) {
    return (
      <div className="rotation-panel-columns">
        <div className="rotation-loading">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="rotation-panel-columns">
      {members.map((member) => {
        const memberTasks = assignments.get(member.id) || [];

        return (
          <div key={member.id} className="rotation-column">
            <div className="rotation-column-header" style={{ '--child-color': member.color } as React.CSSProperties}>
              <div className="rotation-avatar">
                {member.avatar_url ? (
                  <img src={getAvatarUrl(member.avatar_url) || ''} alt={member.name} className="rotation-avatar-img" />
                ) : (
                  <div className="rotation-avatar-placeholder">
                    {ICON_EMOJIS[member.icon] ?? getInitials(member.name)}
                  </div>
                )}
              </div>
              <div className="rotation-name">{member.name}</div>
            </div>

            <div className="rotation-tasks-list">
              {memberTasks.length === 0 ? (
                <div className="rotation-empty">Aucune tâche assignée</div>
              ) : (
                memberTasks.map(({ task, completed_today, assignment_id }) => (
                  <button
                    key={assignment_id}
                    className={`rotation-task-card ${completed_today ? 'completed' : ''}`}
                    onClick={() => toggleTask(member.id, task, completed_today)}
                    type="button"
                    style={{ '--child-color': member.color } as React.CSSProperties}
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
