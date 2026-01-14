import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  icon: string | null;
  avatar_url: string | null;
};

const CHILD_ICONS: Record<string, string> = {
  bee: '🐝',
  ladybug: '🐞',
  butterfly: '🦋',
  caterpillar: '🐛',
  dragon: '🐉',
  unicorn: '🦄',
  dinosaur: '🦖',
  robot: '🤖',
  default: '👤',
};

const CHILD_COLORS: Record<string, string> = {
  bee: '#fbbf24',
  ladybug: '#f87171',
  butterfly: '#a78bfa',
  caterpillar: '#34d399',
  dragon: '#ef4444',
  unicorn: '#ec4899',
  dinosaur: '#10b981',
  robot: '#6b7280',
  default: '#8b5cf6',
};

export const FinancePage: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex } = useChildSelection();
  const navigate = useNavigate();

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
          .select('id, first_name, icon, avatar_url')
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
  const childIcon = selectedChild?.icon ? CHILD_ICONS[selectedChild.icon] || CHILD_ICONS.default : CHILD_ICONS.default;
  const childColor = selectedChild?.icon ? CHILD_COLORS[selectedChild.icon] || CHILD_COLORS.default : CHILD_COLORS.default;
  const childDisplayName = selectedChild?.first_name || (loadingChildren ? 'Chargement...' : 'Aucun enfant');

  return (
    <div className="finance-page">
      <AppHeader
        title="Finances"
        description="Épargne projets et premiers réflexes d'investissement pour vos enfants."
      />

      <div className="finance-header">
        <button type="button" className="finance-back-button" onClick={() => navigate('/dashboard')}>
          ← Dashboard
        </button>
        <div className="finance-child-card">
          <div
            className="finance-child-avatar"
            style={{ backgroundColor: childColor }}
            aria-label="Avatar enfant"
          >
            {selectedChild?.avatar_url ? (
              <img src={selectedChild.avatar_url} alt={`Avatar de ${childDisplayName}`} />
            ) : (
              <span>{childIcon}</span>
            )}
          </div>
          <div className="finance-child-info">
            <span className="finance-child-label">Enfant sélectionné</span>
            <span className="finance-child-name">{childDisplayName}</span>
          </div>
        </div>
      </div>

      <div className="finance-hero">
        <div>
          <p className="finance-kicker">Épargne & projets</p>
          <h1>Construisez des projets motivants</h1>
          <p className="finance-subtitle">
            Suivez les objectifs d&apos;épargne des enfants, ajoutez des contributions, et préparez l&apos;avenir.
          </p>
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
