import React from 'react';
import { CalendarWidget } from '@/features/dashboard/components/CalendarWidget';
import { GoogleTasksWidget } from '@/features/dashboard/components/GoogleTasksWidget';
import './FamilyPage.css';

export const FamilyPage: React.FC = () => {
  return (
    <div className="family-page">
      <div className="family-grid">
        <div className="family-panel">
          <CalendarWidget />
        </div>
        <div className="family-panel">
          <GoogleTasksWidget />
        </div>
      </div>
    </div>
  );
};
