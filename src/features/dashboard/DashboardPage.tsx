import React from 'react';
import { useNavigate } from 'react-router-dom';

import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { CalendarWidget } from './components/CalendarWidget';

import './Dashboard.css';

const DashboardInner: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <div className="dashboard-summary">
        <div className="dashboard-grid">
          <ChildrenWidget />
          <DailyTasksWidget maxTasks={6} showPagination={false} />
          <CalendarWidget maxEvents={3} />
        </div>
        <div className="dashboard-cta">
          <button
            type="button"
            className="dashboard-cta-btn"
            onClick={() => navigate('/famille?tab=tasks')}
          >
            Voir tâches
          </button>
          <button
            type="button"
            className="dashboard-cta-btn"
            onClick={() => navigate('/famille?tab=agenda')}
          >
            Voir agenda
          </button>
        </div>
      </div>
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  return <DashboardInner />;
};
