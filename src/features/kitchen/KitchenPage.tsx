import React from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import './KitchenPage.css';

export const KitchenPage: React.FC = () => {
  return (
    <div className="kitchen-page">
      <header className="kitchen-hero">
        <h1>Cuisine</h1>
        <div className="kitchen-actions">
          <Link to="/dashboard" className="ghost-btn" aria-label="Retour au tableau de bord">
            ← Dashboard
          </Link>
          <Link to="/config" className="ghost-btn" aria-label="Paramètres">
            ⚙️ Paramètres
          </Link>
        </div>
      </header>

      <div className="kitchen-grid-3col">
        {/* Colonne 1: Menu amélioré */}
        <div className="kitchen-col">
          <MenuPanel />
        </div>

        {/* Colonne 2: Épicerie corrigée */}
        <div className="kitchen-col">
          <GroceryPanel />
        </div>

        {/* Colonne 3: Rotation avec animation Arts Martiaux */}
        <div className="kitchen-col">
          <RotationPanel />
        </div>
      </div>
    </div>
  );
};