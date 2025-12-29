import React from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import './KitchenPage.css';

/**
 * KitchenPage - Layout 2 colonnes fixe
 * Gauche: Menu 7 jours | Droite: Épicerie (haut) + Rotation (bas)
 */
export const KitchenPage: React.FC = () => {
  return (
    <div className="kitchen-page">
      {/* Header compact */}
      <header className="kitchen-hero">
        <h1>Cuisine</h1>
        <div className="kitchen-actions">
          <Link to="/dashboard" className="ghost-btn" aria-label="Retour au tableau de bord">
            ← Dashboard
          </Link>
          <Link to="/config" className="ghost-btn" aria-label="Ouvrir les paramètres">
            ⚙️ Paramètres
          </Link>
        </div>
      </header>

      {/* Grid 2 colonnes: Menu | Sidebar */}
      <div className="kitchen-grid">
        {/* Colonne 1: Menu de la semaine (7 jours) */}
        <section className="menu-area" aria-label="Menu de la semaine">
          <MenuPanel />
        </section>

        {/* Colonne 2: Stack Épicerie + Rotation (50/50) */}
        <div className="kitchen-sidebar">
          {/* Épicerie (50% hauteur) */}
          <section className="grocery-area" aria-label="Liste d'épicerie">
            <GroceryPanel />
          </section>

          {/* Rotation (50% hauteur) */}
          <section className="rotation-area" aria-label="Rotation hebdomadaire">
            <RotationPanel />
          </section>
        </div>
      </div>
    </div>
  );
};
