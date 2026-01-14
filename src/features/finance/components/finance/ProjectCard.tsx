import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/shared/components/Button';
import type { SavingsProjectProgress } from './SavingsProjectsPanel';
import './ProjectCard.css';

type ProjectCardProps = {
  project: SavingsProjectProgress;
  onAddMoney: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onHistory: () => void;
};

const formatCurrency = (value: number) => `${value.toLocaleString('fr-CA')} $`;

export const ProjectCard: React.FC<ProjectCardProps> = ({
  project,
  onAddMoney,
  onEdit,
  onArchive,
  onRestore,
  onHistory,
}) => {
  const progress = useMemo(() => {
    const raw = Number.isFinite(project.progress_percent) ? project.progress_percent : 0;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }, [project.progress_percent]);

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [isMenuOpen]);

  const handleMenuAction = (action: () => void) => {
    action();
    setIsMenuOpen(false);
  };

  const hasEmoji = Boolean(project.emoji);
  const showArchive = project.status === 'active';

  return (
    <article className="project-card">
      <div className="project-image">
        {hasEmoji ? (
          <div className="project-emoji" aria-hidden="true">
            {project.emoji}
          </div>
        ) : project.image_url ? (
          <img src={project.image_url} alt={project.name} loading="lazy" />
        ) : (
          <div className="project-image-fallback" aria-hidden="true">
            🎯
          </div>
        )}
      </div>

      <div className="project-content">
        <div className="project-header">
          <h3>{project.name}</h3>
          <div className="project-menu" ref={menuRef}>
            <button
              type="button"
              className="project-menu-trigger"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Actions du projet"
            >
              ⋯
            </button>
            {isMenuOpen && (
              <div className="project-menu-dropdown" role="menu">
                <button type="button" className="project-menu-item" onClick={() => handleMenuAction(onEdit)}>
                  Modifier
                </button>
                <button type="button" className="project-menu-item" onClick={() => handleMenuAction(onHistory)}>
                  Historique
                </button>
                {showArchive && (
                  <button type="button" className="project-menu-item" onClick={() => handleMenuAction(onArchive)}>
                    Archiver
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="project-amounts">
          <span>{formatCurrency(project.saved_amount)}</span>
          <span className="project-divider">/</span>
          <span>{formatCurrency(project.target_amount)}</span>
        </p>

        <div className="project-progress">
          <div className="project-progress-track">
            <div className="project-progress-bar" style={{ width: `${progress}%` }} />
          </div>
          <span className="project-progress-value">{progress}%</span>
        </div>

        <div className="project-actions">
          {project.status === 'active' ? (
            <Button size="small" variant="secondary" onClick={onAddMoney}>
              Ajouter $ +
            </Button>
          ) : (
            <Button size="small" variant="secondary" onClick={onRestore}>
              Restaurer
            </Button>
          )}
        </div>
      </div>
    </article>
  );
};
