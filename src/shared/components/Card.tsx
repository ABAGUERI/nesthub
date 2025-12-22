import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  icon,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const classNames = [
    'card',
    hoverable || onClick ? 'card-hoverable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} onClick={onClick}>
      {(title || subtitle || icon) && (
        <div className="card-header">
          {icon && <div className="card-icon">{icon}</div>}
          <div className="card-header-text">
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className="card-content">{children}</div>
    </div>
  );
};
