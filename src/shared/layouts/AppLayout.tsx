import React from 'react';
import { useLocation } from 'react-router-dom';
import { AppHeader } from '@/shared/components/AppHeader';
import './AppLayout.css';

type HeaderMeta = {
  title?: string;
  description?: string;
};

const HEADER_META: Array<{ match: RegExp; meta: HeaderMeta }> = [
  {
    match: /^\/dashboard/,
    meta: {
      title: 'Tableau de bord',
      description: 'Vue globale des missions familiales, agendas et finances.',
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

  return (
    <div className="app-shell">
      <AppHeader title={title} description={description} />
      <div className="app-content">{children}</div>
    </div>
  );
};
