import React, { useMemo, useRef, useState } from 'react';
import { DashboardHeader } from './components/DashboardHeader';
import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { GoogleTasksWidget } from './components/GoogleTasksWidget';
import { VehicleWidget } from './components/VehicleWidget';
import { StockTicker } from './components/StockTicker';
import { FinanceWidget } from './components/FinanceWidget';
import { ChildSelectionProvider } from './contexts/ChildSelectionContext';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
  const { config } = useClientConfig();
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const screens = useMemo(() => {
    return [
      {
        id: 'kids',
        content: (
          <div className="screen-grid kids-screen">
            <div className="screen-card">
              <ChildrenWidget />
            </div>
            <div className="screen-card">
              <DailyTasksWidget />
            </div>
          </div>
        ),
      },
      {
        id: 'agenda',
        content: (
          <div className="screen-grid agenda-screen">
            <div className="screen-card wide">
              <CalendarWidget />
            </div>
            <div className="screen-card narrow">
              <GoogleTasksWidget />
            </div>
          </div>
        ),
      },
      {
        id: 'mobility',
        content: (
          <div className="screen-grid mobility-screen">
            <div className="screen-card">
              <VehicleWidget />
            </div>
            <div className="screen-card">
              <FinanceWidget />
              <StockTicker />
            </div>
          </div>
        ),
      },
    ];
  }, [config]);

  const clampIndex = (index: number) => {
    return Math.min(Math.max(index, 0), screens.length - 1);
  };

  const goTo = (index: number) => {
    setActiveIndex(clampIndex(index));
  };

  const next = () => goTo(activeIndex + 1);
  const prev = () => goTo(activeIndex - 1);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouchStartX(e.clientX);
    setIsDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || touchStartX === null || !trackRef.current) return;
    const diff = e.clientX - touchStartX;
    trackRef.current.style.transform = `translateX(calc(-${activeIndex * 100}% + ${diff}px))`;
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || touchStartX === null) {
      setIsDragging(false);
      return;
    }

    const diff = e.clientX - touchStartX;
    const threshold = 60;

    if (Math.abs(diff) > threshold) {
      if (diff < 0) {
        next();
      } else {
        prev();
      }
    } else {
      goTo(activeIndex);
    }

    setTouchStartX(null);
    setIsDragging(false);
  };

  return (
    <ChildSelectionProvider>
      <div className="dashboard-container carousel-mode">
        <DashboardHeader />

        <div
          className="dashboard-carousel"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            ref={trackRef}
            className="dashboard-carousel-track"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {screens.map((screen) => (
              <section key={screen.id} className="dashboard-screen">
                {screen.content}
              </section>
            ))}
          </div>
          <button
            className="screen-arrow left"
            onClick={prev}
            disabled={activeIndex === 0}
            aria-label="Écran précédent"
          >
            ‹
          </button>
          <button
            className="screen-arrow right"
            onClick={next}
            disabled={activeIndex === screens.length - 1}
            aria-label="Écran suivant"
          >
            ›
          </button>
          <div className="screen-dots">
            {screens.map((screen, index) => (
              <button
                key={screen.id}
                className={`screen-dot ${index === activeIndex ? 'active' : ''}`}
                onClick={() => goTo(index)}
                aria-label={`Aller à l'écran ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </ChildSelectionProvider>
  );
};
