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
  icon: string;
}

const TASK_ICON_OPTIONS = [
  '🏠', '🧹', '🛏️', '🧺', '🧼', '🍽️', '🧽', '🗑️', '🧯', '🧴',
  '📚', '✏️', '📖', '🧠', '🔢', '🧪', '🖍️', '📝',
  '🪥', '🚿', '🛁', '🧼', '👕', '🧢', '🎒',
  '🥪', '🍎', '🥛', '⏰', '🧩', '📦',
  '🐶', '🐱', '🐾', '🌱',
  '⚽', '🏃', '🚴', '🏀', '🏊', '🤸', '🧘',
  '😊', '🤝', '🗣️', '🕊️', '⭐', '🎯',
  '🎮', '🍿', '🎁', '🏆', '🌟', '✨', '🦷',
];

const ITEMS_PER_PAGE = 12;

export const RewardsTab: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<RewardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const [newTask, setNewTask] = useState({
    name: '',
    points: 10,
    icon: '⭐',
  });
  const [newTaskError, setNewTaskError] = useState<string | null>(null);

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
        icon: task.icon || '⭐',
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
      setNewTaskError('Veuillez renseigner un nom de tâche');
      return;
    }
    if (newTask.points < 1 || newTask.points > 50) {
      setNewTaskError('Les points doivent être entre 1 et 50');
      return;
    }
    setSaving(true);
    setNewTaskError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('available_tasks')
        .insert({
          user_id: user.id,
          name: newTask.name.trim(),
          points: newTask.points,
          money_value: 0,
          category: 'special',
          icon: newTask.icon,
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
            icon: data.icon || newTask.icon,
          },
        ]);
      }
      setNewTask({ name: '', points: 10, icon: '⭐' });
      setModalOpen(false);
    } catch (err: any) {
      setNewTaskError(err.message || "Impossible d'ajouter la tâche");
    } finally {
      setSaving(false);
    }
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

  const visibleTasks = showAll ? tasks : tasks.slice(0, ITEMS_PER_PAGE);
  const hasMore = tasks.length > ITEMS_PER_PAGE;

  const openModal = () => {
    setNewTask({ name: '', points: 10, icon: '⭐' });
    setNewTaskError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setNewTaskError(null);
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Gamification</p>
          <h2>Tâches qui donnent des récompenses</h2>
          <p className="panel-subtitle">
            Gérez les tâches que vos enfants peuvent accomplir pour gagner des points.
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
            <p>{tasks.length} tâche{tasks.length !== 1 ? 's' : ''} configurée{tasks.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : tasks.length === 0 ? (
          <div className="config-placeholder">
            Aucune tâche configurée. Cliquez sur le bouton ci-dessous pour en ajouter.
          </div>
        ) : (
          <>
            <div className="rewards-grid">
              {visibleTasks.map((task) => (
                <div key={`reward-${task.id}`} className="reward-card">
                  <button
                    className="reward-card-delete"
                    onClick={() => handleDeleteTask(task.id)}
                    disabled={saving}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                  <div className="reward-card-emoji">{task.icon}</div>
                  <div className="reward-card-name">{task.name}</div>
                  <div className="reward-card-points">
                    <span className="reward-points-badge">{task.points} pts</span>
                  </div>
                </div>
              ))}
            </div>

            {hasMore && (
              <button
                className="rewards-show-more"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? 'Voir moins'
                  : `Voir les ${tasks.length - ITEMS_PER_PAGE} autres tâches`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Floating Add Button */}
      <button className="rewards-fab" onClick={openModal}>
        <span className="rewards-fab-icon">+</span>
        <span className="rewards-fab-label">Ajouter une tâche</span>
      </button>

      {/* Add Task Modal */}
      {modalOpen && (
        <div className="rewards-modal-overlay" onClick={closeModal}>
          <div className="rewards-modal" onClick={(e) => e.stopPropagation()}>
            <div className="rewards-modal-header">
              <h3>Nouvelle tâche</h3>
              <button className="rewards-modal-close" onClick={closeModal}>✕</button>
            </div>

            <div className="rewards-modal-body">
              {newTaskError && (
                <div className="config-alert error">{newTaskError}</div>
              )}

              <Input
                label="Nom de la tâche"
                placeholder="Ex: Ranger sa chambre"
                value={newTask.name}
                onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              />

              <div className="rewards-modal-field">
                <label className="input-label">Choisir une emoji</label>
                <div className="rewards-emoji-grid">
                  {TASK_ICON_OPTIONS.map((icon, index) => (
                    <button
                      key={`modal-icon-${icon}-${index}`}
                      className={`rewards-emoji-btn ${newTask.icon === icon ? 'active' : ''}`}
                      onClick={() => setNewTask({ ...newTask, icon })}
                      type="button"
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Nombre de points"
                type="number"
                value={newTask.points}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setNewTask({ ...newTask, points: Math.min(50, Math.max(0, val)) });
                }}
                helperText="Maximum 50 points"
              />
            </div>

            <div className="rewards-modal-footer">
              <Button variant="secondary" onClick={closeModal}>
                Annuler
              </Button>
              <Button
                onClick={handleAddTask}
                isLoading={saving}
                disabled={saving || !newTask.name.trim()}
              >
                Ajouter
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
