import './components/FamilyRotationTabs.css';
import React, { useState } from 'react';
import { TabNavigation } from './components/TabNavigation';
import { FamilyTab } from './components/tabs/FamilyTab';
import { RotationTab } from './components/tabs/RotationTab';
import { GoogleTab } from './components/tabs/GoogleTab';
import { RewardsTab } from './components/tabs/RewardsTab';
import { WeatherTab } from './components/tabs/WeatherTab';
import { ScreenTimeTab } from './components/tabs/ScreenTimeTab';
import './ConfigPage.css';

type TabId = 'family' | 'rotation' | 'google' | 'rewards' | 'weather' | 'screenTime';

const TABS: Array<{ id: TabId; label: string; description: string; icon: string }> = [
  { id: 'family', label: 'Famille', description: 'Membres et avatars', icon: '👨‍👩‍👧' },
  { id: 'rotation', label: 'Rotation', description: 'Tâches et assignations', icon: '🔄' },
  { id: 'google', label: 'Google', description: 'Gmail, agendas, tâches', icon: '📧' },
  { id: 'rewards', label: 'Récompenses', description: 'Points et argent', icon: '🎯' },
  { id: 'weather', label: 'Météo', description: 'Ville et code postal', icon: '🌦️' },
  { id: 'screenTime', label: 'Temps d’écran', description: 'Budget et cœurs', icon: '⏱️' },
];

export const ConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('family');

  return (
    <div className="config-page">
      <div className="config-hero">
        <div className="config-hero-text">
          <h1>Affinez votre hub familial</h1>
          <p className="config-subtitle">
            Gérez votre famille, vos rotations de tâches, votre compte Google et vos récompenses en quelques clics.
          </p>
        </div>
        <div className="config-hero-badge">
          <div className="badge-dot" />
          <div>
            <p className="badge-label">Vue tactile optimisée</p>
            <p className="badge-desc">Interface moderne et fluide</p>
          </div>
        </div>
      </div>

      <div className="config-shell">
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="config-panel">
          {activeTab === 'family' && <FamilyTab />}
          {activeTab === 'rotation' && <RotationTab />}
          {activeTab === 'google' && <GoogleTab />}
          {activeTab === 'rewards' && <RewardsTab />}
          {activeTab === 'weather' && <WeatherTab />}
          {activeTab === 'screenTime' && <ScreenTimeTab />}
        </div>
      </div>
    </div>
  );
};
