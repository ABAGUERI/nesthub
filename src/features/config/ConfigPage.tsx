import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TabNavigation } from './components/TabNavigation';
import { ChildrenTab } from './components/tabs/ChildrenTab';
import { GoogleTab } from './components/tabs/GoogleTab';
import { RewardsTab } from './components/tabs/RewardsTab';
import { WeatherTab } from './components/tabs/WeatherTab';
import './ConfigPage.css';

type TabId = 'children' | 'google' | 'rewards' | 'weather';

const TABS: Array<{ id: TabId; label: string; description: string; icon: string }> = [
  { id: 'children', label: 'Enfants', description: 'Ajouter, modifier, avatars', icon: '👨‍👩‍👧' },
  { id: 'google', label: 'Google', description: 'Adresse Gmail, agendas, tâches', icon: '📧' },
  { id: 'rewards', label: 'Récompenses', description: 'Tâches et points', icon: '🎯' },
  { id: 'weather', label: 'Météo', description: 'Ville et code postal', icon: '🌦️' },
];

export const ConfigPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('children');
  const navigate = useNavigate();

  return (
    <div className="config-page">
      <div className="config-hero">
        <div className="config-hero-text">
          <p className="config-kicker">Paramètres & personnalisation</p>
          <h1>Affinez votre hub familial</h1>
          <p className="config-subtitle">
            Gérez vos enfants, votre compte Google, vos tâches récompensées et les informations météo en quelques clics.
          </p>
        </div>
        <button className="back-dashboard" onClick={() => navigate('/dashboard')}>
          ← Retour au dashboard
        </button>
        <div className="config-hero-badge">
          <div className="badge-dot" />
          <div>
            <p className="badge-label">Vue tactile</p>
            <p className="badge-desc">Zones larges + animations douces</p>
          </div>
        </div>
      </div>

      <div className="config-shell">
        <TabNavigation tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

        <div className="config-panel">
          {activeTab === 'children' && <ChildrenTab />}
          {activeTab === 'google' && <GoogleTab />}
          {activeTab === 'rewards' && <RewardsTab />}
          {activeTab === 'weather' && <WeatherTab />}
        </div>
      </div>
    </div>
  );
};
