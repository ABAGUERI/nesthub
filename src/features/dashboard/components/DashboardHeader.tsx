import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import './DashboardHeader.css';

export const DashboardHeader: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { config } = useClientConfig();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{
    temp: number;
    icon: string;
  } | null>(null);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Mettre à jour l'heure chaque seconde
  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Charger la météo au démarrage
  useEffect(() => {
    loadWeather();
  }, [config]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

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

      const query = cityQuery
        ? `q=${encodeURIComponent(cityQuery)}`
        : `zip=${encodeURIComponent(postalQuery!)}`
      ;

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

  const formatTime = () => {
    return time.toLocaleTimeString('fr-CA', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = () => {
    return time.toLocaleDateString('fr-CA', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="dashboard-header">
      {/* Heure/Date + Météo */}
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

      {/* Titre central */}
      <div className="header-title">HUB FAMILIAL</div>

      {/* Menu avec bouton déconnexion */}
      <div className="header-menu">
        <button
          className={`menu-btn fullscreen-btn ${isFullscreen ? 'active' : ''}`}
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Quitter le plein écran' : 'Passer en plein écran'}
        >
          {isFullscreen ? '🗗' : '🗖'}
        </button>
        <button className="menu-btn" title="Cuisine" onClick={() => navigate('/kitchen')}>
          🍽️
        </button>
        <button
          className="menu-btn logout-btn"
          onClick={handleLogout}
          title="Se déconnecter"
        >
          🚪
        </button>
        <button className="menu-btn settings-btn" title="Paramètres" onClick={() => navigate('/config')}>
          ⚙️
        </button>
      </div>

      <div className="dashboard-header-utility" aria-hidden="true">
        <div className="utility-time">
          <span className="utility-time-value">{formatTime()}</span>
          <span className="utility-date">{formatDate()}</span>
        </div>
        <div className="utility-weather">
          {weather ? (
            <>
              <span className="utility-weather-icon">{weather.icon}</span>
              <span className="utility-weather-temp">{weather.temp}°C</span>
            </>
          ) : (
            <span className="utility-weather-fallback">{weatherError || 'Météo indisponible'}</span>
          )}
        </div>
      </div>
    </div>
  );
};
