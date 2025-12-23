import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';

interface RewardTask {
  id: string;
  name: string;
  points: number;
  moneyValue: number;
  category: string;
}

export const RewardsTab: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newTask, setNewTask] = useState({
    name: '',
    points: 10,
    moneyValue: 0.5,
  });

  useEffect(() => {
    loadTasks();
  }, [user]);

  const loadTasks = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('available_tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (dbError) throw dbError;
      const formatted = (data || []).map((task: any) => ({
        id: task.id,
        name: task.name,
        points: task.points,
        moneyValue: task.money_value,
        category: task.category || 'special',
      }));
      setTasks(formatted);
    } catch (err: any) {
      setError(err.message || 'Impossible de charger les tâches');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!user || !newTask.name.trim()) {
      setError('Veuillez renseigner un nom de tâche');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('available_tasks')
        .insert({
          user_id: user.id,
          name: newTask.name.trim(),
          points: newTask.points,
          money_value: newTask.moneyValue,
          category: 'special',
        })
        .select()
        .single();

      if (dbError) throw dbError;
      if (data) {
        setTasks((prev) => [
          ...prev,
          {
            id: data.id,
            name: data.name,
            points: data.points,
            moneyValue: data.money_value,
            category: data.category,
          },
        ]);
      }
      setNewTask({ name: '', points: 10, moneyValue: 0.5 });
    } catch (err: any) {
      setError(err.message || 'Impossible d’ajouter la tâche');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (task: RewardTask) => {
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('available_tasks')
        .update({
          name: task.name.trim(),
          points: task.points,
          money_value: task.moneyValue,
          category: task.category,
        })
        .eq('id', task.id);

      if (dbError) throw dbError;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
    } catch (err: any) {
      setError(err.message || 'Impossible de mettre à jour la tâche');
    } finally {
      setSaving(false);
    }
  };

  const updateLocalTask = (id: string, updates: Partial<RewardTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...updates } : t)));
  };

  const handleDeleteTask = async (taskId: string) => {
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase.from('available_tasks').delete().eq('id', taskId);
      if (dbError) throw dbError;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'Impossible de supprimer la tâche');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Gamification</p>
          <h2>Tâches qui donnent des récompenses</h2>
          <p className="panel-subtitle">
            Ajustez les points et la valeur monétaire des tâches. C’est ici que vous modulez la motivation et le niveau de difficulté.
          </p>
        </div>
        <Button variant="secondary" onClick={loadTasks} isLoading={loading}>
          Rafraîchir
        </Button>
      </div>

      {error && <div className="config-alert error">{error}</div>}

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Tâches récompensées</h3>
            <p>Les modifications sont prises en compte immédiatement sur le dashboard.</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="config-placeholder">Aucune tâche. Ajoutez-en ci-dessous.</div>
        ) : (
          <div className="task-grid">
            {tasks.map((task) => (
              <div key={task.id} className="task-tile">
                <div className="task-tile-header">
                  <span className="chip neutral">Récompense</span>
                  <button className="ghost-button" onClick={() => handleDeleteTask(task.id)} disabled={saving}>
                    Supprimer
                  </button>
                </div>

                <Input
                  label="Nom"
                  value={task.name}
                  onChange={(e) => updateLocalTask(task.id, { name: e.target.value })}
                />

                <div className="task-inline">
                  <Input
                    label="Points"
                    type="number"
                    value={task.points}
                    onChange={(e) => updateLocalTask(task.id, { points: Number(e.target.value) })}
                  />
                  <Input
                    label="Valeur $"
                    type="number"
                    step="0.1"
                    value={task.moneyValue}
                    onChange={(e) => updateLocalTask(task.id, { moneyValue: Number(e.target.value) })}
                  />
                </div>

                <Button
                  fullWidth
                  size="small"
                  onClick={() => handleUpdateTask(task)}
                  isLoading={saving}
                  disabled={saving || !task.name.trim()}
                >
                  Sauvegarder
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Ajouter une tâche récompensée</h3>
            <p>Points et valeur monétaire seront visibles dans le widget “Tâches du jour”.</p>
          </div>
        </div>
        <div className="task-inline-form">
          <Input
            label="Nom"
            placeholder="Ex: Ranger sa chambre"
            value={newTask.name}
            onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
          />
          <div className="task-inline">
            <Input
              label="Points"
              type="number"
              value={newTask.points}
              onChange={(e) => setNewTask({ ...newTask, points: Number(e.target.value) })}
            />
            <Input
              label="Valeur $"
              type="number"
              step="0.1"
              value={newTask.moneyValue}
              onChange={(e) => setNewTask({ ...newTask, moneyValue: Number(e.target.value) })}
            />
          </div>

          <Button
            onClick={handleAddTask}
            isLoading={saving}
            disabled={saving || !newTask.name.trim()}
            fullWidth
          >
            Ajouter la tâche
          </Button>
        </div>
      </div>
    </div>
  );
};
