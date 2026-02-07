import React, { useState, useEffect, useRef, useCallback } from 'react';
import './FloatingFullscreenButton.css';

const ONBOARDING_KEY = 'nesthub_fullscreen_hint_shown';
const IDLE_TIMEOUT_MS = 4000;

export const FloatingFullscreenButton: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [isIdle, setIsIdle] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [pressed, setPressed] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Fullscreen state sync
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Idle detection (only in fullscreen)
  const resetIdleTimer = useCallback(() => {
    setIsIdle(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (isFullscreen) {
      idleTimerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT_MS);
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      return;
    }

    resetIdleTimer();
    const events = ['mousemove', 'touchstart', 'keydown', 'scroll'];
    events.forEach((ev) => document.addEventListener(ev, resetIdleTimer, { passive: true }));
    return () => {
      events.forEach((ev) => document.removeEventListener(ev, resetIdleTimer));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isFullscreen, resetIdleTimer]);

  // Onboarding hint (one-time)
  useEffect(() => {
    try {
      if (!localStorage.getItem(ONBOARDING_KEY)) {
        setShowHint(true);
        const timer = setTimeout(() => {
          setShowHint(false);
          localStorage.setItem(ONBOARDING_KEY, '1');
        }, 5000);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  const toggleFullscreen = () => {
    setPressed(true);
    setTimeout(() => setPressed(false), 300);

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }

    if (showHint) {
      setShowHint(false);
      try { localStorage.setItem(ONBOARDING_KEY, '1'); } catch {}
    }
  };

  const fabClasses = [
    'floating-fullscreen-fab',
    isFullscreen ? 'is-fullscreen' : '',
    isIdle ? 'is-idle' : '',
    pressed ? 'is-pressed' : '',
  ].filter(Boolean).join(' ');

  return (
    <>
      <button
        className={fabClasses}
        onClick={toggleFullscreen}
        aria-label={isFullscreen ? 'Quitter le plein écran' : 'Activer le plein écran'}
        title={isFullscreen ? 'Quitter le plein écran' : 'Activer le plein écran'}
        type="button"
      >
        <span className="fab-icon" aria-hidden="true">
          {isFullscreen ? '⊡' : '⊞'}
        </span>
      </button>

      {showHint && (
        <div className="fullscreen-hint" role="status" aria-live="polite">
          Passe en plein écran
        </div>
      )}
    </>
  );
};
