import React, { useState, useEffect } from 'react';
import { useAuth } from '@/shared/hooks/useAuth';
import { DashboardHeader } from './components/DashboardHeader';
import { ChildrenWidget } from './components/ChildrenWidget';
import { DailyTasksWidget } from './components/DailyTasksWidget';
import { CalendarWidget } from './components/CalendarWidget';
import { GoogleTasksWidget } from './components/GoogleTasksWidget';
import { VehicleWidget } from './components/VehicleWidget';
import { StockTicker } from './components/StockTicker';
import './Dashboard.css';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-container">
      {/* Header: Heure/Date + Météo + Titre + Menu */}
      <DashboardHeader />

      {/* Widgets Grid - 4 colonnes */}
      <div className="widgets-container">
        {/* COLONNE 1: Enfants + Tâches */}
        <div className="col">
          <ChildrenWidget />
          <DailyTasksWidget />
        </div>

        {/* COLONNE 2: Agenda */}
        <div className="col">
          <CalendarWidget />
        </div>

        {/* COLONNE 3: Google Tasks */}
        <div className="col">
          <GoogleTasksWidget />
        </div>

        {/* COLONNE 4: Véhicule */}
        <div className="col">
          <VehicleWidget />
        </div>
      </div>

      {/* Ticker boursier en bas */}
      <StockTicker />
    </div>
  );
};
