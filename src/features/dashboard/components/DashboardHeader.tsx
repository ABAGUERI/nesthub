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

  const loadWeather = async () => {
    if (!config?.weatherEnabled || !config?.weatherCity) return;

    try {
      const apiKey = import.meta.env.VITE_OPENWEATHER_API_KEY;
      if (!apiKey) return;

      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${config.weatherCity}&appid=${apiKey}&units=metric&lang=fr`
      );

      if (response.ok) {
        const data = await response.json();
        setWeather({
          temp: Math.round(data.main.temp),
          icon: getWeatherIcon(data.weather[0].id),
        });
      }
    } catch (error) {
      console.error('Error loading weather:', error);
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
      </div>

      {/* Titre central */}
      <div className="header-title">HUB FAMILIAL</div>

      {/* Menu avec bouton déconnexion */}
      <div className="header-menu">
        <button
          className="menu-btn logout-btn"
          onClick={handleLogout}
          title="Se déconnecter"
        >
          🚪
        </button>
        <button className="menu-btn" title="Paramètres">
          ⚙️
        </button>
      </div>
    </div>
  );
};
