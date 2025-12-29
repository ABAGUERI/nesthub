import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import {
  createChild,
  deleteChild,
  FamilyRole,
  getChildren,
  updateChild,
} from '@/shared/utils/children.service';

type ChildIcon = 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';

interface ChildForm {
  id: string;
  name: string;
  icon: ChildIcon;
  role: FamilyRole;
  createdAt: string;
}

const ICON_OPTIONS: { value: ChildIcon; label: string; emoji: string }[] = [
  { value: 'bee', label: 'Abeille', emoji: '🐝' },
  { value: 'ladybug', label: 'Coccinelle', emoji: '🐞' },
  { value: 'butterfly', label: 'Papillon', emoji: '🦋' },
  { value: 'caterpillar', label: 'Chenille', emoji: '🐛' },
];

export const FamilyTab: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newChild, setNewChild] = useState<{ name: string; icon: ChildIcon; role: FamilyRole }>(
    {
      name: '',
      icon: 'bee',
      role: 'child',
    }
  );

  const sortedChildren = useMemo(
    () => [...children].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [children]
  );

  useEffect(() => {
    loadChildren();
  }, [user]);

  const loadChildren = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getChildren(user.id);
      setChildren(
        data.map((c) => ({
          id: c.id,
          name: c.firstName,
          icon: c.icon as ChildIcon,
          role: c.role ?? 'child',
          createdAt: c.createdAt,
        }))
      );
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateChild = async (child: ChildForm) => {
    setSaving(true);
    setError(null);
    try {
      await updateChild(child.id, { firstName: child.name.trim(), icon: child.icon, role: child.role });
      setChildren((prev) => prev.map((c) => (c.id === child.id ? child : c)));
    } catch (err: any) {
      setError(err.message || 'Impossible de sauvegarder ce membre');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    setSaving(true);
    setError(null);
    try {
      await deleteChild(childId);
      setChildren((prev) => prev.filter((c) => c.id !== childId));
    } catch (err: any) {
      setError(err.message || 'Impossible de supprimer ce membre');
    } finally {
      setSaving(false);
    }
  };

  const handleAddChild = async () => {
    if (!user || !newChild.name.trim()) {
      setError('Veuillez saisir un prénom');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createChild(user.id, newChild.name.trim(), newChild.icon, newChild.role);
      setChildren((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.firstName,
          icon: created.icon as ChildIcon,
          role: created.role ?? 'child',
          createdAt: created.createdAt,
        },
      ]);
      setNewChild({ name: '', icon: 'bee', role: 'child' });
    } catch (err: any) {
      setError(err.message || "Impossible d’ajouter ce membre");
    } finally {
      setSaving(false);
    }
  };

  const updateLocalChild = (id: string, updates: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Famille & avatars</p>
          <h2>Gérez votre famille</h2>
          <p className="panel-subtitle">Ajoutez chaque membre (enfant ou adulte), choisissez son rôle et son avatar.</p>
        </div>
      </div>

      {error && <div className="config-alert error">{error}</div>}

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Membres actifs</h3>
            <p>Cette liste est la source unique pour les enfants (dashboard) et les rotations.</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : sortedChildren.length === 0 ? (
          <div className="config-placeholder">Aucun membre configuré</div>
        ) : (
          <div className="child-grid">
            {sortedChildren.map((child) => (
              <div key={child.id} className="child-tile">
                <div className="child-tile-header">
                  <span className="chip">Avatar</span>
                  <button
                    className="ghost-button"
                    onClick={() => handleDeleteChild(child.id)}
                    disabled={saving}
                  >
                    Supprimer
                  </button>
                </div>

                <div className="icon-options-inline">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon.value}
                      className={`icon-choice ${child.icon === icon.value ? 'active' : ''}`}
                      onClick={() => updateLocalChild(child.id, { icon: icon.value })}
                    >
                      <span className="icon-emoji">{icon.emoji}</span>
                      <span>{icon.label}</span>
                    </button>
                  ))}
                </div>

                <Input
                  label="Prénom"
                  value={child.name}
                  onChange={(e) => updateLocalChild(child.id, { name: e.target.value })}
                  placeholder="Prénom"
                />

                <label className="input-label">Rôle</label>
                <div className="role-switcher">
                  {(
                    [
                      { value: 'child', label: 'Enfant' },
                      { value: 'adult', label: 'Adulte' },
                    ] as { value: FamilyRole; label: string }[]
                  ).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`ghost-button ${child.role === option.value ? 'active' : ''}`}
                      onClick={() => updateLocalChild(child.id, { role: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <Button
                  fullWidth
                  size="small"
                  onClick={() => handleUpdateChild(child)}
                  isLoading={saving}
                  disabled={saving || !child.name.trim()}
                >
                  Mettre à jour
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Ajouter un membre</h3>
            <p>Limite actuelle : 4 membres au total.</p>
          </div>
        </div>
        <div className="child-inline-form">
          <Input
            label="Prénom"
            placeholder="Ex: Léa"
            value={newChild.name}
            onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
          />

          <div className="icon-options-inline">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon.value}
                className={`icon-choice ${newChild.icon === icon.value ? 'active' : ''}`}
                onClick={() => setNewChild({ ...newChild, icon: icon.value })}
              >
                <span className="icon-emoji">{icon.emoji}</span>
                <span>{icon.label}</span>
              </button>
            ))}
          </div>

          <label className="input-label">Rôle</label>
          <div className="role-switcher">
            {(
              [
                { value: 'child', label: 'Enfant' },
                { value: 'adult', label: 'Adulte' },
              ] as { value: FamilyRole; label: string }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={`ghost-button ${newChild.role === option.value ? 'active' : ''}`}
                onClick={() => setNewChild({ ...newChild, role: option.value })}
              >
                {option.label}
              </button>
            ))}
          </div>

          <Button
            onClick={handleAddChild}
            isLoading={saving}
            disabled={saving || !newChild.name.trim() || children.length >= 4}
            fullWidth
          >
            Ajouter
          </Button>
        </div>
      </div>
    </div>
  );
};
