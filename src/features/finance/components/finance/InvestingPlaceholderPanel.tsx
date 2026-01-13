import React from 'react';
import './InvestingPlaceholderPanel.css';

export const InvestingPlaceholderPanel: React.FC = () => {
  return (
    <section className="finance-panel investing-panel">
      <p className="panel-kicker">Investissement</p>
      <h2>📈 Investissement (bientôt)</h2>
      <p className="panel-subtitle">
        Une future section pour apprendre les bases de l&apos;investissement long terme et suivre les progrès.
      </p>
      <ul className="investing-list">
        <li>Suivre un mini-portefeuille</li>
        <li>Comprendre le long terme</li>
        <li>Risque et patience</li>
      </ul>
      <div className="investing-note">Aucune action disponible pour le moment.</div>
    </section>
  );
};
