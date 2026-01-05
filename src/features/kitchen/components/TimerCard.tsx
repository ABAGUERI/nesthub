import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Timer } from '../types/timer.types';
import './TimerCard.css';

const STORAGE_KEY = 'hub_kitchen_timers';

const playAlarm = () => {
  try {
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
  } catch (err) {
    console.error('Audio playback failed:', err);
  }
};

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getProgress = (timer: Timer): number => {
  if (timer.durationSeconds === 0) return 0;
  return Math.min(1, Math.max(0, (timer.durationSeconds - timer.remainingSeconds) / timer.durationSeconds));
};

export const TimerCard: React.FC = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [customLabel, setCustomLabel] = useState<string>('');
  const [showOverlay, setShowOverlay] = useState<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTimers(JSON.parse(stored));
      } catch (err) {
        console.error('Failed to parse timers:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (timers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [timers]);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimers(prev => {
        let updated = false;
        const newTimers = prev.map(timer => {
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

        return updated ? newTimers : prev;
      });
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const addTimer = (seconds: number, label: string) => {
    const duration = Math.max(1, seconds);
    const newTimer: Timer = {
      id: Date.now().toString(),
      label,
      durationSeconds: duration,
      remainingSeconds: duration,
      startTime: Date.now(),
      isPaused: false,
      isRinging: false,
    };

    setTimers(prev => [...prev, newTimer]);
    setShowOverlay(true);
  };

  const handleQuickTimer = (seconds: number, label: string) => {
    addTimer(seconds, label);
  };

  const addCustomTimer = () => {
    const minutes = parseInt(customMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    addTimer(minutes * 60, customLabel.trim() || `${minutes} min`);
    setCustomLabel('');
    setCustomMinutes('');
  };

  const togglePause = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id !== id) return timer;

      if (timer.isPaused) {
        const newStartTime = Date.now() - (timer.durationSeconds - timer.remainingSeconds) * 1000;
        return { ...timer, isPaused: false, startTime: newStartTime };
      }

      return { ...timer, isPaused: true };
    }));
  };

  const stopTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const ringingTimers = timers.filter(t => t.isRinging);
  const activeTimers = timers.filter(t => !t.isRinging);

  return (
    <>
      <div className="timer-card-container">
        <div className="timer-card-header">
          <div className="timer-card-icon">⏲️</div>
          <div>
            <div className="timer-card-title">Minuteurs</div>
            <div className="timer-card-subtitle">
              {timers.length > 0 ? `${timers.length} actif${timers.length > 1 ? 's' : ''}` : 'Aucun minuteur'}
            </div>
          </div>
        </div>

        <div className="timer-controls">
          <div className="timer-quick-buttons">
            {[{ seconds: 45, label: '45 sec' }, { seconds: 60, label: '1 min' }, { seconds: 300, label: '5 min' }].map((preset) => (
              <button
                key={preset.label}
                className="timer-quick-btn"
                onClick={() => handleQuickTimer(preset.seconds, preset.label)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
            <button
              className="timer-quick-btn highlight"
              onClick={() => setShowOverlay(true)}
              type="button"
            >
              Personnalisé
            </button>
          </div>

          <button
            className="timer-overlay-btn subtle"
            type="button"
            onClick={() => setShowOverlay(true)}
          >
            Voir les minuteurs
          </button>
        </div>

        <div className="timer-floating-summary">
          <div className="timer-summary-text">
            {timers.length === 0 && 'Aucun minuteur actif'}
            {timers.length > 0 && `${activeTimers.length} en cours · ${ringingTimers.length} terminé${ringingTimers.length > 1 ? 's' : ringingTimers.length === 1 ? '' : 's'}`}
          </div>
          <button
            type="button"
            className="timer-overlay-btn"
            onClick={() => setShowOverlay(true)}
            disabled={timers.length === 0}
          >
            Ouvrir
          </button>
        </div>
      </div>

      {showOverlay && createPortal(
        <div className="timer-overlay" role="dialog" aria-label="Minuteurs en cours">
          <div className="timer-overlay-card" onClick={(e) => e.stopPropagation()}>
            <div className="timer-overlay-header">
              <div>
                <div className="timer-overlay-title">Minuteurs analogiques</div>
                <div className="timer-overlay-subtitle">Vue flottante sans masquer le menu</div>
              </div>
              <button type="button" className="timer-overlay-close" onClick={() => setShowOverlay(false)} aria-label="Fermer">
                ✕
              </button>
            </div>

            <div className="timer-analog-list">
              <div className="timer-custom-row overlay-row">
                <input
                  className="timer-custom-input"
                  placeholder="Nom du minuteur"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  maxLength={30}
                />
                <input
                  className="timer-custom-input"
                  placeholder="Minutes"
                  value={customMinutes}
                  onChange={(e) => setCustomMinutes(e.target.value)}
                  type="number"
                  min={1}
                />
                <button
                  className="timer-add-btn"
                  onClick={addCustomTimer}
                  type="button"
                  disabled={!customMinutes}
                >
                  +
                </button>
              </div>

              {ringingTimers.length > 0 && (
                <div className="timer-ringing">
                  {ringingTimers.map(timer => (
                    <div key={timer.id} className="timer-ringing-card">
                      <div className="timer-ringing-icon">🔔</div>
                      <div className="timer-ringing-label">{timer.label}</div>
                      <button className="timer-stop-btn" onClick={() => stopTimer(timer.id)} type="button">
                        Arrêter
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTimers.length === 0 && ringingTimers.length === 0 && (
                <div className="timer-empty">Aucun minuteur actif</div>
              )}

              {activeTimers.map((timer) => {
                const progress = getProgress(timer);
                const angle = progress * 360;
                const needleRotation = angle - 90;

                return (
                  <div key={timer.id} className={`analog-card ${timer.isPaused ? 'paused' : ''}`}>
                    <div className="analog-face" style={{ background: `conic-gradient(#22d3ee ${angle}deg, rgba(255, 255, 255, 0.08) ${angle}deg 360deg)` }}>
                      <div className="analog-center">
                        <div className="analog-time">{formatTime(timer.remainingSeconds)}</div>
                        <div className="analog-label">{timer.label}</div>
                      </div>
                      <div className="analog-needle" style={{ transform: `rotate(${needleRotation}deg)` }} />
                    </div>

                    <div className="analog-actions">
                      <button
                        className="timer-mini-btn"
                        onClick={() => togglePause(timer.id)}
                        type="button"
                        title={timer.isPaused ? 'Reprendre' : 'Pause'}
                      >
                        {timer.isPaused ? '▶' : '⏸'}
                      </button>
                      <button
                        className="timer-mini-btn danger"
                        onClick={() => stopTimer(timer.id)}
                        type="button"
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
