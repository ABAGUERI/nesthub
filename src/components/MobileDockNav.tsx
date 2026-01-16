import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './MobileDockNav.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { path: '/kitchen', icon: '🍽️', label: 'Cuisine' },
  { path: '/finances', icon: '💰', label: 'Finances' },
  { path: '/config', icon: '⚙️', label: 'Paramètres' },
];

export const MobileDockNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <nav className="mobile-dock" aria-label="Navigation mobile">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          type="button"
          className={`mobile-dock-btn${isActive(item.path) ? ' is-active' : ''}`}
          onClick={() => navigate(item.path)}
          aria-label={item.label}
        >
          <span className="mobile-dock-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="mobile-dock-label">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};
