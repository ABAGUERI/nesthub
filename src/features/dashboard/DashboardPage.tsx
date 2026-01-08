import React from 'react';
import { AppHeader } from '@/shared/components/AppHeader';
import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { ChildSelectionProvider } from './contexts/ChildSelectionContext';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
  return (
    <ChildSelectionProvider>
      <div className="dashboard-container">
        <AppHeader title="Tableau de bord" description="Vue globale des missions familiales, agendas et finances." />

        <div className="dashboard-body">
          <section className="dashboard-panel">
            <div className="screen-grid kids-screen">
              <ChildrenWidget />
              <DailyTasksWidget />
            </div>
          </section>
        </div>
      </div>
    </ChildSelectionProvider>
  );
};
