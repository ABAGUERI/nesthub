import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { supabase } from '@/shared/utils/supabase';

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
}

interface Assignment {
  task_id: string;
  child_id: string;
}

const TASK_ICONS = [
  '🍽️', '🧹', '🗑️', '🐶', '🧺', '🚿', '🛏️', '🧽',
  '🪴', '📚', '🚗', '🏃', '🎮', '🎨', '🎵', '⚽'
];

const getDayName = (day: number): string => {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  return days[day];
};

const getWeekStart = (): string => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

export const RotationTab: React.FC = () => {
  const { user } = useAuth();
  const { config, updateConfig } = useClientConfig();
  
  const [tasks, setTasks] = useState<RotationTask[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [rotationResetDay, setRotationResetDay] = useState<number>(config?.rotationResetDay ?? 1);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskIcon, setNewTaskIcon] = useState('🍽️');

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    if (config?.rotationResetDay !== undefined) {
      setRotationResetDay(config.rotationResetDay);
    }
  }, [config?.rotationResetDay]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      // Charger tâches rotation
      const { data: tasksData, error: tasksError } = await supabase
        .from('rotation_tasks')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Charger enfants
      const { data: childrenData, error: childrenError } = await supabase
        .from('family_members')
        .select('id, first_name, icon')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (childrenError) throw childrenError;
      setChildren(childrenData || []);

      // Charger assignations semaine courante
      const weekStart = getWeekStart();
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('rotation_assignments')
        .select('task_id, child_id')
        .eq('user_id', user.id)
        .eq('week_start', weekStart);

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);

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
      const { error } = await supabase
        .from('rotation_tasks')
        .update(updates)
        .eq('id', taskId)
        .eq('user_id', user.id);

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
      const { error } = await supabase
        .from('rotation_tasks')
        .delete()
        .eq('id', taskId)
        .eq('user_id', user.id);

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

  const handleSaveAssignments = async () => {
  if (!user) return;

  // ✅ VALIDATION : Vérifier unicité
  const taskIds = assignments.map(a => a.task_id);
  const uniqueTaskIds = new Set(taskIds);

  if (taskIds.length !== uniqueTaskIds.size) {
    console.error('❌ Doublons détectés dans le state');
    setError('❌ Erreur : Certaines tâches sont assignées plusieurs fois !');
    setTimeout(() => setError(null), 5000);
    return;
  }

  setSaving(true);
  setError(null);

  try {
    const weekStart = getWeekStart();
    console.log('📅 Semaine en cours:', weekStart);

    // ✅ 1. SUPPRIMER assignations de LA SEMAINE EN COURS uniquement
    const { error: deleteError } = await supabase
      .from('rotation_assignments')
      .delete()
      .eq('user_id', user.id)
      .eq('week_start', weekStart);  // ← Seulement cette semaine

    if (deleteError) {
      console.error('Erreur DELETE:', deleteError);
      throw deleteError;
    }
    console.log('✅ Assignations de cette semaine supprimées');

    // ✅ 2. PRÉPARER nouvelles assignations
    let insertData = assignments
      .filter((a) => a.child_id && a.task_id)
      .map((a, index) => ({
        user_id: user.id,
        week_start: weekStart,
        task_id: a.task_id,
        child_id: a.child_id,
        sort_order: index,
      }));

    // ✅ 3. DÉDUPLIQUER (sécurité contre doublons dans state)
    const seen = new Set<string>();
    const originalLength = insertData.length;
    
    insertData = insertData.filter(item => {
      if (seen.has(item.task_id)) {
        console.warn('⚠️ Doublon supprimé:', item.task_id);
        return false;
      }
      seen.add(item.task_id);
      return true;
    });

    if (insertData.length !== originalLength) {
      console.warn(`⚠️ ${originalLength - insertData.length} doublons supprimés`);
    }

    console.log(`📊 ${insertData.length} assignations à insérer`);

    // ✅ 4. INSÉRER nouvelles assignations
    if (insertData.length > 0) {
      const { error: insertError } = await supabase
        .from('rotation_assignments')
        .insert(insertData);

      if (insertError) {
        console.error('Erreur INSERT:', insertError);
        
        // Erreur de contrainte unique
        if (insertError.code === '23505') {
          throw new Error('Doublons détectés ! Vérifiez vos assignations.');
        }
        
        throw new Error(`Erreur insertion: ${insertError.message}`);
      }
      console.log('✅ Assignations sauvegardées');
    }

    // ✅ 5. RECHARGER depuis DB pour synchroniser state
    const { data: freshAssignments } = await supabase
      .from('rotation_assignments')
      .select('task_id, child_id')
      .eq('user_id', user.id)
      .eq('week_start', weekStart);

    console.log(`🔄 Rechargé: ${freshAssignments?.length || 0} assignations`);
    setAssignments(freshAssignments || []);

    setSuccessMessage(`✅ ${insertData.length} assignations sauvegardées`);
    setTimeout(() => setSuccessMessage(null), 3000);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur sauvegarde';
    console.error('❌ ERREUR:', message);
    setError(message);
    setTimeout(() => setError(null), 5000);
  } finally {
    setSaving(false);
  }
};

  const handleGenerateRandom = () => {
    if (tasks.length === 0 || children.length === 0) {
      setError('Ajoutez des tâches et des membres d\'abord');
      return;
    }

    // ✅ DISTRIBUTION ÉQUITABLE : 1 tâche = 1 membre unique
    
    // 1. Mélanger les tâches aléatoirement
    const shuffledTasks = [...tasks].sort(() => Math.random() - 0.5);
    
    // 2. Distribuer en round-robin (tour par tour)
    const newAssignments: Assignment[] = [];
    
    shuffledTasks.forEach((task, index) => {
      const childIndex = index % children.length;
      newAssignments.push({
        task_id: task.id,
        child_id: children[childIndex].id,
      });
    });

    setAssignments(newAssignments);
    setSuccessMessage('✅ Rotation générée (1 tâche = 1 membre)');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const getAssignedChild = (taskId: string): string => {
    return assignments.find((a) => a.task_id === taskId)?.child_id || '';
  };

  const updateAssignment = (taskId: string, childId: string) => {
    setAssignments((prev) => {
      // ✅ GARANTIR UNICITÉ : Supprimer toute assignation existante de cette tâche
      const filtered = prev.filter((a) => a.task_id !== taskId);
      
      if (childId) {
        // Ajouter nouvelle assignation unique
        return [...filtered, { task_id: taskId, child_id: childId }];
      }
      
      // Si childId vide = désassigner
      return filtered;
    });
  };

  return (
    <div className="rotation-tab">
      {/* Messages */}
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
          <span className="input-hint">
            La rotation se réinitialisera chaque {getDayName(rotationResetDay)}
          </span>
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
                            setTasks((prev) =>
                              prev.map((t) => (t.id === task.id ? { ...t, name: e.target.value } : t))
                            )
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
                        <button
                          className="task-btn task-btn-cancel"
                          onClick={() => setEditingTask(null)}
                          type="button"
                        >
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
              <select
                className="task-icon-select"
                value={newTaskIcon}
                onChange={(e) => setNewTaskIcon(e.target.value)}
              >
                {TASK_ICONS.map((icon) => (
                  <option key={icon} value={icon}>
                    {icon}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Ex: Cuisine, Balayer..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
              />
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
              <p>Chaque tâche ne peut être assignée qu'à un seul membre</p>
            </div>
          </div>

          <div className="assignments-list">
            {tasks.map((task) => (
              <div key={task.id} className="assignment-row">
                <span className="assignment-task">
                  <span className="task-icon">{task.icon}</span>
                  <span>{task.name}</span>
                </span>
                <select
                  className="assignment-select"
                  value={getAssignedChild(task.id)}
                  onChange={(e) => updateAssignment(task.id, e.target.value)}
                  disabled={saving}
                >
                  <option value="">— Non assigné —</option>
                  {children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.first_name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
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
            {tasks.length > 0 && children.length === 0 && 'Ajoutez des membres dans l\'onglet Famille'}
          </div>
        </div>
      )}
    </div>
  );
};
