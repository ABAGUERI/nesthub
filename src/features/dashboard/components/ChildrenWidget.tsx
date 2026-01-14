import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart, ArcElement, DoughnutController } from 'chart.js';
import { useAuth } from '@/shared/hooks/useAuth';
import { useClientConfig } from '@/shared/hooks/useClientConfig';
import { useChildSelection } from '../contexts/ChildSelectionContext';
import { supabase } from '@/shared/utils/supabase';
import { getOrCreateConfig, getWeekUsage, getWeekWindow } from '@/shared/utils/screenTimeService';
import './ChildrenWidget.css';

Chart.register(ArcElement, DoughnutController);

type ChildIcon = 'bee' | 'ladybug' | 'butterfly' | 'caterpillar' | string;

const CHILD_ICONS: Record<string, string> = {
  bee: '🐝',
  ladybug: '🐞',
  butterfly: '🦋',
  caterpillar: '🐛',
  dragon: '🐉',
  unicorn: '🦄',
  dinosaur: '🦖',
  robot: '🤖',
  default: '👤',
};

const CHILD_COLORS: Record<string, string> = {
  bee: '#fbbf24',
  ladybug: '#f87171',
  butterfly: '#a78bfa',
  caterpillar: '#34d399',
  dragon: '#ef4444',
  unicorn: '#ec4899',
  dinosaur: '#10b981',
  robot: '#6b7280',
  default: '#8b5cf6',
};

interface Child {
  id: string;
  firstName: string;
  icon: ChildIcon;
  avatarUrl?: string;
  totalPoints: number;
  currentLevel: number;
  targetPoints: number;
}

export const ChildrenWidget: React.FC = () => {
  const { user } = useAuth();
  const { config } = useClientConfig();
  const { selectedChildIndex, setSelectedChildIndex, setTotalChildren } = useChildSelection();
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [screenTimeStatus, setScreenTimeStatus] = useState<{
    allowance: number;
    usedMinutes: number;
    heartsTotal: number;
    heartsMinutes: number;
    usedHearts: number;
  } | null>(null);
  const chartRef = useRef<Chart | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [lastTurnedOffIndex, setLastTurnedOffIndex] = useState<number | null>(null);
  const prevHeartsOnRef = useRef<number>(0);
  const turnOffTimeoutRef = useRef<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    loadChildren();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('child_progress_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'child_progress',
        },
        () => {
          loadChildren();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const selectedChild = useMemo(() => children[selectedChildIndex], [children, selectedChildIndex]);

  useEffect(() => {
    if (children.length > 0) {
      setTotalChildren(children.length);
    }
  }, [children, setTotalChildren]);

  useEffect(() => {
    if (!selectedChild || !config?.moduleScreenTime) {
      setScreenTimeStatus(null);
      return;
    }

    const loadScreenTime = async () => {
      try {
        const screenConfig = await getOrCreateConfig(selectedChild.id);
        const allowance = resolveWeeklyAllowance(screenConfig);
        const { weekStart, weekEnd } = getWeekWindow(screenConfig.weekResetDay);
        const usedMinutes = await getWeekUsage(selectedChild.id, weekStart, weekEnd);
        const heartsTotal = Math.max(1, screenConfig.heartsTotal ?? 5);
        const heartsMinutes =
          screenConfig.heartsMinutes && screenConfig.heartsMinutes > 0
            ? screenConfig.heartsMinutes
            : Math.max(1, Math.ceil(allowance / heartsTotal));
        const usedHearts = Math.min(heartsTotal, Math.max(0, Math.floor(usedMinutes / heartsMinutes)));

        setScreenTimeStatus({
          allowance,
          usedMinutes,
          heartsTotal,
          heartsMinutes,
          usedHearts,
        });
      } catch (error) {
        console.error('Error loading screen time data:', error);
        setScreenTimeStatus(null);
      }
    };

    void loadScreenTime();
  }, [selectedChild, config?.moduleScreenTime, config?.screenTimeDefaultAllowance]);

  useEffect(() => {
    if (!selectedChild || !config?.moduleScreenTime) return;

    const handleScreenTimeUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ childId?: string }>).detail;
      if (detail?.childId && detail.childId !== selectedChild.id) return;

      void getOrCreateConfig(selectedChild.id)
        .then((screenConfig) => {
          const allowance = resolveWeeklyAllowance(screenConfig);
          const { weekStart, weekEnd } = getWeekWindow(screenConfig.weekResetDay);
          return getWeekUsage(selectedChild.id, weekStart, weekEnd).then((usedMinutes) => ({
            screenConfig,
            allowance,
            usedMinutes,
          }));
        })
        .then(({ screenConfig, allowance, usedMinutes }) => {
          const heartsTotal = Math.max(1, screenConfig.heartsTotal ?? 5);
          const heartsMinutes =
            screenConfig.heartsMinutes && screenConfig.heartsMinutes > 0
              ? screenConfig.heartsMinutes
              : Math.max(1, Math.ceil(allowance / heartsTotal));
          const usedHearts = Math.min(heartsTotal, Math.max(0, Math.floor(usedMinutes / heartsMinutes)));
          setScreenTimeStatus({
            allowance,
            usedMinutes,
            heartsTotal,
            heartsMinutes,
            usedHearts,
          });
        })
        .catch((error) => {
          console.error('Error refreshing screen time data:', error);
        });
    };

    window.addEventListener('screen-time-updated', handleScreenTimeUpdate);
    return () => {
      window.removeEventListener('screen-time-updated', handleScreenTimeUpdate);
    };
  }, [selectedChild, config?.moduleScreenTime, config?.screenTimeDefaultAllowance]);

  useEffect(() => {
    if (!selectedChild || !canvasRef.current) return;
    createDonutChart(selectedChild, canvasRef.current);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [selectedChild]);

  const loadChildren = async () => {
    if (!user) return;

    try {
      const { data: childrenData, error: childrenError } = await supabase
        .from('family_members')
        .select('id, first_name, icon, avatar_url')
        .eq('user_id', user.id)
        .eq('role', 'child')
        .order('created_at', { ascending: true });

      if (childrenError) throw childrenError;

      const childrenWithProgress = await Promise.all(
        childrenData.map(async (child) => {
          try {
            const { data: progressData } = await supabase
              .from('child_progress')
              .select('total_points, current_level, target_points')
              .eq('child_id', child.id)
              .maybeSingle();

            return {
              id: child.id,
              firstName: child.first_name,
              icon: child.icon,
              avatarUrl: child.avatar_url,
              totalPoints: progressData?.total_points || 0,
              currentLevel: progressData?.current_level || 1,
              targetPoints: progressData?.target_points || 1000,
            };
          } catch (error) {
            console.error(`Error loading progress for child ${child.id}:`, error);
            return {
              id: child.id,
              firstName: child.first_name,
              icon: child.icon,
              avatarUrl: child.avatar_url,
              totalPoints: 0,
              currentLevel: 1,
              targetPoints: 1000,
            };
          }
        })
      );

      setChildren(childrenWithProgress);
    } catch (error) {
      console.error('Error loading children from family_members:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDonutChart = (child: Child, canvas: HTMLCanvasElement) => {
    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const percentage = getPercentage(child);
    const color = getChildColor(child.icon);

    chartRef.current = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [
          {
            data: [percentage, 100 - percentage],
            backgroundColor: [color, 'rgba(255, 255, 255, 0.08)'],
            borderWidth: 0,
            circumference: 360,
            rotation: -90,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '78%',
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
        },
      },
    });
  };

  const getChildIcon = (icon: string): string => CHILD_ICONS[icon] || CHILD_ICONS.default;
  const getChildColor = (icon: string): string => CHILD_COLORS[icon] || CHILD_COLORS.default;

  const getPercentage = (child: Child): number => {
    if (!child || !Number.isFinite(child.totalPoints) || !Number.isFinite(child.targetPoints) || child.targetPoints <= 0) {
      return 0;
    }
    return Math.min((child.totalPoints / child.targetPoints) * 100, 100);
  };

  const resolveWeeklyAllowance = (screenConfig: {
    weeklyAllowance: number | null;
    dailyAllowance: number | null;
  }) => {
    if (screenConfig.weeklyAllowance && screenConfig.weeklyAllowance > 0) {
      return screenConfig.weeklyAllowance;
    }

    if (screenConfig.dailyAllowance && screenConfig.dailyAllowance > 0) {
      return screenConfig.dailyAllowance * 7;
    }

    return (config?.screenTimeDefaultAllowance ?? 60) * 7;
  };

  const ChildAvatar: React.FC<{
    child: Child;
    size?: 'small' | 'medium' | 'large';
    className?: string;
  }> = ({ child, size = 'medium', className = '' }) => {
    const sizeClasses = {
      small: 'child-avatar-small',
      medium: 'child-avatar-medium',
      large: 'child-avatar-large',
    };

    if (child.avatarUrl) {
      return (
        <img
          src={child.avatarUrl}
          alt={`Avatar de ${child.firstName}`}
          className={`child-avatar ${sizeClasses[size]} ${className}`}
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const fallback = e.currentTarget.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      );
    }

    return (
      <div
        className={`child-avatar-fallback ${sizeClasses[size]} ${className}`}
        style={{ backgroundColor: getChildColor(child.icon) }}
      >
        <span>{getChildIcon(child.icon)}</span>
      </div>
    );
  };

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setTouchStart(e.clientX);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || touchStart === null) return;
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
    const threshold = 50;

    if (Math.abs(diff) > threshold) {
      if (diff > 0) prevChild();
      else nextChild();
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

  const percentage = getPercentage(selectedChild);
  const hasReachedGoal = percentage >= 100;
  const targetPoints = Math.max(1000, selectedChild.targetPoints || 0);

  const heartsTotal = screenTimeStatus?.heartsTotal ?? 5;
  const usedMinutes = screenTimeStatus?.usedMinutes ?? 0;
  const totalMinutes = screenTimeStatus?.allowance ?? 0;
  const remainingMinutes = Math.max(0, totalMinutes - usedMinutes);
  const ratioRemaining = totalMinutes > 0 ? Math.min(1, Math.max(0, remainingMinutes / totalMinutes)) : 0;
  const heartsOn = Math.round(ratioRemaining * heartsTotal);

  useEffect(() => {
    const previousHeartsOn = prevHeartsOnRef.current;
    if (heartsOn < previousHeartsOn) {
      const turnedOffIndex = heartsOn;
      setLastTurnedOffIndex(turnedOffIndex);
      if (turnOffTimeoutRef.current !== null) {
        window.clearTimeout(turnOffTimeoutRef.current);
      }
      turnOffTimeoutRef.current = window.setTimeout(() => {
        setLastTurnedOffIndex(null);
      }, 650);
    } else if (heartsOn > previousHeartsOn && lastTurnedOffIndex !== null) {
      if (turnOffTimeoutRef.current !== null) {
        window.clearTimeout(turnOffTimeoutRef.current);
      }
      setLastTurnedOffIndex(null);
    }
    prevHeartsOnRef.current = heartsOn;
  }, [heartsOn, lastTurnedOffIndex]);

  useEffect(() => {
    return () => {
      if (turnOffTimeoutRef.current !== null) {
        window.clearTimeout(turnOffTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="widget children-widget">
      <div className="widget-header">
        <div className="widget-title">🏆 Vas-tu atteindre ton objectif?</div>
        <div className="points-chip">
          <span className="points-value">{selectedChild.totalPoints} pts</span>
          <span className="points-target">/ {targetPoints}</span>
        </div>
      </div>

      <div className="carousel-container">
        {children.length > 1 && (
          <div className="child-switcher">
            {children.map((child, index) => (
              <button
                key={child.id}
                className={`switcher-pill ${index === selectedChildIndex ? 'active' : ''}`}
                onClick={() => selectChild(index)}
                aria-label={`Voir ${child.firstName}`}
              >
                <ChildAvatar child={child} size="small" className="pill-avatar" />
                <span className="pill-name">{child.firstName}</span>
              </button>
            ))}
          </div>
        )}

        <button
          className="carousel-arrow carousel-arrow-left"
          onClick={prevChild}
          disabled={selectedChildIndex === 0}
          aria-label="Enfant précédent"
        >
          ‹
        </button>

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
            {hasReachedGoal && (
              <div className="goal-badge">
                <span className="goal-icon">🏆</span>
                <span className="goal-text">Objectif!</span>
              </div>
            )}

            <div className="donut-and-hearts">
              <div className="donut-wrapper">
                <div className="donut-stack">
                  <canvas ref={canvasRef} className="donut-chart-large" aria-label="Progression des points" />
                  <div className="donut-label-large">
                    <ChildAvatar child={selectedChild} size="large" className="donut-avatar-large" />
                  </div>
                </div>

                <div className="child-name-large">{selectedChild.firstName}</div>
              </div>

              <div className="screen-time-hearts">
                <div className="hearts-label">Temps d'écran</div>
                <div className="hearts-column">
                  {Array.from({ length: heartsTotal }).map((_, index) => {
                    const isActive = index < heartsOn;
                    const isTurningOff = index === lastTurnedOffIndex;
                    return (
                      <span
                        key={index}
                        className={`heart ${isActive ? 'heart--on' : 'heart--off'} ${
                          isTurningOff ? 'heart--turning-off' : ''
                        }`}
                      >
                        ❤️
                      </span>
                    );
                  })}
                </div>
                <div className="hearts-meta">
                  {config?.moduleScreenTime ? `${usedMinutes} / ${totalMinutes} min` : 'Module désactivé'}
                </div>
              </div>
            </div>

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
          </div>
        </div>

        <button
          className="carousel-arrow carousel-arrow-right"
          onClick={nextChild}
          disabled={selectedChildIndex === children.length - 1}
          aria-label="Enfant suivant"
        >
          ›
        </button>
      </div>

      <div className="children-widget-footer">
        <button type="button" className="finance-cta piggy-cta" onClick={() => navigate('/finances')}>
          🐷 Ma tirelire
        </button>
      </div>
    </div>
  );
};
