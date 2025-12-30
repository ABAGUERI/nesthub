import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'hub_kitchen_card_flipped';

interface FlippableCardProps {
  frontComponent: React.ReactNode;
  backComponent: React.ReactNode;
  frontTitle?: string;
  backTitle?: string;
  hasActiveTimers?: boolean;
}

export const FlippableCard: React.FC<FlippableCardProps> = ({
  frontComponent,
  backComponent,
  frontTitle = 'Épicerie',
  backTitle = 'Minuteurs',
  hasActiveTimers = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  // Charger l'état depuis localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      setIsFlipped(true);
    }
  }, []);

  // Sauvegarder l'état dans localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isFlipped.toString());
  }, [isFlipped]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flippable-card-wrapper">
      {/* Badge indicateur visible seulement sur face Épicerie */}
      {!isFlipped && (
        <div className="flip-indicator-container">
          <div 
            className={`flip-indicator ${hasActiveTimers ? 'has-active' : ''}`}
            onClick={handleFlip}
            role="button"
            aria-label="Afficher les minuteurs"
            tabIndex={0}
          >
            <span className="flip-icon">⏱️</span>
            {hasActiveTimers && (
              <span className="active-badge">●</span>
            )}
          </div>
          <span className="flip-label">Minuteurs</span>
        </div>
      )}

      <div className="flippable-card-container">
        <div className={`flippable-card ${isFlipped ? 'flipped' : ''}`}>
          {/* Face avant : Épicerie */}
          <div className="card-face card-front">
            {frontComponent}
          </div>

          {/* Face arrière : Timer */}
          <div className="card-face card-back">
            {backComponent}
            
            {/* Bouton retour visible sur face Timer */}
            <button 
              className="flip-back-button"
              onClick={handleFlip}
              type="button"
              aria-label="Retour à l'épicerie"
            >
              ← {frontTitle}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
