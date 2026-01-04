import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import { TimerPanel } from './components/TimerPanel';
import { AIMenuPanel } from './components/AIMenuPanel';
import './KitchenPage.css';

type ActivePanel = 'menu' | 'ai-menu' | 'grocery' | 'timer';

export const KitchenPage: React.FC = () => {
  const [activePanel, setActivePanel] = useState<ActivePanel>('menu');

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

      {/* Layout 2 colonnes : Menu (gauche) + Rotation (droite) */}
      <div className="kitchen-grid-2col">
        
        {/* COLONNE GAUCHE : Menu avec barre d'icônes */}
        <div className="kitchen-col-main">
          
          {/* Barre d'icônes en haut */}
          <div className="kitchen-icon-bar">
            <button
              className={`icon-bar-btn ${activePanel === 'ai-menu' ? 'active' : ''}`}
              onClick={() => setActivePanel('ai-menu')}
              type="button"
              title="Menu IA"
            >
              <span className="icon-bar-emoji">🍽️</span>
              <span className="icon-bar-label">Menu IA</span>
            </button>
            
            <button
              className={`icon-bar-btn ${activePanel === 'timer' ? 'active' : ''}`}
              onClick={() => setActivePanel('timer')}
              type="button"
              title="Minuteurs"
            >
              <span className="icon-bar-emoji">⏱️</span>
              <span className="icon-bar-label">Minuteurs</span>
            </button>
            
            <button
              className={`icon-bar-btn ${activePanel === 'grocery' ? 'active' : ''}`}
              onClick={() => setActivePanel('grocery')}
              type="button"
              title="Épicerie"
            >
              <span className="icon-bar-emoji">🛒</span>
              <span className="icon-bar-label">Épicerie</span>
            </button>

            {/* Bouton retour au menu si un autre panel est actif */}
            {activePanel !== 'menu' && (
              <button
                className="icon-bar-btn-back"
                onClick={() => setActivePanel('menu')}
                type="button"
                title="Retour au menu"
              >
                <span className="icon-bar-emoji">←</span>
                <span className="icon-bar-label">Menu</span>
              </button>
            )}
          </div>

          {/* Contenu de la colonne gauche selon le panel actif */}
          <div className="kitchen-main-content">
            {activePanel === 'menu' && <MenuPanel />}
            {activePanel === 'ai-menu' && <AIMenuPanel />}
            {activePanel === 'grocery' && <GroceryPanel />}
            {activePanel === 'timer' && <TimerPanel />}
          </div>
        </div>

        {/* COLONNE DROITE : Rotation des tâches (compacte) */}
        <div className="kitchen-col-sidebar">
          <RotationPanel />
        </div>
      </div>
    </div>
  );
};
