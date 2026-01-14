import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Input } from '@/shared/components/Input';
import { supabase } from '@/shared/utils/supabase';
import type { SavingsProjectProgress } from './SavingsProjectsPanel';
import './FinanceModals.css';

type AllowanceSource = 'pocket_money' | 'reward' | 'gift' | 'parent_adjustment';

const SOURCE_OPTIONS: Array<{ value: AllowanceSource; label: string }> = [
  { value: 'pocket_money', label: 'Argent de poche' },
  { value: 'reward', label: 'Récompense' },
  { value: 'gift', label: 'Cadeau' },
  { value: 'parent_adjustment', label: 'Ajustement parent' },
];

type AddMoneyModalProps = {
  isOpen: boolean;
  onClose: () => void;
  project: SavingsProjectProgress | null;
  childId?: string;
  onAdded: () => void;
  onError: (message: string) => void;
};

export const AddMoneyModal: React.FC<AddMoneyModalProps> = ({
  isOpen,
  onClose,
  project,
  childId,
  onAdded,
  onError,
}) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState<AllowanceSource>('pocket_money');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAmount('');
      setDescription('');
      setSource('pocket_money');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen]);

  const title = useMemo(() => {
    return project ? `Ajouter de l'argent à ${project.name}` : "Ajouter de l'argent";
  }, [project]);

  if (!isOpen || !project) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!childId) {
      setError('Aucun enfant sélectionné.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Le montant doit être supérieur à 0.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const { data: transaction, error: transactionError } = await supabase
        .from('allowance_transactions')
        .insert({
          family_member_id: childId,
          amount: parsedAmount,
          source,
          description: description.trim() || null,
          validated_by_parent: true,
        })
        .select('id')
        .single();

      if (transactionError || !transaction) throw transactionError;

      const { error: contributionError } = await supabase.from('savings_contributions').insert({
        project_id: project.id,
        transaction_id: transaction.id,
        amount: parsedAmount,
      });

      if (contributionError) throw contributionError;

      onAdded();
    } catch (err) {
      console.error('Error adding contribution:', err);
      const message = 'Impossible d\'ajouter la contribution pour le moment.';
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
          <h3>{title}</h3>
          <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <form onSubmit={handleSubmit} className="finance-modal-form">
          <div className="finance-modal-body">
            <Input
              label="Montant"
              type="number"
              min="0"
              step="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="0"
            />
            <div className="finance-select-group">
              <label className="finance-select-label" htmlFor="source-select">
                Source
              </label>
              <select
                id="source-select"
                className="finance-select"
                value={source}
                onChange={(event) => setSource(event.target.value as AllowanceSource)}
              >
                {SOURCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Description (optionnelle)"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Ex: Bonus devoirs, cadeau..."
            />
            {error && <div className="finance-modal-error">{error}</div>}
          </div>
          <div className="finance-modal-footer">
            <div className="finance-modal-actions">
              <Button type="button" variant="secondary" onClick={onClose} disabled={isSaving}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSaving}>
                Ajouter
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
