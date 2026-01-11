import React, { useState } from 'react';

interface FlippableCardProps {
  frontComponent: React.ReactNode;
  backComponent: React.ReactNode;
  frontTitle?: string;
  backTitle?: string;
  flipIcon?: string;
  flipLabel?: string;
  backFlipIcon?: string;
  backFlipLabel?: string;
  hasActiveTimer?: boolean;
}

export const FlippableCard: React.FC<FlippableCardProps> = ({
  frontComponent,
  backComponent,
  frontTitle,
  backTitle,
  flipIcon = '🔄',
  flipLabel = 'Flip',
  backFlipIcon,
  backFlipLabel,
  hasActiveTimer = false,
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="flippable-card-wrapper">
      {/* Badge indicateur en haut - affiche l'icône de la face CACHÉE */}
      <div className="flip-indicator-container">
        <span className="flip-label">
          {isFlipped ? flipLabel : (backFlipLabel || flipLabel)}
        </span>
        <div 
          className={`flip-indicator ${hasActiveTimer && !isFlipped ? 'has-active' : ''}`}
          onClick={handleFlip}
          role="button"
          tabIndex={0}
          aria-label={isFlipped ? `Retour à ${flipLabel}` : `Voir ${backFlipLabel || flipLabel}`}
        >
          <span className="flip-icon">
            {isFlipped ? flipIcon : (backFlipIcon || flipIcon)}
          </span>
          {hasActiveTimer && !isFlipped && <span className="active-badge"></span>}
        </div>
      </div>

      {/* Conteneur de la carte flippable */}
      <div className="flippable-card-container">
        <div className={`flippable-card ${isFlipped ? 'flipped' : ''}`}>
          {/* Face avant */}
          <div className="card-face card-front kitchen-card-enhanced">
            {frontTitle && (
              <div className="card-header">
                <div>
                  <h2 className="card-title">{frontTitle}</h2>
                </div>
              </div>
            )}
            {frontComponent}
          </div>

          {/* Face arrière */}
          <div className="card-face card-back kitchen-card-enhanced">
            {backTitle && (
              <div className="card-header">
                <div>
                  <h2 className="card-title">{backTitle}</h2>
                </div>
              </div>
            )}
            {backComponent}
          </div>
        </div>
      </div>
    </div>
  );
};
