import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import './MobileDockNav.css';

const NAV_ITEMS = [
  { path: '/dashboard', icon: '⭐', label: 'Champions', ariaLabel: 'Ouvrir l\'Espace des champions' },
  { path: '/famille', icon: '👨‍👩‍👧‍👦', label: 'Famille', ariaLabel: 'Ouvrir l\'Espace famille' },
  { path: '/kitchen', icon: '🍽️', label: 'Cuisine', ariaLabel: 'Ouvrir la cuisine' },
  { path: '/finances', icon: '💰', label: 'Finances', ariaLabel: 'Ouvrir les finances' },
];

export const MobileDockNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname.startsWith(path);

  useEffect(() => {
    if (!systemMenuOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (systemMenuRef.current && !systemMenuRef.current.contains(e.target as Node)) {
        setSystemMenuOpen(false);
        setShowLogoutConfirm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [systemMenuOpen]);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <nav className="mobile-dock" aria-label="Navigation mobile">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.path}
          type="button"
          className={`mobile-dock-btn${isActive(item.path) ? ' is-active' : ''}`}
          onClick={() => navigate(item.path)}
          aria-label={item.ariaLabel}
        >
          <span className="mobile-dock-icon" aria-hidden="true">
            {item.icon}
          </span>
          <span className="mobile-dock-label">{item.label}</span>
        </button>
      ))}

      {/* System menu button */}
      <div className="mobile-dock-system" ref={systemMenuRef}>
        <button
          type="button"
          className={`mobile-dock-btn mobile-dock-btn--system${systemMenuOpen || isActive('/config') ? ' is-active' : ''}`}
          onClick={() => { setSystemMenuOpen((v) => !v); setShowLogoutConfirm(false); }}
          aria-label="Ouvrir le menu système"
          aria-expanded={systemMenuOpen}
          aria-haspopup="true"
        >
          <span className="mobile-dock-icon" aria-hidden="true">⚙️</span>
          <span className="mobile-dock-label">Système</span>
        </button>

        {systemMenuOpen && (
          <div className="system-menu-popover" role="menu" aria-label="Menu système">
            <button
              className="system-menu-item"
              role="menuitem"
              onClick={() => { navigate('/config'); setSystemMenuOpen(false); }}
            >
              <span className="system-menu-item-icon" aria-hidden="true">⚙️</span>
              <span>Paramètres</span>
            </button>

            {!showLogoutConfirm ? (
              <button
                className="system-menu-item system-menu-item--danger"
                role="menuitem"
                onClick={() => setShowLogoutConfirm(true)}
              >
                <span className="system-menu-item-icon" aria-hidden="true">🚪</span>
                <span>Se déconnecter</span>
              </button>
            ) : (
              <div className="system-menu-confirm">
                <span className="system-menu-confirm-text">Confirmer la déconnexion ?</span>
                <div className="system-menu-confirm-actions">
                  <button
                    className="system-menu-confirm-btn system-menu-confirm-btn--cancel"
                    onClick={() => setShowLogoutConfirm(false)}
                  >
                    Annuler
                  </button>
                  <button
                    className="system-menu-confirm-btn system-menu-confirm-btn--confirm"
                    onClick={handleLogout}
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
