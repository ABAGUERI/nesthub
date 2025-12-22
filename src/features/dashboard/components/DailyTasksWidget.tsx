import React, { useState } from 'react';
import './DailyTasksWidget.css';

export const DailyTasksWidget: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sifaw' | 'lucas'>('sifaw');

  return (
    <div className="widget">
      <div className="widget-header">
        <div className="widget-title">⭐ Tâches du jour</div>
        <span className="refresh-btn">🔄</span>
      </div>

      <div className="tabs-container">
        <button
          className={`tab-button sifaw ${activeTab === 'sifaw' ? 'active' : ''}`}
          onClick={() => setActiveTab('sifaw')}
        >
          🐝 Sifaw
        </button>
        <button
          className={`tab-button lucas ${activeTab === 'lucas' ? 'active' : ''}`}
          onClick={() => setActiveTab('lucas')}
        >
          🐞 Lucas
        </button>
      </div>

      <div className="widget-scroll">
        <div className="empty-message">
          Aucune tâche pour aujourd'hui
        </div>
      </div>
    </div>
  );
};
