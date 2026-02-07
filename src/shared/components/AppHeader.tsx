import React, { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { useIsMobile } from '@/shared/hooks/useIsMobile';
import './AppHeader.css';

interface AppHeaderProps {
  title?: string;
  description?: string;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ title, description }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { config } = useClientConfig();
  const isMobile = useIsMobile();

  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; icon: string } | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [systemMenuOpen, setSystemMenuOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    loadWeather();
  }, [config]);

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

  const navItems = [
    { path: '/dashboard', icon: '⭐', label: 'Champions', ariaLabel: 'Ouvrir l\'Espace des champions' },
    { path: '/famille', icon: '👨‍👩‍👧‍👦', label: 'Famille', ariaLabel: 'Ouvrir l\'Espace famille' },
    { path: '/kitchen', icon: '🍽️', label: 'Cuisine', ariaLabel: 'Ouvrir la cuisine' },
    { path: '/finances', icon: '💰', label: 'Finances', ariaLabel: 'Ouvrir les finances' },
  ];

  const loadWeather = async () => {
    if (!config?.moduleWeather) return;

    const cityQuery = config.weatherCity?.trim();
    const postalQuery = config.weatherPostalCode?.trim();
    if (!cityQuery && !postalQuery) return;

    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey || apiKey === 'your-openweather-api-key') {
        setWeather(null);
        setWeatherError('Clé météo manquante ou invalide');
        return;
      }

      const query = cityQuery ? `q=${encodeURIComponent(cityQuery)}` : `zip=${encodeURIComponent(postalQuery!)}`;
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?${query}&appid=${apiKey}&units=metric&lang=fr`
      );

      if (response.ok) {
        const data = await response.json();
        setWeather({
          temp: Math.round(data.main.temp),
          icon: getWeatherIcon(data.weather[0].id),
        });
        setWeatherError(null);
      } else {
        setWeather(null);
        setWeatherError('Météo indisponible (vérifiez la clé/API ou le code postal)');
      }
    } catch (error) {
      console.error('Error loading weather:', error);
      setWeather(null);
      setWeatherError('Météo indisponible pour le moment');
    }
  };

  const getWeatherIcon = (weatherId: number): string => {
    if (weatherId >= 200 && weatherId < 300) return '⛈️';
    if (weatherId >= 300 && weatherId < 400) return '🌦️';
    if (weatherId >= 500 && weatherId < 600) return '🌧️';
    if (weatherId >= 600 && weatherId < 700) return '❄️';
    if (weatherId >= 700 && weatherId < 800) return '🌫️';
    if (weatherId === 800) return '☀️';
    if (weatherId > 800) return '☁️';
    return '🌤️';
  };

  const formatTime = () =>
    time.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatDate = () =>
    time.toLocaleDateString('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className={`app-header${isMobile ? ' is-mobile' : ''}`}>
      <div className={`header-core${isMobile ? ' is-mobile' : ''}`}>
        <div className="datetime-weather-box">
          <div className="time-date-group">
            <div className="time">{formatTime()}</div>
            <div className="date">{formatDate()}</div>
          </div>

          {weather && (
            <div className="weather-display">
              <span className="weather-icon">{weather.icon}</span>
              <span>{weather.temp}°C</span>
            </div>
          )}
          {weatherError && <div className="weather-error">{weatherError}</div>}
        </div>

        <div className="header-title">
          {title && <div className="section-title">{title}</div>}
          {description && <p className="section-description">{description}</p>}
        </div>

        {!isMobile && (
          <div className="header-menu">
            <div className="nav-buttons">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  className={`menu-btn ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                  title={item.label}
                  aria-label={item.ariaLabel}
                >
                  {item.icon}
                </button>
              ))}
            </div>

            {/* System menu */}
            <div className="system-menu-wrapper" ref={systemMenuRef}>
              <button
                className={`menu-btn system-menu-trigger${systemMenuOpen || isActive('/config') ? ' active' : ''}`}
                onClick={() => { setSystemMenuOpen((v) => !v); setShowLogoutConfirm(false); }}
                aria-label="Ouvrir le menu système"
                aria-expanded={systemMenuOpen}
                aria-haspopup="true"
              >
                ⚙️
              </button>

              {systemMenuOpen && (
                <div className="header-system-popover" role="menu" aria-label="Menu système">
                  <button
                    className="header-system-item"
                    role="menuitem"
                    onClick={() => { navigate('/config'); setSystemMenuOpen(false); }}
                  >
                    <span aria-hidden="true">⚙️</span>
                    <span>Paramètres</span>
                  </button>

                  {!showLogoutConfirm ? (
                    <button
                      className="header-system-item header-system-item--danger"
                      role="menuitem"
                      onClick={() => setShowLogoutConfirm(true)}
                    >
                      <span aria-hidden="true">🚪</span>
                      <span>Se déconnecter</span>
                    </button>
                  ) : (
                    <div className="header-system-confirm">
                      <span className="header-system-confirm-text">Confirmer la déconnexion ?</span>
                      <div className="header-system-confirm-actions">
                        <button
                          className="header-system-confirm-btn header-system-confirm-btn--cancel"
                          onClick={() => setShowLogoutConfirm(false)}
                        >
                          Annuler
                        </button>
                        <button
                          className="header-system-confirm-btn header-system-confirm-btn--confirm"
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
          </div>
        )}
      </div>
    </header>
  );
};
