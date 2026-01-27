import React from 'react';
import { FamilyWeekCalendar } from '@/features/family/FamilyWeekCalendar';
import { FamilyWeeklyTasks } from '@/features/family/FamilyWeeklyTasks';
import './FamilyPage.css';

export const FamilyPage: React.FC = () => {
  return (
    <div className="family-page">
      <div className="family-calendar-section">
        <FamilyWeekCalendar />
      </div>
      <div className="family-tasks-section">
        <FamilyWeeklyTasks />
      </div>
    </div>
  );
};
