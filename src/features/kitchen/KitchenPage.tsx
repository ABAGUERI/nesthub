import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import { TimerPanel } from './components/TimerPanel';
import { FlippableCard } from './components/FlippableCard';
import './KitchenPage.css';

export const KitchenPage: React.FC = () => {
  const [timerCount, setTimerCount] = useState(0);

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
        {/* Colonne 1: Menu */}
        <div className="kitchen-col">
          <MenuPanel />
        </div>

        {/* Colonne 2: Carte Flippable (Épicerie ⇄ Timer) */}
        <div className="kitchen-col">
          <FlippableCard
            frontComponent={<GroceryPanel />}
            backComponent={<TimerPanel onTimerCountChange={setTimerCount} />}
            frontTitle="Épicerie"
            backTitle="Minuteurs"
            hasActiveTimers={timerCount > 0}
          />
        </div>

        {/* Colonne 3: Rotation */}
        <div className="kitchen-col">
          <RotationPanel />
        </div>
      </div>
    </div>
  );
};