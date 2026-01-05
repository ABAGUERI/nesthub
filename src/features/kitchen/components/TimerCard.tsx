import React, { useState, useEffect, useRef } from 'react';
import { Timer } from '../types/timer.types';
import './TimerCard.css'; 

const STORAGE_KEY = 'hub_kitchen_timers';


// Son d'alarme
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

// Format MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TimerCard: React.FC = () => {
  const [timers, setTimers] = useState<Timer[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Charger timers
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

  // Sauvegarder timers
  useEffect(() => {
    if (timers.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(timers));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [timers]);

  // Update loop
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

  const addQuickTimer = (minutes: number) => {
    const newTimer: Timer = {
      id: Date.now().toString(),
      label: `${minutes} min`,
      durationSeconds: minutes * 60,
      remainingSeconds: minutes * 60,
      startTime: Date.now(),
      isPaused: false,
      isRinging: false,
    };
    setTimers(prev => [...prev, newTimer]);
  };

  const togglePause = (id: string) => {
    setTimers(prev => prev.map(timer => {
      if (timer.id !== id) return timer;
      
      if (timer.isPaused) {
        // Reprendre : recalculer startTime
        const newStartTime = Date.now() - (timer.durationSeconds - timer.remainingSeconds) * 1000;
        return { ...timer, isPaused: false, startTime: newStartTime };
      } else {
        // Pause
        return { ...timer, isPaused: true };
      }
    }));
  };

  const stopTimer = (id: string) => {
    setTimers(prev => prev.filter(t => t.id !== id));
  };

  const activeTimers = timers.filter(t => !t.isRinging);
  const ringingTimers = timers.filter(t => t.isRinging);

  return (
    <div className="timer-card-compact">
      {/* Header */}
      <div className="timer-card-header">
        <div className="timer-card-icon">⏱️</div>
        <div className="timer-card-title">Minuteurs</div>
      </div>

      {/* Quick timers */}
      <div className="timer-quick-buttons">
        <button 
          className="timer-quick-btn"
          onClick={() => addQuickTimer(5)}
          type="button"
        >
          5
        </button>
        <button 
          className="timer-quick-btn"
          onClick={() => addQuickTimer(10)}
          type="button"
        >
          10
        </button>
        <button 
          className="timer-quick-btn"
          onClick={() => addQuickTimer(15)}
          type="button"
        >
          15
        </button>
      </div>

      {/* Timers actifs */}
      <div className="timer-list-compact">
        {ringingTimers.length > 0 && (
          <div className="timer-ringing-section">
            {ringingTimers.map(timer => (
              <div key={timer.id} className="timer-item-mini ringing">
                <div className="timer-mini-emoji">🔔</div>
                <div className="timer-mini-label">{timer.label}</div>
                <button
                  className="timer-mini-btn stop"
                  onClick={() => stopTimer(timer.id)}
                  type="button"
                  title="Arrêter"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {activeTimers.length > 0 ? (
          activeTimers.map(timer => (
            <div key={timer.id} className="timer-item-mini">
              <div className="timer-mini-time">
                {formatTime(timer.remainingSeconds)}
              </div>
              <div className="timer-mini-actions">
                <button
                  className="timer-mini-btn"
                  onClick={() => togglePause(timer.id)}
                  type="button"
                  title={timer.isPaused ? 'Reprendre' : 'Pause'}
                >
                  {timer.isPaused ? '▶' : '⏸'}
                </button>
                <button
                  className="timer-mini-btn"
                  onClick={() => stopTimer(timer.id)}
                  type="button"
                  title="Supprimer"
                >
                  ✕
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="timer-empty-compact">
            Aucun minuteur
          </div>
        )}
      </div>
    </div>
  );
};
