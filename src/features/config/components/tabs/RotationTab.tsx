import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { supabase } from '@/shared/utils/supabase';
import { getAvatarUrl } from '../../services/avatar.service';

interface RotationTask {
  id: string;
  name: string;
  icon: string;
  category: string;
  is_active: boolean;
  sort_order: number;
}

interface Child {
  id: string;
  first_name: string;
  icon: string;
  avatar_url?: string | null;
}

interface Assignment {
  task_id: string;
  child_id: string;
}

type WeekWindow = { weekStartISO: string; weekEndISO: string; weekStartDate: Date; weekEndDate: Date };

const TASK_ICONS = ['🍽️', '🧹', '🗑️', '🐶', '🧺', '🚿', '🛏️', '🧽', '🪴', '📚', '🚗', '🏃', '🎮', '🎨', '🎵', '⚽'];

const getDayName = (day: number): string => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[day] ?? '—';
};

const formatWeekRange = (weekStartDate: Date, weekEndDate: Date): string => {
  const formatter = new Intl.DateTimeFormat('fr-CA', { weekday: 'short', day: '2-digit', month: 'short' });
  return `Semaine du ${formatter.format(weekStartDate)} au ${formatter.format(weekEndDate)}`;
};

const formatResetLabel = (rotationResetDay: number): string => {
  return `Réinitialisation : ${getDayName(rotationResetDay)}`;
};

/**
 * Calcule la fenêtre [weekStart, weekEnd) basée sur rotationResetDay.
 * rotationResetDay: 0=Dimanche ... 6=Samedi
 * Retourne des ISO générées à partir de minuit (heure locale), puis toISOString (UTC).
 *
 * NOTE: la génération DB (RPC) calcule aussi week_start selon rotation_reset_day (America/Montreal).
 * Ici on garde cette fenêtre pour filtrer l'affichage. La RPC est la source de vérité pour créer.
 */
const getWeekWindow = (rotationResetDay: number): WeekWindow => {
  const now = new Date();

  // Minuit local aujourd'hui
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const currentDow = today.getDay(); // 0..6
  const resetDow = Number.isFinite(rotationResetDay) ? rotationResetDay : 1;

  const diff = (currentDow - resetDow + 7) % 7;
  const weekStartDate = new Date(today);
  weekStartDate.setDate(today.getDate() - diff);
  weekStartDate.setHours(0, 0, 0, 0);

  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 7);
  weekEndDate.setHours(0, 0, 0, 0);

  return {
    weekStartISO: weekStartDate.toISOString(),
    weekEndISO: weekEndDate.toISOString(),
    weekStartDate,
    weekEndDate,
  };
};

/**
 * Déduplique côté client pour garantir 1 ligne par task_id,
 * en priorisant updated_at (ou created_at) le plus récent.
 */
const dedupeAssignmentsByTaskMostRecent = (
  rows: Array<{ task_id: string; child_id: string; updated_at?: string | null; created_at?: string | null }>
): Assignment[] => {
  const bestByTask = new Map<string, { task_id: string; child_id: string; ts: number }>();

  for (const r of rows) {
    const tsStr = r.updated_at ?? r.created_at ?? null;
    const ts = tsStr ? new Date(tsStr).getTime() : 0;

    const prev = bestByTask.get(r.task_id);
    if (!prev || ts >= prev.ts) {
      bestByTask.set(r.task_id, { task_id: r.task_id, child_id: r.child_id, ts });
    }
  }

  return Array.from(bestByTask.values()).map(({ task_id, child_id }) => ({ task_id, child_id }));
};

export const RotationTab: React.FC = () => {
  const { user } = useAuth();
  const { config, updateConfig } = useClientConfig();

  const [tasks, setTasks] = useState<RotationTask[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [rotationResetDay, setRotationResetDay] = useState<number>(config?.rotationResetDay ?? 1);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState('🍽️');

  const weekWindow = useMemo(() => getWeekWindow(rotationResetDay), [rotationResetDay]);
  const weekStartISO = weekWindow.weekStartISO;
  const weekEndISO = weekWindow.weekEndISO;

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekStartISO, weekEndISO]);

  useEffect(() => {
    if (config?.rotationResetDay !== undefined) {
      setRotationResetDay(config.rotationResetDay);
    }
  }, [config?.rotationResetDay]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-rotation-card="true"]')) {
        setOpenMenuTaskId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuTaskId(null);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const fetchActiveAssignmentsThisWeek = async () => {
    if (!user) return [];

    const { data, error: assignmentsError } = await supabase
      .from('rotation_assignments')
      .select('task_id, child_id, updated_at, created_at')
      .eq('user_id', user.id)
      .gte('week_start', weekStartISO)
      .lt('week_start', weekEndISO)
      .is('task_end_date', null)
      .order('updated_at', { ascending: false, nullsFirst: false });

    if (assignmentsError) throw assignmentsError;

    return dedupeAssignmentsByTaskMostRecent((data as any[]) || []);
  };

  const ensureWeeklyRotationIfMissing = async () => {
    // Si aucune assignation active pour la semaine, on demande à la DB de générer automatiquement (shuffle + round-robin)
    const { error: rpcError } = await supabase.rpc('ensure_weekly_rotation_random', { p_force: false });
    if (rpcError) throw rpcError;
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // 1) Charger tâches rotation
      const { data: tasksData, error: tasksError } = await supabase
        .from('rotation_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // 2) Charger enfants
      const { data: childrenData, error: childrenError } = await supabase
        .from('family_members')
        .select('id, first_name, icon, avatar_url')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      // 3) Charger assignations actives semaine courante
      let deduped = await fetchActiveAssignmentsThisWeek();

      // 4) Auto-génération si aucune rotation active
      if (deduped.length === 0 && (tasksData?.length ?? 0) > 0 && (childrenData?.length ?? 0) > 0) {
        await ensureWeeklyRotationIfMissing();
        deduped = await fetchActiveAssignmentsThisWeek();
      }

      setAssignments(deduped);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur de chargement';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResetDay = async (day: number) => {
    if (!user) return;

    try {
      await updateConfig({ rotationResetDay: day });
      setRotationResetDay(day);
      setSuccessMessage(`Réinitialisation: ${getDayName(day)}`);
      setTimeout(() => setSuccessMessage(null), 3000);

      // Optionnel: si tu veux regénérer immédiatement après changement de jour, tu peux forcer (reroll) :
      // await supabase.rpc('ensure_weekly_rotation_random', { p_force: true });
      // void loadData();
    } catch (err) {
      console.error('Failed to save reset day:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleAddTask = async () => {
    if (!user || !newTaskName.trim()) {
      setError('Veuillez saisir un nom de tâche');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('rotation_tasks')
        .insert({
          user_id: user.id,
          name: newTaskName.trim(),
          icon: newTaskIcon,
          category: 'household',
          is_active: true,
          sort_order: tasks.length,
        })
        .select()
        .single();

      if (error) throw error;

      setTasks((prev) => [...prev, data]);
      setNewTaskName('');
      setNewTaskIcon('🍽️');
      setSuccessMessage('Tâche ajoutée');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur ajout tâche';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<RotationTask>) => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from('rotation_tasks').update(updates).eq('id', taskId).eq('user_id', user.id);

      if (error) throw error;

      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t)));
      setEditingTask(null);
      setSuccessMessage('Tâche mise à jour');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur mise à jour';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!user || !confirm('Supprimer cette tâche ?')) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from('rotation_tasks').delete().eq('id', taskId).eq('user_id', user.id);

      if (error) throw error;

      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setAssignments((prev) => prev.filter((a) => a.task_id !== taskId));
      setSuccessMessage('Tâche supprimée');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur suppression';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Sauvegarde manuelle :
   * - clôture les actives de la fenêtre
   * - insert les assignations actuellement sélectionnées
   *
   * (on garde ta logique, elle est correcte et utile)
   */
  const handleSaveAssignments = async () => {
    if (!user) return;

    const taskIds = assignments.map((a) => a.task_id);
    const uniqueTaskIds = new Set(taskIds);
    if (taskIds.length !== uniqueTaskIds.size) {
      setError('❌ Erreur : Certaines tâches sont assignées plusieurs fois !');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const nowISO = new Date().toISOString();

      const { error: closeError } = await supabase
        .from('rotation_assignments')
        .update({ task_end_date: nowISO })
        .eq('user_id', user.id)
        .gte('week_start', weekStartISO)
        .lt('week_start', weekEndISO)
        .is('task_end_date', null);

      if (closeError) throw closeError;

      let insertData = assignments
        .filter((a) => a.child_id && a.task_id)
        .map((a, index) => ({
          user_id: user.id,
          week_start: weekStartISO,
          task_id: a.task_id,
          child_id: a.child_id,
          sort_order: index,
        }));

      const seen = new Set<string>();
      insertData = insertData.filter((row) => {
        if (seen.has(row.task_id)) return false;
        seen.add(row.task_id);
        return true;
      });

      if (insertData.length > 0) {
        const { error: insertError } = await supabase.from('rotation_assignments').insert(insertData);

        if (insertError) {
          if ((insertError as any).code === '23505') {
            throw new Error('Conflit: une assignation active existe déjà pour une tâche. Réessayez après rafraîchissement.');
          }
          throw insertError;
        }
      }

      const dedupedFresh = await fetchActiveAssignmentsThisWeek();
      setAssignments(dedupedFresh);

      setSuccessMessage(`✅ ${insertData.length} assignations sauvegardées`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur sauvegarde';
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  /**
   * 🎲 Maintenant, on déclenche la génération côté DB (source de vérité),
   * avec clôture automatique des actives de la semaine (p_force=true).
   */
  const handleGenerateRandom = async () => {
    if (!user) return;

    if (tasks.length === 0 || children.length === 0) {
      setError("Ajoutez des tâches et des membres d'abord");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error: rpcError } = await supabase.rpc('ensure_weekly_rotation_random', { p_force: true });
      if (rpcError) throw rpcError;

      const dedupedFresh = await fetchActiveAssignmentsThisWeek();
      setAssignments(dedupedFresh);

      setSuccessMessage('✅ Rotation générée aléatoirement');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur génération';
      setError(message);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const getAssignedChild = (taskId: string): string => {
    return assignments.find((a) => a.task_id === taskId)?.child_id || '';
  };

  const getChildById = (childId: string): Child | undefined => {
    return children.find((child) => child.id === childId);
  };

  const renderAvatarContent = (child?: Child): React.ReactNode => {
    if (child?.avatar_url) {
      return (
        <img
          src={getAvatarUrl(child.avatar_url) || ''}
          alt={`Avatar de ${child.first_name}`}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '999px' }}
        />
      );
    }
    if (child?.icon) return child.icon;
    if (child?.first_name) return child.first_name.charAt(0).toUpperCase();
    return '—';
  };

  const updateAssignment = (taskId: string, childId: string) => {
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.task_id !== taskId);
      if (childId) return [...filtered, { task_id: taskId, child_id: childId }];
      return filtered;
    });
  };

  return (
    <div className="rotation-tab">
      {error && (
        <div className="config-alert config-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}
      {successMessage && (
        <div className="config-alert config-alert-success">
          <span>✅</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Configuration */}
      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>⚙️ Configuration de la rotation</h3>
            <p>Jour de réinitialisation et paramètres généraux</p>
          </div>
        </div>

        <label className="input-label">
          Jour de réinitialisation hebdomadaire
          <span className="input-hint">La rotation se réinitialisera chaque {getDayName(rotationResetDay)}</span>
        </label>
        <div className="day-selector">
          {[
            { value: 0, label: 'Dim' },
            { value: 1, label: 'Lun' },
            { value: 2, label: 'Mar' },
            { value: 3, label: 'Mer' },
            { value: 4, label: 'Jeu' },
            { value: 5, label: 'Ven' },
            { value: 6, label: 'Sam' },
          ].map((day) => (
            <button
              key={day.value}
              className={`day-btn ${rotationResetDay === day.value ? 'active' : ''}`}
              onClick={() => handleSaveResetDay(day.value)}
              disabled={saving}
              type="button"
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tâches disponibles */}
      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>📋 Tâches de rotation</h3>
            <p>Définissez les tâches qui tourneront entre les membres</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : (
          <>
            <div className="tasks-list">
              {tasks.length === 0 ? (
                <div className="config-placeholder">Aucune tâche définie</div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className="task-item">
                    {editingTask === task.id ? (
                      <>
                        <select
                          className="task-icon-select"
                          value={task.icon}
                          onChange={(e) => handleUpdateTask(task.id, { icon: e.target.value })}
                        >
                          {TASK_ICONS.map((icon) => (
                            <option key={icon} value={icon}>
                              {icon}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={task.name}
                          onChange={(e) =>
                            setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, name: e.target.value } : t)))
                          }
                          placeholder="Nom de la tâche"
                        />
                        <button
                          className="task-btn task-btn-save"
                          onClick={() => handleUpdateTask(task.id, { name: task.name })}
                          disabled={saving}
                          type="button"
                        >
                          ✓
                        </button>
                        <button className="task-btn task-btn-cancel" onClick={() => setEditingTask(null)} type="button">
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="task-icon">{task.icon}</span>
                        <span className="task-name">{task.name}</span>
                        <button
                          className="task-btn task-btn-edit"
                          onClick={() => setEditingTask(task.id)}
                          disabled={saving}
                          type="button"
                        >
                          ✏️
                        </button>
                        <button
                          className="task-btn task-btn-delete"
                          onClick={() => handleDeleteTask(task.id)}
                          disabled={saving}
                          type="button"
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="add-task-form">
              <select className="task-icon-select" value={newTaskIcon} onChange={(e) => setNewTaskIcon(e.target.value)}>
                {TASK_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <Input placeholder="Ex: Cuisine, Balayer..." value={newTaskName} onChange={(e) => setNewTaskName(e.target.value)} />
              <Button onClick={handleAddTask} disabled={!newTaskName.trim() || saving}>
                + Ajouter
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Assignations */}
      {tasks.length > 0 && children.length > 0 && (
        <div className="config-card">
          <div className="config-card-header">
            <div>
              <h3>👥 Assignations de cette semaine</h3>
              <p>Chaque tâche ne peut être assignée qu&apos;à un seul membre</p>
              <div className="rotation-week-pill" style={{ marginTop: 8 }}>
                <div className="rotation-week-title">{formatWeekRange(weekWindow.weekStartDate, weekWindow.weekEndDate)}</div>
                <div className="rotation-week-sub">{formatResetLabel(rotationResetDay)}</div>
              </div>
            </div>
          </div>

          <div className="rotation-assignments-grid">
            {tasks.map((task) => {
              const assignedChildId = getAssignedChild(task.id);
              const assignedChild = assignedChildId ? getChildById(assignedChildId) : undefined;

              return (
                <div
                  key={task.id}
                  className="rotation-assignment-card"
                  data-rotation-card="true"
                  data-task-id={task.id}
                >
                  <div className="rotation-assignment-header">
                    <span className="rotation-task-badge">{task.icon}</span>
                    <span className="rotation-task-title">{task.name}</span>
                  </div>

                  <div className="rotation-assignee-row">
                    <button
                      type="button"
                      className="rotation-assignee-chip"
                      aria-haspopup="menu"
                      aria-expanded={openMenuTaskId === task.id}
                      onClick={() =>
                        setOpenMenuTaskId((prev) => (prev === task.id ? null : task.id))
                      }
                      disabled={saving}
                    >
                      <span className="rotation-assignee-avatar">{renderAvatarContent(assignedChild)}</span>
                      <span className="rotation-assignee-name">{assignedChild?.first_name ?? 'Non assigné'}</span>
                      <span className="rotation-assignee-chevron">▾</span>
                    </button>

                    {openMenuTaskId === task.id && (
                      <div className="rotation-assignee-menu" role="menu">
                        <div
                          className={`rotation-assignee-item ${assignedChildId ? '' : 'selected'}`}
                          role="menuitem"
                          tabIndex={0}
                          onClick={() => {
                            updateAssignment(task.id, '');
                            setOpenMenuTaskId(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              updateAssignment(task.id, '');
                              setOpenMenuTaskId(null);
                            }
                          }}
                        >
                          <span>Non assigné</span>
                          {!assignedChildId && <span className="rotation-assignee-check">✓</span>}
                        </div>
                        {children.map((child) => {
                          const isSelected = assignedChildId === child.id;
                          return (
                            <div
                              key={child.id}
                              className={`rotation-assignee-item ${isSelected ? 'selected' : ''}`}
                              role="menuitem"
                              tabIndex={0}
                              onClick={() => {
                                updateAssignment(task.id, child.id);
                                setOpenMenuTaskId(null);
                              }}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  updateAssignment(task.id, child.id);
                                  setOpenMenuTaskId(null);
                                }
                              }}
                            >
                              <span className="rotation-assignee-avatar">{renderAvatarContent(child)}</span>
                              <span className="rotation-assignee-name">{child.first_name}</span>
                              {isSelected && <span className="rotation-assignee-check">✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rotation-actions">
            <Button onClick={handleSaveAssignments} isLoading={saving} disabled={saving}>
              💾 Sauvegarder la rotation
            </Button>
            <Button onClick={handleGenerateRandom} disabled={saving} variant="secondary">
              🎲 Générer aléatoirement
            </Button>
          </div>
        </div>
      )}

      {(tasks.length === 0 || children.length === 0) && !loading && (
        <div className="config-card">
          <div className="config-placeholder">
            {tasks.length === 0 && 'Ajoutez des tâches de rotation ci-dessus'}
            {tasks.length > 0 && children.length === 0 && "Ajoutez des membres dans l'onglet Famille"}
          </div>
        </div>
      )}
    </div>
  );
};
