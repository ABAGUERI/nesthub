import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/shared/utils/supabase';
import './FinanceModals.css';

type ProjectHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  projectName?: string;
};

type AuditEntry = {
  id: string;
  action: string;
  changed_fields: Record<string, unknown> | null;
  created_at: string;
};

const formatDate = (value: string) =>
  new Date(value).toLocaleString('fr-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const formatChangedFields = (changedFields: Record<string, unknown> | null) => {
  if (!changedFields || Object.keys(changedFields).length === 0) {
    return ['Aucun détail'];
  }

  return Object.entries(changedFields).map(([key, value]) => {
    if (value && typeof value === 'object' && 'from' in (value as Record<string, unknown>)) {
      const detail = value as { from?: unknown; to?: unknown };
      return `${key}: ${detail.from ?? '—'} → ${detail.to ?? '—'}`;
    }

    return `${key}: ${JSON.stringify(value)}`;
  });
};

export const ProjectHistoryModal: React.FC<ProjectHistoryModalProps> = ({ isOpen, onClose, projectId, projectName }) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error: historyError } = await supabase
          .from('savings_project_audit')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        if (historyError) throw historyError;
        setEntries((data as AuditEntry[]) || []);
      } catch (err) {
        console.error('Error loading project history:', err);
        setEntries([]);
        setError('Impossible de charger l’historique.');
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      void loadHistory();
    }
  }, [isOpen, projectId]);

  const title = useMemo(() => {
    return projectName ? `Historique — ${projectName}` : 'Historique du projet';
  }, [projectName]);

  if (!isOpen || !projectId) return null;

  return (
    <div className="finance-modal-overlay" role="dialog" aria-modal="true">
      <div className="finance-modal finance-modal-history">
        <div className="finance-modal-header">
          <h3>{title}</h3>
          <button type="button" className="finance-modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="finance-modal-body">
          {loading ? (
            <div className="history-empty">Chargement...</div>
          ) : error ? (
            <div className="history-empty error">{error}</div>
          ) : entries.length === 0 ? (
            <div className="history-empty">Aucune action enregistrée.</div>
          ) : (
            <div className="history-list">
              {entries.map((entry) => (
                <div key={entry.id} className="history-entry">
                  <div className="history-entry-header">
                    <span className="history-action">{entry.action}</span>
                    <span className="history-date">{formatDate(entry.created_at)}</span>
                  </div>
                  <ul className="history-changes">
                    {formatChangedFields(entry.changed_fields).map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          <div className="finance-modal-actions">
            <button type="button" className="history-close" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
