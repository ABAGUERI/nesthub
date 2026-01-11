import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import {
  createChild,
  deleteChild,
  FamilyRole,
  getChildren,
  updateChild,
} from '@/shared/utils/children.service';
import { uploadAvatar, deleteAvatar, validateAvatarFile, getAvatarUrl } from '../../services/avatar.service';
import type { Child } from '@/shared/types';

type ChildIcon = 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';

interface ChildForm {
  id: string;
  name: string;
  icon: ChildIcon;
  role: FamilyRole;
  avatar_url?: string;
  createdAt: string;
}

const ICON_OPTIONS: { value: ChildIcon; label: string; emoji: string }[] = [
  { value: 'bee', label: 'Abeille', emoji: '🐝' },
  { value: 'ladybug', label: 'Coccinelle', emoji: '🐞' },
  { value: 'butterfly', label: 'Papillon', emoji: '🦋' },
  { value: 'caterpillar', label: 'Chenille', emoji: '🐛' },
];

const DEFAULT_COLORS: Record<string, string> = {
  'bee': '#22d3ee',
  'ladybug': '#10b981',
  'butterfly': '#a855f7',
  'caterpillar': '#fb923c'
};

export const FamilyTab: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newChild, setNewChild] = useState<{ name: string; icon: ChildIcon; role: FamilyRole }>({
    name: '',
    icon: 'bee',
    role: 'child',
  });

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
        data.map((c: Child) => ({
          id: c.id,
          name: c.firstName,
          icon: c.icon as ChildIcon,
          role: c.role ?? 'child',
          avatar_url: c.avatarUrl,
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
  console.log('children', children)

  const updateLocalChild = (childId: string, updates: Partial<ChildForm>) => {
    setChildren((prev) => prev.map((c) => (c.id === childId ? { ...c, ...updates } : c)));
  };

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
      setSuccessMessage('Membre mis à jour');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteChild = async (childId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    setSaving(true);
    setError(null);
    try {
      // Supprimer avatar si existe
      const child = children.find(c => c.id === childId);
      if (child?.avatar_url && user) {
        try {
          await deleteAvatar(user.id, childId);
        } catch (err) {
          console.warn('Avatar delete failed:', err);
        }
      }

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
          avatar_url: created.avatarUrl,
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

  const handleAvatarUpload = async (childId: string, file: File) => {
    if (!user) return;

    const validationError = validateAvatarFile(file);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploadingId(childId);
    setError(null);

    try {
      const avatarUrl = await uploadAvatar(user.id, childId, file);

      // Mettre à jour DB
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ avatar_url: avatarUrl })
        .eq('id', childId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        throw new Error(`Erreur sauvegarde DB: ${updateError.message}`);
      }

      updateLocalChild(childId, { avatar_url: avatarUrl });
      setSuccessMessage('Avatar mis à jour');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur upload avatar';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteAvatar = async (childId: string) => {
    if (!user || !confirm('Supprimer l\'avatar ?')) return;

    setUploadingId(childId);
    setError(null);

    try {
      await deleteAvatar(user.id, childId);

      // Mettre à jour DB
      const { error: updateError } = await supabase
        .from('family_members')
        .update({ avatar_url: null })
        .eq('id', childId)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('DB update error:', updateError);
        throw new Error(`Erreur suppression DB: ${updateError.message}`);
      }

      updateLocalChild(childId, { avatar_url: undefined });
      setSuccessMessage('Avatar supprimé');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur suppression avatar';
      setError(message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setUploadingId(null);
    }
  };

  const sortedChildren = [...children].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return (
    <div className="family-tab">
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

      {/* Membres actifs */}
      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>👨‍👩‍👧 Membres de la famille</h3>
            <p>Gérez les membres, leurs avatars et leurs rôles</p>
          </div>
        </div>

        {loading ? (
          <div className="config-placeholder">Chargement...</div>
        ) : sortedChildren.length === 0 ? (
          <div className="config-placeholder">Aucun membre configuré</div>
        ) : (
          <div className="family-members-grid">
            {sortedChildren.map((child) => {
              const childColor = DEFAULT_COLORS[child.icon] || '#64748b';
              
              return (
                <div key={child.id} className="family-member-card">
                  {/* Avatar section */}
                  <div className="member-avatar-section">
                    <div 
                      className="member-avatar"
                      style={{ '--child-color': childColor } as React.CSSProperties}
                    >
                      {child.avatar_url ? (
                        <img 
                          src={getAvatarUrl(child.avatar_url) || ''} 
                          alt={child.name}
                          className="avatar-image"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          <span className="avatar-icon">{ICON_OPTIONS.find(i => i.value === child.icon)?.emoji}</span>
                        </div>
                      )}
                      {uploadingId === child.id && (
                        <div className="avatar-uploading">
                          <div className="spinner" />
                        </div>
                      )}
                    </div>

                    <div className="avatar-actions">
                      <input
                        ref={(el) => (fileInputRefs.current[child.id] = el)}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAvatarUpload(child.id, file);
                        }}
                        style={{ display: 'none' }}
                      />
                      <button
                        className="avatar-btn avatar-btn-upload"
                        onClick={() => fileInputRefs.current[child.id]?.click()}
                        disabled={uploadingId === child.id}
                        type="button"
                      >
                        📸 {child.avatar_url ? 'Changer' : 'Ajouter'} photo
                      </button>
                      {child.avatar_url && (
                        <button
                          className="avatar-btn avatar-btn-delete"
                          onClick={() => handleDeleteAvatar(child.id)}
                          disabled={uploadingId === child.id}
                          type="button"
                        >
                          ✕ Supprimer
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Infos section */}
                  <div className="member-info-section">
                    <Input
                      label="Prénom"
                      value={child.name}
                      onChange={(e) => updateLocalChild(child.id, { name: e.target.value })}
                      placeholder="Prénom"
                    />

                    <label className="input-label">Icône de fallback</label>
                    <div className="icon-options-compact">
                      {ICON_OPTIONS.map((icon) => (
                        <button
                          key={icon.value}
                          className={`icon-btn ${child.icon === icon.value ? 'active' : ''}`}
                          onClick={() => updateLocalChild(child.id, { icon: icon.value })}
                          type="button"
                          title={icon.label}
                        >
                          {icon.emoji}
                        </button>
                      ))}
                    </div>

                    <label className="input-label">Rôle</label>
                    <div className="role-toggle">
                      {(
                        [
                          { value: 'child', label: 'Enfant' },
                          { value: 'adult', label: 'Adulte' },
                        ] as { value: FamilyRole; label: string }[]
                      ).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          className={`role-btn ${child.role === option.value ? 'active' : ''}`}
                          onClick={() => updateLocalChild(child.id, { role: option.value })}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>

                    <div className="member-actions">
                      <Button
                        onClick={() => handleUpdateChild(child)}
                        isLoading={saving}
                        disabled={saving || !child.name.trim()}
                        size="small"
                      >
                        Sauvegarder
                      </Button>
                      <button
                        className="delete-member-btn"
                        onClick={() => handleDeleteChild(child.id)}
                        disabled={saving}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Ajouter membre */}
      <div className="config-card">
        <div className="config-card-header">
          <div>
            <h3>➕ Ajouter un membre</h3>
            <p>Maximum 4 membres au total</p>
          </div>
        </div>

        <div className="add-member-form">
          <Input
            label="Prénom"
            placeholder="Ex: Léa"
            value={newChild.name}
            onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
          />

          <label className="input-label">Icône</label>
          <div className="icon-options-compact">
            {ICON_OPTIONS.map((icon) => (
              <button
                key={icon.value}
                className={`icon-btn ${newChild.icon === icon.value ? 'active' : ''}`}
                onClick={() => setNewChild({ ...newChild, icon: icon.value })}
                type="button"
              >
                <span className="icon-emoji">{icon.emoji}</span>
                <span className="icon-label">{icon.label}</span>
              </button>
            ))}
          </div>

          <label className="input-label">Rôle</label>
          <div className="role-toggle">
            {(
              [
                { value: 'child', label: 'Enfant' },
                { value: 'adult', label: 'Adulte' },
              ] as { value: FamilyRole; label: string }[]
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                className={`role-btn ${newChild.role === option.value ? 'active' : ''}`}
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
            Ajouter le membre
          </Button>
        </div>
      </div>
    </div>
  );
};
