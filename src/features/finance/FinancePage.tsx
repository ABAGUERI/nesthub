import React, { useEffect, useMemo, useState } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { useChildSelection } from '@/features/dashboard/contexts/ChildSelectionContext';
import { SavingsProjectsPanel } from './components/finance/SavingsProjectsPanel';
import { InvestingPlaceholderPanel } from './components/finance/InvestingPlaceholderPanel';
import './FinancePage.css';

type ChildRow = {
  id: string;
  first_name: string;
};

export const FinancePage: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex } = useChildSelection();

  const [children, setChildren] = useState<ChildRow[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [childrenError, setChildrenError] = useState<string | null>(null);

  useEffect(() => {
    const loadChildren = async () => {
      if (!user) return;
      setLoadingChildren(true);
      setChildrenError(null);

      try {
        const { data, error } = await supabase
          .from('family_members')
          .select('id, first_name')
          .eq('user_id', user.id)
          .eq('role', 'child')
          .order('created_at', { ascending: true });

        if (error) throw error;
        setChildren((data as ChildRow[]) || []);
      } catch (err) {
        console.error('Error loading children:', err);
        setChildren([]);
        setChildrenError('Impossible de charger la liste des enfants.');
      } finally {
        setLoadingChildren(false);
      }
    };

    void loadChildren();
  }, [user]);

  const selectedChild = useMemo(() => children[selectedChildIndex] ?? null, [children, selectedChildIndex]);

  return (
    <div className="finance-page">
      <AppHeader
        title="Finances"
        description="Épargne projets et premiers réflexes d'investissement pour vos enfants."
      />

      <div className="finance-hero">
        <div>
          <p className="finance-kicker">Épargne & projets</p>
          <h1>Construisez des projets motivants</h1>
          <p className="finance-subtitle">
            Suivez les objectifs d&apos;épargne des enfants, ajoutez des contributions, et préparez l&apos;avenir.
          </p>
        </div>
        <div className="finance-active-child">
          <span className="finance-active-label">Enfant actif</span>
          <span className="finance-active-value">
            {selectedChild?.first_name || (loadingChildren ? 'Chargement...' : 'Aucun enfant')}
          </span>
        </div>
      </div>

      <div className="finance-columns">
        <SavingsProjectsPanel
          childId={selectedChild?.id}
          childName={selectedChild?.first_name || ''}
          loadingChildren={loadingChildren}
          childrenError={childrenError}
        />
        <InvestingPlaceholderPanel />
      </div>
    </div>
  );
};
