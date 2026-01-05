import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MenuPanel } from './components/MenuPanel';
import { GroceryPanel } from './components/GroceryPanel';
import { RotationPanel } from './components/RotationPanel';
import { AIMenuPanel } from './components/AIMenuPanel';
import './KitchenPage.css';

type ActivePanel = 'menu' | 'ai-menu' | 'grocery';

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
        
        {/* COLONNE GAUCHE : Menu (SANS toolbar standalone) */}
        <div className="kitchen-col-main">
          
          {/* Contenu de la colonne gauche selon le panel actif */}
          <div className="kitchen-main-content">
            {activePanel === 'menu' && (
              <MenuPanel 
                onShowAIMenu={() => setActivePanel('ai-menu')}
                onShowGrocery={() => setActivePanel('grocery')}
              />
            )}
            {activePanel === 'ai-menu' && <AIMenuPanel />}
            {activePanel === 'grocery' && <GroceryPanel />}
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
