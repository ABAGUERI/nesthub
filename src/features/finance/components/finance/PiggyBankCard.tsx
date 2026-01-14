import React from 'react';
import { Button } from '@/shared/components/Button';
import './PiggyBankCard.css';

type PiggyBankCardProps = {
  balance: number | null;
  balanceError: string | null;
  isLoading: boolean;
  onNewProject: () => void;
  isAnimating: boolean;
};

const formatCurrency = (value: number) => `${value.toLocaleString('fr-CA')} $`;

export const PiggyBankCard: React.FC<PiggyBankCardProps> = ({
  balance,
  balanceError,
  isLoading,
  onNewProject,
  isAnimating,
}) => {
  const displayBalance = balance !== null ? formatCurrency(balance) : '--';

  return (
    <section className="piggy-card">
      <div className="piggy-card-content">
        <div>
          <p className="piggy-card-kicker">🪙 Ma tirelire</p>
          <h2 className="piggy-card-title">{isLoading ? 'On compte tes pièces...' : `Tu as ${displayBalance}`}</h2>
          <p className="piggy-card-highlight">
            {balanceError
              ? balanceError
              : balance !== null
              ? 'Chaque pièce te rapproche de ton prochain projet 🔥'
              : 'Garde le rythme pour atteindre tes objectifs !'}
          </p>
          <p className="piggy-card-note">Cet argent est réel, dans ta tirelire à la maison.</p>
        </div>
        <div className="piggy-card-actions">
          <Button size="large" onClick={onNewProject} className="piggy-card-cta">
            + Nouveau projet
          </Button>
        </div>
      </div>
      <div className={`piggy-visual ${isAnimating ? 'is-animated' : ''}`} aria-hidden="true">
        <div className="piggy-glow"></div>
        <div className="piggy-icon">🐷</div>
        <div className="piggy-coins">✨</div>
      </div>
    </section>
  );
};
