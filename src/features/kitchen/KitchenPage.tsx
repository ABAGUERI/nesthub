import React from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import { TimerPanel } from './components/TimerPanel';
import { FlippableCard } from './components/FlippableCard';
import { AIMenuPanel } from './components/AIMenuPanel';
import './KitchenPage.css';

export const KitchenPage: React.FC = () => {
  return (
    <div className="kitchen-page">
      {/* Header */}
      <div className="kitchen-hero">
        <h1>Cuisine</h1>
        <div className="kitchen-actions">
          <Link to="/dashboard" className="ghost-btn">
            ← Dashboard
          </Link>
          <Link to="/settings" className="ghost-btn">
            ⚙️ Paramètres
          </Link>
        </div>
      </div>

      {/* Grid 3 colonnes */}
      <div className="kitchen-grid-3col">
        {/* COLONNE 1 : Menu de la semaine ⇄ Menu IA (Flippable Card) */}
        <div className="kitchen-col">
          <FlippableCard 
            frontComponent={<MenuPanel />}
            backComponent={<AIMenuPanel />}
            flipIcon="🍽️"
            flipLabel="Menu IA"
          />
        </div>

        {/* COLONNE 2 : Épicerie ⇄ Timer (Flippable Card) */}
        <div className="kitchen-col">
          <FlippableCard 
            frontComponent={<GroceryPanel />}
            backComponent={<TimerPanel />}
            flipIcon="🛒"
            flipLabel="Épicerie"
            backFlipIcon="⏱️"
            backFlipLabel="Minuteurs"
          />
        </div>

        {/* COLONNE 3 : Rotation des tâches */}
        <div className="kitchen-col">
          <RotationPanel />
        </div>
      </div>
    </div>
  );
};
