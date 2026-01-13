import React, { useMemo } from 'react';
import { Button } from '@/shared/components/Button';
import type { SavingsProjectProgress } from './SavingsProjectsPanel';
import './ProjectCard.css';

type ProjectCardProps = {
  project: SavingsProjectProgress;
  onAddMoney: () => void;
};

const formatCurrency = (value: number) => `${value.toLocaleString('fr-CA')} $`;

export const ProjectCard: React.FC<ProjectCardProps> = ({ project, onAddMoney }) => {
  const progress = useMemo(() => {
    const raw = Number.isFinite(project.progress_percent) ? project.progress_percent : 0;
    return Math.min(100, Math.max(0, Math.round(raw)));
  }, [project.progress_percent]);

  return (
    <article className="project-card">
      <div className="project-image">
        {project.image_url ? (
          <img src={project.image_url} alt={project.name} loading="lazy" />
        ) : (
          <div className="project-image-fallback" aria-hidden="true">
            🎯
          </div>
        )}
      </div>

      <div className="project-content">
        <h3>{project.name}</h3>
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

        <Button size="small" variant="secondary" onClick={onAddMoney}>
          Ajouter $ +
        </Button>
      </div>
    </article>
  );
};
