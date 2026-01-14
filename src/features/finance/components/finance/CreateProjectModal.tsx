import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase } from '@/shared/utils/supabase';
import { EmojiPicker } from './EmojiPicker';
import './FinanceModals.css';

type CreateProjectModalProps = {
  isOpen: boolean;
  onClose: () => void;
  childId?: string;
  onCreated: () => void;
  onError: (message: string) => void;
};

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  childId,
  onCreated,
  onError,
}) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [emoji, setEmoji] = useState('🎯');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setTargetAmount('');
      setImageUrl('');
      setEmoji('🎯');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!childId) {
      setError('Aucun enfant sélectionné.');
      return;
    }

    if (!name.trim()) {
      setError('Le nom du projet est obligatoire.');
      return;
    }

    const parsedTarget = Number(targetAmount);
    if (!parsedTarget || parsedTarget <= 0) {
      setError('Le montant cible doit être supérieur à 0.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { error: insertError } = await supabase.from('savings_projects').insert({
        family_member_id: childId,
        name: name.trim(),
        target_amount: parsedTarget,
        emoji,
        image_url: imageUrl.trim() || null,
        status: 'active',
        priority: 0,
      });

      if (insertError) throw insertError;

      onCreated();
    } catch (err) {
      console.error('Error creating project:', err);
      const rawMessage = err instanceof Error ? err.message : '';
      const message = rawMessage.includes('LIMIT_ACTIVE_PROJECTS_REACHED')
        ? 'Tu as déjà 8 projets actifs. Archive-en un avant d\'en créer un nouveau.'
        : 'Impossible de créer le projet pour le moment.';
      setError(message);
      onError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="finance-modal-overlay" role="dialog" aria-modal="true">
      <div className="finance-modal">
        <div className="finance-modal-header">
          <h3>Nouveau projet</h3>
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
            <Input
              label="Image (optionnel)"
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              placeholder="URL de l'image"
            />
            {error && <div className="finance-modal-error">{error}</div>}
          </div>
          <div className="finance-modal-footer">
            <div className="finance-modal-actions">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Créer le projet
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
