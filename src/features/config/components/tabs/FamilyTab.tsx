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
import {
  saveRotation,
  getCurrentRotation,
  generateNextWeekRotation,
} from '@/features/kitchen/services/rotation.service';
import type { Child } from '@/shared/types';
import type { RotationAssignment } from '@/shared/types/kitchen.types';

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

const DEFAULT_ROLES = [
  'Cuisine',
  'Vaisselle',
  'Poubelles',
  'Salle de bain',
  'Rangement',
];

/**
 * Obtenir le lundi de la semaine courante
 */
const getWeekStart = (): string => {
  const date = new Date();
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString();
};

/**
 * FamilyTab - Gestion de la famille et des rotations
 */
export const FamilyTab: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Nouvel enfant/membre
  const [newChild, setNewChild] = useState<{ name: string; icon: ChildIcon; role: FamilyRole }>({
    name: '',
    icon: 'bee',
    role: 'child',
  });

  // Configuration rotation
  const [rotationRoles, setRotationRoles] = useState<string[]>([...DEFAULT_ROLES]);
  const [newRole, setNewRole] = useState('');
  const [rotationAssignments, setRotationAssignments] = useState<
    Record<string, string>
  >({});

  // Tri par date de création
  const sortedChildren = useMemo(
    () => [...children].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [children]
  );

  const familyCount = sortedChildren.length;

  useEffect(() => {
    loadChildren();
    loadCurrentRotation();
  }, [user]);

  /**
   * Charger les membres de la famille
   */
  const loadChildren = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getChildren(user.id);
      setChildren(
        data.map((c: Child) => ({
          id: c.id,
          name: c.firstName,
          icon: c.icon as ChildIcon,
          role: c.role ?? 'child',
          createdAt: c.createdAt,
        }))
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Charger la rotation courante
   */
  const loadCurrentRotation = async () => {
    if (!user) return;

    try {
      const rotation = await getCurrentRotation(user.id);
      if (rotation && rotation.assignments.length > 0) {
        // Construire le mapping role → membre
        const assignments: Record<string, string> = {};
        const roles: string[] = [];

        rotation.assignments.forEach((assignment) => {
          assignments[assignment.role] = assignment.assigneeMemberId;
          if (!roles.includes(assignment.role)) {
            roles.push(assignment.role);
          }
        });

        setRotationAssignments(assignments);
        if (roles.length > 0) {
          setRotationRoles(roles);
        }
      }
    } catch (err) {
      console.error('Failed to load rotation:', err);
    }
  };

  /**
   * Mettre à jour un membre
   */
  const handleUpdateChild = async (child: ChildForm) => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await updateChild(child.id, {
        firstName: child.name.trim(),
        icon: child.icon,
        role: child.role,
      });
      setChildren((prev) => prev.map((c) => (c.id === child.id ? child : c)));
      setSuccessMessage('Membre mis à jour');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Supprimer un membre
   */
  const handleDeleteChild = async (childId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    setSaving(true);
    setError(null);
    try {
      await deleteChild(childId);
      setChildren((prev) => prev.filter((c) => c.id !== childId));
      setSuccessMessage('Membre supprimé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Ajouter un nouveau membre
   */
  const handleAddChild = async () => {
    if (!user || !newChild.name.trim()) {
      setError('Veuillez saisir un prénom');
      return;
    }

    if (children.length >= 4) {
      setError('Limite de 4 membres atteinte');
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
      setSuccessMessage('Membre ajouté');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Mettre à jour localement un membre
   */
  const updateLocalChild = (id: string, updates: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  /**
   * Ajouter un nouveau rôle de rotation
   */
  const handleAddRole = () => {
    const trimmed = newRole.trim();
    if (!trimmed || rotationRoles.includes(trimmed)) {
      setError('Rôle invalide ou déjà existant');
      return;
    }
    setRotationRoles((prev) => [...prev, trimmed]);
    setNewRole('');
  };

  /**
   * Supprimer un rôle
   */
  const handleRemoveRole = (role: string) => {
    setRotationRoles((prev) => prev.filter((r) => r !== role));
    setRotationAssignments((prev) => {
      const updated = { ...prev };
      delete updated[role];
      return updated;
    });
  };

  /**
   * Sauvegarder la rotation
   */
  const handleSaveRotation = async () => {
    if (!user) return;

    const assignments: RotationAssignment[] = rotationRoles
      .map((role, index) => {
        const memberId = rotationAssignments[role];
        if (!memberId) return null;

        const member = sortedChildren.find((c) => c.id === memberId);
        if (!member) return null;

        return {
          role,
          assigneeMemberId: memberId,
          assigneeName: member.name,
          sortOrder: index,
        };
      })
      .filter((a): a is RotationAssignment => a !== null);

    if (assignments.length === 0) {
      setError('Aucune assignation configurée');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const weekStart = getWeekStart();
      await saveRotation(user.id, weekStart, assignments, {
        rule: 'Rotation manuelle',
      });
      setSuccessMessage('Rotation sauvegardée pour cette semaine');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to save rotation:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  /**
   * Générer la rotation automatique de la prochaine semaine
   */
  const handleGenerateNextWeek = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      await generateNextWeekRotation(user.id);
      setSuccessMessage('Rotation de la prochaine semaine générée');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to generate next week:', err);
      setError('Erreur : configurez d\'abord la rotation courante');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="config-tab-panel">
      <div className="panel-header">
        <div>
          <p className="panel-kicker">Famille & avatars</p>
          <h2>Gérez votre famille</h2>
          <p className="panel-subtitle">
            Ajoutez chaque membre (enfant ou adulte), choisissez son rôle et son avatar.
          </p>
        </div>
      </div>

      {error && <div className="config-alert error">{error}</div>}
      {successMessage && <div className="config-alert success">{successMessage}</div>}

      {/* Aperçu Rotation */}
      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>Rotation hebdomadaire</h3>
            <p>
              La rotation de l'écran Cuisine s'appuie sur ces membres. Configurez les assignations
              ci-dessous.
            </p>
          </div>
          <a className="ghost-button" href="/kitchen">
            Voir la rotation
          </a>
        </div>
        <div className="rotation-summary">
          <p>
            {familyCount
              ? `${familyCount} membre(s) prêts pour la rotation.`
              : 'Ajoutez un membre pour activer la rotation.'}
          </p>
          {familyCount > 0 && (
            <div className="rotation-member-list">
              {sortedChildren.map((member) => (
                <div key={member.id} className="rotation-member-chip">
                  <span className="rotation-name">{member.name}</span>
                  <span className={`rotation-role-pill ${member.role === 'adult' ? 'adult' : 'child'}`}>
                    {member.role === 'adult' ? 'Adulte' : 'Enfant'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Configuration Rotation */}
      {familyCount > 0 && (
        <div className="config-card">
          <div className="config-card-header">
            <h3>Configuration des rotations</h3>
            <p>Définissez les rôles et assignez-les aux membres de la famille</p>
          </div>

          {/* Gestion des rôles */}
          <div className="rotation-roles-config">
            <label className="input-label">Rôles disponibles</label>
            <div className="role-list">
              {rotationRoles.map((role) => (
                <div key={role} className="role-item">
                  <span>{role}</span>
                  <button
                    className="ghost-button ghost-button-compact"
                    onClick={() => handleRemoveRole(role)}
                    disabled={saving}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div className="add-role-form">
              <Input
                label="Ajouter un rôle"
                placeholder="Ex: Aspirateur, Lessive..."
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <Button onClick={handleAddRole} disabled={!newRole.trim() || saving}>
                Ajouter le rôle
              </Button>
            </div>
          </div>

          {/* Assignations */}
          <div className="rotation-assignments">
            <label className="input-label">Assignations de cette semaine</label>
            {rotationRoles.map((role) => (
              <div key={role} className="assignment-row">
                <span className="assignment-role">{role}</span>
                <select
                  className="assignment-select"
                  value={rotationAssignments[role] || ''}
                  onChange={(e) =>
                    setRotationAssignments((prev) => ({
                      ...prev,
                      [role]: e.target.value,
                    }))
                  }
                  disabled={saving}
                >
                  <option value="">— Sélectionner —</option>
                  {sortedChildren.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="rotation-actions">
            <Button onClick={handleSaveRotation} isLoading={saving} disabled={saving}>
              Sauvegarder la rotation
            </Button>
            <Button
              onClick={handleGenerateNextWeek}
              disabled={saving}
              variant="secondary"
            >
              Générer semaine prochaine
            </Button>
          </div>
        </div>
      )}

      {/* Membres actifs */}
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

      {/* Ajouter un membre */}
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
