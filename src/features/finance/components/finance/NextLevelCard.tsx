import React from 'react';
import './NextLevelCard.css';

export const NextLevelCard: React.FC = () => {
  return (
    <section className="next-level-card">
      <div>
        <p className="next-level-kicker">Niveau suivant 🔒</p>
        <h2>Investissement bientôt</h2>
        <p className="next-level-text">
          Quand tu seras prêt, tu apprendras à faire travailler ton argent et à suivre tes gains comme un pro.
        </p>
      </div>
      <div className="next-level-visual" aria-hidden="true">
        <div className="next-level-glow"></div>
        <div className="next-level-icon">🧰</div>
        <div className="next-level-coins">🪙</div>
      </div>
    </section>
  );
};
