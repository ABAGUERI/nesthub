import React from 'react';
import { Link } from 'react-router-dom';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import { MenuPanel } from './components/MenuPanel';
import './KitchenPage.css';

export const KitchenPage: React.FC = () => {
  return (
    <div className="kitchen-page">
      <header className="kitchen-hero">
        <div>
          <p className="kitchen-kicker">Vue collective</p>
          <h1>Cuisine</h1>
          <p className="kitchen-subtitle">
            Planifiez les repas, synchronisez l'épicerie Google Tasks et suivez les tâches en rotation sans perdre
            en lisibilité sur le Nest Hub.
          </p>
        </div>
        <div className="kitchen-actions">
          <Link to="/dashboard" className="ghost-btn">
            ← Dashboard
          </Link>
          <Link to="/config" className="ghost-btn">
            ⚙️ Paramètres
          </Link>
        </div>
      </header>

      <div className="kitchen-grid">
        <section className="rotation-area">
          <RotationPanel />
        </section>
        <section className="grocery-area">
          <GroceryPanel />
        </section>
        <section className="menu-area">
          <MenuPanel />
        </section>
      </div>
    </div>
  );
};
