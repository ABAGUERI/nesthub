import React, { useState, useEffect, useRef } from 'react';
import { Chart, ArcElement, DoughnutController } from 'chart.js';
import { useAuth } from '@/shared/hooks/useAuth';
import { getChildrenWithProgress } from '@/shared/utils/children.service';
import { useChildSelection } from '../contexts/ChildSelectionContext';
import './ChildrenWidget.css';

// Enregistrer les éléments Chart.js
Chart.register(ArcElement, DoughnutController);

interface Child {
  id: string;
  firstName: string;
  icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar';
  totalPoints: number;
  currentLevel: number;
  targetPoints: number;
}

export const ChildrenWidget: React.FC = () => {
  const { user } = useAuth();
  const { selectedChildIndex, setSelectedChildIndex, setTotalChildren } = useChildSelection();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const chartsRef = useRef<{ [key: string]: Chart }>({});
  
  // Swipe support
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [user]);

  useEffect(() => {
    if (children.length > 0) {
      setTotalChildren(children.length);
      // Créer le donut pour l'enfant sélectionné
      const selectedChild = children[selectedChildIndex];
      if (selectedChild) {
        createDonutChart(selectedChild);
      }
    }

    // Cleanup
    return () => {
      Object.values(chartsRef.current).forEach((chart) => {
        chart.destroy();
      });
      chartsRef.current = {};
    };
  }, [children, selectedChildIndex]);

  const loadChildren = async () => {
    if (!user) return;

    try {
      const data = await getChildrenWithProgress(user.id);
      setChildren(
        data.map((c: any) => ({
          id: c.id,
          firstName: c.first_name,
          icon: c.icon,
          totalPoints: c.progress?.total_points || 0,
          currentLevel: c.progress?.current_level || 1,
          targetPoints: c.progress?.target_points || 1000,
        }))
      );
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDonutChart = (child: Child) => {
    const canvasId = `chart-${child.id}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;

    if (!canvas) return;

    // Détruire l'ancien chart s'il existe
    if (chartsRef.current[child.id]) {
      chartsRef.current[child.id].destroy();
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const percentage = Math.min((child.totalPoints / child.targetPoints) * 100, 100);
    const color = child.icon === 'bee' ? '#fbbf24' : '#f87171';

    chartsRef.current[child.id] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [percentage, 100 - percentage],
            backgroundColor: [color, 'rgba(255, 255, 255, 0.05)'],
            borderWidth: 0,
            circumference: 360,
            rotation: -90,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });
  };

  const getChildIcon = (icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar'): string => {
    const icons = {
      bee: '🐝',
      ladybug: '🐞',
      butterfly: '🦋',
      caterpillar: '🐛',
    };
    return icons[icon] || '🐝';
  };

  const getChildColor = (icon: 'bee' | 'ladybug' | 'butterfly' | 'caterpillar'): string => {
    const colors = {
      bee: '#fbbf24',      // Jaune
      ladybug: '#f87171',  // Rouge
      butterfly: '#a78bfa', // Violet
      caterpillar: '#34d399', // Vert
    };
    return colors[icon] || '#fbbf24';
  };

  const getPercentage = (child: Child): number => {
    return Math.min((child.totalPoints / child.targetPoints) * 100, 100);
  };

  // Navigation handlers
  const nextChild = () => {
    if (selectedChildIndex < children.length - 1) {
      setSelectedChildIndex(selectedChildIndex + 1);
    }
  };

  const prevChild = () => {
    if (selectedChildIndex > 0) {
      setSelectedChildIndex(selectedChildIndex - 1);
    }
  };

  const selectChild = (index: number) => {
    setSelectedChildIndex(index);
  };

  // Swipe handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || touchStart === null) return;
    
    // Visual feedback pendant le drag (optionnel)
    const diff = e.clientX - touchStart;
    if (Math.abs(diff) > 10) {
      (e.currentTarget as HTMLDivElement).style.cursor = 'grabbing';
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || touchStart === null) {
      setIsDragging(false);
      return;
    }

    const diff = e.clientX - touchStart;
    const threshold = 50; // Seuil minimum pour swipe

    if (Math.abs(diff) > threshold) {
      if (diff > 0) {
        // Swipe right → enfant précédent
        prevChild();
      } else {
        // Swipe left → enfant suivant
        nextChild();
      }
    }

    setTouchStart(null);
    setIsDragging(false);
    (e.currentTarget as HTMLDivElement).style.cursor = 'grab';
  };

  const handlePointerCancel = () => {
    setIsDragging(false);
    setTouchStart(null);
  };

  if (loading) {
    return (
      <div className="widget children-widget">
        <div className="widget-header">
          <div className="widget-title">🏆 Vas-tu atteindre ton objectif?</div>
        </div>
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="widget children-widget">
        <div className="widget-header">
          <div className="widget-title">🏆 Vas-tu atteindre ton objectif?</div>
        </div>
        <div className="empty-message">Aucun enfant configuré</div>
      </div>
    );
  }

  const selectedChild = children[selectedChildIndex];
  const percentage = getPercentage(selectedChild);
  const hasReachedGoal = percentage >= 100;
  const targetPoints = Math.max(1000, selectedChild.targetMoney * 100);

  return (
    <div className="widget children-widget">
      <div className="widget-header">
        <div className="widget-title">🏆 Vas-tu atteindre ton objectif?</div>
        <div className="points-chip">
          <span className="points-value">{selectedChild.totalPoints} pts</span>
          <span className="points-target">/ {targetPoints}</span>
        </div>
      </div>

      {children.length > 1 && (
        <div className="child-switcher">
          {children.map((child, index) => (
            <button
              key={child.id}
              className={`switcher-pill ${index === selectedChildIndex ? 'active' : ''}`}
              onClick={() => selectChild(index)}
              aria-label={`Voir ${child.firstName}`}
            >
              <span className="pill-icon">{getChildIcon(child.icon)}</span>
              <span className="pill-name">{child.firstName}</span>
            </button>
          ))}
        </div>
      )}

      <div className="carousel-container">
        {/* Flèche gauche */}
        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={prevChild}
          disabled={selectedChildIndex === 0}
          aria-label="Enfant précédent"
        >
          ‹
        </button>

        {/* Enfant principal (avec swipe) */}
        <div
          ref={containerRef}
          className="carousel-content"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          <div className="child-main" key={selectedChild.id}>
            {/* Badge "Objectif!" si atteint */}
            {hasReachedGoal && (
              <div className="goal-badge">
                <span className="goal-icon">🏆</span>
                <span className="goal-text">Objectif!</span>
              </div>
            )}

            {/* Canvas pour le donut */}
            <canvas id={`chart-${selectedChild.id}`} className="donut-chart-large"></canvas>

            {/* Label au centre (icône) */}
            <div className="donut-label-large">
              <span
                className="donut-icon-large"
                style={{ color: getChildColor(selectedChild.icon) }}
              >
                {getChildIcon(selectedChild.icon)}
              </span>
            </div>

            {/* Argent et points */}
            <div className="donut-money-large">
              <div
                className="points-balance"
                style={{ color: getChildColor(selectedChild.icon) }}
              >
                {selectedChild.totalPoints} pts
              </div>
              <div className="points-balance">{selectedChild.totalPoints} pts</div>
            </div>

            {/* Nom de l'enfant */}
            <div className="child-name-large">{selectedChild.firstName}</div>

            {/* Progression objectif */}
            <div className="progress-track">
              <div className="progress-label">
                <span>Progression</span>
                <span className="progress-value">{percentage.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: getChildColor(selectedChild.icon),
                  }}
                />
              </div>
            </div>

            {/* Temps d'écran */}
            <div className="screen-time-compact">
              <div className="screen-time-info">
                <div className="time-label">Temps écran (60min/sem)</div>
                <div className="time-value">45 min</div>
              </div>
              <div className="vertical-bar-container">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className={`vertical-bar ${i < 4 ? 'used' : ''}`}
                  ></div>
                ))}
              </div>
              <button className="btn-remove-time" title="Enlever 10 min">
                -10 min
              </button>
            </div>
          </div>
        </div>

        {/* Flèche droite */}
        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={nextChild}
          disabled={selectedChildIndex === children.length - 1}
          aria-label="Enfant suivant"
        >
          ›
        </button>
      </div>

      {/* Dots indicateurs */}
      {children.length > 1 && (
        <div className="carousel-dots">
          {children.map((child, index) => (
            <button
              key={child.id}
              className={`dot ${index === selectedChildIndex ? 'active' : ''}`}
              onClick={() => selectChild(index)}
              aria-label={`Aller à ${child.firstName}`}
              style={{
                backgroundColor:
                  index === selectedChildIndex
                    ? getChildColor(child.icon)
                    : 'rgba(255, 255, 255, 0.2)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};
