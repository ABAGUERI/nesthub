import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { supabase } from '@/shared/utils/supabase';
import { ProjectCard } from './ProjectCard';
import { CreateProjectModal } from './CreateProjectModal';
import { AddMoneyModal } from './AddMoneyModal';
import './SavingsProjectsPanel.css';

export type SavingsProjectProgress = {
  id: string;
  family_member_id: string;
  name: string;
  target_amount: number;
  image_url: string | null;
  priority: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  saved_amount: number;
  remaining_amount: number;
  progress_percent: number;
};

type SavingsProjectsPanelProps = {
  childId?: string;
  childName: string;
  loadingChildren: boolean;
  childrenError: string | null;
};

type ToastState = {
  message: string;
  variant: 'success' | 'error';
};

export const SavingsProjectsPanel: React.FC<SavingsProjectsPanelProps> = ({
  childId,
  childName,
  loadingChildren,
  childrenError,
}) => {
  const [projects, setProjects] = useState<SavingsProjectProgress[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<SavingsProjectProgress | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, variant: ToastState['variant']) => {
    setToast({ message, variant });
    window.setTimeout(() => setToast(null), 3000);
  }, []);

  const loadProjects = useCallback(async () => {
    if (!childId) {
      setProjects([]);
      return;
    }

    setLoadingProjects(true);
    setProjectsError(null);

    try {
      const { data, error } = await supabase
        .from('v_savings_project_progress')
        .select('*')
        .eq('family_member_id', childId)
        .eq('status', 'active')
        .order('priority', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setProjects((data as SavingsProjectProgress[]) || []);
    } catch (err) {
      console.error('Error loading savings projects:', err);
      setProjects([]);
      setProjectsError('Impossible de charger les projets pour le moment.');
    } finally {
      setLoadingProjects(false);
    }
  }, [childId]);

  const loadBalance = useCallback(async () => {
    if (!childId) {
      setBalance(null);
      return;
    }

    setBalanceError(null);
    try {
      const { data, error } = await supabase
        .from('allowance_transactions')
        .select('amount')
        .eq('family_member_id', childId);

      if (error) throw error;

      const total = (data || []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
      setBalance(total);
    } catch (err) {
      console.error('Error loading balance:', err);
      setBalance(null);
      setBalanceError('Solde indisponible');
    }
  }, [childId]);

  useEffect(() => {
    void loadProjects();
    void loadBalance();
  }, [loadProjects, loadBalance]);

  const handleProjectCreated = useCallback(() => {
    showToast('Projet créé avec succès.', 'success');
    setIsCreateOpen(false);
    void loadProjects();
  }, [loadProjects, showToast]);

  const handleContributionAdded = useCallback(() => {
    showToast('Contribution ajoutée.', 'success');
    setSelectedProject(null);
    void loadProjects();
    void loadBalance();
  }, [loadBalance, loadProjects, showToast]);

  const panelStatus = useMemo(() => {
    if (loadingChildren) return 'Chargement des enfants...';
    if (childrenError) return childrenError;
    if (!childId) return "Sélectionnez un enfant depuis le tableau de bord.";
    return null;
  }, [loadingChildren, childrenError, childId]);

  return (
    <section className="finance-panel savings-panel">
      <div className="savings-panel-header">
        <div>
          <p className="panel-kicker">Épargne projets</p>
          <h2>Objectifs {childName ? `pour ${childName}` : 'familiaux'}</h2>
          <p className="panel-subtitle">Priorisez les projets, suivez la progression et ajoutez des contributions.</p>
        </div>
        <div className="panel-actions">
          <div className="balance-pill">
            <span className="balance-label">Solde total</span>
            <span className="balance-value">
              {balanceError ? balanceError : balance !== null ? `${balance.toLocaleString('fr-CA')} $` : '--'}
            </span>
          </div>
          <Button onClick={() => setIsCreateOpen(true)} size="small">
            + Nouveau projet
          </Button>
        </div>
      </div>

      {toast && <div className={`finance-toast ${toast.variant}`}>{toast.message}</div>}

      {panelStatus ? (
        <div className="panel-empty">{panelStatus}</div>
      ) : loadingProjects ? (
        <div className="panel-empty">Chargement des projets...</div>
      ) : projectsError ? (
        <div className="panel-empty error">{projectsError}</div>
      ) : projects.length === 0 ? (
        <div className="panel-empty">Aucun projet actif. Lancez un nouvel objectif !</div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} onAddMoney={() => setSelectedProject(project)} />
          ))}
        </div>
      )}

      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        childId={childId}
        onCreated={handleProjectCreated}
        onError={(message) => showToast(message, 'error')}
      />

      <AddMoneyModal
        isOpen={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        project={selectedProject}
        childId={childId}
        onAdded={handleContributionAdded}
        onError={(message) => showToast(message, 'error')}
      />
    </section>
  );
};
