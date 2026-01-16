import React from 'react';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import './FinanceHeader.css';

type FinanceHeaderProps = {
  childName: string;
  childIcon: string;
  childColor: string;
  avatarUrl: string | null;
  onBack: () => void;
  isCompact: boolean;
};

export const FinanceHeader: React.FC<FinanceHeaderProps> = ({
  childName,
  childIcon,
  childColor,
  avatarUrl,
  onBack,
  isCompact,
}) => {
  const isMobile = useIsMobile();

  return (
    <header className={`finance-header ${isCompact ? 'is-compact' : ''}${isMobile ? ' is-mobile' : ''}`}>
      <div className="finance-header-inner">
        {!isMobile && (
          <button type="button" className="finance-back-button" onClick={onBack}>
            ← Dashboard
          </button>
        )}
        <div className="finance-header-profile">
          <div className="finance-header-avatar" style={{ backgroundColor: childColor }} aria-label="Avatar enfant">
            {avatarUrl ? <img src={avatarUrl} alt={`Avatar de ${childName}`} /> : <span>{childIcon}</span>}
          </div>
          <div className="finance-header-text">
            <span className="finance-header-name">{childName}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
