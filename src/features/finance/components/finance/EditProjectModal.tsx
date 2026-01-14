import React, { useEffect, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase } from '@/shared/utils/supabase';
import type { SavingsProjectProgress } from './SavingsProjectsPanel';
import { EmojiPicker } from './EmojiPicker';
import './FinanceModals.css';

type EditProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: SavingsProjectProgress | null;
  onUpdated: () => void;
  onError: (message: string) => void;
};

export const EditProjectModal: React.FC<EditProjectModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdated,
  onError,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && project) {
      setName(project.name);
      setTargetAmount(project.target_amount.toString());
      setEmoji(project.emoji || '🎯');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!name.trim()) {
      setError('Le nom du projet est obligatoire.');
      return;
    }

    const parsedTarget = Number(targetAmount);
    if (!parsedTarget || parsedTarget <= 0) {
      setError('Le montant cible doit être supérieur à 0.');
      return;
    }

    if (parsedTarget < project.saved_amount) {
      setError('Le montant cible ne peut pas être inférieur à ce qui est déjà épargné.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('savings_projects')
        .update({ name: name.trim(), target_amount: parsedTarget, emoji })
        .eq('id', project.id);

      if (updateError) throw updateError;
      onUpdated();
    } catch (err) {
      console.error('Error updating project:', err);
      const rawMessage = err instanceof Error ? err.message : '';
      const message = rawMessage.includes('TARGET_BELOW_SAVED_NOT_ALLOWED')
        ? 'Le montant cible ne peut pas être inférieur à ce qui est déjà épargné.'
        : 'Impossible de modifier le projet pour le moment.';
      setError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="finance-modal-overlay" role="dialog" aria-modal="true">
      <div className="finance-modal">
        <div className="finance-modal-header">
          <h3>Modifier le projet</h3>
          <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="finance-modal-form">
          <div className="finance-modal-body">
            <EmojiPicker value={emoji} onChange={setEmoji} label="Emoji du projet" />
            <Input
              label="Nom du projet"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex: Vélo, LEGO, sortie..."
            />
            <Input
              label="Montant cible"
              type="number"
              min="0"
              step="1"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
              placeholder="0"
            />
            {error && <div className="finance-modal-error">{error}</div>}
          </div>
          <div className="finance-modal-footer">
            <div className="finance-modal-actions">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Enregistrer
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
