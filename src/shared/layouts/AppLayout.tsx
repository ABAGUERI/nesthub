import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@/shared/components/AppHeader';
import { DashboardHeader } from '@/features/dashboard/components/DashboardHeader';
import { MobileDockNav } from '@/components/MobileDockNav';
import { FloatingFullscreenButton } from '@/shared/components/FloatingFullscreenButton';
import './AppLayout.css';

type HeaderMeta = {
  title?: string;
  description?: string;
};

const HEADER_META: Array<{ match: RegExp; meta: HeaderMeta }> = [
  {
    match: /^\/dashboard/,
    meta: {
      title: 'Espace des champions',
      description: 'Vue globale des missions, du temps d\u2019écran et de la progression.',
    },
  },
  {
    match: /^\/kitchen/,
    meta: {
      title: 'Cuisine',
      description: 'Planifiez vos repas, courses et rotations sans perdre le fil.',
    },
  },
  {
    match: /^\/famille/,
    meta: {
      title: 'Espace famille',
      description: 'Gérez vos tâches et votre agenda Google en un seul endroit.',
    },
  },
  {
    match: /^\/finances/,
    meta: {
      title: 'Finances',
      description: 'Suivez les économies, projets et récompenses des enfants.',
    },
  },
  {
    match: /^\/config/,
    meta: {
      title: 'Paramètres',
      description: 'Affinez votre hub familial, les rotations et vos intégrations en quelques clics.',
    },
  },
];

const getHeaderMeta = (pathname: string): HeaderMeta => {
  const match = HEADER_META.find((entry) => entry.match.test(pathname));
  return match?.meta ?? {};
};

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { title, description } = getHeaderMeta(location.pathname);
  const isDashboard = /^\/dashboard/.test(location.pathname);

  return (
    <div className={`app-shell${isDashboard ? ' app-shell--dashboard' : ''}`}>
      {isDashboard ? <DashboardHeader /> : <AppHeader title={title} description={description} />}
      <div className="app-content">{children}</div>
      <MobileDockNav />
      <FloatingFullscreenButton />
    </div>
  );
};
