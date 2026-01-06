import React, { useState } from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
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
      <AppHeader title="Cuisine" description="Planifiez vos repas, courses et rotations sans perdre le fil." />

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
            {activePanel === 'ai-menu' && <AIMenuPanel onBackToMenu={() => setActivePanel('menu')} />}
            {activePanel === 'grocery' && <GroceryPanel onBackToMenu={() => setActivePanel('menu')} />}
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
