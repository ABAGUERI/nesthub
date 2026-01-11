import React, { useState, useEffect, useRef } from 'react';
import { Timer } from '../types/timer.types';

const STORAGE_KEY = 'hub_kitchen_timers';

// Sons d'alarme (beep simple avec Web Audio API)
const playAlarm = () => {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.value = 800;
  oscillator.type = 'sine';
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

interface TimerPanelProps {
  onTimerCountChange?: (count: number) => void;
}

export const TimerPanel: React.FC<TimerPanelProps> = ({ onTimerCountChange }) => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Notifier le parent du nombre de timers
  useEffect(() => {
    if (onTimerCountChange) {
      onTimerCountChange(timers.length);
    }
  }, [timers.length, onTimerCountChange]);

  // Charger les timers depuis localStorage au démarrage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setTimers(parsed);
      } catch (err) {
        console.error('Failed to parse timers:', err);
      }
    }
  }, []);

  // Sauvegarder les timers dans localStorage quand ils changent
  useEffect(() => {
    if (timers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [timers]);

  // Interval pour mettre à jour les timers actifs
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prevTimers => {
        let updated = false;
        const newTimers = prevTimers.map(timer => {
          if (timer.isPaused || timer.isRinging) return timer;

          const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
          const remaining = Math.max(0, timer.durationSeconds - elapsed);

          if (remaining === 0 && !timer.isRinging) {
            playAlarm();
            updated = true;
            return { ...timer, remainingSeconds: 0, isRinging: true };
          }

          if (remaining !== timer.remainingSeconds) {
            updated = true;
            return { ...timer, remainingSeconds: remaining };
          }

          return timer;
        });

        return updated ? newTimers : prevTimers;
      });
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const createTimer = (minutes: number, label: string) => {
    const durationSeconds = minutes * 60;
    const newTimer: Timer = {
      id: Date.now().toString(),
      label: label || `${minutes} min`,
      durationSeconds,
      remainingSeconds: durationSeconds,
      startTime: Date.now(),
      isPaused: false,
      isRinging: false,
    };

    setTimers(prev => [...prev, newTimer]);
  };

  const handleQuickTimer = (minutes: number) => {
    createTimer(minutes, `${minutes} min`);
  };

  const handleCustomTimer = () => {
    const minutes = parseInt(customMinutes);
    if (isNaN(minutes) || minutes <= 0) return;

    createTimer(minutes, customLabel || `${minutes} min`);
    setCustomMinutes('');
    setCustomLabel('');
    setShowCustomForm(false);
  };

  const pauseTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id && !timer.isRinging) {
        return { ...timer, isPaused: true };
      }
      return timer;
    }));
  };

  const resumeTimer = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id === id && timer.isPaused) {
        const elapsed = timer.durationSeconds - timer.remainingSeconds;
        return {
          ...timer,
          isPaused: false,
          startTime: Date.now() - (elapsed * 1000),
        };
      }
      return timer;
    }));
  };

  const stopAlarm = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const deleteTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = (timer: Timer): number => {
    return ((timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds) * 100;
  };

  return (
    <div className="timer-panel-content">
      <div className="timer-header">
        <h2 className="card-title">⏱️ Minuteurs</h2>
        <p className="card-subtitle">
          {timers.length > 0 ? `${timers.length} actif${timers.length > 1 ? 's' : ''}` : 'Aucun minuteur'}
        </p>
      </div>

      {/* Timers actifs */}
      <div className="timers-list">
        {timers.map(timer => (
          <div 
            key={timer.id} 
            className={`timer-item ${timer.isRinging ? 'ringing' : ''} ${timer.isPaused ? 'paused' : ''}`}
          >
            <div className="timer-content">
              <div className="timer-label">{timer.label}</div>
              <div className="timer-display">
                {formatTime(timer.remainingSeconds)}
              </div>
              <div className="timer-progress-bar">
                <div 
                  className="timer-progress-fill"
                  style={{ width: `${getProgress(timer)}%` }}
                />
              </div>
            </div>

            <div className="timer-actions">
              {timer.isRinging ? (
                <button
                  className="timer-btn stop-btn"
                  onClick={() => stopAlarm(timer.id)}
                  type="button"
                >
                  🔕 Arrêter
                </button>
              ) : timer.isPaused ? (
                <>
                  <button
                    className="timer-btn play-btn"
                    onClick={() => resumeTimer(timer.id)}
                    type="button"
                  >
                    ▶️
                  </button>
                  <button
                    className="timer-btn delete-btn"
                    onClick={() => deleteTimer(timer.id)}
                    type="button"
                  >
                    🗑️
                  </button>
                </>
              ) : (
                <>
                  <button
                    className="timer-btn pause-btn"
                    onClick={() => pauseTimer(timer.id)}
                    type="button"
                  >
                    ⏸️
                  </button>
                  <button
                    className="timer-btn delete-btn"
                    onClick={() => deleteTimer(timer.id)}
                    type="button"
                  >
                    🗑️
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {timers.length === 0 && (
          <div className="timers-empty">
            <div className="empty-icon">⏱️</div>
            <div className="empty-text">Aucun minuteur actif</div>
          </div>
        )}
      </div>

      {/* Quick timers */}
      <div className="quick-timers">
        <button
          className="quick-timer-btn"
          onClick={() => handleQuickTimer(1)}
          type="button"
        >
          1 min
        </button>
        <button
          className="quick-timer-btn"
          onClick={() => handleQuickTimer(5)}
          type="button"
        >
          5 min
        </button>
        <button
          className="quick-timer-btn"
          onClick={() => handleQuickTimer(10)}
          type="button"
        >
          10 min
        </button>
        <button
          className="quick-timer-btn"
          onClick={() => handleQuickTimer(15)}
          type="button"
        >
          15 min
        </button>
      </div>

      {/* Custom timer form */}
      {!showCustomForm ? (
        <button
          className="custom-timer-toggle"
          onClick={() => setShowCustomForm(true)}
          type="button"
        >
          + Minuteur personnalisé
        </button>
      ) : (
        <div className="custom-timer-form">
          <input
            type="text"
            className="custom-timer-input"
            placeholder="Nom (ex: Pâtes)"
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
          />
          <input
            type="number"
            className="custom-timer-input"
            placeholder="Minutes"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            min="1"
            max="999"
          />
          <div className="custom-timer-actions">
            <button
              className="custom-timer-btn confirm-btn"
              onClick={handleCustomTimer}
              disabled={!customMinutes || parseInt(customMinutes) <= 0}
              type="button"
            >
              Créer
            </button>
            <button
              className="custom-timer-btn cancel-btn"
              onClick={() => {
                setShowCustomForm(false);
                setCustomMinutes('');
                setCustomLabel('');
              }}
              type="button"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
