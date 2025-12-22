import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { getChildrenWithProgress } from '@/shared/utils/children.service';
import './ChildrenWidget.css';

interface Child {
  id: string;
  firstName: string;
  icon: 'bee' | 'ladybug';
  totalPoints: number;
  currentLevel: number;
  moneyBalance: number;
}

export const ChildrenWidget: React.FC = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChildren();
  }, [user]);

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
          moneyBalance: c.progress?.money_balance || 0,
        }))
      );
    } catch (error) {
      console.error('Error loading children:', error);
    } finally {
      setLoading(false);
    }
  };

  const getChildIcon = (icon: 'bee' | 'ladybug'): string => {
    return icon === 'bee' ? '🐝' : '🐞';
  };

  const getChildColor = (icon: 'bee' | 'ladybug'): string => {
    return icon === 'bee' ? '#fbbf24' : '#f87171';
  };

  if (loading) {
    return (
      <div className="widget children-widget">
        <div className="widget-header">
          <div className="widget-title">🏆 Progression</div>
        </div>
        <div className="loading-message">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="widget children-widget">
      <div className="widget-header">
        <div className="widget-title">🏆 Vas-tu atteindre ton objectif?</div>
      </div>

      <div className="children-container">
        {children.map((child) => (
          <div key={child.id} className="child-card">
            <div
              className="child-icon"
              style={{ color: getChildColor(child.icon) }}
            >
              {getChildIcon(child.icon)}
            </div>
            <div className="child-name">{child.firstName}</div>
            
            {/* Placeholder donut - À implémenter avec Chart.js */}
            <div className="progress-placeholder">
              <div className="progress-circle">
                <div className="progress-percent">75%</div>
              </div>
            </div>

            <div className="child-stats">
              <div
                className="child-money"
                style={{ color: getChildColor(child.icon) }}
              >
                {child.moneyBalance.toFixed(2)}$
              </div>
              <div className="child-level">Niveau {child.currentLevel}</div>
            </div>

            {/* Temps d'écran placeholder */}
            <div className="screen-time-info">
              <div className="time-label">Temps écran (60min/sem)</div>
              <div className="time-value">45 min</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
