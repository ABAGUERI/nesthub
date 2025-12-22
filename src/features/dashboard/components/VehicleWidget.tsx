import React from 'react';
import './VehicleWidget.css';

export const VehicleWidget: React.FC = () => {
  return (
    <div className="widget vehicle-widget">
      <div className="vehicle-widget-header">
        <div className="vehicle-icon-large">
          <svg
            width="50"
            height="50"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M6 20h2c0 1.1.9 2 2 2s2-.9 2-2h8c0 1.1.9 2 2 2s2-.9 2-2h2c1.1 0 2-.9 2-2v-6l-3-5H9L6 12v6c0 1.1.9 2 2 2z"
              fill="currentColor"
              opacity="0.9"
            />
            <path
              d="M9 14l2-3h10l2 3H9z"
              fill="currentColor"
              opacity="0.6"
            />
            <path
              d="M16 6l-2 5h2l-2 5 4-6h-2l2-4z"
              fill="#10b981"
              stroke="#0ea472"
              strokeWidth="0.5"
            />
            <circle cx="10" cy="20" r="1.5" fill="#64748b" />
            <circle cx="22" cy="20" r="1.5" fill="#64748b" />
          </svg>
        </div>
        <div className="vehicle-title-group">
          <div className="vehicle-name">Ma Tesla rouge</div>
          <div className="vehicle-status">Prêt</div>
        </div>
      </div>

      <div className="vehicle-stats-grid">
        <div className="vehicle-stat-card primary">
          <div className="stat-icon-large">⚡</div>
          <div className="stat-details">
            <div className="stat-label">Batterie</div>
            <div className="stat-value-large">85%</div>
            <div className="stat-subtext">340 km restants</div>
          </div>
        </div>

        <div className="vehicle-stat-card">
          <div className="stat-icon">🌡️</div>
          <div className="stat-content">
            <div className="stat-label">Extérieur</div>
            <div className="stat-value">-5°C</div>
          </div>
        </div>

        <div className="vehicle-stat-card">
          <div className="stat-icon">🔥</div>
          <div className="stat-content">
            <div className="stat-label">Intérieur</div>
            <div className="stat-value">20°C</div>
          </div>
        </div>
      </div>

      <button className="vehicle-preheat-btn">
        <div className="vehicle-btn-content">
          <span>🔥</span>
          <span>Préchauffer</span>
        </div>
      </button>

      <div className="vehicle-info-section">
        <div className="info-item">
          <span className="info-icon">📍</span>
          <span className="info-text">Stationnée à la maison</span>
        </div>
        <div className="info-item">
          <span className="info-icon">🔒</span>
          <span className="info-text">Verrouillée</span>
        </div>
      </div>
    </div>
  );
};
