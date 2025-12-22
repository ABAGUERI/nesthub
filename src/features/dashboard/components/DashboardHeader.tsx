import React, { useState, useEffect } from 'react';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import './DashboardHeader.css';

export const DashboardHeader: React.FC = () => {
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
    // Codes OpenWeatherMap: https://openweathermap.org/weather-conditions
    if (weatherId >= 200 && weatherId < 300) return '⛈️'; // Orage
    if (weatherId >= 300 && weatherId < 400) return '🌦️'; // Bruine
    if (weatherId >= 500 && weatherId < 600) return '🌧️'; // Pluie
    if (weatherId >= 600 && weatherId < 700) return '❄️'; // Neige
    if (weatherId >= 700 && weatherId < 800) return '🌫️'; // Brouillard
    if (weatherId === 800) return '☀️'; // Ciel dégagé
    if (weatherId > 800) return '☁️'; // Nuages
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

      {/* Menu (placeholder pour l'instant) */}
      <div className="header-menu">
        <button className="menu-btn" title="Paramètres">
          ⚙️
        </button>
      </div>
    </div>
  );
};
