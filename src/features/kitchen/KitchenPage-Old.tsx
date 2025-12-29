import React from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import './KitchenPage.css';

/**
 * KitchenPage
 * Écran collectif pour l'organisation quotidienne de la famille
 * Trois sections principales : Menu, Épicerie, Rotation
 */
export const KitchenPage: React.FC = () => {
  return (
    <div className="kitchen-page">
      {/* Header avec navigation */}
      <header className="kitchen-hero">
        <div>
          <p className="kitchen-kicker">Vue collective</p>
          <h1>Cuisine</h1>
          <p className="kitchen-subtitle">
            Planifiez les repas, synchronisez l'épicerie Google Tasks et suivez les tâches en
            rotation sans perdre en lisibilité sur le Nest Hub.
          </p>
        </div>
        <div className="kitchen-actions">
          <Link to="/dashboard" className="ghost-btn" aria-label="Retour au tableau de bord">
            ← Dashboard
          </Link>
          <Link to="/config" className="ghost-btn" aria-label="Ouvrir les paramètres">
            ⚙️ Paramètres
          </Link>
        </div>
      </header>

      {/* Grid à 3 zones : Menu en haut, Épicerie et Rotation en bas */}
      <div className="kitchen-grid">
        {/* Menu de la semaine (zone large en haut) */}
        <section className="menu-area" aria-label="Menu de la semaine">
          <MenuPanel />
        </section>

        {/* Liste d'épicerie (zone gauche en bas) */}
        <section className="grocery-area" aria-label="Liste d'épicerie">
          <GroceryPanel />
        </section>

        {/* Rotation des tâches (zone droite en bas) */}
        <section className="rotation-area" aria-label="Rotation hebdomadaire">
          <RotationPanel />
        </section>
      </div>
    </div>
  );
};
