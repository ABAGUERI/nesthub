import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { supabase } from '@/shared/utils/supabase';
import { useChildSelection } from '@/features/dashboard/contexts/ChildSelectionContext';
import { FinanceHeader } from './components/finance/FinanceHeader';
import { PiggyBankCard } from './components/finance/PiggyBankCard';
import { ProjectsSection } from './components/finance/ProjectsSection';
import { NextLevelCard } from './components/finance/NextLevelCard';
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
  const [isHeaderCompact, setIsHeaderCompact] = useState(false);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [createSignal, setCreateSignal] = useState(0);
  const [piggyAnimate, setPiggyAnimate] = useState(false);
  const pageRef = useRef<HTMLDivElement | null>(null);

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

  const loadBalance = useCallback(async () => {
    if (!selectedChild?.id) {
      setBalance(null);
      return;
    }

    setBalanceLoading(true);
    setBalanceError(null);
    try {
      const { data, error } = await supabase
        .from('allowance_transactions')
        .select('amount')
        .eq('family_member_id', selectedChild.id);

      if (error) throw error;

      const total = (data || []).reduce((sum, row) => sum + (row.amount ?? 0), 0);
      setBalance(total);
    } catch (err) {
      console.error('Error loading balance:', err);
      setBalance(null);
      setBalanceError('Solde indisponible');
    } finally {
      setBalanceLoading(false);
    }
  }, [selectedChild?.id]);

  useEffect(() => {
    void loadBalance();
  }, [loadBalance]);

  useEffect(() => {
    const scrollContainer = pageRef.current;
    if (!scrollContainer) return;

    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsHeaderCompact(scrollContainer.scrollTop > 80);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNewProject = useCallback(() => {
    setCreateSignal((prev) => prev + 1);
  }, []);

  const handleContributionAdded = useCallback(() => {
    setPiggyAnimate(true);
    window.setTimeout(() => setPiggyAnimate(false), 700);
  }, []);

  return (
    <div ref={pageRef} className="finance-page">
      <div className="finance-background" aria-hidden="true"></div>
      <FinanceHeader
        childName={childDisplayName}
        childIcon={childIcon}
        childColor={childColor}
        avatarUrl={selectedChild?.avatar_url ?? null}
        onBack={() => navigate('/dashboard')}
        isCompact={isHeaderCompact}
      />

      <main className="finance-content">
        <PiggyBankCard
          balance={balance}
          balanceError={balanceError}
          isLoading={balanceLoading}
          onNewProject={handleNewProject}
          isAnimating={piggyAnimate}
        />

        <ProjectsSection
          childId={selectedChild?.id}
          childName={selectedChild?.first_name || ''}
          loadingChildren={loadingChildren}
          childrenError={childrenError}
          createSignal={createSignal}
          onContributionAdded={handleContributionAdded}
          onBalanceRefresh={loadBalance}
        />

        <NextLevelCard />
      </main>
    </div>
  );
};
